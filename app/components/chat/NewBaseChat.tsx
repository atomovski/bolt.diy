/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import type { JSONValue, Message } from 'ai';
import React, { type RefCallback, useEffect, useState } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { cn } from '~/utils/cn';
import { PROVIDER_LIST } from '~/utils/constants';
import { Messages } from './Messages.client';
import { getApiKeysFromCookies } from './APIKeyManager';
import Cookies from 'js-cookie';
import * as Tooltip from '@radix-ui/react-tooltip';
import styles from './BaseChat.module.scss';
import { ImportButtons } from '~/components/chat/chatExportAndImport/ImportButtons';
import { ExamplePrompts } from '~/components/chat/ExamplePrompts';
import GitCloneButton from './GitCloneButton';
import type { ProviderInfo } from '~/types/model';
import StarterTemplates from './StarterTemplates';
import type { ActionAlert, SupabaseAlert, DeployAlert, LlmErrorAlertType } from '~/types/actions';
import DeployChatAlert from '~/components/deploy/DeployAlert';
import ChatAlert from './ChatAlert';
import type { ModelInfo } from '~/lib/modules/llm/types';
import ProgressCompilation from './ProgressCompilation';
import type { ProgressAnnotation } from '~/types/context';
import { SupabaseChatAlert } from '~/components/chat/SupabaseAlert';
import { expoUrlAtom } from '~/lib/stores/qrCodeStore';
import { useStore } from '@nanostores/react';
import { StickToBottom, useStickToBottomContext } from '~/lib/hooks';
import { ChatBox } from './ChatBox';
import type { DesignScheme } from '~/types/design-scheme';
import type { ElementInfo } from '~/components/workbench/Inspector';
import LlmErrorAlert from './LLMApiAlert';
import { useLocation } from '@remix-run/react';
import { Icon } from '~/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { Workbench } from '~/components/workbench/Workbench.client';
import { ChatHistory } from './ChatHistory';
import { workbenchStore } from '~/lib/stores/workbench';
import { LoadingAnimation } from './LoadingAnimation';
import { ChatHeader } from './chat-header';
import { WorkbenchHeader } from '~/components/workbench/workbench-header';

const TEXTAREA_MIN_HEIGHT = 76;

interface BaseChatProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement> | undefined;
  messageRef?: RefCallback<HTMLDivElement> | undefined;
  scrollRef?: RefCallback<HTMLDivElement> | undefined;
  showChat?: boolean;
  chatStarted?: boolean;
  isStreaming?: boolean;
  onStreamingChange?: (streaming: boolean) => void;
  messages?: Message[];
  description?: string;
  enhancingPrompt?: boolean;
  promptEnhanced?: boolean;
  input?: string;
  model?: string;
  setModel?: (model: string) => void;
  provider?: ProviderInfo;
  setProvider?: (provider: ProviderInfo) => void;
  providerList?: ProviderInfo[];
  handleStop?: () => void;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  enhancePrompt?: () => void;
  importChat?: (description: string, messages: Message[]) => Promise<void>;
  exportChat?: () => void;
  uploadedFiles?: File[];
  setUploadedFiles?: (files: File[]) => void;
  imageDataList?: string[];
  setImageDataList?: (dataList: string[]) => void;
  actionAlert?: ActionAlert;
  clearAlert?: () => void;
  supabaseAlert?: SupabaseAlert;
  clearSupabaseAlert?: () => void;
  deployAlert?: DeployAlert;
  clearDeployAlert?: () => void;
  llmErrorAlert?: LlmErrorAlertType;
  clearLlmErrorAlert?: () => void;
  data?: JSONValue[] | undefined;
  chatMode?: 'discuss' | 'build';
  setChatMode?: (mode: 'discuss' | 'build') => void;
  append?: (message: Message) => void;
  designScheme?: DesignScheme;
  setDesignScheme?: (scheme: DesignScheme) => void;
  selectedElement?: ElementInfo | null;
  setSelectedElement?: (element: ElementInfo | null) => void;
  isInspectorMode?: boolean;
  toggleInspectorMode?: () => void;
  currentView?: 'code' | 'diff' | 'preview';
  addToolResult?: ({ toolCallId, result }: { toolCallId: string; result: any }) => void;
}

