import { Toggle, Icon, Button } from '~/components/ui';
import { memo, useEffect, useRef, useState } from 'react';
import { cn } from '~/utils/cn';

import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { showDeviceModeAtom, previewContainerRefAtom } from '~/lib/stores/previews';
import { PortDropdown } from '~/components/workbench/PortDropdown';

export const WorkbenchHeader = memo(() => {
  /**
   * State
   */
  const chat = useStore(chatStore);
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const showDeviceMode = useStore(showDeviceModeAtom);
  const previewContainerRef = useStore(previewContainerRefAtom);
  const selectedView = useStore(workbenchStore.currentView);
  const showTerminal = useStore(workbenchStore.showTerminal);
  const previews = useStore(workbenchStore.previews);

  const inputRef = useRef<HTMLInputElement>(null);
  const hasSelectedPreview = useRef(false);

  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const activePreview = previews[activePreviewIndex];
  const [isPortDropdownOpen, setIsPortDropdownOpen] = useState(false);
  const [displayPath, setDisplayPath] = useState('/');
  const [, setIframeUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  /**
   * Functions
   */
  const handleToggleCode = (pressed: boolean) => {
    workbenchStore.currentView.set(pressed ? 'code' : 'preview');
  };

  const handleToggleTerminal = () => {
    workbenchStore.toggleTerminal(!showTerminal);
  };

  const handleToggleDeviceMode = () => {
    showDeviceModeAtom.set(!showDeviceMode);
  };

  const handleToggleFullscreen = async () => {
    if (!isFullscreen && previewContainerRef) {
      await previewContainerRef.requestFullscreen();
    } else if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  };

  const handleReloadPreview = () => {
    // Find the iframe in the preview container and reload it
    if (previewContainerRef) {
      const iframe = previewContainerRef.querySelector('iframe[title="preview"]') as HTMLIFrameElement;

      if (iframe) {
        iframe.src = iframe.src;
      }
    }
  };

  /**
   * Lifecycle
   */
  useEffect(() => {
    if (activePreview?.baseUrl) {
      const { baseUrl } = activePreview;
      setIframeUrl(baseUrl);
    }
  }, [activePreview]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  /**
   * Return
   */
  return (
    <header className={cn('flex h-(--header-height) items-center justify-between pr-4')}>
      {/* Code Toggle */}
      {chat.started && showWorkbench && (
        <div className="flex items-center gap-2">
          <Toggle pressed={selectedView === 'code'} onPressedChange={handleToggleCode} aria-label="Toggle code view">
            <Icon.Code className="size-4" />
          </Toggle>
          {selectedView === 'code' ? (
            <Toggle pressed={showTerminal} onPressedChange={handleToggleTerminal} aria-label="Toggle code view">
              <Icon.Computer className="size-4" />
            </Toggle>
          ) : (
            <Toggle pressed={showDeviceMode} onPressedChange={handleToggleDeviceMode} aria-label="Toggle code view">
              <Icon.SmartphoneDevice />
            </Toggle>
          )}
        </div>
      )}
      <div className="flex max-w-md items-center gap-1 rounded-full border">
        <PortDropdown
          activePreviewIndex={activePreviewIndex}
          setActivePreviewIndex={setActivePreviewIndex}
          isDropdownOpen={isPortDropdownOpen}
          setHasSelectedPreview={(value) => (hasSelectedPreview.current = value)}
          setIsDropdownOpen={setIsPortDropdownOpen}
          previews={previews}
        />
        <div className="relative flex w-full items-center">
          <Button onClick={handleReloadPreview} size="icon-sm" className="absolute left-0.5" variant="ghost">
            <Icon.Refresh className="size-3.5" />
          </Button>
          <Button
            onClick={handleToggleFullscreen}
            size="icon-xs"
            className={cn('absolute right-8', isFullscreen && 'bg-primary')}
            variant="ghost"
          >
            <Icon.Enlarge className="size-3.5" />
          </Button>
          <Button size="icon-xs" className="absolute right-1.5" variant="ghost">
            <Icon.OpenNewWindow className="size-3.5" />
          </Button>
          <input
            title="URL Path"
            ref={inputRef}
            className="h-8 w-full bg-transparent pl-10 text-base outline-hidden"
            type="text"
            value={displayPath}
            onChange={(event) => {
              setDisplayPath(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && activePreview) {
                let targetPath = displayPath.trim();

                if (!targetPath.startsWith('/')) {
                  targetPath = '/' + targetPath;
                }

                const fullUrl = activePreview.baseUrl + targetPath;
                setIframeUrl(fullUrl);
                setDisplayPath(targetPath);

                if (inputRef.current) {
                  inputRef.current.blur();
                }
              }
            }}
          />
        </div>
      </div>
      <div>
        <Button>Publish</Button>
      </div>
    </header>
  );
});
