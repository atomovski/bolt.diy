import { memo } from 'react';
import { cn } from '~/utils/cn';

interface PanelHeaderButtonProps {
  className?: string;
  disabledClassName?: string;
  disabled?: boolean;
  children: string | JSX.Element | Array<JSX.Element | string>;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export const PanelHeaderButton = memo(
  ({ className, disabledClassName, disabled = false, children, onClick }: PanelHeaderButtonProps) => {
    return (
      <button
        className={cn(
          'text-bolt-elements-item-contentDefault enabled:hover:text-bolt-elements-item-contentActive enabled:hover:bg-bolt-elements-item-backgroundActive flex shrink-0 items-center gap-1.5 rounded-md bg-transparent px-1.5 py-0.5 disabled:cursor-not-allowed',
          {
            [cn('opacity-30', disabledClassName)]: disabled,
          },
          className,
        )}
        disabled={disabled}
        onClick={(event) => {
          if (disabled) {
            return;
          }

          onClick?.(event);
        }}
      >
        {children}
      </button>
    );
  },
);
