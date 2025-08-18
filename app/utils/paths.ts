import { path } from '~/utils/path';
import { WORK_DIR } from '~/utils/constants';

/**
 * Convert file path to sandbox-relative path
 * @param filePath Relative path like 'src/App.tsx' or absolute path like '/home/project/src/App.tsx'
 * @returns Relative path like 'src/App.tsx'
 */
export function toSandboxPath(filePath: string): string {
  // If already absolute, return as-is
  if (filePath.startsWith('/') && filePath.startsWith(WORK_DIR)) {
    return filePath;
  }

  const absolutePath = path.join(WORK_DIR, filePath);

  if (absolutePath.startsWith('..')) {
    throw new Error(`Invalid path: ${filePath} resolves outside working directory`);
  }

  return absolutePath;
}

/**
 * Convert sandbox-relative path to absolute path
 * @param relativePath Relative path like 'src/App.tsx'
 * @returns Absolute path like '/home/project/src/App.tsx'
 */
export function fromSandboxPath(relativePath: string): string {
  return path.join(WORK_DIR, relativePath);
}

/**
 * Validate that a path is within the working directory
 * @param filePath Path to validate
 * @returns True if path is valid
 */
export function isValidPath(filePath: string): boolean {
  try {
    toSandboxPath(filePath);
    return true;
  } catch {
    return false;
  }
}
