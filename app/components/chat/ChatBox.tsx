import React from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { cn } from '~/utils/cn';
import { PROVIDER_LIST } from '~/utils/constants';
import { ModelSelector } from '~/components/chat/ModelSelector';
import { APIKeyManager } from './APIKeyManager';
import { LOCAL_PROVIDERS } from '~/lib/stores/settings';
import FilePreview from './FilePreview';
import { ScreenshotStateManager } from './ScreenshotStateManager';
import { SendButton } from './SendButton.client';
import { toast } from 'react-toastify';

import { ExpoQrModal } from '~/components/workbench/ExpoQrModal';
import type { ProviderInfo } from '~/types/model';
import type { DesignScheme } from '~/types/design-scheme';
import type { ElementInfo } from '~/components/workbench/Inspector';
import { LoadingSpinner } from '~/components/ui/loading-spinner';
import { Toggle, Icon, Button } from '~/components/ui';
import { AdditionalOptions } from './additional-options';

interface ChatBoxProps {
  isModelSettingsCollapsed: boolean;
  setIsModelSettingsCollapsed: (collapsed: boolean) => void;
  provider: any;
  providerList: any[];
  modelList: any[];
  apiKeys: Record<string, string>;
  isModelLoading: string | undefined;
  onApiKeysChange: (providerName: string, apiKey: string) => void;
  uploadedFiles: File[];
  imageDataList: string[];
  textareaRef: React.RefObject<HTMLTextAreaElement> | undefined;
  input: string;
  handlePaste: (e: React.ClipboardEvent) => void;
  TEXTAREA_MIN_HEIGHT: number;
  TEXTAREA_MAX_HEIGHT: number;
  isStreaming: boolean;
  handleSendMessage: (event: React.UIEvent, messageInput?: string) => void;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  speechRecognitionSupported?: boolean;
  chatStarted: boolean;
  exportChat?: () => void;
  qrModalOpen: boolean;
  setQrModalOpen: (open: boolean) => void;
  handleFileUpload: () => void;
  setProvider?: ((provider: ProviderInfo) => void) | undefined;
  model?: string | undefined;
  setModel?: ((model: string) => void) | undefined;
  setUploadedFiles?: ((files: File[]) => void) | undefined;
  setImageDataList?: ((dataList: string[]) => void) | undefined;
  handleInputChange?: ((event: React.ChangeEvent<HTMLTextAreaElement>) => void) | undefined;
  handleStop?: (() => void) | undefined;
  enhancingPrompt?: boolean | undefined;
  enhancePrompt?: (() => void) | undefined;
  chatMode?: 'discuss' | 'build';
  setChatMode?: (mode: 'discuss' | 'build') => void;
  designScheme?: DesignScheme;
  setDesignScheme?: (scheme: DesignScheme) => void;
  selectedElement?: ElementInfo | null;
  setSelectedElement?: ((element: ElementInfo | null) => void) | undefined;
  isInspectorMode?: boolean;
  toggleInspectorMode?: () => void;
  currentView?: 'code' | 'diff' | 'preview';
}

