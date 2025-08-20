import { useStore } from '@nanostores/react';
import { AnimatePresence, motion } from 'framer-motion';
import { computed } from 'nanostores';
import { memo, useEffect, useRef, useState } from 'react';
import { createHighlighter, type BundledLanguage, type BundledTheme, type HighlighterGeneric } from 'shiki';
import type { ActionState } from '~/lib/runtime/action-runner';
import { workbenchStore } from '~/lib/stores/workbench';
import { cn } from '~/utils/cn';
import { cubicEasingFn } from '~/utils/easings';
import { WORK_DIR } from '~/utils/constants';
import { LoadingSpinner } from '~/components/ui/loading-spinner';
import { Icon } from '~/components/ui';

const highlighterOptions = {
  langs: ['shell'],
  themes: ['light-plus', 'dark-plus'],
};

const shellHighlighter: HighlighterGeneric<BundledLanguage, BundledTheme> =
  import.meta.hot?.data.shellHighlighter ?? (await createHighlighter(highlighterOptions));

if (import.meta.hot) {
  import.meta.hot.data.shellHighlighter = shellHighlighter;
}

interface ArtifactProps {
  messageId: string;
}

export const Artifact = memo(({ messageId }: ArtifactProps) => {
  const userToggledActions = useRef(false);
  const [showActions, setShowActions] = useState(false);
  const [allActionFinished, setAllActionFinished] = useState(false);

  const artifacts = useStore(workbenchStore.artifacts);
  const artifact = artifacts[messageId];

  const actions = useStore(
    computed(artifact.runner.actions, (actions) => {
      // Filter out Supabase actions except for migrations
      return Object.values(actions).filter((action) => {
        // Exclude actions with type 'supabase' or actions that contain 'supabase' in their content
        return action.type !== 'supabase' && !(action.type === 'shell' && action.content?.includes('supabase'));
      });
    }),
  );

  const toggleActions = () => {
    userToggledActions.current = true;
    setShowActions(!showActions);
  };

  useEffect(() => {
    if (actions.length && !showActions && !userToggledActions.current) {
      setShowActions(true);
    }

    if (actions.length !== 0 && artifact.type === 'bundled') {
      const finished = !actions.find(
        (action) => action.status !== 'complete' && !(action.type === 'start' && action.status === 'running'),
      );

      if (allActionFinished !== finished) {
        setAllActionFinished(finished);
      }
    }
  }, [actions, artifact.type, allActionFinished]);

  // Determine the dynamic title based on state for bundled artifacts
  const dynamicTitle =
    artifact?.type === 'bundled'
      ? allActionFinished
        ? artifact.id === 'restored-project-setup'
          ? 'Project Restored' // Title when restore is complete
          : 'Project Created' // Title when initial creation is complete
        : artifact.id === 'restored-project-setup'
          ? 'Restoring Project...' // Title during restore
          : 'Creating Project...' // Title during initial creation
      : artifact?.title; // Fallback to original title for non-bundled or if artifact is missing

  return (
    <>
      <div className="artifact transition-border flex w-full flex-col overflow-hidden rounded-lg border duration-150">
        <div className={cn('flex', showActions && 'border-b')}>
          <button
            className="hover:bg-bolt-elements-artifacts-backgroundHover flex w-full items-stretch overflow-hidden"
            onClick={() => {
              const showWorkbench = workbenchStore.showWorkbench.get();
              workbenchStore.showWorkbench.set(!showWorkbench);
            }}
          >
            <div className="w-full p-3.5 px-5 text-left">
              <div className="w-full text-base leading-5 font-medium text-black">
                {/* Use the dynamic title here */}
                {dynamicTitle}
              </div>
              <div className="mt-0.5 w-full text-sm">Click to open Workbench</div>
            </div>
          </button>
          {artifact.type !== 'bundled' && <div className="bg-bolt-elements-artifacts-borderColor w-px" />}
          <AnimatePresence>
            {actions.length && artifact.type !== 'bundled' && (
              <motion.button
                initial={{ width: 0 }}
                animate={{ width: 'auto' }}
                exit={{ width: 0 }}
                transition={{ duration: 0.15, ease: cubicEasingFn }}
                className="bg-bolt-elements-artifacts-background hover:bg-bolt-elements-artifacts-backgroundHover"
                onClick={toggleActions}
              >
                <div className="p-4">
                  {showActions ? <Icon.NavArrowUp className="size-4" /> : <Icon.NavArrowDown className="size-4" />}
                </div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        {artifact.type === 'bundled' && (
          <div className="bg-bolt-elements-actions-background border-bolt-elements-artifacts-borderColor flex items-center gap-1.5 border-t p-5">
            <div className={cn('text-lg', getIconColor(allActionFinished ? 'complete' : 'running'))}>
              {allActionFinished ? <Icon.Check className="size-4" /> : <LoadingSpinner spinnerSize="sm" />}
            </div>
            <div className="text-base leading-5 font-medium">
              {/* This status text remains the same */}
              {allActionFinished
                ? artifact.id === 'restored-project-setup'
                  ? 'Restore files from snapshot'
                  : 'Initial files created'
                : 'Creating initial files'}
            </div>
          </div>
        )}
        <AnimatePresence>
          {artifact.type !== 'bundled' && showActions && actions.length > 0 && (
            <motion.div
              className="actions"
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: '0px' }}
              transition={{ duration: 0.15 }}
            >
              <div className="bg-bolt-elements-artifacts-borderColor h-px" />

              <div className="bg-bolt-elements-actions-background p-5 text-left">
                <ActionList actions={actions} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
});

interface ShellCodeBlockProps {
  classsName?: string;
  code: string;
}

function ShellCodeBlock({ classsName, code }: ShellCodeBlockProps) {
  return (
    <div
      className={cn('text-sm', classsName)}
      dangerouslySetInnerHTML={{
        __html: shellHighlighter.codeToHtml(code, {
          lang: 'shell',
          theme: 'dark-plus',
        }),
      }}
    ></div>
  );
}

interface ActionListProps {
  actions: ActionState[];
}

const actionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function openArtifactInWorkbench(filePath: any) {
  if (workbenchStore.currentView.get() !== 'code') {
    workbenchStore.currentView.set('code');
  }

  workbenchStore.setSelectedFile(`${WORK_DIR}/${filePath}`);
}

const ActionList = memo(({ actions }: ActionListProps) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
      <ul className="list-none space-y-2.5">
        {actions.map((action, index) => {
          const { status, type, content } = action;
          const isLast = index === actions.length - 1;

          return (
            <motion.li
              key={index}
              variants={actionVariants}
              initial="hidden"
              animate="visible"
              transition={{
                duration: 0.2,
                ease: cubicEasingFn,
              }}
            >
              <div className="flex items-center gap-1.5 text-base">
                <div className={cn('text-lg', getIconColor(action.status))}>
                  {status === 'running' ? (
                    <>{type !== 'start' ? <LoadingSpinner spinnerSize="sm" /> : <Icon.Terminal className="size-4" />}</>
                  ) : status === 'pending' ? (
                    <Icon.Clock className="size-4" />
                  ) : status === 'complete' ? (
                    <Icon.Check className="size-4 text-green-900" />
                  ) : status === 'failed' || status === 'aborted' ? (
                    <Icon.X className="size-4" />
                  ) : null}
                </div>
                {type === 'file' ? (
                  <div>
                    Create{' '}
                    <code
                      className="cursor-pointer rounded-md px-1.5 py-1 hover:underline"
                      onClick={() => openArtifactInWorkbench(action.filePath)}
                    >
                      {action.filePath}
                    </code>
                  </div>
                ) : type === 'shell' ? (
                  <div className="flex min-h-[28px] w-full items-center">
                    <span className="flex-1">Run command</span>
                  </div>
                ) : type === 'start' ? (
                  <a
                    onClick={(e) => {
                      e.preventDefault();
                      workbenchStore.currentView.set('preview');
                    }}
                    className="flex min-h-[28px] w-full items-center"
                  >
                    <span className="flex-1">Start Application</span>
                  </a>
                ) : null}
              </div>
              {(type === 'shell' || type === 'start') && (
                <ShellCodeBlock
                  classsName={cn('mt-1', {
                    'mb-3.5': !isLast,
                  })}
                  code={content}
                />
              )}
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
});

function getIconColor(status: ActionState['status']) {
  switch (status) {
    case 'pending': {
      return 'text-bolt-elements-text-tertiary';
    }
    case 'running': {
      return 'text-bolt-elements-loader-progress';
    }
    case 'complete': {
      return 'text-bolt-elements-icon-success';
    }
    case 'aborted': {
      return 'text-bolt-elements-text-secondary';
    }
    case 'failed': {
      return 'text-bolt-elements-icon-error';
    }
    default: {
      return undefined;
    }
  }
}
