import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '~/components/ui';

interface LoadingMessage {
  text: string;
  IconComponent: any;
  animation: 'pulse' | 'spin' | 'bounce';
}

const loadingMessages: LoadingMessage[] = [
  {
    text: 'Thinking...',
    IconComponent: Icon.Clock, // thinking/time-based icon
    animation: 'pulse',
  },
  {
    text: 'Building your idea...',
    IconComponent: Icon.Wrench, // building/tools icon
    animation: 'bounce',
  },
  {
    text: 'Working out the details...',
    IconComponent: Icon.Settings, // details/configuration icon
    animation: 'spin',
  },
];

export function LoadingAnimation({ isVisible }: { isVisible: boolean }) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2500); // Change message every 2.5 seconds

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  const currentMessage = loadingMessages[currentMessageIndex];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentMessageIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="flex flex-col items-center justify-center p-8"
      >
        {/* Icon with animation */}
        <div className="mb-4">
          {currentMessage.animation === 'pulse' && (
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <currentMessage.IconComponent className="text-bolt-elements-textPrimary h-16 w-16" />
            </motion.div>
          )}

          {currentMessage.animation === 'spin' && (
            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <currentMessage.IconComponent className="text-bolt-elements-textPrimary h-16 w-16" />
            </motion.div>
          )}

          {currentMessage.animation === 'bounce' && (
            <motion.div
              animate={{
                y: [0, -20, 0],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <currentMessage.IconComponent className="text-bolt-elements-textPrimary h-16 w-16" />
            </motion.div>
          )}
        </div>

        {/* Loading text */}
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-bolt-elements-textPrimary text-xl font-medium"
        >
          {currentMessage.text}
        </motion.h3>

        {/* Loading dots animation */}
        <div className="mt-4 flex space-x-2">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: index * 0.2,
                ease: 'easeInOut',
              }}
              className="bg-bolt-elements-textPrimary h-2 w-2 rounded-full"
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
