import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { Octokit } from '@octokit/rest';

// Internal imports
import { getLocalStorage } from '~/lib/persistence';
import { cn } from '~/utils/cn';
import type { GitHubUserResponse } from '~/types/GitHub';
import { logStore } from '~/lib/stores/logs';
import { workbenchStore } from '~/lib/stores/workbench';
import { extractRelativePath } from '~/utils/diff';
import { formatSize } from '~/utils/formatSize';
import type { FileMap, File } from '~/lib/stores/files';

// UI Components
import { Badge, EmptyState, StatusIndicator, SearchInput } from '~/components/ui';

interface PushToGitHubDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPush: (repoName: string, username?: string, token?: string, isPrivate?: boolean) => Promise<string>;
}

interface GitHubRepo {
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  updated_at: string;
  language: string;
  private: boolean;
}

export function PushToGitHubDialog({ isOpen, onClose, onPush }: PushToGitHubDialogProps) {
  const [repoName, setRepoName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<GitHubUserResponse | null>(null);
  const [recentRepos, setRecentRepos] = useState<GitHubRepo[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([]);
  const [repoSearchQuery, setRepoSearchQuery] = useState('');
  const [isFetchingRepos, setIsFetchingRepos] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdRepoUrl, setCreatedRepoUrl] = useState('');
  const [pushedFiles, setPushedFiles] = useState<{ path: string; size: number }[]>([]);

  // Load GitHub connection on mount
  useEffect(() => {
    if (isOpen) {
      const connection = getLocalStorage('github_connection');

      if (connection?.user && connection?.token) {
        setUser(connection.user);

        // Only fetch if we have both user and token
        if (connection.token.trim()) {
          fetchRecentRepos(connection.token);
        }
      }
    }
  }, [isOpen]);

  /*
   * Filter repositories based on search query
   * const debouncedSetRepoSearchQuery = useDebouncedCallback((value: string) => setRepoSearchQuery(value), 300);
   */

  useEffect(() => {
    if (recentRepos.length === 0) {
      setFilteredRepos([]);
      return;
    }

    if (!repoSearchQuery.trim()) {
      setFilteredRepos(recentRepos);
      return;
    }

    const query = repoSearchQuery.toLowerCase().trim();
    const filtered = recentRepos.filter(
      (repo) =>
        repo.name.toLowerCase().includes(query) ||
        (repo.description && repo.description.toLowerCase().includes(query)) ||
        (repo.language && repo.language.toLowerCase().includes(query)),
    );

    setFilteredRepos(filtered);
  }, [recentRepos, repoSearchQuery]);

  const fetchRecentRepos = useCallback(async (token: string) => {
    if (!token) {
      logStore.logError('No GitHub token available');
      toast.error('GitHub authentication required');

      return;
    }

    try {
      setIsFetchingRepos(true);
      console.log('Fetching GitHub repositories with token:', token.substring(0, 5) + '...');

      // Fetch ALL repos by paginating through all pages
      let allRepos: GitHubRepo[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const requestUrl = `https://api.github.com/user/repos?sort=updated&per_page=100&page=${page}&affiliation=owner,organization_member`;
        const response = await fetch(requestUrl, {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `Bearer ${token.trim()}`,
          },
        });

        if (!response.ok) {
          let errorData: { message?: string } = {};

          try {
            errorData = await response.json();
            console.error('Error response data:', errorData);
          } catch (e) {
            errorData = { message: 'Could not parse error response' };
            console.error('Could not parse error response:', e);
          }

          if (response.status === 401) {
            toast.error('GitHub token expired. Please reconnect your account.');

            // Clear invalid token
            const connection = getLocalStorage('github_connection');

            if (connection) {
              localStorage.removeItem('github_connection');
              setUser(null);
            }
          } else if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
            // Rate limit exceeded
            const resetTime = response.headers.get('x-ratelimit-reset');
            const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000).toLocaleTimeString() : 'soon';
            toast.error(`GitHub API rate limit exceeded. Limit resets at ${resetDate}`);
          } else {
            logStore.logError('Failed to fetch GitHub repositories', {
              status: response.status,
              statusText: response.statusText,
              error: errorData,
            });
            toast.error(`Failed to fetch repositories: ${errorData.message || response.statusText}`);
          }

          return;
        }

        try {
          const repos = (await response.json()) as GitHubRepo[];
          allRepos = allRepos.concat(repos);

          if (repos.length < 100) {
            hasMore = false;
          } else {
            page += 1;
          }
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          logStore.logError('Failed to parse GitHub repositories response', { parseError });
          toast.error('Failed to parse repository data');
          setRecentRepos([]);

          return;
        }
      }
      setRecentRepos(allRepos);
    } catch (error) {
      console.error('Exception while fetching GitHub repositories:', error);
      logStore.logError('Failed to fetch GitHub repositories', { error });
      toast.error('Failed to fetch recent repositories');
    } finally {
      setIsFetchingRepos(false);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const connection = getLocalStorage('github_connection');

    if (!connection?.token || !connection?.user) {
      toast.error('Please connect your GitHub account in Settings > Connections first');
      return;
    }

    if (!repoName.trim()) {
      toast.error('Repository name is required');
      return;
    }

    setIsLoading(true);

    try {
      // Check if repository exists first
      const octokit = new Octokit({ auth: connection.token });

      try {
        const { data: existingRepo } = await octokit.repos.get({
          owner: connection.user.login,
          repo: repoName,
        });

        // If we get here, the repo exists
        let confirmMessage = `Repository "${repoName}" already exists. Do you want to update it? This will add or modify files in the repository.`;

        // Add visibility change warning if needed
        if (existingRepo.private !== isPrivate) {
          const visibilityChange = isPrivate
            ? 'This will also change the repository from public to private.'
            : 'This will also change the repository from private to public.';

          confirmMessage += `\n\n${visibilityChange}`;
        }

        const confirmOverwrite = window.confirm(confirmMessage);

        if (!confirmOverwrite) {
          setIsLoading(false);
          return;
        }
      } catch (error) {
        // 404 means repo doesn't exist, which is what we want for new repos
        if (error instanceof Error && 'status' in error && error.status !== 404) {
          throw error;
        }
      }

      const repoUrl = await onPush(repoName, connection.user.login, connection.token, isPrivate);
      setCreatedRepoUrl(repoUrl);

      // Get list of pushed files
      const files = workbenchStore.files.get();
      const filesList = Object.entries(files as FileMap)
        .filter(([, dirent]) => dirent?.type === 'file' && !dirent.isBinary)
        .map(([path, dirent]) => ({
          path: extractRelativePath(path),
          size: new TextEncoder().encode((dirent as File).content || '').length,
        }));

      setPushedFiles(filesList);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error pushing to GitHub:', error);
      toast.error('Failed to push to GitHub. Please check your repository name and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const handleClose = () => {
    setRepoName('');
    setIsPrivate(false);
    setShowSuccessDialog(false);
    setCreatedRepoUrl('');
    onClose();
  };

  // Success Dialog
  if (showSuccessDialog) {
    return (
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-9999 bg-black/50 backdrop-blur-xs" />
          <div className="fixed inset-0 z-9999 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="max-h-[85vh] w-[90vw] overflow-y-auto md:w-[600px]"
            >
              <Dialog.Content
                className="dark:bg-bolt-elements-background-depth-1 border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark rounded-lg border bg-white shadow-xl"
                aria-describedby="success-dialog-description"
              >
                <div className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
                        <div className="i-ph:check-circle h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="dark:text-bolt-elements-textPrimary-dark text-lg font-medium text-black">
                          Successfully pushed to GitHub
                        </h3>
                        <p
                          id="success-dialog-description"
                          className="text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark text-sm"
                        >
                          Your code is now available on GitHub
                        </p>
                      </div>
                    </div>
                    <Dialog.Close asChild>
                      <button
                        onClick={handleClose}
                        className="text-bolt-elements-text-tertiary dark:text-bolt-elements-textTertiary-dark dark:hover:text-bolt-elements-textPrimary-dark hover:bg-bolt-elements-background-depth-2 dark:hover:bg-darken-50 focus:ring-bolt-elements-border-color dark:focus:ring-bolt-elements-borderColor-dark rounded-lg bg-transparent p-2 transition-all duration-200 ease-in-out hover:text-black focus:ring-2 focus:outline-hidden"
                      >
                        <span className="i-ph:x block h-5 w-5" aria-hidden="true" />
                        <span className="sr-only">Close dialog</span>
                      </button>
                    </Dialog.Close>
                  </div>

                  <div className="bg-bolt-elements-background-depth-2 dark:bg-darken-50 border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark rounded-lg border p-4 text-left">
                    <p className="dark:text-bolt-elements-textPrimary-dark mb-2 flex items-center gap-2 text-sm font-medium text-black">
                      <span className="i-ph:github-logo h-4 w-4 text-purple-500" />
                      Repository URL
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-4 border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark dark:text-bolt-elements-textPrimary-dark flex-1 rounded-sm border px-3 py-2 font-mono text-sm text-black">
                        {createdRepoUrl}
                      </code>
                      <motion.button
                        onClick={() => {
                          navigator.clipboard.writeText(createdRepoUrl);
                          toast.success('URL copied to clipboard');
                        }}
                        className="text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark dark:hover:text-bolt-elements-textPrimary-dark bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-4 border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark rounded-lg border p-2 hover:text-black"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="i-ph:copy h-4 w-4" />
                      </motion.button>
                    </div>
                  </div>

                  <div className="bg-bolt-elements-background-depth-2 dark:bg-darken-50 border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark rounded-lg border p-4">
                    <p className="dark:text-bolt-elements-textPrimary-dark mb-2 flex items-center gap-2 text-sm font-medium text-black">
                      <span className="i-ph:files h-4 w-4 text-purple-500" />
                      Pushed Files ({pushedFiles.length})
                    </p>
                    <div className="custom-scrollbar max-h-[200px] overflow-y-auto pr-2">
                      {pushedFiles.map((file) => (
                        <div
                          key={file.path}
                          className="dark:text-bolt-elements-textPrimary-dark border-bolt-elements-border-color/30 dark:border-bolt-elements-borderColor-dark/30 flex items-center justify-between border-b py-1.5 text-sm text-black last:border-0"
                        >
                          <span className="flex-1 truncate font-mono text-xs">{file.path}</span>
                          <span className="bg-darken-50 dark:bg-bolt-elements-background-depth-4 text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark ml-2 rounded-full px-2 py-0.5 text-xs">
                            {formatSize(file.size)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <motion.a
                      href={createdRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm text-white hover:bg-purple-600"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="i-ph:github-logo h-4 w-4" />
                      View Repository
                    </motion.a>
                    <motion.button
                      onClick={() => {
                        navigator.clipboard.writeText(createdRepoUrl);
                        toast.success('URL copied to clipboard');
                      }}
                      className="bg-bolt-elements-background-depth-2 dark:bg-darken-50 text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark hover:bg-darken-50 dark:hover:bg-bolt-elements-background-depth-4 border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="i-ph:copy h-4 w-4" />
                      Copy URL
                    </motion.button>
                    <motion.button
                      onClick={handleClose}
                      className="bg-bolt-elements-background-depth-2 dark:bg-darken-50 text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark hover:bg-darken-50 dark:hover:bg-bolt-elements-background-depth-4 border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark rounded-lg border px-4 py-2 text-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Close
                    </motion.button>
                  </div>
                </div>
              </Dialog.Content>
            </motion.div>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  if (!user) {
    return (
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-9999 bg-black/50 backdrop-blur-xs" />
          <div className="fixed inset-0 z-9999 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-[90vw] md:w-[500px]"
            >
              <Dialog.Content
                className="dark:bg-bolt-elements-background-depth-1 border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark rounded-lg border bg-white p-6 shadow-xl"
                aria-describedby="connection-required-description"
              >
                <div className="relative space-y-4 text-center">
                  <Dialog.Close asChild>
                    <button
                      onClick={handleClose}
                      className="text-bolt-elements-text-tertiary dark:text-bolt-elements-textTertiary-dark dark:hover:text-bolt-elements-textPrimary-dark hover:bg-bolt-elements-background-depth-2 dark:hover:bg-darken-50 focus:ring-bolt-elements-border-color dark:focus:ring-bolt-elements-borderColor-dark absolute top-0 right-0 rounded-lg bg-transparent p-2 transition-all duration-200 ease-in-out hover:text-black focus:ring-2 focus:outline-hidden"
                    >
                      <span className="i-ph:x block h-5 w-5" aria-hidden="true" />
                      <span className="sr-only">Close dialog</span>
                    </button>
                  </Dialog.Close>
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-darken-50 mx-auto flex h-16 w-16 items-center justify-center rounded-xl text-purple-500"
                  >
                    <div className="i-ph:github-logo h-8 w-8" />
                  </motion.div>
                  <h3 className="dark:text-bolt-elements-textPrimary-dark text-lg font-medium text-black">
                    GitHub Connection Required
                  </h3>
                  <p
                    id="connection-required-description"
                    className="text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark mx-auto max-w-md text-sm"
                  >
                    To push your code to GitHub, you need to connect your GitHub account in Settings {'>'} Connections
                    first.
                  </p>
                  <div className="flex justify-center gap-3 pt-2">
                    <motion.button
                      className="bg-bolt-elements-background-depth-2 dark:bg-darken-50 text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark hover:bg-darken-50 dark:hover:bg-bolt-elements-background-depth-4 border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark rounded-lg border px-4 py-2 text-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleClose}
                    >
                      Close
                    </motion.button>
                    <motion.a
                      href="/settings/connections"
                      className="inline-flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm text-white hover:bg-purple-600"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="i-ph:gear" />
                      Go to Settings
                    </motion.a>
                  </div>
                </div>
              </Dialog.Content>
            </motion.div>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-9999 bg-black/50 backdrop-blur-xs" />
        <div className="fixed inset-0 z-9999 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-[90vw] md:w-[500px]"
          >
            <Dialog.Content
              className="dark:bg-bolt-elements-background-depth-1 border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark rounded-lg border bg-white shadow-xl"
              aria-describedby="push-dialog-description"
            >
              <div className="p-6">
                <div className="mb-6 flex items-center gap-4">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-darken-50 flex h-10 w-10 items-center justify-center rounded-xl text-purple-500"
                  >
                    <div className="i-ph:github-logo h-5 w-5" />
                  </motion.div>
                  <div>
                    <Dialog.Title className="dark:text-bolt-elements-textPrimary-dark text-lg font-medium text-black">
                      Push to GitHub
                    </Dialog.Title>
                    <p
                      id="push-dialog-description"
                      className="text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark text-sm"
                    >
                      Push your code to a new or existing GitHub repository
                    </p>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      onClick={handleClose}
                      className="text-bolt-elements-text-tertiary dark:text-bolt-elements-textTertiary-dark dark:hover:text-bolt-elements-textPrimary-dark hover:bg-bolt-elements-background-depth-2 dark:hover:bg-darken-50 focus:ring-bolt-elements-border-color dark:focus:ring-bolt-elements-borderColor-dark ml-auto rounded-lg bg-transparent p-2 transition-all duration-200 ease-in-out hover:text-black focus:ring-2 focus:outline-hidden"
                    >
                      <span className="i-ph:x block h-5 w-5" aria-hidden="true" />
                      <span className="sr-only">Close dialog</span>
                    </button>
                  </Dialog.Close>
                </div>

                <div className="bg-bolt-elements-background-depth-2 dark:bg-darken-50 border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark mb-6 flex items-center gap-3 rounded-lg border p-4">
                  <div className="relative">
                    <img src={user.avatar_url} alt={user.login} className="h-10 w-10 rounded-full" />
                    <div className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-white">
                      <div className="i-ph:github-logo h-3 w-3" />
                    </div>
                  </div>
                  <div>
                    <p className="dark:text-bolt-elements-textPrimary-dark text-sm font-medium text-black">
                      {user.name || user.login}
                    </p>
                    <p className="text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark text-sm">
                      @{user.login}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="repoName"
                      className="text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark text-sm"
                    >
                      Repository Name
                    </label>
                    <div className="relative">
                      <div className="text-bolt-elements-text-tertiary dark:text-bolt-elements-textTertiary-dark absolute top-1/2 left-3 -translate-y-1/2">
                        <span className="i-ph:git-branch h-4 w-4" />
                      </div>
                      <input
                        id="repoName"
                        type="text"
                        value={repoName}
                        onChange={(e) => setRepoName(e.target.value)}
                        placeholder="my-awesome-project"
                        className="bg-bolt-elements-background-depth-2 dark:bg-darken-50 border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark dark:text-bolt-elements-textPrimary-dark placeholder-bolt-elements-text-tertiary dark:placeholder-bolt-elements-textTertiary-dark w-full rounded-lg border px-4 py-2 pl-10 text-black focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark text-sm">
                        Recent Repositories
                      </label>
                      <span className="text-bolt-elements-text-tertiary dark:text-bolt-elements-textTertiary-dark text-xs">
                        {filteredRepos.length} of {recentRepos.length}
                      </span>
                    </div>

                    <div className="mb-2">
                      <SearchInput
                        placeholder="Search repositories..."
                        value={repoSearchQuery}
                        onChange={(e) => setRepoSearchQuery(e.target.value)}
                        onClear={() => setRepoSearchQuery('')}
                        className="bg-bolt-elements-background-depth-2 dark:bg-darken-50 border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark border text-sm"
                      />
                    </div>

                    {recentRepos.length === 0 && !isFetchingRepos ? (
                      <EmptyState
                        icon="i-ph:github-logo"
                        title="No repositories found"
                        description="We couldn't find any repositories in your GitHub account."
                        variant="compact"
                      />
                    ) : (
                      <div className="custom-scrollbar max-h-[200px] space-y-2 overflow-y-auto pr-2">
                        {filteredRepos.length === 0 && repoSearchQuery.trim() !== '' ? (
                          <EmptyState
                            icon="i-ph:magnifying-glass"
                            title="No matching repositories"
                            description="Try a different search term"
                            variant="compact"
                          />
                        ) : (
                          filteredRepos.map((repo) => (
                            <motion.button
                              key={repo.full_name}
                              type="button"
                              onClick={() => setRepoName(repo.name)}
                              className="bg-bolt-elements-background-depth-2 dark:bg-darken-50 hover:bg-darken-50 dark:hover:bg-bolt-elements-background-depth-4 group border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark w-full rounded-lg border p-3 text-left transition-colors hover:border-purple-500/30"
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="i-ph:git-branch h-4 w-4 text-purple-500" />
                                  <span className="dark:text-bolt-elements-textPrimary-dark text-sm font-medium text-black group-hover:text-purple-500">
                                    {repo.name}
                                  </span>
                                </div>
                                {repo.private && (
                                  <Badge variant="primary" size="sm" icon="i-ph:lock w-3 h-3">
                                    Private
                                  </Badge>
                                )}
                              </div>
                              {repo.description && (
                                <p className="text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark mt-1 line-clamp-2 text-xs">
                                  {repo.description}
                                </p>
                              )}
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {repo.language && (
                                  <Badge variant="subtle" size="sm" icon="i-ph:code w-3 h-3">
                                    {repo.language}
                                  </Badge>
                                )}
                                <Badge variant="subtle" size="sm" icon="i-ph:star w-3 h-3">
                                  {repo.stargazers_count.toLocaleString()}
                                </Badge>
                                <Badge variant="subtle" size="sm" icon="i-ph:git-fork w-3 h-3">
                                  {repo.forks_count.toLocaleString()}
                                </Badge>
                                <Badge variant="subtle" size="sm" icon="i-ph:clock w-3 h-3">
                                  {new Date(repo.updated_at).toLocaleDateString()}
                                </Badge>
                              </div>
                            </motion.button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {isFetchingRepos && (
                    <div className="flex items-center justify-center py-4">
                      <StatusIndicator status="loading" pulse={true} label="Loading repositories..." />
                    </div>
                  )}
                  <div className="bg-bolt-elements-background-depth-2 dark:bg-darken-50 border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="private"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        className="border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark dark:bg-darken-50 rounded text-purple-500 focus:ring-purple-500"
                      />
                      <label htmlFor="private" className="dark:text-bolt-elements-textPrimary-dark text-sm text-black">
                        Make repository private
                      </label>
                    </div>
                    <p className="text-bolt-elements-text-tertiary dark:text-bolt-elements-textTertiary-dark mt-2 ml-6 text-xs">
                      Private repositories are only visible to you and people you share them with
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <motion.button
                      type="button"
                      onClick={handleClose}
                      className="bg-bolt-elements-background-depth-2 dark:bg-darken-50 text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark hover:bg-darken-50 dark:hover:bg-bolt-elements-background-depth-4 border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark rounded-lg border px-4 py-2 text-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      className={cn(
                        'inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm text-white hover:bg-purple-600',
                        isLoading ? 'cursor-not-allowed opacity-50' : '',
                      )}
                      whileHover={!isLoading ? { scale: 1.02 } : {}}
                      whileTap={!isLoading ? { scale: 0.98 } : {}}
                    >
                      {isLoading ? (
                        <>
                          <div className="i-ph:spinner-gap h-4 w-4 animate-spin" />
                          Pushing...
                        </>
                      ) : (
                        <>
                          <div className="i-ph:github-logo h-4 w-4" />
                          Push to GitHub
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            </Dialog.Content>
          </motion.div>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
