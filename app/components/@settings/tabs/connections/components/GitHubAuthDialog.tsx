import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import type { GitHubUserResponse } from '~/types/GitHub';

interface GitHubAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GitHubAuthDialog({ isOpen, onClose }: GitHubAuthDialogProps) {
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenType, setTokenType] = useState<'classic' | 'fine-grained'>('classic');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = (await response.json()) as GitHubUserResponse;

        // Save connection data
        const connectionData = {
          token,
          tokenType,
          user: {
            login: userData.login,
            avatar_url: userData.avatar_url,
            name: userData.name || userData.login,
          },
          connected_at: new Date().toISOString(),
        };

        localStorage.setItem('github_connection', JSON.stringify(connectionData));

        // Set cookies for API requests
        Cookies.set('githubToken', token);
        Cookies.set('githubUsername', userData.login);
        Cookies.set('git:github.com', JSON.stringify({ username: token, password: 'x-oauth-basic' }));

        toast.success(`Successfully connected as ${userData.login}`);
        setToken('');
        onClose();
      } else {
        if (response.status === 401) {
          toast.error('Invalid GitHub token. Please check and try again.');
        } else {
          toast.error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Error connecting to GitHub:', error);
      toast.error('Failed to connect to GitHub. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-9999 bg-black/50 backdrop-blur-xs" />
        <div className="fixed inset-0 z-9999 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Dialog.Content className="mx-4 w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-xl dark:bg-[#1A1A1A]">
              <div className="space-y-3 p-4">
                <h2 className="text-lg font-semibold text-[#111111] dark:text-white">Access Private Repositories</h2>

                <p className="text-sm text-[#666666] dark:text-[#999999]">
                  To access private repositories, you need to connect your GitHub account by providing a personal access
                  token.
                </p>

                <div className="space-y-3 rounded-lg bg-[#F9F9F9] p-4 dark:bg-[#252525]">
                  <h3 className="text-base font-medium text-[#111111] dark:text-white">Connect with GitHub Token</h3>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm text-[#666666] dark:text-[#999999]">
                        GitHub Personal Access Token
                      </label>
                      <input
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-1.5 text-sm text-[#111111] placeholder-[#999999] dark:border-[#333333] dark:bg-[#1A1A1A] dark:text-white"
                      />
                      <div className="mt-1 text-xs text-[#666666] dark:text-[#999999]">
                        Get your token at{' '}
                        <a
                          href="https://github.com/settings/tokens"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-500 hover:underline"
                        >
                          github.com/settings/tokens
                        </a>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm text-[#666666] dark:text-[#999999]">Token Type</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={tokenType === 'classic'}
                            onChange={() => setTokenType('classic')}
                            className="h-3.5 w-3.5 accent-purple-500"
                          />
                          <span className="text-sm text-[#111111] dark:text-white">Classic</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={tokenType === 'fine-grained'}
                            onChange={() => setTokenType('fine-grained')}
                            className="h-3.5 w-3.5 accent-purple-500"
                          />
                          <span className="text-sm text-[#111111] dark:text-white">Fine-grained</span>
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-lg bg-purple-500 py-2 text-sm text-white transition-colors hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting ? 'Connecting...' : 'Connect to GitHub'}
                    </button>
                  </form>
                </div>

                <div className="space-y-1.5 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                  <h3 className="flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-300">
                    <span className="i-ph:warning-circle h-4 w-4" />
                    Accessing Private Repositories
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Important things to know about accessing private repositories:
                  </p>
                  <ul className="list-disc space-y-0.5 pl-4 text-xs text-amber-700 dark:text-amber-400">
                    <li>You must be granted access to the repository by its owner</li>
                    <li>Your GitHub token must have the 'repo' scope</li>
                    <li>For organization repositories, you may need additional permissions</li>
                    <li>No token can give you access to repositories you don't have permission for</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end border-t border-[#E5E5E5] p-3 dark:border-[#333333]">
                <Dialog.Close asChild>
                  <button
                    onClick={onClose}
                    className="rounded-lg bg-[#F5F5F5] bg-transparent px-4 py-1.5 text-sm text-[#111111] transition-colors hover:bg-[#E5E5E5] dark:bg-[#252525] dark:text-white dark:hover:bg-[#333333]"
                  >
                    Close
                  </button>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </motion.div>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
