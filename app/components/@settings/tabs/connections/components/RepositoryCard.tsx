import React from 'react';
import { motion } from 'framer-motion';
import type { GitHubRepoInfo } from '~/types/GitHub';

interface RepositoryCardProps {
  repo: GitHubRepoInfo;
  onSelect: () => void;
}

import { useMemo } from 'react';

export function RepositoryCard({ repo, onSelect }: RepositoryCardProps) {
  // Use a consistent styling for all repository cards
  const getCardStyle = () => {
    return 'from-bolt-elements-background-depth-1 to-bolt-elements-background-depth-1 dark:from-bolt-elements-background-depth-2-dark dark:to-bolt-elements-background-depth-2-dark';
  };

  // Format the date in a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      return 'Today';
    }

    if (diffDays <= 2) {
      return 'Yesterday';
    }

    if (diffDays <= 7) {
      return `${diffDays} days ago`;
    }

    if (diffDays <= 30) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    }

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const cardStyle = useMemo(() => getCardStyle(), []);

  // const formattedDate = useMemo(() => formatDate(repo.updated_at), [repo.updated_at]);

  return (
    <motion.div
      className={`rounded-xl bg-linear-to-br p-5 ${cardStyle} border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark border shadow-xs transition-all duration-300 hover:border-purple-500/40 hover:shadow-md`}
      whileHover={{
        scale: 1.02,
        y: -2,
        transition: { type: 'spring', stiffness: 400, damping: 17 },
      }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="bg-bolt-elements-background-depth-1/80 dark:bg-bolt-elements-background-depth-4/80 flex h-10 w-10 items-center justify-center rounded-xl text-purple-500 shadow-xs backdrop-blur-xs">
            <span className="i-ph:git-branch h-5 w-5" />
          </div>
          <div>
            <h3 className="dark:text-bolt-elements-textPrimary-dark text-base font-medium text-black">{repo.name}</h3>
            <p className="text-bolt-elements-text-tertiary dark:text-bolt-elements-textTertiary-dark flex items-center gap-1 text-xs">
              <span className="i-ph:user h-3 w-3" />
              {repo.full_name.split('/')[0]}
            </p>
          </div>
        </div>
        <motion.button
          onClick={onSelect}
          className="flex h-9 min-w-[100px] items-center justify-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm text-white shadow-xs transition-all duration-200 hover:bg-purple-600 hover:shadow-md"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="i-ph:git-pull-request h-3.5 w-3.5" />
          Import
        </motion.button>
      </div>

      {repo.description && (
        <div className="bg-bolt-elements-background-depth-1/50 dark:bg-bolt-elements-background-depth-4/50 border-bolt-elements-border-color/30 dark:border-bolt-elements-borderColor-dark/30 mb-4 rounded-lg border p-3 backdrop-blur-xs">
          <p className="text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark line-clamp-2 text-sm">
            {repo.description}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {repo.private && (
          <span className="flex items-center gap-1 rounded-lg bg-purple-500/10 px-2 py-1 text-xs text-purple-600 dark:text-purple-400">
            <span className="i-ph:lock h-3 w-3" />
            Private
          </span>
        )}
        {repo.language && (
          <span className="bg-bolt-elements-background-depth-1/50 dark:bg-bolt-elements-background-depth-4/50 text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark border-bolt-elements-border-color/30 dark:border-bolt-elements-borderColor-dark/30 flex items-center gap-1 rounded-lg border px-2 py-1 text-xs backdrop-blur-xs">
            <span className="i-ph:code h-3 w-3" />
            {repo.language}
          </span>
        )}
        <span className="bg-bolt-elements-background-depth-1/50 dark:bg-bolt-elements-background-depth-4/50 text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark border-bolt-elements-border-color/30 dark:border-bolt-elements-borderColor-dark/30 flex items-center gap-1 rounded-lg border px-2 py-1 text-xs backdrop-blur-xs">
          <span className="i-ph:star h-3 w-3" />
          {repo.stargazers_count.toLocaleString()}
        </span>
        {repo.forks_count > 0 && (
          <span className="bg-bolt-elements-background-depth-1/50 dark:bg-bolt-elements-background-depth-4/50 text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark border-bolt-elements-border-color/30 dark:border-bolt-elements-borderColor-dark/30 flex items-center gap-1 rounded-lg border px-2 py-1 text-xs backdrop-blur-xs">
            <span className="i-ph:git-fork h-3 w-3" />
            {repo.forks_count.toLocaleString()}
          </span>
        )}
      </div>

      <div className="border-bolt-elements-border-color/30 dark:border-bolt-elements-borderColor-dark/30 mt-3 flex items-center justify-between border-t pt-3">
        <span className="text-bolt-elements-text-tertiary dark:text-bolt-elements-textTertiary-dark flex items-center gap-1 text-xs">
          <span className="i-ph:clock h-3 w-3" />
          Updated {formatDate(repo.updated_at)}
        </span>

        {repo.topics && repo.topics.length > 0 && (
          <span className="text-bolt-elements-text-tertiary dark:text-bolt-elements-textTertiary-dark text-xs">
            {repo.topics.slice(0, 1).map((topic) => (
              <span
                key={topic}
                className="bg-bolt-elements-background-depth-1/50 dark:bg-bolt-elements-background-depth-4/50 rounded-full px-1.5 py-0.5 text-xs"
              >
                {topic}
              </span>
            ))}
            {repo.topics.length > 1 && <span className="ml-1">+{repo.topics.length - 1}</span>}
          </span>
        )}
      </div>
    </motion.div>
  );
}
