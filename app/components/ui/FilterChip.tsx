import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '~/utils/cn';

interface FilterChipProps {
  /** The label text to display */
  label: string;

  /** Optional value to display after the label */
  value?: string | number;

  /** Function to call when the remove button is clicked */
  onRemove?: () => void;

  /** Whether the chip is active/selected */
  active?: boolean;

  /** Optional icon to display before the label */
  icon?: string;

  /** Additional class name */
  className?: string;
}

/**
 * FilterChip component
 *
 * A chip component for displaying filters with optional remove button.
 */
export function FilterChip({ label, value, onRemove, active = false, icon, className }: FilterChipProps) {
  // Animation variants
  const variants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{ duration: 0.2 }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
        active
          ? 'border border-purple-500/30 bg-purple-500/15 text-purple-600 dark:text-purple-400'
          : 'bg-bolt-elements-background-depth-2 dark:bg-darken-50 text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark border',
        onRemove && 'pr-1',
        className,
      )}
    >
      {/* Icon */}
      {icon && <span className={cn(icon, 'text-inherit')} />}

      {/* Label and value */}
      <span>
        {label}
        {value !== undefined && ': '}
        {value !== undefined && (
          <span
            className={
              active
                ? 'font-semibold text-purple-700 dark:text-purple-300'
                : 'dark:text-bolt-elements-textPrimary-dark text-black'
            }
          >
            {value}
          </span>
        )}
      </span>

      {/* Remove button */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            'hover:bg-darken-50 dark:hover:bg-bolt-elements-background-depth-4 ml-1 rounded-full p-0.5 transition-colors',
            active
              ? 'text-purple-600 dark:text-purple-400'
              : 'text-bolt-elements-text-tertiary dark:text-bolt-elements-textTertiary-dark',
          )}
          aria-label={`Remove ${label} filter`}
        >
          <span className="i-ph:x h-3 w-3" />
        </button>
      )}
    </motion.div>
  );
}
