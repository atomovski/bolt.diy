import { useStore } from '@nanostores/react';
import { useLocation } from '@remix-run/react';
import { ClientOnly } from 'remix-utils/client-only';
import { useState, useRef, useEffect } from 'react';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { cn } from '~/utils/cn';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { UserMenu } from './UserMenu';
import { LogoDropdown } from './LogoDropdown';
import { Toggle } from '~/components/ui/Toggle';
import { Icon } from '~/components/ui';
import { IconButton } from '~/components/ui/IconButton';
import { PortDropdown } from '~/components/workbench/PortDropdown';

export function Header() {
  const chat = useStore(chatStore);
  const location = useLocation();
  const selectedView = useStore(workbenchStore.currentView);
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const { showChat } = useStore(chatStore);
  const canHideChat = showWorkbench || !showChat;

  // Preview/URL bar state
  const previews = useStore(workbenchStore.previews);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [displayPath, setDisplayPath] = useState('/');
  const [isPortDropdownOpen, setIsPortDropdownOpen] = useState(false);
  const [, setIframeUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSelectedPreview = useRef(false);

  const activePreview = previews[activePreviewIndex];

  // Determine if we're on a chat page
  const isChatPage = location.pathname.startsWith('/chat');

  // Update iframe URL when preview changes
  useEffect(() => {
    if (activePreview?.baseUrl) {
      const { baseUrl } = activePreview;
      setIframeUrl(baseUrl);
    }
  }, [activePreview]);

  const handleToggleChange = (pressed: boolean) => {
    // When toggle is pressed (ON), show Code; when not pressed (OFF), show Preview
    workbenchStore.currentView.set(pressed ? 'code' : 'preview');
  };

  return (
    <header
      className={cn('flex h-(--header-height) items-center px-4', {
        'border-transparent': !chat.started,
        'border-bolt-elements-border-color': chat.started,
      })}
    >
      {/* Left side - Logo and showChat toggle */}
      <div className="flex items-center gap-2">
        {isChatPage && (
          <>
            <LogoDropdown size="sm" />
            {chat.started && showWorkbench && (
              <IconButton
                icon={showChat ? 'i-ph:sidebar-simple-fill' : 'i-ph:sidebar-simple'}
                className="text-bolt-elements-text-secondary text-lg"
                disabled={!canHideChat}
                onClick={() => {
                  if (canHideChat) {
                    chatStore.setKey('showChat', !showChat);
                  }
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Center content - URL bar and Code toggle */}
      <div className="flex flex-1 items-center justify-center gap-3">
        {/* URL Bar */}
        {chat.started && showWorkbench && isChatPage && activePreview && (
          <>
            {isPortDropdownOpen && (
              <div className="z-iframe-overlay absolute inset-0" onClick={() => setIsPortDropdownOpen(false)} />
            )}
            <div className="flex max-w-md items-center gap-1 rounded-full border px-3 py-1.5 text-sm">
              <PortDropdown
                activePreviewIndex={activePreviewIndex}
                setActivePreviewIndex={setActivePreviewIndex}
                isDropdownOpen={isPortDropdownOpen}
                setHasSelectedPreview={(value) => (hasSelectedPreview.current = value)}
                setIsDropdownOpen={setIsPortDropdownOpen}
                previews={previews}
              />
              <input
                title="URL Path"
                ref={inputRef}
                className="w-full bg-transparent outline-hidden"
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
          </>
        )}

        {/* Code Toggle */}
        {chat.started && showWorkbench && isChatPage && (
          <Toggle pressed={selectedView === 'code'} onPressedChange={handleToggleChange} aria-label="Toggle code view">
            <Icon.Code className="size-4" />
          </Toggle>
        )}
      </div>

      {/* Right side content */}
      <div className="flex items-center justify-end gap-2">
        {chat.started && isChatPage ? (
          <ClientOnly>
            {() => (
              <div className="">
                <HeaderActionButtons chatStarted={chat.started} />
              </div>
            )}
          </ClientOnly>
        ) : !isChatPage ? null : (
          <UserMenu />
        )}
      </div>
    </header>
  );
}
