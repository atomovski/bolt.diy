import type { ProviderInfo } from '~/types/model';
import { useEffect, useState, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { ModelInfo } from '~/lib/modules/llm/types';
import { cn } from '~/utils/cn';

interface ModelSelectorProps {
  model?: string;
  setModel?: (model: string) => void;
  provider?: ProviderInfo;
  setProvider?: (provider: ProviderInfo) => void;
  modelList: ModelInfo[];
  providerList: ProviderInfo[];
  apiKeys: Record<string, string>;
  modelLoading?: string;
}

// Helper function to determine if a model is likely free
const isModelLikelyFree = (model: ModelInfo, providerName?: string): boolean => {
  // OpenRouter models with zero pricing in the label
  if (providerName === 'OpenRouter' && model.label.includes('in:$0.00') && model.label.includes('out:$0.00')) {
    return true;
  }

  // Models with "free" in the name or label
  if (model.name.toLowerCase().includes('free') || model.label.toLowerCase().includes('free')) {
    return true;
  }

  return false;
};

export const ModelSelector = ({
  model,
  setModel,
  provider,
  setProvider,
  modelList,
  providerList,
  modelLoading,
}: ModelSelectorProps) => {
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [focusedModelIndex, setFocusedModelIndex] = useState(-1);
  const modelSearchInputRef = useRef<HTMLInputElement>(null);
  const modelOptionsRef = useRef<(HTMLDivElement | null)[]>([]);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [focusedProviderIndex, setFocusedProviderIndex] = useState(-1);
  const providerSearchInputRef = useRef<HTMLInputElement>(null);
  const providerOptionsRef = useRef<(HTMLDivElement | null)[]>([]);
  const providerDropdownRef = useRef<HTMLDivElement>(null);
  const [showFreeModelsOnly, setShowFreeModelsOnly] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
        setModelSearchQuery('');
      }

      if (providerDropdownRef.current && !providerDropdownRef.current.contains(event.target as Node)) {
        setIsProviderDropdownOpen(false);
        setProviderSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredModels = [...modelList]
    .filter((e) => e.provider === provider?.name && e.name)
    .filter((model) => {
      // Apply free models filter
      if (showFreeModelsOnly && !isModelLikelyFree(model, provider?.name)) {
        return false;
      }

      // Apply search filter
      return (
        model.label.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
        model.name.toLowerCase().includes(modelSearchQuery.toLowerCase())
      );
    });

  const filteredProviders = providerList.filter((p) =>
    p.name.toLowerCase().includes(providerSearchQuery.toLowerCase()),
  );

  // Reset free models filter when provider changes
  useEffect(() => {
    setShowFreeModelsOnly(false);
  }, [provider?.name]);

  useEffect(() => {
    setFocusedModelIndex(-1);
  }, [modelSearchQuery, isModelDropdownOpen, showFreeModelsOnly]);

  useEffect(() => {
    setFocusedProviderIndex(-1);
  }, [providerSearchQuery, isProviderDropdownOpen]);

  useEffect(() => {
    if (isModelDropdownOpen && modelSearchInputRef.current) {
      modelSearchInputRef.current.focus();
    }
  }, [isModelDropdownOpen]);

  useEffect(() => {
    if (isProviderDropdownOpen && providerSearchInputRef.current) {
      providerSearchInputRef.current.focus();
    }
  }, [isProviderDropdownOpen]);

  const handleModelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isModelDropdownOpen) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedModelIndex((prev) => (prev + 1 >= filteredModels.length ? 0 : prev + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedModelIndex((prev) => (prev - 1 < 0 ? filteredModels.length - 1 : prev - 1));
        break;
      case 'Enter':
        e.preventDefault();

        if (focusedModelIndex >= 0 && focusedModelIndex < filteredModels.length) {
          const selectedModel = filteredModels[focusedModelIndex];
          setModel?.(selectedModel.name);
          setIsModelDropdownOpen(false);
          setModelSearchQuery('');
        }

        break;
      case 'Escape':
        e.preventDefault();
        setIsModelDropdownOpen(false);
        setModelSearchQuery('');
        break;
      case 'Tab':
        if (!e.shiftKey && focusedModelIndex === filteredModels.length - 1) {
          setIsModelDropdownOpen(false);
        }

        break;
    }
  };

  const handleProviderKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isProviderDropdownOpen) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedProviderIndex((prev) => (prev + 1 >= filteredProviders.length ? 0 : prev + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedProviderIndex((prev) => (prev - 1 < 0 ? filteredProviders.length - 1 : prev - 1));
        break;
      case 'Enter':
        e.preventDefault();

        if (focusedProviderIndex >= 0 && focusedProviderIndex < filteredProviders.length) {
          const selectedProvider = filteredProviders[focusedProviderIndex];

          if (setProvider) {
            setProvider(selectedProvider);

            const firstModel = modelList.find((m) => m.provider === selectedProvider.name);

            if (firstModel && setModel) {
              setModel(firstModel.name);
            }
          }

          setIsProviderDropdownOpen(false);
          setProviderSearchQuery('');
        }

        break;
      case 'Escape':
        e.preventDefault();
        setIsProviderDropdownOpen(false);
        setProviderSearchQuery('');
        break;
      case 'Tab':
        if (!e.shiftKey && focusedProviderIndex === filteredProviders.length - 1) {
          setIsProviderDropdownOpen(false);
        }

        break;
    }
  };

  useEffect(() => {
    if (focusedModelIndex >= 0 && modelOptionsRef.current[focusedModelIndex]) {
      modelOptionsRef.current[focusedModelIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedModelIndex]);

  useEffect(() => {
    if (focusedProviderIndex >= 0 && providerOptionsRef.current[focusedProviderIndex]) {
      providerOptionsRef.current[focusedProviderIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedProviderIndex]);

  useEffect(() => {
    if (providerList.length === 0) {
      return;
    }

    if (provider && !providerList.some((p) => p.name === provider.name)) {
      const firstEnabledProvider = providerList[0];
      setProvider?.(firstEnabledProvider);

      const firstModel = modelList.find((m) => m.provider === firstEnabledProvider.name);

      if (firstModel) {
        setModel?.(firstModel.name);
      }
    }
  }, [providerList, provider, setProvider, modelList, setModel]);

  if (providerList.length === 0) {
    return (
      <div className="border-bolt-elements-border-color bg-bolt-elements-prompt-background mb-2 rounded-lg border p-4 text-black">
        <p className="text-center">
          No providers are currently enabled. Please enable at least one provider in the settings to start using the
          chat.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {/* Provider Combobox */}
      <div className="relative flex w-full" onKeyDown={handleProviderKeyDown} ref={providerDropdownRef}>
        <div
          className={cn(
            'border-bolt-elements-border-color w-full rounded-lg border p-2',
            'bg-bolt-elements-prompt-background text-black',
            'focus-within:ring-bolt-elements-focus focus-within:ring-2 focus-within:outline-hidden',
            'cursor-pointer transition-all',
            isProviderDropdownOpen ? 'ring-bolt-elements-focus ring-2' : undefined,
          )}
          onClick={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsProviderDropdownOpen(!isProviderDropdownOpen);
            }
          }}
          role="combobox"
          aria-expanded={isProviderDropdownOpen}
          aria-controls="provider-listbox"
          aria-haspopup="listbox"
          tabIndex={0}
        >
          <div className="flex items-center justify-between">
            <div className="truncate">{provider?.name || 'Select provider'}</div>
            <div
              className={cn(
                'i-ph:caret-down text-bolt-elements-text-secondary h-4 w-4 opacity-75',
                isProviderDropdownOpen ? 'rotate-180' : undefined,
              )}
            />
          </div>
        </div>

        {isProviderDropdownOpen && (
          <div
            className="border-bolt-elements-border-color bg-bolt-elements-background-depth-2 absolute z-20 mt-1 w-full rounded-lg border py-1 shadow-lg"
            role="listbox"
            id="provider-listbox"
          >
            <div className="px-2 pb-2">
              <div className="relative">
                <input
                  ref={providerSearchInputRef}
                  type="text"
                  value={providerSearchQuery}
                  onChange={(e) => setProviderSearchQuery(e.target.value)}
                  placeholder="Search providers..."
                  className={cn(
                    'w-full rounded-md py-1.5 pl-2 text-sm',
                    'bg-bolt-elements-background-depth-2 border-bolt-elements-border-color border',
                    'placeholder:text-bolt-elements-text-tertiary text-black',
                    'focus:ring-bolt-elements-focus focus:ring-2 focus:outline-hidden',
                    'transition-all',
                  )}
                  onClick={(e) => e.stopPropagation()}
                  role="searchbox"
                  aria-label="Search providers"
                />
                <div className="absolute top-1/2 left-2.5 -translate-y-1/2">
                  <span className="i-ph:magnifying-glass text-bolt-elements-text-tertiary" />
                </div>
              </div>
            </div>

            <div
              className={cn(
                'max-h-60 overflow-y-auto',
                'sm:scrollbar-none',
                '[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2',
                '[&::-webkit-scrollbar-thumb]:bg-bolt-elements-border-color',
                '[&::-webkit-scrollbar-thumb]:hover:bg-bolt-elements-borderColorHover',
                '[&::-webkit-scrollbar-thumb]:rounded-full',
                '[&::-webkit-scrollbar-track]:bg-bolt-elements-background-depth-2',
                '[&::-webkit-scrollbar-track]:rounded-full',
                'sm:[&::-webkit-scrollbar]:h-1.5 sm:[&::-webkit-scrollbar]:w-1.5',
                'sm:hover:[&::-webkit-scrollbar-thumb]:bg-bolt-elements-border-color/50',
                'sm:hover:[&::-webkit-scrollbar-thumb:hover]:bg-bolt-elements-border-color',
                'sm:[&::-webkit-scrollbar-track]:bg-transparent',
              )}
            >
              {filteredProviders.length === 0 ? (
                <div className="text-bolt-elements-text-tertiary px-3 py-2 text-sm">No providers found</div>
              ) : (
                filteredProviders.map((providerOption, index) => (
                  <div
                    ref={(el) => (providerOptionsRef.current[index] = el)}
                    key={providerOption.name}
                    role="option"
                    aria-selected={provider?.name === providerOption.name}
                    className={cn(
                      'cursor-pointer px-3 py-2 text-sm',
                      'hover:bg-darken-50',
                      'text-black',
                      'outline-hidden',
                      provider?.name === providerOption.name || focusedProviderIndex === index
                        ? 'bg-bolt-elements-background-depth-2'
                        : undefined,
                      focusedProviderIndex === index ? 'ring-bolt-elements-focus ring-1 ring-inset' : undefined,
                    )}
                    onClick={(e) => {
                      e.stopPropagation();

                      if (setProvider) {
                        setProvider(providerOption);

                        const firstModel = modelList.find((m) => m.provider === providerOption.name);

                        if (firstModel && setModel) {
                          setModel(firstModel.name);
                        }
                      }

                      setIsProviderDropdownOpen(false);
                      setProviderSearchQuery('');
                    }}
                    tabIndex={focusedProviderIndex === index ? 0 : -1}
                  >
                    {providerOption.name}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Model Combobox */}
      <div className="relative flex w-full min-w-[70%]" onKeyDown={handleModelKeyDown} ref={modelDropdownRef}>
        <div
          className={cn(
            'border-bolt-elements-border-color w-full rounded-lg border p-2',
            'bg-bolt-elements-prompt-background text-black',
            'focus-within:ring-bolt-elements-focus focus-within:ring-2 focus-within:outline-hidden',
            'cursor-pointer transition-all',
            isModelDropdownOpen ? 'ring-bolt-elements-focus ring-2' : undefined,
          )}
          onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsModelDropdownOpen(!isModelDropdownOpen);
            }
          }}
          role="combobox"
          aria-expanded={isModelDropdownOpen}
          aria-controls="model-listbox"
          aria-haspopup="listbox"
          tabIndex={0}
        >
          <div className="flex items-center justify-between">
            <div className="truncate">{modelList.find((m) => m.name === model)?.label || 'Select model'}</div>
            <div
              className={cn(
                'i-ph:caret-down text-bolt-elements-text-secondary h-4 w-4 opacity-75',
                isModelDropdownOpen ? 'rotate-180' : undefined,
              )}
            />
          </div>
        </div>

        {isModelDropdownOpen && (
          <div
            className="border-bolt-elements-border-color bg-bolt-elements-background-depth-2 absolute z-10 mt-1 w-full rounded-lg border py-1 shadow-lg"
            role="listbox"
            id="model-listbox"
          >
            <div className="space-y-2 px-2 pb-2">
              {/* Free Models Filter Toggle - Only show for OpenRouter */}
              {provider?.name === 'OpenRouter' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFreeModelsOnly(!showFreeModelsOnly);
                    }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all',
                      'hover:bg-darken-50',
                      showFreeModelsOnly
                        ? 'border border-purple-500/30 bg-purple-500/20 text-purple-400'
                        : 'bg-darken-50 text-bolt-elements-text-secondary border-bolt-elements-border-color border',
                    )}
                  >
                    <span className="i-ph:gift text-xs" />
                    Free models only
                  </button>
                  {showFreeModelsOnly && (
                    <span className="text-bolt-elements-text-tertiary text-xs">
                      {filteredModels.length} free model{filteredModels.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}

              {/* Search Input */}
              <div className="relative">
                <input
                  ref={modelSearchInputRef}
                  type="text"
                  value={modelSearchQuery}
                  onChange={(e) => setModelSearchQuery(e.target.value)}
                  placeholder="Search models..."
                  className={cn(
                    'w-full rounded-md py-1.5 pl-2 text-sm',
                    'bg-bolt-elements-background-depth-2 border-bolt-elements-border-color border',
                    'placeholder:text-bolt-elements-text-tertiary text-black',
                    'focus:ring-bolt-elements-focus focus:ring-2 focus:outline-hidden',
                    'transition-all',
                  )}
                  onClick={(e) => e.stopPropagation()}
                  role="searchbox"
                  aria-label="Search models"
                />
                <div className="absolute top-1/2 left-2.5 -translate-y-1/2">
                  <span className="i-ph:magnifying-glass text-bolt-elements-text-tertiary" />
                </div>
              </div>
            </div>

            <div
              className={cn(
                'max-h-60 overflow-y-auto',
                'sm:scrollbar-none',
                '[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2',
                '[&::-webkit-scrollbar-thumb]:bg-bolt-elements-border-color',
                '[&::-webkit-scrollbar-thumb]:hover:bg-bolt-elements-borderColorHover',
                '[&::-webkit-scrollbar-thumb]:rounded-full',
                '[&::-webkit-scrollbar-track]:bg-bolt-elements-background-depth-2',
                '[&::-webkit-scrollbar-track]:rounded-full',
                'sm:[&::-webkit-scrollbar]:h-1.5 sm:[&::-webkit-scrollbar]:w-1.5',
                'sm:hover:[&::-webkit-scrollbar-thumb]:bg-bolt-elements-border-color/50',
                'sm:hover:[&::-webkit-scrollbar-thumb:hover]:bg-bolt-elements-border-color',
                'sm:[&::-webkit-scrollbar-track]:bg-transparent',
              )}
            >
              {modelLoading === 'all' || modelLoading === provider?.name ? (
                <div className="text-bolt-elements-text-tertiary px-3 py-2 text-sm">Loading...</div>
              ) : filteredModels.length === 0 ? (
                <div className="text-bolt-elements-text-tertiary px-3 py-2 text-sm">
                  {showFreeModelsOnly ? 'No free models found' : 'No models found'}
                </div>
              ) : (
                filteredModels.map((modelOption, index) => (
                  <div
                    ref={(el) => (modelOptionsRef.current[index] = el)}
                    key={index} // Consider using modelOption.name if unique
                    role="option"
                    aria-selected={model === modelOption.name}
                    className={cn(
                      'cursor-pointer px-3 py-2 text-sm',
                      'hover:bg-darken-50',
                      'text-black',
                      'outline-hidden',
                      model === modelOption.name || focusedModelIndex === index
                        ? 'bg-bolt-elements-background-depth-2'
                        : undefined,
                      focusedModelIndex === index ? 'ring-bolt-elements-focus ring-1 ring-inset' : undefined,
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setModel?.(modelOption.name);
                      setIsModelDropdownOpen(false);
                      setModelSearchQuery('');
                    }}
                    tabIndex={focusedModelIndex === index ? 0 : -1}
                  >
                    <div className="flex items-center justify-between">
                      <span>{modelOption.label}</span>
                      {isModelLikelyFree(modelOption, provider?.name) && (
                        <span className="i-ph:gift ml-2 text-xs text-purple-400" title="Free model" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
