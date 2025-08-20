import type { ToolInvocationUIPart } from '@ai-sdk/ui-utils';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useMemo, useState, useEffect } from 'react';
import { createHighlighter, type BundledLanguage, type BundledTheme, type HighlighterGeneric } from 'shiki';
import { cn } from '~/utils/cn';
import {
  TOOL_EXECUTION_APPROVAL,
  TOOL_EXECUTION_DENIED,
  TOOL_EXECUTION_ERROR,
  TOOL_NO_EXECUTE_FUNCTION,
} from '~/utils/constants';
import { cubicEasingFn } from '~/utils/easings';
import { logger } from '~/utils/logger';
import { themeStore, type Theme } from '~/lib/stores/theme';
import { useStore } from '@nanostores/react';
import type { ToolCallAnnotation } from '~/types/context';

const highlighterOptions = {
  langs: ['json'],
  themes: ['light-plus', 'dark-plus'],
};

const jsonHighlighter: HighlighterGeneric<BundledLanguage, BundledTheme> =
  import.meta.hot?.data.jsonHighlighter ?? (await createHighlighter(highlighterOptions));

if (import.meta.hot) {
  import.meta.hot.data.jsonHighlighter = jsonHighlighter;
}

interface JsonCodeBlockProps {
  className?: string;
  code: string;
  theme: Theme;
}

function JsonCodeBlock({ className, code, theme }: JsonCodeBlockProps) {
  let formattedCode = code;

  try {
    if (typeof formattedCode === 'object') {
      formattedCode = JSON.stringify(formattedCode, null, 2);
    } else if (typeof formattedCode === 'string') {
      // Attempt to parse and re-stringify for formatting
      try {
        const parsed = JSON.parse(formattedCode);
        formattedCode = JSON.stringify(parsed, null, 2);
      } catch {
        // Leave as is if not JSON
      }
    }
  } catch (e) {
    // If parsing fails, keep original code
    logger.error('Failed to parse JSON', { error: e });
  }

  return (
    <div
      className={cn('mcp-tool-invocation-code overflow-hidden rounded-md text-xs', className)}
      dangerouslySetInnerHTML={{
        __html: jsonHighlighter.codeToHtml(formattedCode, {
          lang: 'json',
          theme: theme === 'dark' ? 'dark-plus' : 'light-plus',
        }),
      }}
      style={{
        padding: '0',
        margin: '0',
      }}
    ></div>
  );
}

interface ToolInvocationsProps {
  toolInvocations: ToolInvocationUIPart[];
  toolCallAnnotations: ToolCallAnnotation[];
  addToolResult: ({ toolCallId, result }: { toolCallId: string; result: any }) => void;
}

