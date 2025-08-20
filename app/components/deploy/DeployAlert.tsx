import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '~/utils/cn';
import type { DeployAlert } from '~/types/actions';

interface DeployAlertProps {
  alert: DeployAlert;
  clearAlert: () => void;
  postMessage: (message: string) => void;
}

export default function DeployChatAlert({ alert, clearAlert, postMessage }: DeployAlertProps) {
  const { type, title, description, content, url, stage, buildStatus, deployStatus } = alert;

  // Determine if we should show the deployment progress
  const showProgress = stage && (buildStatus || deployStatus);

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
            <div
              className={cn(
                'text-xl',
                type === 'success'
                  ? 'i-ph:check-circle-duotone text-bolt-elements-icon-success'
                  : type === 'error'
                    ? 'i-ph:warning-duotone text-bolt-elements-button-danger-text'
                    : 'i-ph:info-duotone text-bolt-elements-loader-progress',
              )}
            ></div>
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
              <p>{description}</p>

              {/* Deployment Progress Visualization */}
              {showProgress && (
                <div className="mt-4 mb-2">
                  <div className="mb-3 flex items-center space-x-2">
                    {/* Build Step */}
                    <div className="flex items-center">
                      <div
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full',
                          buildStatus === 'running'
                            ? 'bg-bolt-elements-loader-progress'
                            : buildStatus === 'complete'
                              ? 'bg-bolt-elements-icon-success'
                              : buildStatus === 'failed'
                                ? 'bg-bolt-elements-button-danger-background'
                                : 'bg-bolt-elements-text-tertiary',
                        )}
                      >
                        {buildStatus === 'running' ? (
                          <div className="i-svg-spinners:90-ring-with-bg text-xs text-white"></div>
                        ) : buildStatus === 'complete' ? (
                          <div className="i-ph:check text-xs text-white"></div>
                        ) : buildStatus === 'failed' ? (
                          <div className="i-ph:x text-xs text-white"></div>
                        ) : (
                          <span className="text-xs text-white">1</span>
                        )}
                      </div>
                      <span className="ml-2">Build</span>
                    </div>

                    {/* Connector Line */}
                    <div
                      className={cn(
                        'h-0.5 w-8',
                        buildStatus === 'complete' ? 'bg-bolt-elements-icon-success' : 'bg-bolt-elements-text-tertiary',
                      )}
                    ></div>

                    {/* Deploy Step */}
                    <div className="flex items-center">
                      <div
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full',
                          deployStatus === 'running'
                            ? 'bg-bolt-elements-loader-progress'
                            : deployStatus === 'complete'
                              ? 'bg-bolt-elements-icon-success'
                              : deployStatus === 'failed'
                                ? 'bg-bolt-elements-button-danger-background'
                                : 'bg-bolt-elements-text-tertiary',
                        )}
                      >
                        {deployStatus === 'running' ? (
                          <div className="i-svg-spinners:90-ring-with-bg text-xs text-white"></div>
                        ) : deployStatus === 'complete' ? (
                          <div className="i-ph:check text-xs text-white"></div>
                        ) : deployStatus === 'failed' ? (
                          <div className="i-ph:x text-xs text-white"></div>
                        ) : (
                          <span className="text-xs text-white">2</span>
                        )}
                      </div>
                      <span className="ml-2">Deploy</span>
                    </div>
                  </div>
                </div>
              )}

              {content && (
                <div className="text-bolt-elements-text-secondary bg-darken-50 mt-4 mb-4 rounded-sm p-2 text-xs">
                  {content}
                </div>
              )}
              {url && type === 'success' && (
                <div className="mt-2">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-bolt-elements-item-contentAccent flex items-center hover:underline"
                  >
                    <span className="mr-1">View deployed site</span>
                    <div className="i-ph:arrow-square-out"></div>
                  </a>
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
                {type === 'error' && (
                  <button
                    onClick={() =>
                      postMessage(`*Fix this deployment error*\n\`\`\`\n${content || description}\n\`\`\`\n`)
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
                )}
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
