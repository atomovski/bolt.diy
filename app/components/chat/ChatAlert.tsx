import { AnimatePresence, motion } from 'framer-motion';
import type { ActionAlert } from '~/types/actions';
import { cn } from '~/utils/cn';

interface Props {
  alert: ActionAlert;
  clearAlert: () => void;
  postMessage: (message: string) => void;
}

export default function ChatAlert({ alert, clearAlert, postMessage }: Props) {
  const { description, content, source } = alert;

  const isPreview = source === 'preview';
  const title = isPreview ? 'Preview Error' : 'Terminal Error';
  const message = isPreview
    ? 'We encountered an error while running the preview. Would you like Bolt to analyze and help resolve this issue?'
    : 'We encountered an error while running terminal commands. Would you like Bolt to analyze and help resolve this issue?';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={`border-bolt-elements-border-color bg-bolt-elements-background-depth-2 mb-2 rounded-lg border p-4`}
      >
        <div className="flex items-start">
          {/* Icon */}
          <motion.div className="shrink-0" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
            <div className={`i-ph:warning-duotone text-bolt-elements-button-danger-text text-xl`}></div>
          </motion.div>
          {/* Content */}
          <div className="ml-3 flex-1">
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={`text-sm font-medium text-black`}
            >
              {title}
            </motion.h3>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={`text-bolt-elements-text-secondary mt-2 text-sm`}
            >
              <p>{message}</p>
              {description && (
                <div className="text-bolt-elements-text-secondary bg-darken-50 mt-4 mb-4 rounded-sm p-2 text-xs">
                  Error: {description}
                </div>
              )}
            </motion.div>

            {/* Actions */}
            <motion.div
              className="mt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className={cn('flex gap-2')}>
                <button
                  onClick={() =>
                    postMessage(
                      `*Fix this ${isPreview ? 'preview' : 'terminal'} error* \n\`\`\`${isPreview ? 'js' : 'sh'}\n${content}\n\`\`\`\n`,
                    )
                  }
                  className={cn(
                    `rounded-md px-2 py-1.5 text-sm font-medium`,
                    'bg-bolt-elements-button-primary-background',
                    'hover:bg-bolt-elements-button-primary-background-hover',
                    'focus:ring-bolt-elements-button-danger-background focus:ring-2 focus:ring-offset-2 focus:outline-hidden',
                    'text-bolt-elements-button-primary-text',
                    'flex items-center gap-1.5',
                  )}
                >
                  <div className="i-ph:chat-circle-duotone"></div>
                  Ask Bolt
                </button>
                <button
                  onClick={clearAlert}
                  className={cn(
                    `rounded-md px-2 py-1.5 text-sm font-medium`,
                    'bg-bolt-elements-button-secondary-background',
                    'hover:bg-bolt-elements-button-secondary-background-hover',
                    'focus:ring-bolt-elements-button-secondary-background focus:ring-2 focus:ring-offset-2 focus:outline-hidden',
                    'text-bolt-elements-button-secondary-text',
                  )}
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
