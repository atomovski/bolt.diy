import { useStore } from '@nanostores/react';
import { motion, type Variants } from 'framer-motion';
import { computed } from 'nanostores';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type { FileHistory } from '~/types/actions';
import { DiffView } from './DiffView';
import {
  type OnChangeCallback as OnEditorChange,
  type OnScrollCallback as OnEditorScroll,
} from '~/components/editor/codemirror/CodeMirrorEditor';

/*
 * import { IconButton } from '~/components/ui/IconButton';
 * import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
 */
import { workbenchStore } from '~/lib/stores/workbench';

// import { cn } from '~/utils/cn';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { EditorPanel } from './EditorPanel';
import { Preview } from './Preview';
import { PushToGitHubDialog } from '~/components/@settings/tabs/connections/components/PushToGitHubDialog';

// import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { usePreviewStore } from '~/lib/stores/previews';
import type { ElementInfo } from './Inspector';
import { ProgressLoader } from './ProgressLoader';

interface WorkspaceProps {
  chatStarted?: boolean;
  isStreaming?: boolean;
  metadata?: {
    gitUrl?: string;
  };
  updateChatMestaData?: (metadata: any) => void;
  setSelectedElement?: (element: ElementInfo | null) => void;
  isInspectorMode?: boolean;
  toggleInspectorMode?: () => void;
  onViewChange?: (view: 'code' | 'diff' | 'preview') => void;
}

