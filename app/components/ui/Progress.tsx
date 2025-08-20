import * as React from 'react';
import { cn } from '~/utils/cn';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(({ className, value, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('bg-bolt-elements-background relative h-2 w-full overflow-hidden rounded-full', className)}
    {...props}
  >
    <div
      className="bg-bolt-elements-text-primary h-full w-full flex-1 transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </div>
));
Progress.displayName = 'Progress';

export { Progress };
