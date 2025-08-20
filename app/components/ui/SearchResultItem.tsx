import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '~/utils/cn';
import { Badge } from './Badge';

interface SearchResultItemProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  iconBackground?: string;
  iconColor?: string;
  tags?: string[];
  metadata?: Array<{
    icon?: string;
    label: string;
    value?: string | number;
  }>;
  actionLabel?: string;
  onAction?: () => void;
  onClick?: () => void;
  className?: string;
}

export function SearchResultItem({
  title,
  subtitle,
  description,
  icon,
  iconBackground = 'bg-bolt-elements-background-depth-1/80 dark:bg-bolt-elements-background-depth-4/80',
  iconColor = 'text-purple-500',
  tags,
  metadata,
  actionLabel,
  onAction,
  onClick,
  className,
}: SearchResultItemProps) {
  return (
    <motion.div
      className={cn(
        'border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark bg-bolt-elements-background-depth-1/50 dark:bg-darken-50/50 rounded-xl border p-5 shadow-xs transition-all duration-300 hover:border-purple-500/40 hover:shadow-md',
        onClick ? 'cursor-pointer' : '',
        className,
      )}
      whileHover={{
        scale: 1.01,
        y: -1,
        transition: { type: 'spring', stiffness: 400, damping: 17 },
      }}
      whileTap={{ scale: 0.99 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon && (
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl shadow-xs backdrop-blur-xs',
                iconBackground,
              )}
            >
              <span className={cn(icon, 'h-5 w-5', iconColor)} />
            </div>
          )}
          <div>
            <h3 className="dark:text-bolt-elements-textPrimary-dark text-base font-medium text-black">{title}</h3>
            {subtitle && (
              <p className="text-bolt-elements-text-tertiary dark:text-bolt-elements-textTertiary-dark flex items-center gap-1 text-xs">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actionLabel && onAction && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
            className="flex h-9 min-w-[100px] items-center justify-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm text-white shadow-xs transition-all duration-200 hover:bg-purple-600 hover:shadow-md"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {actionLabel}
          </motion.button>
        )}
      </div>

      {description && (
        <div className="bg-bolt-elements-background-depth-1/50 dark:bg-bolt-elements-background-depth-4/50 border-bolt-elements-border-color/30 dark:border-bolt-elements-borderColor-dark/30 mb-4 rounded-lg border p-3 backdrop-blur-xs">
          <p className="text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark line-clamp-2 text-sm">
            {description}
          </p>
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="subtle" size="sm">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {metadata && metadata.length > 0 && (
        <div className="text-bolt-elements-text-tertiary dark:text-bolt-elements-textTertiary-dark flex flex-wrap items-center gap-3 text-xs">
          {metadata.map((item, index) => (
            <div key={index} className="flex items-center gap-1">
              {item.icon && <span className={cn(item.icon, 'h-3.5 w-3.5')} />}
              <span>
                {item.label}
                {item.value !== undefined && ': '}
                {item.value !== undefined && (
                  <span className="text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark">
                    {item.value}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
