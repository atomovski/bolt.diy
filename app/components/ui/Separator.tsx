import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '~/utils/cn';

interface SeparatorProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export const Separator = ({ className, orientation = 'horizontal' }: SeparatorProps) => {
  return (
    <SeparatorPrimitive.Root
      className={cn(
        'bg-bolt-elements-border-color',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      orientation={orientation}
    />
  );
};

export default Separator;
