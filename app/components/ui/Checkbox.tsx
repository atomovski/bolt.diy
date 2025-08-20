import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '~/utils/cn';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded-xs border transition-colors',
      'bg-transparent dark:bg-transparent',
      'border-gray-400 dark:border-gray-600',
      'focus-visible:ring-1 focus-visible:ring-purple-500 focus-visible:ring-offset-1 focus-visible:ring-offset-white focus-visible:outline-hidden dark:focus-visible:ring-offset-gray-950',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-purple-500 dark:data-[state=checked]:bg-purple-500',
      'data-[state=checked]:border-purple-500 dark:data-[state=checked]:border-purple-500',
      'data-[state=checked]:text-white',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="h-3 w-3" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = 'Checkbox';

export { Checkbox };