export const ToolInvocations = memo(({ toolInvocations, toolCallAnnotations, addToolResult }: ToolInvocationsProps) => {
  const theme = useStore(themeStore);
  const [showDetails, setShowDetails] = useState(false);

  const toggleDetails = () => {
    setShowDetails((prev) => !prev);
  };

  const toolCalls = useMemo(
    () => toolInvocations.filter((inv) => inv.toolInvocation.state === 'call'),
    [toolInvocations],
  );

  const toolResults = useMemo(
    () => toolInvocations.filter((inv) => inv.toolInvocation.state === 'result'),
    [toolInvocations],
  );

  const hasToolCalls = toolCalls.length > 0;
  const hasToolResults = toolResults.length > 0;

  if (!hasToolCalls && !hasToolResults) {
    return null;
  }

  return (
    <div className="tool-invocation border-bolt-elements-border-color transition-border flex w-full flex-col overflow-hidden rounded-lg border duration-150">
      <div className="flex">
        <button
          className="bg-bolt-elements-artifacts-background hover:bg-bolt-elements-artifacts-backgroundHover flex w-full items-stretch overflow-hidden"
          onClick={toggleDetails}
          aria-label={showDetails ? 'Collapse details' : 'Expand details'}
        >
          <div className="p-2.5">
            <div className="i-ph:wrench text-bolt-elements-text-secondary text-xl transition-colors hover:text-black"></div>
          </div>
          <div className="border-bolt-elements-border-color w-full border-l p-2.5 text-left">
            <div className="w-full text-sm leading-5 font-medium text-black">
              MCP Tool Invocations{' '}
              {hasToolResults && (
                <span className="text-bolt-elements-text-secondary mt-0.5 w-full text-xs">
                  ({toolResults.length} tool{hasToolResults ? 's' : ''} used)
                </span>
              )}
            </div>
          </div>
        </button>
        <AnimatePresence>
          {hasToolResults && (
            <motion.button
              initial={{ width: 0 }}
              animate={{ width: 'auto' }}
              exit={{ width: 0 }}
              transition={{ duration: 0.15, ease: cubicEasingFn }}
              className="bg-bolt-elements-artifacts-background hover:bg-bolt-elements-artifacts-backgroundHover"
              onClick={toggleDetails}
            >
              <div className="p-2">
                <div
                  className={`${showDetails ? 'i-ph:caret-up-bold' : 'i-ph:caret-down-bold'} text-bolt-elements-text-secondary text-xl transition-colors hover:text-black`}
                ></div>
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {hasToolCalls && (
          <motion.div
            className="details"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: '0px' }}
            transition={{ duration: 0.15 }}
          >
            <div className="bg-bolt-elements-artifacts-borderColor h-px" />

            <div className="bg-bolt-elements-actions-background px-3 py-3 text-left">
              <ToolCallsList
                toolInvocations={toolCalls}
                toolCallAnnotations={toolCallAnnotations}
                addToolResult={addToolResult}
                theme={theme}
              />
            </div>
          </motion.div>
        )}

        {hasToolResults && showDetails && (
          <motion.div
            className="details"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: '0px' }}
            transition={{ duration: 0.15 }}
          >
            <div className="bg-bolt-elements-artifacts-borderColor h-px" />

            <div className="bg-bolt-elements-actions-background p-5 text-left">
              <ToolResultsList toolInvocations={toolResults} toolCallAnnotations={toolCallAnnotations} theme={theme} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

const toolVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface ToolResultsListProps {
  toolInvocations: ToolInvocationUIPart[];
  toolCallAnnotations: ToolCallAnnotation[];
  theme: Theme;
}

const ToolResultsList = memo(({ toolInvocations, toolCallAnnotations, theme }: ToolResultsListProps) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
      <ul className="list-none space-y-4">
        {toolInvocations.map((tool, index) => {
          const toolCallState = tool.toolInvocation.state;

          if (toolCallState !== 'result') {
            return null;
          }

          const { toolName, toolCallId } = tool.toolInvocation;

          const annotation = toolCallAnnotations.find((annotation) => {
            return annotation.toolCallId === toolCallId;
          });

          const isErrorResult = [TOOL_NO_EXECUTE_FUNCTION, TOOL_EXECUTION_DENIED, TOOL_EXECUTION_ERROR].includes(
            tool.toolInvocation.result,
          );

          return (
            <motion.li
              key={index}
              variants={toolVariants}
              initial="hidden"
              animate="visible"
              transition={{
                duration: 0.2,
                ease: cubicEasingFn,
              }}
            >
              <div className="mb-1 flex items-center gap-1.5 text-xs">
                {isErrorResult ? (
                  <div className="text-bolt-elements-icon-error text-lg">
                    <div className="i-ph:x"></div>
                  </div>
                ) : (
                  <div className="text-bolt-elements-icon-success text-lg">
                    <div className="i-ph:check"></div>
                  </div>
                )}
                <div className="text-bolt-elements-text-secondary text-xs">Server:</div>
                <div className="font-semibold text-black">{annotation?.serverName}</div>
              </div>

              <div className="mb-2 ml-6">
                <div className="text-bolt-elements-text-secondary mb-1 text-xs">
                  Tool: <span className="font-semibold text-black">{toolName}</span>
                </div>
                <div className="text-bolt-elements-text-secondary mb-1 text-xs">
                  Description: <span className="font-semibold text-black">{annotation?.toolDescription}</span>
                </div>
                <div className="text-bolt-elements-text-secondary mb-1 text-xs">Parameters:</div>
                <div className="rounded-md bg-[#FAFAFA] p-3 dark:bg-[#0A0A0A]">
                  <JsonCodeBlock className="mb-0" code={JSON.stringify(tool.toolInvocation.args)} theme={theme} />
                </div>
                <div className="text-bolt-elements-text-secondary mt-3 mb-1 text-xs">Result:</div>
                <div className="rounded-md bg-[#FAFAFA] p-3 dark:bg-[#0A0A0A]">
                  <JsonCodeBlock className="mb-0" code={JSON.stringify(tool.toolInvocation.result)} theme={theme} />
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
});

interface ToolCallsListProps {
  toolInvocations: ToolInvocationUIPart[];
  toolCallAnnotations: ToolCallAnnotation[];
  addToolResult: ({ toolCallId, result }: { toolCallId: string; result: any }) => void;
  theme: Theme;
}

const ToolCallsList = memo(({ toolInvocations, toolCallAnnotations, addToolResult, theme }: ToolCallsListProps) => {
  const [expanded, setExpanded] = useState<{ [id: string]: boolean }>({});

  // OS detection for shortcut display
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  const toggleExpand = (toolCallId: string) => {
    setExpanded((prev) => ({
      ...prev,
      [toolCallId]: !prev[toolCallId],
    }));
  };

  useEffect(() => {
    const expandedState: { [id: string]: boolean } = {};
    toolInvocations.forEach((inv) => {
      if (inv.toolInvocation.state === 'call') {
        expandedState[inv.toolInvocation.toolCallId] = true;
      }
    });
    setExpanded(expandedState);
  }, [toolInvocations]);

  // Keyboard shortcut logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input/textarea/contenteditable
      const active = document.activeElement as HTMLElement | null;

      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
        return;
      }

      if (Object.keys(expanded).length === 0) {
        return;
      }

      const openId = Object.keys(expanded).find((id) => expanded[id]);

      if (!openId) {
        return;
      }

      // Cancel: Cmd/Ctrl + Backspace
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key === 'Backspace') {
        e.preventDefault();
        addToolResult({
          toolCallId: openId,
          result: TOOL_EXECUTION_APPROVAL.REJECT,
        });
      }

      // Run tool: Cmd/Ctrl + Enter
      if ((isMac ? e.metaKey : e.ctrlKey) && (e.key === 'Enter' || e.key === 'Return')) {
        e.preventDefault();
        addToolResult({
          toolCallId: openId,
          result: TOOL_EXECUTION_APPROVAL.APPROVE,
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expanded, addToolResult, isMac]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
      <ul className="list-none space-y-4">
        {toolInvocations.map((tool, index) => {
          const toolCallState = tool.toolInvocation.state;

          if (toolCallState !== 'call') {
            return null;
          }

          const { toolName, toolCallId } = tool.toolInvocation;
          const annotation = toolCallAnnotations.find((annotation) => annotation.toolCallId === toolCallId);

          return (
            <motion.li
              key={index}
              variants={toolVariants}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.2, ease: cubicEasingFn }}
            >
              <div className="">
                <div key={toolCallId} className="flex flex-col gap-1">
                  <div className="text-bolt-elements-text-secondary flex items-center text-sm font-semibold">
                    <button
                      onClick={() => toggleExpand(toolCallId)}
                      className="mr-1 bg-transparent focus:outline-hidden"
                      aria-label={expanded[toolCallId] ? 'Collapse' : 'Expand'}
                      tabIndex={0}
                      type="button"
                    >
                      <span
                        className={`i-ph:caret-down-bold inline-block transition-transform duration-150 ${expanded[toolCallId] ? '' : '-rotate-90'}`}
                      />
                    </button>
                    Calling MCP tool{' '}
                    <span className="bg-darken-50 ml-0.5 rounded-md px-1.5 py-0.5 font-mono font-light text-black">
                      {toolName}
                    </span>
                  </div>
                  {expanded[toolCallId] && (
                    <div className="flex gap-3">
                      <div className="bg-darken-50 ml-1.5 min-h-[40px] w-[0.1px]" />
                      <div className="flex w-full flex-col gap-1">
                        <div className="text-bolt-elements-text-secondary mb-1 text-xs">
                          Description: <span className="font-semibold text-black">{annotation?.toolDescription}</span>
                        </div>
                        <div className="flex w-full items-stretch space-x-2">
                          <div className="bg-darken-50 border-bolt-elements-border-color ml-0 w-full rounded-md border-l-2 p-3">
                            <JsonCodeBlock
                              className="mb-0"
                              code={JSON.stringify(tool.toolInvocation.args, null, 2)}
                              theme={theme}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2.5">
                    <button
                      className={cn(
                        'rounded-lg px-2.5 py-1.5 text-xs',
                        'bg-transparent',
                        'text-bolt-elements-text-tertiary hover:text-black',
                        'transition-all duration-200',
                        'flex items-center gap-2',
                      )}
                      onClick={() =>
                        addToolResult({
                          toolCallId,
                          result: TOOL_EXECUTION_APPROVAL.REJECT,
                        })
                      }
                    >
                      Cancel <span className="ml-1 text-xs opacity-70">{isMac ? '⌘⌫' : 'Ctrl+Backspace'}</span>
                    </button>
                    <button
                      className={cn(
                        'inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-normal transition-colors',
                        'bg-accent-500 hover:bg-accent-600',
                        'text-black',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                      )}
                      onClick={() =>
                        addToolResult({
                          toolCallId,
                          result: TOOL_EXECUTION_APPROVAL.APPROVE,
                        })
                      }
                    >
                      Run tool <span className="ml-1 text-xs opacity-70">{isMac ? '⌘↵' : 'Ctrl+Enter'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
});
