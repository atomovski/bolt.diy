import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import type { RepositoryStats } from '~/types/GitHub';
import { formatSize } from '~/utils/formatSize';
import { RepositoryStats as RepoStats } from '~/components/ui';

interface StatsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  stats: RepositoryStats;
  isLargeRepo?: boolean;
}

export function StatsDialog({ isOpen, onClose, onConfirm, stats, isLargeRepo }: StatsDialogProps) {
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
            className="w-[90vw] md:w-[500px]"
          >
            <Dialog.Content className="dark:bg-bolt-elements-background-depth-1 border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark rounded-lg border bg-white shadow-xl">
              <div className="space-y-4 p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-darken-50 flex h-10 w-10 items-center justify-center rounded-xl text-purple-500">
                    <span className="i-ph:git-branch h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="dark:text-bolt-elements-textPrimary-dark text-lg font-medium text-black">
                      Repository Overview
                    </h3>
                    <p className="text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark text-sm">
                      Review repository details before importing
                    </p>
                  </div>
                </div>

                <div className="bg-bolt-elements-background-depth-2 dark:bg-darken-50 mt-4 rounded-lg p-4">
                  <RepoStats stats={stats} />
                </div>

                {isLargeRepo && (
                  <div className="flex items-start gap-2 rounded-lg bg-yellow-50 p-3 text-sm dark:bg-yellow-500/10">
                    <span className="i-ph:warning mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-500" />
                    <div className="text-yellow-800 dark:text-yellow-500">
                      This repository is quite large ({formatSize(stats.totalSize)}). Importing it might take a while
                      and could impact performance.
                    </div>
                  </div>
                )}
              </div>
              <div className="border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark bg-bolt-elements-background-depth-2 dark:bg-darken-50 flex justify-end gap-3 rounded-b-lg border-t p-4">
                <motion.button
                  onClick={onClose}
                  className="bg-darken-50 dark:bg-bolt-elements-background-depth-4 text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark dark:hover:text-bolt-elements-textPrimary-dark rounded-lg px-4 py-2 transition-colors hover:text-black"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={onConfirm}
                  className="rounded-lg bg-purple-500 px-4 py-2 text-white transition-colors hover:bg-purple-600"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Import Repository
                </motion.button>
              </div>
            </Dialog.Content>
          </motion.div>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
