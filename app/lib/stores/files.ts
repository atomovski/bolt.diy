import { FilesystemEventType, FileType, type FilesystemEvent, type Sandbox } from 'e2b';
import { map, type MapStore } from 'nanostores';
import { Buffer } from 'node:buffer';
import { path } from '~/utils/path';
import { toSandboxPath } from '~/utils/paths';
import { computeFileModifications } from '~/utils/diff';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';
import {
  addLockedFile,
  removeLockedFile,
  addLockedFolder,
  removeLockedFolder,
  getLockedItemsForChat,
  getLockedFilesForChat,
  getLockedFoldersForChat,
  isPathInLockedFolder,
  migrateLegacyLocks,
  clearCache,
} from '~/lib/persistence/lockedFiles';
import { getCurrentChatId } from '~/utils/fileLocks';

const logger = createScopedLogger('FilesStore');

//const utf8TextDecoder = new TextDecoder('utf8', { fatal: true });

export interface File {
  type: 'file';
  content: string;
  isBinary: boolean;
  isLocked?: boolean;
  lockedByFolder?: string; // Path of the folder that locked this file
}

export interface Folder {
  type: 'folder';
  isLocked?: boolean;
  lockedByFolder?: string; // Path of the folder that locked this folder (for nested folders)
}

type Dirent = File | Folder;

export type FileMap = Record<string, Dirent | undefined>;

export class FilesStore {
  #sandbox: Promise<Sandbox>;

  /**
   * Tracks the number of files without folders.
   */
  #size = 0;

  /**
   * @note Keeps track all modified files with their original content since the last user message.
   * Needs to be reset when the user sends another message and all changes have to be submitted
   * for the model to be aware of the changes.
   */
  #modifiedFiles: Map<string, string> = import.meta.hot?.data.modifiedFiles ?? new Map();

  /**
   * Keeps track of deleted files and folders to prevent them from reappearing on reload
   */
  #deletedPaths: Set<string> = import.meta.hot?.data.deletedPaths ?? new Set();

  #ignorePaths: Array<string> = ['node_modules'];

  /**
   * Map of files that matches the state of E2B Sandbox.
   */
  files: MapStore<FileMap> = import.meta.hot?.data.files ?? map({});

  get filesCount() {
    return this.#size;
  }

  constructor(sandboxPromise: Promise<Sandbox>) {
    this.#sandbox = sandboxPromise;

    // Load deleted paths from localStorage if available
    try {
      if (typeof localStorage !== 'undefined') {
        const deletedPathsJson = localStorage.getItem('bolt-deleted-paths');

        if (deletedPathsJson) {
          const deletedPaths = JSON.parse(deletedPathsJson);

          if (Array.isArray(deletedPaths)) {
            deletedPaths.forEach((path) => this.#deletedPaths.add(path));
          }
        }
      }
    } catch (error) {
      logger.error('Failed to load deleted paths from localStorage', error);
    }

    // Load locked files from localStorage
    this.#loadLockedFiles();

    if (import.meta.hot) {
      // Persist our state across hot reloads
      import.meta.hot.data.files = this.files;
      import.meta.hot.data.modifiedFiles = this.#modifiedFiles;
      import.meta.hot.data.deletedPaths = this.#deletedPaths;
    }

    // Listen for URL changes to detect chat ID changes
    if (typeof window !== 'undefined') {
      let lastChatId = getCurrentChatId();

      // Use MutationObserver to detect URL changes (for SPA navigation)
      const observer = new MutationObserver(() => {
        const currentChatId = getCurrentChatId();

        if (currentChatId !== lastChatId) {
          logger.info(`Chat ID changed from ${lastChatId} to ${currentChatId}, reloading locks`);
          lastChatId = currentChatId;
          this.#loadLockedFiles(currentChatId);
        }
      });

      observer.observe(document, { subtree: true, childList: true });
    }

    this.#init();
  }

  /**
   * Load locked files and folders from localStorage and update the file objects
   * @param chatId Optional chat ID to load locks for (defaults to current chat)
   */
  #loadLockedFiles(chatId?: string) {
    try {
      const currentChatId = chatId || getCurrentChatId();
      const startTime = performance.now();

      // Migrate any legacy locks to the current chat
      migrateLegacyLocks(currentChatId);

      // Get all locked items for this chat (uses optimized cache)
      const lockedItems = getLockedItemsForChat(currentChatId);

      // Split into files and folders
      const lockedFiles = lockedItems.filter((item) => !item.isFolder);
      const lockedFolders = lockedItems.filter((item) => item.isFolder);

      if (lockedItems.length === 0) {
        logger.info(`No locked items found for chat ID: ${currentChatId}`);
        return;
      }

      logger.info(
        `Found ${lockedFiles.length} locked files and ${lockedFolders.length} locked folders for chat ID: ${currentChatId}`,
      );

      const currentFiles = this.files.get();
      const updates: FileMap = {};

      // Process file locks
      for (const lockedFile of lockedFiles) {
        const file = currentFiles[lockedFile.path];

        if (file?.type === 'file') {
          updates[lockedFile.path] = {
            ...file,
            isLocked: true,
          };
        }
      }

      // Process folder locks
      for (const lockedFolder of lockedFolders) {
        const folder = currentFiles[lockedFolder.path];

        if (folder?.type === 'folder') {
          updates[lockedFolder.path] = {
            ...folder,
            isLocked: true,
          };

          // Also mark all files within the folder as locked
          this.#applyLockToFolderContents(currentFiles, updates, lockedFolder.path);
        }
      }

      if (Object.keys(updates).length > 0) {
        this.files.set({ ...currentFiles, ...updates });
      }

      const endTime = performance.now();
      logger.info(`Loaded locked items in ${Math.round(endTime - startTime)}ms`);
    } catch (error) {
      logger.error('Failed to load locked files from localStorage', error);
    }
  }