export const ChatBox: React.FC<ChatBoxProps> = (props) => {
  return (
    <div className={cn('max-w-chat z-prompt relative mx-auto w-full backdrop-blur-sm')}>
      <div>
        <ClientOnly>
          {() => (
            <div className={props.isModelSettingsCollapsed ? 'hidden' : 'hidden'}>
              <ModelSelector
                key={props.provider?.name + ':' + props.modelList.length}
                model={props.model}
                setModel={props.setModel}
                modelList={props.modelList}
                provider={props.provider}
                setProvider={props.setProvider}
                providerList={props.providerList || (PROVIDER_LIST as ProviderInfo[])}
                apiKeys={props.apiKeys}
                modelLoading={props.isModelLoading}
              />
              {(props.providerList || []).length > 0 &&
                props.provider &&
                (!LOCAL_PROVIDERS.includes(props.provider.name) || 'OpenAILike') && (
                  <APIKeyManager
                    provider={props.provider}
                    apiKey={props.apiKeys[props.provider.name] || ''}
                    setApiKey={(key) => {
                      props.onApiKeysChange(props.provider.name, key);
                    }}
                  />
                )}
            </div>
          )}
        </ClientOnly>
      </div>
      <FilePreview
        files={props.uploadedFiles}
        imageDataList={props.imageDataList}
        onRemove={(index) => {
          props.setUploadedFiles?.(props.uploadedFiles.filter((_, i) => i !== index));
          props.setImageDataList?.(props.imageDataList.filter((_, i) => i !== index));
        }}
      />
      <ClientOnly>
        {() => (
          <ScreenshotStateManager
            setUploadedFiles={props.setUploadedFiles}
            setImageDataList={props.setImageDataList}
            uploadedFiles={props.uploadedFiles}
            imageDataList={props.imageDataList}
          />
        )}
      </ClientOnly>
      {props.selectedElement && (
        <div className="border-b-none mx-1.5 flex items-center justify-between gap-2 rounded-lg rounded-b-none border px-2.5 py-1 text-sm font-medium">
          <div className="flex items-center gap-2 lowercase">
            <code className="mr-0.5 rounded-md bg-green-500 px-1.5 py-1 text-white">
              {props?.selectedElement?.tagName}
            </code>
            selected for inspection
          </div>
          <button
            className="text-accent-500 pointer-auto bg-transparent"
            onClick={() => props.setSelectedElement?.(null)}
          >
            Clear
          </button>
        </div>
      )}
      <div
        className={cn(
          'relative rounded-2xl border bg-white px-2 pt-1 backdrop-blur-sm outline-none focus:ring-1 focus:outline-none',
        )}
      >
        <textarea
          ref={props.textareaRef}
          className={cn(
            'w-full resize-none bg-transparent pt-4 pr-16 pl-4 text-base outline-hidden',
            'transition-all duration-200',
            'hover:border-bolt-elements-focus',
          )}
          onDragEnter={(e) => {
            e.preventDefault();
            e.currentTarget.style.border = '2px solid #1488fc';
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.style.border = '2px solid #1488fc';
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';

            const files = Array.from(e.dataTransfer.files);
            files.forEach((file) => {
              if (file.type.startsWith('image/')) {
                const reader = new FileReader();

                reader.onload = (e) => {
                  const base64Image = e.target?.result as string;
                  props.setUploadedFiles?.([...props.uploadedFiles, file]);
                  props.setImageDataList?.([...props.imageDataList, base64Image]);
                };
                reader.readAsDataURL(file);
              }
            });
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              if (event.shiftKey) {
                return;
              }

              event.preventDefault();

              if (props.isStreaming) {
                props.handleStop?.();
                return;
              }

              // ignore if using input method engine
              if (event.nativeEvent.isComposing) {
                return;
              }

              props.handleSendMessage?.(event);
            }
          }}
          value={props.input}
          onChange={(event) => {
            props.handleInputChange?.(event);
          }}
          onPaste={props.handlePaste}
          style={{
            minHeight: props.TEXTAREA_MIN_HEIGHT,
            maxHeight: props.TEXTAREA_MAX_HEIGHT,
          }}
          placeholder={
            props.chatMode === 'build' ? 'How can Modern help you today?' : 'What would you like to discuss?'
          }
          translate="no"
        />
        <div className="flex items-center justify-between px-2 pt-2 pb-3 text-sm [&_svg]:size-4">
          <div className="flex items-center gap-0.5">
            <AdditionalOptions handleFileUpload={props.handleFileUpload} />
            {/* <ColorSchemeDialog designScheme={props.designScheme} setDesignScheme={props.setDesignScheme} /> */}
            {/* <McpTools /> */}
            <Button
              variant="ghost"
              title="Enhance prompt"
              disabled={props.input.length === 0 || props.enhancingPrompt}
              className="size-8 p-0"
              onClick={() => {
                props.enhancePrompt?.();
                toast.success('Prompt enhanced!');
              }}
            >
              {props.enhancingPrompt ? <LoadingSpinner /> : <Icon.MagicWand />}
            </Button>

            {/* <SpeechRecognitionButton
              isListening={props.isListening}
              onStart={() => {
                console.log('Ho');
                props.startListening();
              }}
              onStop={props.stopListening}
              disabled={props.isStreaming || !props.speechRecognitionSupported}
              speechRecognitionSupported={props.speechRecognitionSupported}
            /> */}
            {props.toggleInspectorMode && (
              <Toggle
                pressed={props.isInspectorMode}
                onPressedChange={props.toggleInspectorMode}
                aria-label="Toggle inspector mode"
                className="size-8 gap-0.5 rounded-lg border-0 text-sm"
                disabled={props.currentView !== 'preview'}
              >
                <Icon.CursorPointer className="size-4" />
              </Toggle>
            )}
            {/* <IconButton
              title="Model Settings"
              className={cn('flex items-center gap-1 transition-all', {
                'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent':
                  props.isModelSettingsCollapsed,
                'bg-bolt-elements-item-backgroundDefault text-bolt-elements-item-contentDefault':
                  !props.isModelSettingsCollapsed,
              })}
              onClick={() => props.setIsModelSettingsCollapsed(!props.isModelSettingsCollapsed)}
              disabled={!props.providerList || props.providerList.length === 0}
            >
              {props.isModelSettingsCollapsed ? (
                <Icon.NavArrowRight className="size-4" />
              ) : (
                <Icon.NavArrowDown className="size-4" />
              )}
              {props.isModelSettingsCollapsed ? <span className="text-sm">{props.model}</span> : <span />}
            </IconButton> */}
          </div>
          <div className="flex items-center gap-1">
            <ClientOnly>
              {() => (
                <>
                  {props.chatStarted && (
                    <Toggle
                      pressed={props.chatMode === 'discuss'}
                      onPressedChange={() => {
                        props.setChatMode?.(props.chatMode === 'discuss' ? 'build' : 'discuss');
                      }}
                      className="h-7 w-fit gap-0.5 rounded-full px-2.5 text-sm"
                      aria-label="Discuss"
                    >
                      <Icon.LightBulb className="size-3" />
                      Chat
                    </Toggle>
                  )}
                  <SendButton
                    show={props.input.length > 0 || props.isStreaming || props.uploadedFiles.length > 0}
                    isStreaming={props.isStreaming}
                    disabled={!props.providerList || props.providerList.length === 0 || props.input.length === 0}
                    onClick={(event) => {
                      if (props.isStreaming) {
                        props.handleStop?.();
                        return;
                      }

                      if (props.input.length > 0 || props.uploadedFiles.length > 0) {
                        props.handleSendMessage?.(event);
                      }
                    }}
                  />
                </>
              )}
            </ClientOnly>
          </div>
          {/* {props.input.length > 3 ? (
            <div className="text-bolt-elements-text-tertiary text-xs">
              Use <kbd className="kdb bg-bolt-elements-background-depth-2 rounded-sm px-1.5 py-0.5">Shift</kbd> +{' '}
              <kbd className="kdb bg-bolt-elements-background-depth-2 rounded-sm px-1.5 py-0.5">Return</kbd> a new line
            </div>
          ) : null} */}
          {/* <SupabaseConnection /> */}
          <ExpoQrModal open={props.qrModalOpen} onClose={() => props.setQrModalOpen(false)} />
        </div>
      </div>
    </div>
  );
};
