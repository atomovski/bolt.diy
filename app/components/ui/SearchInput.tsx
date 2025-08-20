import React, { forwardRef } from 'react';
import { cn } from '~/utils/cn';
import { Input } from './Input';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingSpinner } from './loading-spinner';
import { Icon } from '~/components/ui';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Function to call when the clear button is clicked */
  onClear?: () => void;

  /** Whether to show the clear button when there is input */
  showClearButton?: boolean;

  /** Additional class name for the search icon */
  iconClassName?: string;

  /** Additional class name for the container */
  containerClassName?: string;

  /** Whether the search is loading */
  loading?: boolean;
}

/**
 * SearchInput component
 *
 * A search input field with a search icon and optional clear button.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    { className, onClear, showClearButton = true, iconClassName, containerClassName, loading = false, ...props },
    ref,
  ) => {
    const hasValue = Boolean(props.value);

    return (
      <div className={cn('relative flex w-full items-center', containerClassName)}>
        {/* Search icon or loading spinner */}
        <div className={cn('absolute top-1/2 left-3 -translate-y-1/2', iconClassName)}>
          {loading ? <LoadingSpinner spinnerSize="sm" /> : <Icon.Search className="size-4" />}
        </div>

        {/* Input field */}
        <Input
          ref={ref}
          className={cn('bg-darken-50 border-0 pl-10', hasValue && showClearButton ? 'pr-10' : '', className)}
          {...props}
        />

        {/* Clear button */}
        <AnimatePresence>
          {hasValue && showClearButton && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              type="button"
              onClick={onClear}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1"
              aria-label="Clear search"
            >
              <span className="i-ph:x h-3.5 w-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

SearchInput.displayName = 'SearchInput';
