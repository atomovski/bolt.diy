import { motion, AnimatePresence } from 'framer-motion';

interface ProgressLoaderProps {
  isVisible: boolean;
}

export function ProgressLoader({ isVisible }: ProgressLoaderProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute top-0 left-0 z-50 h-1 w-full overflow-hidden bg-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 bg-[length:200%_100%]"
            initial={{ x: '-100%' }}
            animate={{
              x: '100%',
              backgroundPosition: ['0% 50%', '100% 50%'],
            }}
            transition={{
              x: {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              },
              backgroundPosition: {
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              },
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
