import { AnimatePresence, cubicBezier, motion } from 'framer-motion';
import { Button, Icon } from '~/components/ui';

interface SendButtonProps {
  show: boolean;
  isStreaming?: boolean;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onImagesSelected?: (images: File[]) => void;
}

const customEasingFn = cubicBezier(0.4, 0, 0.2, 1);

export const SendButton = ({ show, isStreaming, disabled, onClick }: SendButtonProps) => {
  return (
    <AnimatePresence>
      <motion.button
        className="bg-accent-500 color-white transition-theme flex h-[34px] w-[34px] items-center justify-center rounded-md p-1 hover:brightness-94 disabled:cursor-not-allowed disabled:opacity-50"
        transition={{ ease: customEasingFn, duration: 0.17 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        disabled={disabled || !show}
        onClick={(event) => {
          event.preventDefault();

          if (!disabled) {
            onClick?.(event);
          }
        }}
      >
        <Button size="icon-sm" className="rounded-full" disabled={disabled || !show}>
          {!isStreaming ? <Icon.ArrowUp /> : <Icon.Pause />}
        </Button>
      </motion.button>
    </AnimatePresence>
  );
};
