import type { VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '~/utils/cn';

const inputVariants = cva(
  'border-input placeholder:text-darken-100 focus-visible:ring-ring disabled:bg-muted flex w-full rounded-lg border bg-white px-3 text-black transition-colors file:border-0 file:bg-transparent file:text-base file:font-medium focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 text-base',
  {
    variants: {
      inputSize: {
        xs: 'h-7 py-1',
        sm: 'h-8 py-1',
        md: 'h-9 py-2',
        lg: 'h-10 px-2',
        xl: 'h-11 px-4',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      inputSize: 'md',
    },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, inputSize, ...props }, ref) => {
  return <input type={type} className={cn(inputVariants({ inputSize, className }))} ref={ref} {...props} />;
});

Input.displayName = 'Input';

export { Input, inputVariants };
