import type { Sandbox } from 'e2b';
import { FileType } from 'e2b';
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { sandbox as sandboxPromise } from '~/lib/e2b';
import git, { type GitAuth, type PromiseFsClient } from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';
import { WORK_DIR } from '~/utils/constants';
import { logger } from '~/utils/logger';

const lookupSavedPassword = (url: string) => {
  const domain = url.split('/')[2];
  const gitCreds = Cookies.get(`git:${domain}`);

  if (!gitCreds) {
    return null;
  }

  try {
    const { username, password } = JSON.parse(gitCreds || '{}');
    return { username, password };
  } catch (error) {
    console.log(`Failed to parse Git Cookie ${error}`);
    return null;
  }
};

const saveGitAuth = (url: string, auth: GitAuth) => {
  const domain = url.split('/')[2];
  Cookies.set(`git:${domain}`, JSON.stringify(auth));
};

export function useGit() {
  const [ready, setReady] = useState(false);
  const [sandbox, setSandbox] = useState<Sandbox>();
  const [fs, setFs] = useState<PromiseFsClient>();
  const fileData = useRef<Record<string, { data: any; encoding?: string }>>({});
  useEffect(() => {
    sandboxPromise.then((container) => {
      fileData.current = {};
      setSandbox(container);
      setFs(getFs(container, fileData));
      setReady(true);
    });
  }, []);

  const gitClone = useCallback(
    async (url: string, retryCount = 0) => {
      if (!sandbox || !fs || !ready) {
        throw new Error('Sandbox not initialized. Please try again later.');
      }

      fileData.current = {};

      /*
       * Skip Git initialization for now - let isomorphic-git handle it
       * This avoids potential issues with our manual initialization
       */

      const headers: {
        [x: string]: string;
      } = {
        'User-Agent': 'modern-git',
      };

      const auth = lookupSavedPassword(url);

      if (auth) {
        headers.Authorization = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`;
      }

      try {
        // Add a small delay before retrying to allow for network recovery
        if (retryCount > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
          console.log(`Retrying git clone (attempt ${retryCount + 1})...`);
        }

        await git.clone({
          fs,
          http,
          dir: WORK_DIR,
          url,
          depth: 1,
          singleBranch: true,
          corsProxy: '/api/git-proxy',
          headers,
          onProgress: (event) => {
            console.log('Git clone progress:', event);
          },
          onAuth: (url) => {
            let auth = lookupSavedPassword(url);

            if (auth) {
              console.log('Using saved authentication for', url);
              return auth;
            }

            console.log('Repository requires authentication:', url);

            if (confirm('This repository requires authentication. Would you like to enter your GitHub credentials?')) {
              auth = {
                username: prompt('Enter username') || '',
                password: prompt('Enter password or personal access token') || '',
              };
              return auth;
            } else {
              return { cancel: true };
            }
          },
          onAuthFailure: (url, _auth) => {
            console.error(`Authentication failed for ${url}`);
            toast.error(`Authentication failed for ${url.split('/')[2]}. Please check your credentials and try again.`);
            throw new Error(
              `Authentication failed for ${url.split('/')[2]}. Please check your credentials and try again.`,
            );
          },
          onAuthSuccess: (url, auth) => {
            console.log(`Authentication successful for ${url}`);
            saveGitAuth(url, auth);
          },
        });

        const data: Record<string, { data: any; encoding?: string }> = {};

        for (const [key, value] of Object.entries(fileData.current)) {
          data[key] = value;
        }

        return { workdir: WORK_DIR, data };
      } catch (error) {
        console.error('Git clone error:', error);

        // Handle specific error types
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check for common error patterns
        if (errorMessage.includes('Authentication failed')) {
          toast.error(`Authentication failed. Please check your GitHub credentials and try again.`);
          throw error;
        } else if (
          errorMessage.includes('ENOTFOUND') ||
          errorMessage.includes('ETIMEDOUT') ||
          errorMessage.includes('ECONNREFUSED')
        ) {
          toast.error(`Network error while connecting to repository. Please check your internet connection.`);

          // Retry for network errors, up to 3 times
          if (retryCount < 3) {
            return gitClone(url, retryCount + 1);
          }

          throw new Error(
            `Failed to connect to repository after multiple attempts. Please check your internet connection.`,
          );
        } else if (errorMessage.includes('404')) {
          toast.error(`Repository not found. Please check the URL and make sure the repository exists.`);
          throw new Error(`Repository not found. Please check the URL and make sure the repository exists.`);
        } else if (errorMessage.includes('401')) {
          toast.error(`Unauthorized access to repository. Please connect your GitHub account with proper permissions.`);
          throw new Error(
            `Unauthorized access to repository. Please connect your GitHub account with proper permissions.`,
          );
        } else {
          toast.error(`Failed to clone repository: ${errorMessage}`);
          throw error;
        }
      }
    },
    [sandbox, fs, ready],
  );

  return { ready, gitClone };
}

const getFs = (sandbox: Sandbox, record: MutableRefObject<Record<string, { data: any; encoding?: string }>>) => ({
  promises: {
    readFile: async (gitPath: string, options: any) => {
      const encoding = options?.encoding;

      logger.debug('@@@@@@@@@@@@ Reading file:', gitPath, 'with encoding:', encoding);

      // Check if gitPath is valid
      if (!gitPath || typeof gitPath !== 'string') {
        const fsError = new Error(`EINVAL: invalid argument, open '${gitPath}'`) as NodeJS.ErrnoException;
        fsError.code = 'EINVAL';
        fsError.errno = -22;
        fsError.syscall = 'open';
        fsError.path = gitPath;
        throw fsError;
      }

      try {
        // Git pack files and other binary files need to be read as bytes
        const isBinaryFile =
          gitPath.includes('.pack') || gitPath.includes('.idx') || gitPath.includes('objects/') || encoding === null;

        if (isBinaryFile || encoding === null) {
          // Read as binary for pack files and when no encoding specified
          const binaryData = await sandbox.files.read(gitPath, { format: 'bytes' });
          return new Uint8Array(binaryData);
        }

        // For text files, read as text
        const result = await sandbox.files.read(gitPath);

        // Handle encoding if specified
        if (encoding === 'utf8' || !encoding) {
          return result;
        } else if (encoding === 'base64') {
          return Buffer.from(result).toString('base64');
        } else {
          // For other encodings, return as buffer
          return Buffer.from(result);
        }
      } catch (error) {
        logger.debug('Failed to read file:', error);

        // Convert e2b errors to Node.js fs errors for compatibility
        const fsError = new Error(`ENOENT: no such file or directory, open '${gitPath}'`) as NodeJS.ErrnoException;
        fsError.code = 'ENOENT';
        fsError.errno = -2;
        fsError.syscall = 'open';
        fsError.path = gitPath;
        throw fsError;
      }
    },
    writeFile: async (gitPath: string, data: any, options: any = {}) => {
      logger.debug('@@@@@@@@@@@@ Writing file: ', gitPath);

      if (record.current) {
        record.current[gitPath] = { data, encoding: options?.encoding };
      }

      try {
        // Ensure parent directory exists
        const parentDir = pathUtils.dirname(gitPath);

        if (parentDir && parentDir !== '.' && parentDir !== '/') {
          try {
            await sandbox.files.makeDir(parentDir);
          } catch (error: any) {
            /*
             * Ignore error if directory already exists (409 Conflict)
             * e2b throws 409 when directory exists, which is fine
             */
            if (!error.message?.includes('Conflict') && !error.message?.includes('already exists')) {
              logger.debug('makeDir failed with non-conflict error:', error);
            }
          }
        }

        // Handle different data types
        if (data instanceof Uint8Array) {
          // For binary data, convert to buffer and write
          await sandbox.files.write(gitPath, Buffer.from(data).buffer);
        } else if (typeof data === 'string') {
          // For text data, write directly
          await sandbox.files.write(gitPath, data);
        } else {
          // For other types, convert to string
          await sandbox.files.write(gitPath, String(data));
        }

        return;
      } catch (error) {
        throw error;
      }
    },
    mkdir: async (gitPath: string, _options: any) => {
      logger.debug('@@@@@@@@@@@@ Creating directory: ', gitPath);

      try {
        // e2b makeDir is recursive by default
        await sandbox.files.makeDir(gitPath);
        return;
      } catch (error) {
        throw error;
      }
    },
    readdir: async (gitPath: string, options: any) => {
      logger.debug('@@@@@@@@@@@@ Reading directory: ', gitPath);

      try {
        const entries = await sandbox.files.list(gitPath);

        // Return just the names (like Node.js fs.readdir by default)
        if (options?.withFileTypes) {
          // Return entries with type information
          return entries.map((entry) => ({
            name: entry.name,
            isFile: () => entry.type !== FileType.DIR,
            isDirectory: () => entry.type === FileType.DIR,
            isSymbolicLink: () => false,
          }));
        } else {
          // Return just names
          return entries.map((entry) => entry.name);
        }
      } catch (error) {
        throw error;
      }
    },
    rm: async (gitPath: string, _options: any) => {
      logger.debug('@@@@@@@@@@@@ Removing file: ', gitPath);

      try {
        //await sandbox.files.remove(gitPath);
        return;
      } catch (error) {
        throw error;
      }
    },
    rmdir: async (gitPath: string, _options: any) => {
      logger.debug('@@@@@@@@@@@@ Removing directory: ', gitPath);

      try {
        //await sandbox.files.remove(gitPath);
        return;
      } catch (error) {
        throw error;
      }
    },
    unlink: async (gitPath: string) => {
      logger.debug('@@@@@@@@@@@@ Removing file: ', gitPath);

      try {
        await sandbox.files.remove(gitPath);
        return;
      } catch (error) {
        throw error;
      }
    },
    stat: async (gitPath: string) => {
      logger.debug('@@@@@@@@@@@@ Stat file: ', gitPath);

      try {
        // Special handling for .git/index file
        if (gitPath === `${WORK_DIR}/.git/index`) {
          return {
            isFile: () => true,
            isDirectory: () => false,
            isSymbolicLink: () => false,
            size: 12, // Size of our empty index
            mode: 0o100644, // Regular file
            mtimeMs: Date.now(),
            ctimeMs: Date.now(),
            birthtimeMs: Date.now(),
            atimeMs: Date.now(),
            uid: 1000,
            gid: 1000,
            dev: 1,
            ino: 1,
            nlink: 1,
            rdev: 0,
            blksize: 4096,
            blocks: 1,
            mtime: new Date(),
            ctime: new Date(),
            birthtime: new Date(),
            atime: new Date(),
          };
        }

        const info = await sandbox.files.getInfo(gitPath);
        const isDirectory = info.type === FileType.DIR;

        return {
          isFile: () => !isDirectory,
          isDirectory: () => isDirectory,
          isSymbolicLink: () => false,
          size: isDirectory ? 4096 : info.size || 1,
          mode: isDirectory ? 0o040755 : 0o100644, // Directory or regular file
          mtimeMs: Date.now(),
          ctimeMs: Date.now(),
          birthtimeMs: Date.now(),
          atimeMs: Date.now(),
          uid: 1000,
          gid: 1000,
          dev: 1,
          ino: 1,
          nlink: 1,
          rdev: 0,
          blksize: 4096,
          blocks: Math.ceil((info.size || 1) / 512),
          mtime: new Date(),
          ctime: new Date(),
          birthtime: new Date(),
          atime: new Date(),
        };
      } catch (error: any) {
        logger.debug('Failed to stat file:', error);

        // Convert e2b errors to Node.js fs errors
        const err = new Error(`ENOENT: no such file or directory, stat '${gitPath}'`) as NodeJS.ErrnoException;
        err.code = 'ENOENT';
        err.errno = -2;
        err.syscall = 'stat';
        err.path = gitPath;
        throw err;
      }
    },
    lstat: async (gitPath: string) => {
      return await getFs(sandbox, record).promises.stat(gitPath);
    },
    readlink: async (gitPath: string) => {
      throw new Error(`EINVAL: invalid argument, readlink '${gitPath}'`);
    },
    symlink: async (target: string, gitPath: string) => {
      /*
       * Since E2B Sandbox doesn't support symlinks,
       * we'll throw a "operation not supported" error
       */
      throw new Error(`EPERM: operation not permitted, symlink '${target}' -> '${gitPath}'`);
    },

    chmod: async (_gitPath: string, _mode: number) => {
      /*
       * E2B Sandbox doesn't support changing permissions,
       * but we can pretend it succeeded for compatibility
       */
      return await Promise.resolve();
    },
  },
});

const pathUtils = {
  dirname: (path: string) => {
    // Handle empty or just filename cases
    if (!path || !path.includes('/')) {
      return '.';
    }

    // Remove trailing slashes
    path = path.replace(/\/+$/, '');

    // Get directory part
    return path.split('/').slice(0, -1).join('/') || '/';
  },

  basename: (path: string, ext?: string) => {
    // Remove trailing slashes
    path = path.replace(/\/+$/, '');

    // Get the last part of the path
    const base = path.split('/').pop() || '';

    // If extension is provided, remove it from the result
    if (ext && base.endsWith(ext)) {
      return base.slice(0, -ext.length);
    }

    return base;
  },
  relative: (from: string, to: string): string => {
    // Handle empty inputs
    if (!from || !to) {
      return '.';
    }

    // Normalize paths by removing trailing slashes and splitting
    const normalizePathParts = (p: string) => p.replace(/\/+$/, '').split('/').filter(Boolean);

    const fromParts = normalizePathParts(from);
    const toParts = normalizePathParts(to);

    // Find common parts at the start of both paths
    let commonLength = 0;
    const minLength = Math.min(fromParts.length, toParts.length);

    for (let i = 0; i < minLength; i++) {
      if (fromParts[i] !== toParts[i]) {
        break;
      }

      commonLength++;
    }

    // Calculate the number of "../" needed
    const upCount = fromParts.length - commonLength;

    // Get the remaining path parts we need to append
    const remainingPath = toParts.slice(commonLength);

    // Construct the relative path
    const relativeParts = [...Array(upCount).fill('..'), ...remainingPath];

    // Handle empty result case
    return relativeParts.length === 0 ? '.' : relativeParts.join('/');
  },
};