const workbenchVariants = {
  closed: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

export const Workbench = ({
  chatStarted,
  isStreaming,
  metadata,
  updateChatMestaData,
  setSelectedElement,
  isInspectorMode,
  toggleInspectorMode,
  onViewChange,
}: WorkspaceProps) => {
  renderLogger.trace('Workbench');

  const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);
  const [fileHistory, setFileHistory] = useState<Record<string, FileHistory>>({});

  // const modifiedFiles = Array.from(useStore(workbenchStore.unsavedFiles).keys());

  const hasPreview = useStore(computed(workbenchStore.previews, (previews) => previews.length > 0));
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const selectedFile = useStore(workbenchStore.selectedFile);
  const currentDocument = useStore(workbenchStore.currentDocument);
  const unsavedFiles = useStore(workbenchStore.unsavedFiles);
  const files = useStore(workbenchStore.files);
  const selectedView = useStore(workbenchStore.currentView);

  useEffect(() => {
    if (hasPreview) {
      workbenchStore.currentView.set('preview');
    }
  }, [hasPreview]);

  useEffect(() => {
    onViewChange?.(selectedView);
  }, [selectedView, onViewChange]);

  useEffect(() => {
    workbenchStore.setDocuments(files);
  }, [files]);

  const onEditorChange = useCallback<OnEditorChange>((update) => {
    workbenchStore.setCurrentDocumentContent(update.content);
  }, []);

  const onEditorScroll = useCallback<OnEditorScroll>((position) => {
    workbenchStore.setCurrentDocumentScrollPosition(position);
  }, []);

  const onFileSelect = useCallback((filePath: string | undefined) => {
    workbenchStore.setSelectedFile(filePath);
  }, []);

  const onFileSave = useCallback(() => {
    workbenchStore
      .saveCurrentDocument()
      .then(() => {
        // Explicitly refresh all previews after a file save
        const previewStore = usePreviewStore();
        previewStore.refreshAllPreviews();
      })
      .catch(() => {
        toast.error('Failed to update file content');
      });
  }, []);

  const onFileReset = useCallback(() => {
    workbenchStore.resetCurrentDocument();
  }, []);

  /*
   * const handleSyncFiles = useCallback(async () => {
   *   setIsSyncing(true);
   */

  /*
   *   try {
   *     const directoryHandle = await window.showDirectoryPicker();
   *     await workbenchStore.syncFiles(directoryHandle);
   *     toast.success('Files synced successfully');
   *   } catch (error) {
   *     console.error('Error syncing files:', error);
   *     toast.error('Failed to sync files');
   *   } finally {
   *     setIsSyncing(false);
   *   }
   * }, []);
   */

  /*
   * const handleSelectFile = useCallback((filePath: string) => {
   *   workbenchStore.setSelectedFile(filePath);
   *   workbenchStore.currentView.set('diff');
   * }, []);
   */

  return (
    chatStarted && (
      <motion.div
        initial="closed"
        animate={showWorkbench ? 'open' : 'closed'}
        variants={workbenchVariants}
        className="z-workbench flex h-full w-full flex-col"
      >
        <div className="relative flex h-full w-full flex-col overflow-hidden">
          <ProgressLoader isVisible={isStreaming || false} />
          <div className="flex h-full w-full flex-col overflow-hidden shadow-xs">
            {/* <div className="border-bolt-elements-border-color flex items-center gap-1.5 border-b px-3 py-2">
                <div className="ml-auto" />
                {selectedView === 'code' && (
                  <div className="flex overflow-y-auto">
                    <PanelHeaderButton
                      className="mr-1 text-sm"
                      onClick={() => {
                        workbenchStore.toggleTerminal(!workbenchStore.showTerminal.get());
                      }}
                    >
                      <div className="i-ph:terminal" />
                      Toggle Terminal
                    </PanelHeaderButton>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger className="text-bolt-elements-item-contentDefault enabled:hover:text-bolt-elements-item-contentActive enabled:hover:bg-bolt-elements-item-backgroundActive flex items-center gap-1 rounded-md bg-transparent p-1 text-sm disabled:cursor-not-allowed">
                        <div className="i-ph:box-arrow-up" />
                        Sync
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content
                        className={cn(
                          'z-250 min-w-[240px]',
                          'bg-white dark:bg-[#141414]',
                          'rounded-lg shadow-lg',
                          'border border-gray-200/50 dark:border-gray-800/50',
                          'animate-in fade-in-0 zoom-in-95',
                          'py-1',
                        )}
                        sideOffset={5}
                        align="end"
                      >
                        <DropdownMenu.Item
                          className={cn(
                            'text-black hover:bg-bolt-elements-item-backgroundActive group relative flex w-full cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm',
                          )}
                          onClick={handleSyncFiles}
                          disabled={isSyncing}
                        >
                          <div className="flex items-center gap-2">
                            {isSyncing ? <div className="i-ph:spinner" /> : <div className="i-ph:cloud-arrow-down" />}
                            <span>{isSyncing ? 'Syncing...' : 'Sync Files'}</span>
                          </div>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          className={cn(
                            'text-black hover:bg-bolt-elements-item-backgroundActive group relative flex w-full cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm',
                          )}
                          onClick={() => setIsPushDialogOpen(true)}
                        >
                          <div className="flex items-center gap-2">
                            <div className="i-ph:git-branch" />
                            Push to GitHub
                          </div>
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  </div>
                )}

                {selectedView === 'diff' && (
                  <FileModifiedDropdown fileHistory={fileHistory} onSelectFile={handleSelectFile} />
                )}
                <IconButton
                  icon="i-ph:x-circle"
                  className="-mr-1"
                  size="xl"
                  onClick={() => {
                    workbenchStore.showWorkbench.set(false);
                  }}
                />
              </div> */}
            <div className="relative flex-1">
              {selectedView === 'preview' && (
                <div className="absolute inset-0">
                  <Preview
                    setSelectedElement={setSelectedElement}
                    isInspectorMode={isInspectorMode}
                    toggleInspectorMode={toggleInspectorMode}
                  />
                </div>
              )}
              {selectedView === 'code' && (
                <div className="absolute inset-0 rounded-t-xl border-t border-l">
                  <EditorPanel
                    editorDocument={currentDocument}
                    isStreaming={isStreaming}
                    selectedFile={selectedFile}
                    files={files}
                    unsavedFiles={unsavedFiles}
                    fileHistory={fileHistory}
                    onFileSelect={onFileSelect}
                    onEditorScroll={onEditorScroll}
                    onEditorChange={onEditorChange}
                    onFileSave={onFileSave}
                    onFileReset={onFileReset}
                  />
                </div>
              )}
              {selectedView === 'diff' && (
                <div className="absolute inset-0">
                  <DiffView fileHistory={fileHistory} setFileHistory={setFileHistory} />
                </div>
              )}
            </div>
          </div>
        </div>
        <PushToGitHubDialog
          isOpen={isPushDialogOpen}
          onClose={() => setIsPushDialogOpen(false)}
          onPush={async (repoName, username, token, isPrivate) => {
            try {
              console.log('Dialog onPush called with isPrivate =', isPrivate);

              const commitMessage = prompt('Please enter a commit message:', 'Initial commit') || 'Initial commit';
              const repoUrl = await workbenchStore.pushToGitHub(repoName, commitMessage, username, token, isPrivate);

              if (updateChatMestaData && !metadata?.gitUrl) {
                updateChatMestaData({
                  ...(metadata || {}),
                  gitUrl: repoUrl,
                });
              }

              return repoUrl;
            } catch (error) {
              console.error('Error pushing to GitHub:', error);
              toast.error('Failed to push to GitHub');
              throw error;
            }
          }}
        />
      </motion.div>
    )
  );
};
