import type { VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cva } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { LoadingSpinner } from '~/components/ui/loading-spinner';
import { cn } from '~/utils/cn';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './';

const buttonVariants = cva(
  'focus-visible:ring-ring inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-lg text-base transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-black text-white hover:bg-black/90',
        color: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2',
        outline: 'border-input hover:bg-darken-50 border text-black',
        secondary: 'bg-darken-100 hover:bg-darken-100/80 text-black hover:text-black',
        tertiary: 'rounded-sm bg-orange-800/10 text-black hover:bg-orange-300/10 hover:text-black',
        ghost: 'hover:bg-darken-100 hover:text-secondary-foreground text-black',
        'ghost-bordered': 'hover:bg-darken-100 rounded-lg text-black opacity-100 hover:border hover:text-black/80',
        link: 'text-blue underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-7 px-3 text-sm',
        md: 'h-8 px-4 py-2',
        lg: 'h-9 px-8',
        xl: 'h-10 px-8',
        icon: 'size-8',
        'icon-sm': 'h-7 min-w-7 rounded-md text-xs md:text-sm',
        'icon-xs': 'h-6 min-w-6 rounded-md text-xs md:text-sm',
        link: 'p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;

  /**
   * When true, displays a loading spinner and disables the button
   */
  isLoading?: boolean;

  /**
   * Optional props to pass to the LoadingSpinner component
   */
  spinnerClassName?: string;
  tooltip?: string;
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      spinnerClassName,
      children,
      tooltip,
      tooltipSide = 'top',
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot.Slot : 'button';

    const getSpinnerSize = () => {
      switch (size) {
        case 'xl':
          return 'sm';
        case 'lg':
          return 'sm';
        case 'md':
          return 'sm';
        case 'icon':
          return 'sm';
        default:
          return 'xs';
      }
    };

    const isIconButton = size === 'icon';

    const buttonComp = (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && (
          <LoadingSpinner
            className={cn('text-inherit', isIconButton ? '' : 'mr-2', spinnerClassName)}
            spinnerSize={getSpinnerSize()}
          />
        )}
        {!isLoading || !isIconButton ? children : null}
      </Comp>
    );

    if (tooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{buttonComp}</TooltipTrigger>
            <TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return buttonComp;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
