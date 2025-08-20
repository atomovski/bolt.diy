import { memo } from 'react';
import { cn } from '~/utils/cn';

interface PanelHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export const PanelHeader = memo(({ className, children }: PanelHeaderProps) => {
  return (
    <div
      className={cn(
        'bg-darken-50 text-bolt-elements-text-secondary border-bolt-elements-border-color flex min-h-[34px] items-center gap-2 border-b px-4 py-1 text-sm',
        className,
      )}
    >
      {children}
    </div>
  );
});
