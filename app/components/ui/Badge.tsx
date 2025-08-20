'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 transition-colors focus:outline-hidden focus:ring-2 focus:ring-bolt-elements-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-bolt-elements-background text-black hover:bg-bolt-elements-background/80',
        secondary:
          'border-transparent bg-bolt-elements-background text-bolt-elements-text-secondary hover:bg-bolt-elements-background/80',
        destructive: 'border-transparent bg-red-500/10 text-red-500 hover:bg-red-500/20',
        outline: 'text-black',
        primary: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        success: 'bg-green-500/10 text-green-600 dark:text-green-400',
        warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
        danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
        info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        subtle:
          'border border-bolt-elements-border-color/30 dark:border-bolt-elements-borderColor-dark/30 bg-white/50 dark:bg-bolt-elements-background-depth-4/50 backdrop-blur-xs text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark',
      },
      size: {
        default: 'rounded-full px-2.5 py-0.5 text-xs font-semibold',
        sm: 'rounded-full px-1.5 py-0.5 text-xs',
        md: 'rounded-md px-2 py-1 text-xs font-medium',
        lg: 'rounded-md px-2.5 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  icon?: string;
}

function Badge({ className, variant, size, icon, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {icon && <span className={icon} />}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
