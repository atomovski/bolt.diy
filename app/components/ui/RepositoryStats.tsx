import React from 'react';
import { Badge } from './Badge';
import { cn } from '~/utils/cn';
import { formatSize } from '~/utils/formatSize';

interface RepositoryStatsProps {
  stats: {
    totalFiles?: number;
    totalSize?: number;
    languages?: Record<string, number>;
    hasPackageJson?: boolean;
    hasDependencies?: boolean;
  };
  className?: string;
  compact?: boolean;
}

export function RepositoryStats({ stats, className, compact = false }: RepositoryStatsProps) {
  const { totalFiles, totalSize, languages, hasPackageJson, hasDependencies } = stats;

  return (
    <div className={cn('space-y-3', className)}>
      {!compact && (
        <p className="dark:text-bolt-elements-textPrimary-dark text-sm font-medium text-black">
          Repository Statistics:
        </p>
      )}

      <div className={cn('grid gap-3', compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3')}>
        {totalFiles !== undefined && (
          <div className="dark:text-bolt-elements-textPrimary-dark flex items-center gap-2 text-black">
            <span className="i-ph:files h-4 w-4 text-purple-500" />
            <span className={compact ? 'text-xs' : 'text-sm'}>Total Files: {totalFiles.toLocaleString()}</span>
          </div>
        )}

        {totalSize !== undefined && (
          <div className="dark:text-bolt-elements-textPrimary-dark flex items-center gap-2 text-black">
            <span className="i-ph:database h-4 w-4 text-purple-500" />
            <span className={compact ? 'text-xs' : 'text-sm'}>Total Size: {formatSize(totalSize)}</span>
          </div>
        )}
      </div>

      {languages && Object.keys(languages).length > 0 && (
        <div className={compact ? 'pt-1' : 'pt-2'}>
          <div className="dark:text-bolt-elements-textPrimary-dark mb-2 flex items-center gap-2 text-black">
            <span className="i-ph:code h-4 w-4 text-purple-500" />
            <span className={compact ? 'text-xs' : 'text-sm'}>Languages:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(languages)
              .sort(([, a], [, b]) => b - a)
              .slice(0, compact ? 3 : 5)
              .map(([lang, size]) => (
                <Badge key={lang} variant="subtle" size={compact ? 'sm' : 'md'}>
                  {lang} ({formatSize(size)})
                </Badge>
              ))}
            {Object.keys(languages).length > (compact ? 3 : 5) && (
              <Badge variant="subtle" size={compact ? 'sm' : 'md'}>
                +{Object.keys(languages).length - (compact ? 3 : 5)} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {(hasPackageJson || hasDependencies) && (
        <div className={compact ? 'pt-1' : 'pt-2'}>
          <div className="flex flex-wrap gap-2">
            {hasPackageJson && (
              <Badge variant="primary" size={compact ? 'sm' : 'md'} icon="i-ph:package w-3.5 h-3.5">
                package.json
              </Badge>
            )}
            {hasDependencies && (
              <Badge variant="primary" size={compact ? 'sm' : 'md'} icon="i-ph:tree-structure w-3.5 h-3.5">
                Dependencies
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