  /**
   * Apply a lock to all files within a folder
   * @param currentFiles Current file map
   * @param updates Updates to apply
   * @param folderPath Path of the folder to lock
   */
  #applyLockToFolderContents(currentFiles: FileMap, updates: FileMap, folderPath: string) {
    const folderPrefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;

    // Find all files that are within this folder
    Object.entries(currentFiles).forEach(([path, file]) => {
      if (path.startsWith(folderPrefix) && file) {
        if (file.type === 'file') {
          updates[path] = {
            ...file,
            isLocked: true,

            // Add a property to indicate this is locked by a parent folder
            lockedByFolder: folderPath,
          };
        } else if (file.type === 'folder') {
          updates[path] = {
            ...file,
            isLocked: true,

            // Add a property to indicate this is locked by a parent folder
            lockedByFolder: folderPath,
          };
        }
      }
    });
  }

  /**
   * Lock a file
   * @param filePath Path to the file to lock
   * @param chatId Optional chat ID (defaults to current chat)
   * @returns True if the file was successfully locked
   */
  lockFile(filePath: string, chatId?: string) {
    const file = this.getFile(filePath);
    const currentChatId = chatId || getCurrentChatId();

    if (!file) {
      logger.error(`Cannot lock non-existent file: ${filePath}`);
      return false;
    }

    // Update the file in the store
    this.files.setKey(filePath, {
      ...file,
      isLocked: true,
    });

    // Persist to localStorage with chat ID
    addLockedFile(currentChatId, filePath);

    logger.info(`File locked: ${filePath} for chat: ${currentChatId}`);

    return true;
  }

  /**
   * Lock a folder and all its contents
   * @param folderPath Path to the folder to lock
   * @param chatId Optional chat ID (defaults to current chat)
   * @returns True if the folder was successfully locked
   */
  lockFolder(folderPath: string, chatId?: string) {
    const folder = this.getFileOrFolder(folderPath);
    const currentFiles = this.files.get();
    const currentChatId = chatId || getCurrentChatId();

    if (!folder || folder.type !== 'folder') {
      logger.error(`Cannot lock non-existent folder: ${folderPath}`);
      return false;
    }

    const updates: FileMap = {};

    // Update the folder in the store
    updates[folderPath] = {
      type: folder.type,
      isLocked: true,
    };

    // Apply lock to all files within the folder
    this.#applyLockToFolderContents(currentFiles, updates, folderPath);

    // Update the store with all changes
    this.files.set({ ...currentFiles, ...updates });

    // Persist to localStorage with chat ID
    addLockedFolder(currentChatId, folderPath);

    logger.info(`Folder locked: ${folderPath} for chat: ${currentChatId}`);

    return true;
  }

  /**
   * Unlock a file
   * @param filePath Path to the file to unlock
   * @param chatId Optional chat ID (defaults to current chat)
   * @returns True if the file was successfully unlocked
   */
  unlockFile(filePath: string, chatId?: string) {
    const file = this.getFile(filePath);
    const currentChatId = chatId || getCurrentChatId();

    if (!file) {
      logger.error(`Cannot unlock non-existent file: ${filePath}`);
      return false;
    }

    // Update the file in the store
    this.files.setKey(filePath, {
      ...file,
      isLocked: false,
      lockedByFolder: undefined, // Clear the parent folder lock reference if it exists
    });

    // Remove from localStorage with chat ID
    removeLockedFile(currentChatId, filePath);

    logger.info(`File unlocked: ${filePath} for chat: ${currentChatId}`);

    return true;
  }

  /**
   * Unlock a folder and all its contents
   * @param folderPath Path to the folder to unlock
   * @param chatId Optional chat ID (defaults to current chat)
   * @returns True if the folder was successfully unlocked
   */
  unlockFolder(folderPath: string, chatId?: string) {
    const folder = this.getFileOrFolder(folderPath);
    const currentFiles = this.files.get();
    const currentChatId = chatId || getCurrentChatId();

    if (!folder || folder.type !== 'folder') {
      logger.error(`Cannot unlock non-existent folder: ${folderPath}`);
      return false;
    }

    const updates: FileMap = {};

    // Update the folder in the store
    updates[folderPath] = {
      type: folder.type,
      isLocked: false,
    };

    // Find all files that are within this folder and unlock them
    const folderPrefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;

    Object.entries(currentFiles).forEach(([path, file]) => {
      if (path.startsWith(folderPrefix) && file) {
        if (file.type === 'file' && file.lockedByFolder === folderPath) {
          updates[path] = {
            ...file,
            isLocked: false,
            lockedByFolder: undefined,
          };
        } else if (file.type === 'folder' && file.lockedByFolder === folderPath) {
          updates[path] = {
            type: file.type,
            isLocked: false,
            lockedByFolder: undefined,
          };
        }
      }
    });

    // Update the store with all changes
    this.files.set({ ...currentFiles, ...updates });

    // Remove from localStorage with chat ID
    removeLockedFolder(currentChatId, folderPath);

    logger.info(`Folder unlocked: ${folderPath} for chat: ${currentChatId}`);

    return true;
  }

  /**
   * Check if a file is locked
   * @param filePath Path to the file to check
   * @param chatId Optional chat ID (defaults to current chat)
   * @returns Object with locked status, lock mode, and what caused the lock
   */
  isFileLocked(filePath: string, chatId?: string): { locked: boolean; lockedBy?: string } {
    const file = this.getFile(filePath);
    const currentChatId = chatId || getCurrentChatId();

    if (!file) {
      return { locked: false };
    }

    // First check the in-memory state
    if (file.isLocked) {
      // If the file is locked by a folder, include that information
      if (file.lockedByFolder) {
        return {
          locked: true,
          lockedBy: file.lockedByFolder as string,
        };
      }

      return {
        locked: true,
        lockedBy: filePath,
      };
    }

    // Then check localStorage for direct file locks
    const lockedFiles = getLockedFilesForChat(currentChatId);
    const lockedFile = lockedFiles.find((item) => item.path === filePath);

    if (lockedFile) {
      // Update the in-memory state to match localStorage
      this.files.setKey(filePath, {
        ...file,
        isLocked: true,
      });

      return { locked: true, lockedBy: filePath };
    }

    // Finally, check if the file is in a locked folder
    const folderLockResult = this.isFileInLockedFolder(filePath, currentChatId);

    if (folderLockResult.locked) {
      // Update the in-memory state to reflect the folder lock
      this.files.setKey(filePath, {
        ...file,
        isLocked: true,
        lockedByFolder: folderLockResult.lockedBy,
      });

      return folderLockResult;
    }

    return { locked: false };
  }

  /**
   * Check if a file is within a locked folder
   * @param filePath Path to the file to check
   * @param chatId Optional chat ID (defaults to current chat)
   * @returns Object with locked status, lock mode, and the folder that caused the lock
   */
  isFileInLockedFolder(filePath: string, chatId?: string): { locked: boolean; lockedBy?: string } {
    const currentChatId = chatId || getCurrentChatId();

    // Use the optimized function from lockedFiles.ts
    return isPathInLockedFolder(currentChatId, filePath);
  }

  /**
   * Check if a folder is locked
   * @param folderPath Path to the folder to check
   * @param chatId Optional chat ID (defaults to current chat)
   * @returns Object with locked status and lock mode
   */
  isFolderLocked(folderPath: string, chatId?: string): { isLocked: boolean; lockedBy?: string } {
    const folder = this.getFileOrFolder(folderPath);
    const currentChatId = chatId || getCurrentChatId();

    if (!folder || folder.type !== 'folder') {
      return { isLocked: false };
    }

    // First check the in-memory state
    if (folder.isLocked) {
      return {
        isLocked: true,
        lockedBy: folderPath,
      };
    }

    // Then check localStorage for this specific chat
    const lockedFolders = getLockedFoldersForChat(currentChatId);
    const lockedFolder = lockedFolders.find((item) => item.path === folderPath);

    if (lockedFolder) {
      // Update the in-memory state to match localStorage
      this.files.setKey(folderPath, {
        type: folder.type,
        isLocked: true,
      });

      return { isLocked: true, lockedBy: folderPath };
    }

    return { isLocked: false };
  }

  getFile(filePath: string) {
    const dirent = this.files.get()[filePath];

    if (!dirent) {
      return undefined;
    }

    // For backward compatibility, only return file type dirents
    if (dirent.type !== 'file') {
      return undefined;
    }

    return dirent;
  }

  /**
   * Get any file or folder from the file system
   * @param path Path to the file or folder
   * @returns The file or folder, or undefined if it doesn't exist
   */
  getFileOrFolder(path: string) {
    return this.files.get()[path];
  }

  getFileModifications() {
    return computeFileModifications(this.files.get(), this.#modifiedFiles);
  }

  getModifiedFiles() {
    let modifiedFiles: { [path: string]: File } | undefined = undefined;

    for (const [filePath, originalContent] of this.#modifiedFiles) {
      const file = this.files.get()[filePath];

      if (file?.type !== 'file') {
        continue;
      }

      if (file.content === originalContent) {
        continue;
      }

      if (!modifiedFiles) {
        modifiedFiles = {};
      }

      modifiedFiles[filePath] = file;
    }

    return modifiedFiles;
  }

  resetFileModifications() {
    this.#modifiedFiles.clear();
  }

  async saveFile(filePath: string, content: string) {
    const sandbox = await this.#sandbox;

    try {
      const relativePath = toSandboxPath(filePath);

      const oldContent = this.getFile(filePath)?.content;

      if (!oldContent && oldContent !== '') {
        unreachable('Expected content to be defined');
      }

      await sandbox.files.write(relativePath, content);

      if (!this.#modifiedFiles.has(filePath)) {
        this.#modifiedFiles.set(filePath, oldContent);
      }

      // Get the current lock state before updating
      const currentFile = this.files.get()[filePath];
      const isLocked = currentFile?.type === 'file' ? currentFile.isLocked : false;

      // we immediately update the file and don't rely on file watching
      this.files.setKey(filePath, {
        type: 'file',
        content,
        isBinary: false,
        isLocked,
      });

      logger.info('File updated');
    } catch (error) {
      logger.error('Failed to update file content\n\n', error);
      throw error;
    }
  }

  async #setupDirectoryWatch() {
    try {
      const sandbox = await this.#sandbox;

      const basePath = '/home/project';

      // Set up watcher for the project directory
      await sandbox.files.watchDir(
        basePath,
        async (event: FilesystemEvent) => {
          if (this.#ignorePaths.some((path) => event.name.includes(path))) {
            return;
          }

          const path = event.name.startsWith(basePath) ? event.name : `${basePath}/${event.name}`;

          const isDirectory = event.type !== FilesystemEventType.WRITE && (await this.#isDirectory(sandbox, path));

          switch (event.type) {
            case FilesystemEventType.CREATE:
              if (isDirectory) {
                this.#handleDirCreate(path);
              } else {
                this.#handleFileCreate(path);
              }

              break;

            case FilesystemEventType.REMOVE:
              if (isDirectory) {
                this.#handleDirRemove(path);
              } else {
                this.#handleFileRemove(path);
              }

              break;
          }
        },
        {
          recursive: true,
          timeoutMs: 0,
        },
      );

      logger.info('Directory watcher set up for /home/project');
    } catch (error) {
      logger.error('Failed to set up directory watcher:', error);
    }
  }

  async #isDirectory(sandbox: Sandbox, path: string): Promise<boolean> {
    try {
      const info = await sandbox.files.getInfo(path);
      return info.type === FileType.DIR;
    } catch {
      return false;
    }
  }

  #wasDirectory(path: string): boolean {
    const item = this.files.get()[path];
    return item?.type === 'folder';
  }

  async #handleFileCreate(sandboxPath: string) {
    const filePath = this.#sandboxPathToStorePath(sandboxPath);
    await this.#loadSingleFile(filePath, sandboxPath);
    logger.debug(`File created: ${filePath}`);
  }

  async #handleFileWrite(sandboxPath: string) {
    const filePath = this.#sandboxPathToStorePath(sandboxPath);
    await this.#loadSingleFile(filePath, sandboxPath);
    logger.debug(`File updated: ${filePath}`);
  }

  #handleFileRemove(sandboxPath: string) {
    const filePath = this.#sandboxPathToStorePath(sandboxPath);

    const currentFile = this.files.get()[filePath];

    if (currentFile?.type === 'file') {
      this.#size--;
    }

    this.files.setKey(filePath, undefined);

    if (this.#modifiedFiles.has(filePath)) {
      this.#modifiedFiles.delete(filePath);
    }

    logger.debug(`File removed: ${filePath}`);
  }

  #handleDirCreate(sandboxPath: string) {
    const folderPath = this.#sandboxPathToStorePath(sandboxPath);
    this.files.setKey(folderPath, { type: 'folder' });
    logger.debug(`Directory created: ${folderPath}`);
  }

  #handleDirRemove(sandboxPath: string) {
    const folderPath = this.#sandboxPathToStorePath(sandboxPath);

    // Remove the folder and all its contents
    const allFiles = this.files.get();
    const updates: FileMap = {};

    updates[folderPath] = undefined;

    for (const [path, dirent] of Object.entries(allFiles)) {
      if (path.startsWith(folderPath + '/')) {
        updates[path] = undefined;

        if (dirent?.type === 'file') {
          this.#size--;

          if (this.#modifiedFiles.has(path)) {
            this.#modifiedFiles.delete(path);
          }
        }
      }
    }

    this.files.set({ ...allFiles, ...updates });
    logger.debug(`Directory removed: ${folderPath}`);
  }

  #sandboxPathToStorePath(sandboxPath: string): string {
    return sandboxPath;
  }

  async #loadSingleFile(filePath: string, sandboxPath: string) {
    try {
      const sandbox = await this.#sandbox;

      // Try to read as text first
      let content: string;
      let isBinary = false;

      try {
        content = await sandbox.files.read(sandboxPath);
        isBinary = this.#isBinaryContent(content);
      } catch (error) {
        // If text read fails, try as bytes
        try {
          const binaryContent = await sandbox.files.read(sandboxPath, { format: 'bytes' });
          content = Buffer.from(binaryContent).toString('base64');
          isBinary = true;
        } catch {
          // If both fail, skip this file
          logger.error(`Failed to read file ${filePath}:`, error);
          return;
        }
      }

      const currentFile = this.files.get()[filePath];
      const isLocked = currentFile?.type === 'file' ? currentFile.isLocked : false;

      // Check if this is a new file
      const wasNewFile = !currentFile;

      this.files.setKey(filePath, {
        type: 'file',
        content: isBinary ? content : content,
        isBinary,
        isLocked,
      });

      if (wasNewFile) {
        this.#size++;
      }
    } catch (error) {
      logger.error(`Failed to load file ${filePath}:`, error);
    }
  }

  async #loadFilesFromSandbox() {
    try {
      const sandbox = await this.#sandbox;
      await this.#scanDirectory(sandbox, '/home/project', '/home/project');
      logger.info(`Initial load: ${this.#size} files from sandbox`);
    } catch (error) {
      logger.error('Failed to load files from sandbox:', error);
    }
  }

  async #scanDirectory(sandbox: Sandbox, dirPath: string, basePath: string) {
    try {
      const entries = await sandbox.files.list(dirPath);

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = fullPath.replace(basePath, '').replace(/^\//, '');

        if (!relativePath) {
          continue;
        } // Skip root

        // Convert to the expected file path format
        const filePath = path.join('/home/project', relativePath);

        if (entry.type === FileType.DIR) {
          // Add folder to store
          this.files.setKey(filePath, { type: 'folder' });

          // Recursively scan subdirectory
          await this.#scanDirectory(sandbox, fullPath, basePath);
        } else {
          // Try to read file content
          let content: string;
          let isBinary = false;

          try {
            content = await sandbox.files.read(fullPath);
            isBinary = this.#isBinaryContent(content);
          } catch (error) {
            // If text read fails, try as bytes
            try {
              const binaryContent = await sandbox.files.read(fullPath, { format: 'bytes' });
              content = Buffer.from(binaryContent).toString('base64');
              isBinary = true;
            } catch {
              // Skip files we can't read
              logger.warn(`Failed to read file ${fullPath}:`, error);
              continue;
            }
          }

          this.files.setKey(filePath, {
            type: 'file',
            content,
            isBinary,
          });

          this.#size++;
        }
      }
    } catch (error) {
      logger.error(`Failed to scan directory ${dirPath}:`, error);
    }
  }

  #isBinaryContent(content: string): boolean {
    if (typeof content !== 'string') {
      return true;
    }

    // Check for null bytes (strong indicator of binary)
    if (content.includes('\0')) {
      return true;
    }

    // Check for high percentage of non-printable characters
    let printableCount = 0;
    const totalChars = Math.min(content.length, 8192); // Check first 8KB only for performance

    for (let i = 0; i < totalChars; i++) {
      const code = content.charCodeAt(i);

      // Printable ASCII (32-126) + common whitespace (9,10,13)
      if ((code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13) {
        printableCount++;
      }
    }

    // If less than 70% printable characters, consider it binary
    return printableCount / totalChars < 0.7;
  }

  async #init() {
    // Clean up any files that were previously deleted
    this.#cleanupDeletedFiles();

    // Set up directory watching for real-time file updates
    await this.#setupDirectoryWatch();

    // Get the current chat ID
    const currentChatId = getCurrentChatId();

    // Migrate any legacy locks to the current chat
    migrateLegacyLocks(currentChatId);

    // Load locked files immediately for the current chat
    this.#loadLockedFiles(currentChatId);

    /**
     * Also set up a timer to load locked files again after a delay.
     * This ensures that locks are applied even if files are loaded asynchronously.
     */
    setTimeout(() => {
      this.#loadLockedFiles(currentChatId);
    }, 2000);

    /**
     * Set up a less frequent periodic check to ensure locks remain applied.
     * This is now less critical since we have the storage event listener.
     */
    setInterval(() => {
      // Clear the cache to force a fresh read from localStorage
      clearCache();

      const latestChatId = getCurrentChatId();
      this.#loadLockedFiles(latestChatId);
    }, 30000); // Reduced from 10s to 30s
  }

  /**
   * Removes any deleted files/folders from the store
   */
  #cleanupDeletedFiles() {
    if (this.#deletedPaths.size === 0) {
      return;
    }

    const currentFiles = this.files.get();
    const pathsToDelete = new Set<string>();

    // Precompute prefixes for efficient checking
    const deletedPrefixes = [...this.#deletedPaths].map((p) => p + '/');

    // Iterate through all current files/folders once
    for (const [path, dirent] of Object.entries(currentFiles)) {
      // Skip if dirent is already undefined (shouldn't happen often but good practice)
      if (!dirent) {
        continue;
      }

      // Check for exact match in deleted paths
      if (this.#deletedPaths.has(path)) {
        pathsToDelete.add(path);
        continue; // No need to check prefixes if it's an exact match
      }

      // Check if the path starts with any of the deleted folder prefixes
      for (const prefix of deletedPrefixes) {
        if (path.startsWith(prefix)) {
          pathsToDelete.add(path);
          break; // Found a match, no need to check other prefixes for this path
        }
      }
    }

    // Perform the deletions and updates based on the collected paths
    if (pathsToDelete.size > 0) {
      const updates: FileMap = {};

      for (const pathToDelete of pathsToDelete) {
        const dirent = currentFiles[pathToDelete];
        updates[pathToDelete] = undefined; // Mark for deletion in the map update

        if (dirent?.type === 'file') {
          this.#size--;

          if (this.#modifiedFiles.has(pathToDelete)) {
            this.#modifiedFiles.delete(pathToDelete);
          }
        }
      }

      // Apply all deletions to the store at once for potential efficiency
      this.files.set({ ...currentFiles, ...updates });
    }
  }

  async createFile(filePath: string, content: string | Uint8Array = '') {
    const sandbox = await this.#sandbox;

    try {
      console.log('Creating file: ', filePath);

      const relativePath = toSandboxPath(filePath);
      const dirPath = path.dirname(relativePath);

      if (dirPath !== '.') {
        await sandbox.files.makeDir(dirPath);
      }

      const isBinary = content instanceof Uint8Array;

      if (isBinary) {
        // E2B handles binary content differently
        const buffer = Buffer.from(content);
        console.log('Writing binary file: ', relativePath);
        await sandbox.files.write(relativePath, buffer.buffer);

        const base64Content = buffer.toString('base64');
        this.files.setKey(filePath, {
          type: 'file',
          content: base64Content,
          isBinary: true,
          isLocked: false,
        });

        this.#modifiedFiles.set(filePath, base64Content);
      } else {
        const contentToWrite = (content as string).length === 0 ? ' ' : content;
        console.log('Writing text file: ', relativePath);
        await sandbox.files.write(relativePath, contentToWrite);

        this.files.setKey(filePath, {
          type: 'file',
          content: content as string,
          isBinary: false,
          isLocked: false,
        });

        this.#modifiedFiles.set(filePath, content as string);
      }

      logger.info(`File created: ${filePath}`);

      return true;
    } catch (error) {
      logger.error('Failed to create file\n\n', error);
      throw error;
    }
  }

  async createFolder(folderPath: string) {
    const sandbox = await this.#sandbox;

    try {
      const relativePath = toSandboxPath(folderPath);
      await sandbox.files.makeDir(relativePath);

      this.files.setKey(folderPath, { type: 'folder' });

      logger.info(`Folder created: ${folderPath}`);

      return true;
    } catch (error) {
      logger.error('Failed to create folder\n\n', error);
      throw error;
    }
  }

  async deleteFile(filePath: string) {
    const sandbox = await this.#sandbox;

    try {
      const relativePath = toSandboxPath(filePath);
      await sandbox.files.remove(relativePath);

      this.#deletedPaths.add(filePath);

      this.files.setKey(filePath, undefined);
      this.#size--;

      if (this.#modifiedFiles.has(filePath)) {
        this.#modifiedFiles.delete(filePath);
      }

      this.#persistDeletedPaths();

      logger.info(`File deleted: ${filePath}`);

      return true;
    } catch (error) {
      logger.error('Failed to delete file\n\n', error);
      throw error;
    }
  }

  async deleteFolder(folderPath: string) {
    const sandbox = await this.#sandbox;

    try {
      const relativePath = toSandboxPath(folderPath);
      await sandbox.files.remove(relativePath);

      this.#deletedPaths.add(folderPath);

      this.files.setKey(folderPath, undefined);

      const allFiles = this.files.get();

      for (const [path, dirent] of Object.entries(allFiles)) {
        if (path.startsWith(folderPath + '/')) {
          this.files.setKey(path, undefined);

          this.#deletedPaths.add(path);

          if (dirent?.type === 'file') {
            this.#size--;
          }

          if (dirent?.type === 'file' && this.#modifiedFiles.has(path)) {
            this.#modifiedFiles.delete(path);
          }
        }
      }

      this.#persistDeletedPaths();

      logger.info(`Folder deleted: ${folderPath}`);

      return true;
    } catch (error) {
      logger.error('Failed to delete folder\n\n', error);
      throw error;
    }
  }

  // method to persist deleted paths to localStorage
  #persistDeletedPaths() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bolt-deleted-paths', JSON.stringify([...this.#deletedPaths]));
      }
    } catch (error) {
      logger.error('Failed to persist deleted paths to localStorage', error);
    }
  }
}