export const BaseChat = React.forwardRef<HTMLDivElement, BaseChatProps>(
  (
    {
      textareaRef,
      showChat = true,
      chatStarted = false,
      isStreaming = false,
      onStreamingChange,
      model,
      setModel,
      provider,
      setProvider,
      providerList,
      input = '',
      enhancingPrompt,
      handleInputChange,

      // promptEnhanced,
      enhancePrompt,
      sendMessage,
      handleStop,
      importChat,
      exportChat,
      uploadedFiles = [],
      setUploadedFiles,
      imageDataList = [],
      setImageDataList,
      messages,
      actionAlert,
      clearAlert,
      deployAlert,
      clearDeployAlert,
      supabaseAlert,
      clearSupabaseAlert,
      llmErrorAlert,
      clearLlmErrorAlert,
      data,
      chatMode,
      setChatMode,
      append,
      designScheme,
      setDesignScheme,
      selectedElement,
      setSelectedElement,
      isInspectorMode,
      toggleInspectorMode,
      currentView: currentViewProp,
      addToolResult = () => {
        throw new Error('addToolResult not implemented');
      },
    },
    ref,
  ) => {
    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;
    const [apiKeys, setApiKeys] = useState<Record<string, string>>(getApiKeysFromCookies());
    const [modelList, setModelList] = useState<ModelInfo[]>([]);
    const [isModelSettingsCollapsed, setIsModelSettingsCollapsed] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
    const [transcript, setTranscript] = useState('');
    const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState<string | undefined>('all');
    const [progressAnnotations, setProgressAnnotations] = useState<ProgressAnnotation[]>([]);
    const expoUrl = useStore(expoUrlAtom);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [currentView, setCurrentView] = useState<'code' | 'diff' | 'preview'>('preview');

    // New state for docked chat
    const location = useLocation();
    const [isExpanded, setIsExpanded] = useState(true);
    const [showChatHistory, setShowChatHistory] = useState(false);
    const isChatPage = location.pathname.startsWith('/chat');

    // Auto-start development server state
    const [hasAutoStarted, setHasAutoStarted] = useState(false);
    const [isAutoStarting, setIsAutoStarting] = useState(false);

    useEffect(() => {
      if (expoUrl) {
        setQrModalOpen(true);
      }
    }, [expoUrl]);

    useEffect(() => {
      if (currentViewProp) {
        setCurrentView(currentViewProp);
      }
    }, [currentViewProp]);

    useEffect(() => {
      if (data) {
        const progressList = data.filter(
          (x) => typeof x === 'object' && (x as any).type === 'progress',
        ) as ProgressAnnotation[];
        setProgressAnnotations(progressList);
      }
    }, [data]);
    useEffect(() => {
      console.log(transcript);
    }, [transcript]);

    useEffect(() => {
      onStreamingChange?.(isStreaming);

      // Hide loading animation when streaming starts
      if (isStreaming && isAutoStarting) {
        setIsAutoStarting(false);
      }
    }, [isStreaming, onStreamingChange, isAutoStarting]);

    // Auto-start development server when workbench/chat page is opened with files

    useEffect(() => {
      const autoStartServer = async () => {
        console.log('[AutoStart] Checking conditions:', {
          isChatPage,
          chatStarted,
          hasSendMessage: !!sendMessage,
          messagesLength: messages?.length || 0,
          hasAutoStarted,
        });

        if (!isChatPage || !sendMessage || hasAutoStarted) {
          console.log('[AutoStart] Skipping - not on chat page, no sendMessage, or already auto-started');
          return;
        }

        // Get workbench files from the store
        const workbenchFiles = workbenchStore?.files?.get?.() || {};
        const fileKeys = Object.keys(workbenchFiles);

        console.log('[AutoStart] Files detected:', fileKeys.length, 'files');

        // Also check for previews already running
        const previewStore = workbenchStore?.previews?.get?.() || [];
        console.log('[AutoStart] Previews running:', previewStore.length);

        /*
         * Auto-start if we have files, chat has started, and no previews are running
         * OR if we're on a fresh chat page with no files (for demo purposes)
         * OR if we're on a chat page with no messages (fresh state)
         */
        const shouldAutoStart =
          (fileKeys.length > 0 && chatStarted && previewStore.length === 0) ||
          (fileKeys.length === 0 && isChatPage && !chatStarted) ||
          (isChatPage && (!messages || messages.length === 0) && previewStore.length === 0);

        console.log('[AutoStart] Should auto-start:', shouldAutoStart);

        if (shouldAutoStart) {
          // Check for common project files that indicate a web project
          const hasPackageJson = fileKeys.some((path) => path.includes('package.json'));
          const hasIndexHtml = fileKeys.some((path) => path.includes('index.html'));
          const hasReactFiles = fileKeys.some((path) => path.includes('.jsx') || path.includes('.tsx'));
          const hasVueFiles = fileKeys.some((path) => path.includes('.vue'));
          const hasAstroFiles = fileKeys.some((path) => path.includes('.astro'));
          const hasNextConfig = fileKeys.some((path) => path.includes('next.config'));
          const hasViteConfig = fileKeys.some((path) => path.includes('vite.config'));
          const hasAngularJson = fileKeys.some((path) => path.includes('angular.json'));
          const hasSvelteConfig = fileKeys.some((path) => path.includes('svelte.config'));

          /*
           * Show loading animation and auto-start server for projects with files
           * OR show just the loading animation for fresh chat pages
           */
          if (hasPackageJson || hasIndexHtml || fileKeys.length === 0) {
            // Determine appropriate dev command based on project type
            let devCommand = 'npm run dev';

            if (hasNextConfig) {
              devCommand = 'npm run dev'; // Next.js
            } else if (hasViteConfig) {
              devCommand = 'npm run dev'; // Vite
            } else if (hasAngularJson) {
              devCommand = 'npm start'; // Angular
            } else if (hasSvelteConfig) {
              devCommand = 'npm run dev'; // SvelteKit
            } else if (hasAstroFiles) {
              devCommand = 'npm run dev'; // Astro
            } else if (hasVueFiles || hasReactFiles) {
              devCommand = 'npm run dev'; // React/Vue
            } else if (hasIndexHtml && !hasPackageJson) {
              devCommand = 'python -m http.server 3000'; // Simple HTML
            }

            // Check if we already have messages about server/npm commands
            const hasServerCommands = messages?.some(
              (msg) =>
                msg.content?.toLowerCase().includes('npm') ||
                msg.content?.toLowerCase().includes('server') ||
                msg.content?.toLowerCase().includes('localhost'),
            );

            if (hasServerCommands) {
              console.log('[AutoStart] Server commands already exist in messages, skipping auto-start');
              return;
            }

            // Check if we've already auto-started (use sessionStorage to track)
            const sessionKey = `autostart-${chatStarted ? 'active' : 'new'}-${fileKeys.length}`;

            if (sessionStorage.getItem(sessionKey)) {
              console.log('[AutoStart] Already auto-started in this session');
              return;
            }

            // Show loading animation
            setIsAutoStarting(true);

            // Mark as auto-started
            sessionStorage.setItem(sessionKey, 'true');
            setHasAutoStarted(true);

            // Only send auto-start message if we have actual project files
            if (fileKeys.length > 0) {
              // Auto-start the development server by sending a message
              const autoStartMessage = `Please install dependencies and start the development server by running: npm install && ${devCommand}`;

              console.log('[AutoStart] Sending auto-start message:', autoStartMessage);

              // Send the message to start the server automatically
              const syntheticEvent = new Event('submit') as any;
              sendMessage(syntheticEvent, autoStartMessage);
            } else {
              console.log('[AutoStart] Fresh page - showing loading animation only');
            }

            // Hide loading animation after some time (when streaming typically starts)
            setTimeout(() => {
              setIsAutoStarting(false);
            }, 8000); // 8 seconds should be enough for the cycling animation
          }
        }
      };

      // Small delay to ensure everything is loaded
      const timer = setTimeout(autoStartServer, 2000);

      return () => clearTimeout(timer);
    }, [isChatPage, chatStarted, sendMessage, messages, hasAutoStarted]);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        // Check for speech recognition support in a more comprehensive way
        const SpeechRecognition =
          window.SpeechRecognition ||
          window.webkitSpeechRecognition ||
          (window as any).mozSpeechRecognition ||
          (window as any).msSpeechRecognition;

        if (SpeechRecognition) {
          try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US'; // Set language explicitly

            recognition.onresult = (event) => {
              const transcript = Array.from(event.results)
                .map((result) => result[0])
                .map((result) => result.transcript)
                .join('');

              setTranscript(transcript);

              if (handleInputChange) {
                const syntheticEvent = {
                  target: { value: transcript },
                } as React.ChangeEvent<HTMLTextAreaElement>;
                handleInputChange(syntheticEvent);
              }
            };

            recognition.onerror = (event) => {
              console.error('Speech recognition error:', event.error);
              setIsListening(false);
            };

            recognition.onend = () => {
              setIsListening(false);
            };

            setRecognition(recognition);
            setSpeechRecognitionSupported(true);
            console.log('Speech recognition initialized successfully');
          } catch (error) {
            console.warn('Speech recognition initialization failed:', error);
            setRecognition(null);
            setSpeechRecognitionSupported(false);
          }
        } else {
          console.warn('Speech recognition not supported in this browser');
          setRecognition(null);
          setSpeechRecognitionSupported(false);
        }
      }
    }, []);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        let parsedApiKeys: Record<string, string> | undefined = {};

        try {
          parsedApiKeys = getApiKeysFromCookies();
          setApiKeys(parsedApiKeys);
        } catch (error) {
          console.error('Error loading API keys from cookies:', error);
          Cookies.remove('apiKeys');
        }

        setIsModelLoading('all');
        fetch('/api/models')
          .then((response) => response.json())
          .then((data) => {
            const typedData = data as { modelList: ModelInfo[] };
            setModelList(typedData.modelList);
          })
          .catch((error) => {
            console.error('Error fetching model list:', error);
          })
          .finally(() => {
            setIsModelLoading(undefined);
          });
      }
    }, [providerList, provider]);

    const onApiKeysChange = async (providerName: string, apiKey: string) => {
      const newApiKeys = { ...apiKeys, [providerName]: apiKey };
      setApiKeys(newApiKeys);
      Cookies.set('apiKeys', JSON.stringify(newApiKeys));

      setIsModelLoading(providerName);

      let providerModels: ModelInfo[] = [];

      try {
        const response = await fetch(`/api/models/${encodeURIComponent(providerName)}`);
        const data = await response.json();
        providerModels = (data as { modelList: ModelInfo[] }).modelList;
      } catch (error) {
        console.error('Error loading dynamic models for:', providerName, error);
      }

      // Only update models for the specific provider
      setModelList((prevModels) => {
        const otherModels = prevModels.filter((model) => model.provider !== providerName);
        return [...otherModels, ...providerModels];
      });
      setIsModelLoading(undefined);
    };

    const startListening = () => {
      console.log('Starting speech recognition...', recognition);

      if (recognition && speechRecognitionSupported) {
        try {
          recognition.start();
          setIsListening(true);
        } catch (error) {
          console.error('Failed to start speech recognition:', error);
          setIsListening(false);
        }
      } else {
        console.warn('Speech recognition not available');
      }
    };

    const stopListening = () => {
      if (recognition) {
        recognition.stop();
        setIsListening(false);
      }
    };

    const handleSendMessage = (event: React.UIEvent, messageInput?: string) => {
      if (sendMessage) {
        sendMessage(event, messageInput);
        setSelectedElement?.(null);

        if (recognition) {
          recognition.abort(); // Stop current recognition
          setTranscript(''); // Clear transcript
          setIsListening(false);

          // Clear the input by triggering handleInputChange with empty value
          if (handleInputChange) {
            const syntheticEvent = {
              target: { value: '' },
            } as React.ChangeEvent<HTMLTextAreaElement>;
            handleInputChange(syntheticEvent);
          }
        }
      }
    };

    const handleFileUpload = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];

        if (file) {
          const reader = new FileReader();

          reader.onload = (e) => {
            const base64Image = e.target?.result as string;
            setUploadedFiles?.([...uploadedFiles, file]);
            setImageDataList?.([...imageDataList, base64Image]);
          };
          reader.readAsDataURL(file);
        }
      };

      input.click();
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;

      if (!items) {
        return;
      }

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();

          const file = item.getAsFile();

          if (file) {
            const reader = new FileReader();

            reader.onload = (e) => {
              const base64Image = e.target?.result as string;
              setUploadedFiles?.([...uploadedFiles, file]);
              setImageDataList?.([...imageDataList, base64Image]);
            };
            reader.readAsDataURL(file);
          }

          break;
        }
      }
    };

    // Render docked version for non-chat pages or when collapsed on chat pages
    if (!isChatPage) {
      return (
        <Tooltip.Provider delayDuration={200}>
          {/* Chat History Panel */}
          <ChatHistory isVisible={showChatHistory} onToggle={() => setShowChatHistory(false)} />

          {/* Docked chat at bottom - rendered outside of layout constraints */}
          <AnimatePresence>
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="fixed inset-x-0 bottom-0 z-50"
            >
              <div className="relative h-full px-6">
                {/* Expand button (only shown on chat pages) */}
                {isChatPage && (
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="border-bolt-elements-borderColor bg-bolt-elements-bg-depth-2 hover:bg-bolt-elements-bg-depth-3 absolute -top-10 right-4 rounded-lg border p-2 transition-colors"
                    aria-label="Expand chat"
                  >
                    <Icon.NavArrowUp className="text-bolt-elements-textPrimary h-5 w-5" />
                  </button>
                )}

                <div className="flex h-full w-full items-center gap-2">
                  <ChatBox
                    isModelSettingsCollapsed={true}
                    setIsModelSettingsCollapsed={setIsModelSettingsCollapsed}
                    provider={provider}
                    setProvider={setProvider}
                    providerList={providerList || (PROVIDER_LIST as ProviderInfo[])}
                    model={model}
                    setModel={setModel}
                    modelList={modelList}
                    apiKeys={apiKeys}
                    isModelLoading={isModelLoading}
                    onApiKeysChange={onApiKeysChange}
                    uploadedFiles={uploadedFiles}
                    setUploadedFiles={setUploadedFiles}
                    imageDataList={imageDataList}
                    setImageDataList={setImageDataList}
                    textareaRef={textareaRef}
                    input={input}
                    handleInputChange={handleInputChange}
                    handlePaste={handlePaste}
                    TEXTAREA_MIN_HEIGHT={40}
                    TEXTAREA_MAX_HEIGHT={60}
                    isStreaming={isStreaming}
                    handleStop={handleStop}
                    handleSendMessage={handleSendMessage}
                    enhancingPrompt={enhancingPrompt}
                    enhancePrompt={enhancePrompt}
                    isListening={isListening}
                    startListening={() => {
                      console.log('he');
                      startListening();
                    }}
                    stopListening={stopListening}
                    speechRecognitionSupported={speechRecognitionSupported}
                    chatStarted={false}
                    exportChat={exportChat}
                    qrModalOpen={qrModalOpen}
                    setQrModalOpen={setQrModalOpen}
                    handleFileUpload={handleFileUpload}
                    chatMode={chatMode}
                    setChatMode={setChatMode}
                    designScheme={designScheme}
                    setDesignScheme={setDesignScheme}
                    selectedElement={selectedElement}
                    setSelectedElement={setSelectedElement}
                    isInspectorMode={isInspectorMode}
                    toggleInspectorMode={toggleInspectorMode}
                    currentView={currentView}
                  />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </Tooltip.Provider>
      );
    }

    if (isChatPage && !isExpanded) {
      return (
        <Tooltip.Provider delayDuration={200}>
          {/* Full-screen workbench when chat is docked */}
          <div className="flex h-full w-full flex-col">
            <div className="flex-1 overflow-hidden">
              <ClientOnly>
                {() => (
                  <Workbench
                    chatStarted={chatStarted}
                    isStreaming={isStreaming}
                    setSelectedElement={setSelectedElement}
                    isInspectorMode={isInspectorMode}
                    toggleInspectorMode={toggleInspectorMode}
                    onViewChange={setCurrentView}
                  />
                )}
              </ClientOnly>
            </div>
          </div>

          {/* Docked chat at bottom - rendered outside of layout constraints */}
          <AnimatePresence>
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="fixed inset-x-0 bottom-0 z-50"
            >
              <div className="relative h-full px-6">
                {/* Chat history toggle button */}
                <button
                  onClick={() => setShowChatHistory(!showChatHistory)}
                  className="border-bolt-elements-borderColor bg-bolt-elements-bg-depth-2 hover:bg-bolt-elements-bg-depth-3 absolute -top-10 left-4 rounded-lg border p-2 transition-colors"
                  aria-label="Toggle chat history"
                >
                  <Icon.Clock className="text-bolt-elements-textPrimary h-5 w-5" />
                </button>

                <div className="flex h-full w-full items-center gap-2">
                  <ChatBox
                    isModelSettingsCollapsed={true}
                    setIsModelSettingsCollapsed={setIsModelSettingsCollapsed}
                    provider={provider}
                    setProvider={setProvider}
                    providerList={providerList || (PROVIDER_LIST as ProviderInfo[])}
                    model={model}
                    setModel={setModel}
                    modelList={modelList}
                    apiKeys={apiKeys}
                    isModelLoading={isModelLoading}
                    onApiKeysChange={onApiKeysChange}
                    uploadedFiles={uploadedFiles}
                    setUploadedFiles={setUploadedFiles}
                    imageDataList={imageDataList}
                    setImageDataList={setImageDataList}
                    textareaRef={textareaRef}
                    input={input}
                    handleInputChange={handleInputChange}
                    handlePaste={handlePaste}
                    TEXTAREA_MIN_HEIGHT={40}
                    TEXTAREA_MAX_HEIGHT={60}
                    isStreaming={isStreaming}
                    handleStop={handleStop}
                    handleSendMessage={handleSendMessage}
                    enhancingPrompt={enhancingPrompt}
                    enhancePrompt={enhancePrompt}
                    isListening={isListening}
                    startListening={startListening}
                    stopListening={stopListening}
                    speechRecognitionSupported={speechRecognitionSupported}
                    chatStarted={false}
                    exportChat={exportChat}
                    qrModalOpen={qrModalOpen}
                    setQrModalOpen={setQrModalOpen}
                    handleFileUpload={handleFileUpload}
                    chatMode={chatMode}
                    setChatMode={setChatMode}
                    designScheme={designScheme}
                    setDesignScheme={setDesignScheme}
                    selectedElement={selectedElement}
                    setSelectedElement={setSelectedElement}
                    isInspectorMode={isInspectorMode}
                    toggleInspectorMode={toggleInspectorMode}
                    currentView={currentView}
                  />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </Tooltip.Provider>
      );
    }

    // Render expanded version on chat pages
    const baseChat = (
      <div
        ref={ref}
        className={cn(styles.BaseChat, 'relative flex h-full w-full overflow-hidden')}
        data-chat-visible={showChat}
      >
        {/* Collapse button for expanded view */}
        {/* {isChatPage && isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-4 right-4 z-50 rounded-lg border p-2 transition-colors"
            aria-label="Collapse chat"
          >
            <Icon.NavArrowDown className="text-bolt-elements-textPrimary h-5 w-5" />
          </button>
        )} */}

        <div className="flex h-full w-full flex-col overflow-y-auto lg:flex-row">
          <div className={cn(styles.Chat, 'flex h-full grow flex-col lg:min-w-(--chat-min-width)')}>
            <ChatHeader />
            {!chatStarted && !isAutoStarting && (
              <div id="intro" className="mx-auto mt-[16vh] max-w-2xl px-4 text-center lg:px-0">
                <h1 className="animate-fade-in mb-4 text-3xl font-bold text-black lg:text-6xl">Where ideas begin</h1>
                <p className="text-md text-bolt-elements-text-secondary animate-fade-in animation-delay-200 mb-8 lg:text-xl">
                  Bring ideas to life in seconds or get help on existing projects.
                </p>
              </div>
            )}

            {/* Loading animation when auto-starting */}
            {isAutoStarting && (
              <div className="mx-auto mt-[20vh] max-w-2xl px-4 text-center lg:px-0">
                <LoadingAnimation isVisible={true} />
              </div>
            )}

            {/* Test button for loading animation (development only) */}
            {!chatStarted && process.env.NODE_ENV === 'development' && (
              <div className="mx-auto mt-4 text-center">
                <button
                  onClick={() => {
                    console.log('[Test] Manually triggering loading animation');
                    setIsAutoStarting(true);
                    setTimeout(() => {
                      console.log('[Test] Stopping loading animation');
                      setIsAutoStarting(false);
                    }, 8000);
                  }}
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  {isAutoStarting ? 'Stop Animation' : 'Test Loading Animation'}
                </button>
              </div>
            )}
            <StickToBottom
              className={cn('relative px-2 sm:px-4', {
                'modern-scrollbar flex h-full flex-col': chatStarted,
              })}
              resize="smooth"
              initial="smooth"
            >
              <StickToBottom.Content className="relative flex flex-col gap-4">
                <ClientOnly>
                  {() => {
                    return chatStarted ? (
                      <Messages
                        className="max-w-chat z-1 mx-auto flex w-full flex-1 flex-col pb-4"
                        messages={messages}
                        isStreaming={isStreaming}
                        append={append}
                        chatMode={chatMode}
                        setChatMode={setChatMode}
                        provider={provider}
                        model={model}
                        addToolResult={addToolResult}
                      />
                    ) : null;
                  }}
                </ClientOnly>
                <ScrollToBottom />
              </StickToBottom.Content>
              <div
                className={cn('max-w-chat z-prompt mx-auto my-auto mb-2 flex w-full flex-col gap-2', {
                  'sticky bottom-2': chatStarted,
                })}
              >
                <div className="flex flex-col gap-2">
                  {deployAlert && (
                    <DeployChatAlert
                      alert={deployAlert}
                      clearAlert={() => clearDeployAlert?.()}
                      postMessage={(message: string | undefined) => {
                        sendMessage?.({} as any, message);
                        clearSupabaseAlert?.();
                      }}
                    />
                  )}
                  {supabaseAlert && (
                    <SupabaseChatAlert
                      alert={supabaseAlert}
                      clearAlert={() => clearSupabaseAlert?.()}
                      postMessage={(message) => {
                        sendMessage?.({} as any, message);
                        clearSupabaseAlert?.();
                      }}
                    />
                  )}
                  {actionAlert && (
                    <ChatAlert
                      alert={actionAlert}
                      clearAlert={() => clearAlert?.()}
                      postMessage={(message) => {
                        sendMessage?.({} as any, message);
                        clearAlert?.();
                      }}
                    />
                  )}
                  {llmErrorAlert && <LlmErrorAlert alert={llmErrorAlert} clearAlert={() => clearLlmErrorAlert?.()} />}
                </div>
                {progressAnnotations && <ProgressCompilation data={progressAnnotations} />}
                <ChatBox
                  isModelSettingsCollapsed={isModelSettingsCollapsed}
                  setIsModelSettingsCollapsed={setIsModelSettingsCollapsed}
                  provider={provider}
                  setProvider={setProvider}
                  providerList={providerList || (PROVIDER_LIST as ProviderInfo[])}
                  model={model}
                  setModel={setModel}
                  modelList={modelList}
                  apiKeys={apiKeys}
                  isModelLoading={isModelLoading}
                  onApiKeysChange={onApiKeysChange}
                  uploadedFiles={uploadedFiles}
                  setUploadedFiles={setUploadedFiles}
                  imageDataList={imageDataList}
                  setImageDataList={setImageDataList}
                  textareaRef={textareaRef}
                  input={input}
                  handleInputChange={handleInputChange}
                  handlePaste={handlePaste}
                  TEXTAREA_MIN_HEIGHT={TEXTAREA_MIN_HEIGHT}
                  TEXTAREA_MAX_HEIGHT={TEXTAREA_MAX_HEIGHT}
                  isStreaming={isStreaming}
                  handleStop={handleStop}
                  handleSendMessage={handleSendMessage}
                  enhancingPrompt={enhancingPrompt}
                  enhancePrompt={enhancePrompt}
                  isListening={isListening}
                  startListening={startListening}
                  stopListening={stopListening}
                  speechRecognitionSupported={speechRecognitionSupported}
                  chatStarted={chatStarted}
                  exportChat={exportChat}
                  qrModalOpen={qrModalOpen}
                  setQrModalOpen={setQrModalOpen}
                  handleFileUpload={handleFileUpload}
                  chatMode={chatMode}
                  setChatMode={setChatMode}
                  designScheme={designScheme}
                  setDesignScheme={setDesignScheme}
                  selectedElement={selectedElement}
                  setSelectedElement={setSelectedElement}
                  isInspectorMode={isInspectorMode}
                  toggleInspectorMode={toggleInspectorMode}
                  currentView={currentView}
                />
              </div>
            </StickToBottom>
            <div className="flex flex-col justify-center">
              {!chatStarted && (
                <div className="flex justify-center gap-2">
                  {ImportButtons(importChat)}
                  <GitCloneButton importChat={importChat} />
                </div>
              )}
              <div className="flex flex-col gap-5">
                {!chatStarted &&
                  ExamplePrompts((event, messageInput) => {
                    if (isStreaming) {
                      handleStop?.();
                      return;
                    }

                    handleSendMessage?.(event, messageInput);
                  })}
                {!chatStarted && <StarterTemplates />}
              </div>
            </div>
          </div>
          <ClientOnly>
            {() => (
              <div className="z-workbench flex h-full w-full flex-col">
                <WorkbenchHeader />
                <Workbench
                  chatStarted={chatStarted}
                  isStreaming={isStreaming}
                  setSelectedElement={setSelectedElement}
                  isInspectorMode={isInspectorMode}
                  toggleInspectorMode={toggleInspectorMode}
                  onViewChange={setCurrentView}
                />
              </div>
            )}
          </ClientOnly>
        </div>
      </div>
    );

    return <Tooltip.Provider delayDuration={200}>{baseChat}</Tooltip.Provider>;
  },
);

function ScrollToBottom() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  return (
    !isAtBottom && (
      <>
        <button
          className="hover:bg-darken-50 sticky right-0 bottom-1 left-0 z-50 mx-auto flex size-10 items-center justify-center gap-2 rounded-full border bg-white text-black shadow-sm"
          onClick={() => scrollToBottom()}
        >
          <Icon.ArrowDown />
        </button>
      </>
    )
  );
}
