import { memo } from 'react';
import { cn } from '~/utils/cn';
import { LogoDropdown } from '~/components/header/LogoDropdown';
import { IconButton } from '~/components/ui';
import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';

export const ChatHeader = memo(() => {
  /**
   * State
   */
  const chat = useStore(chatStore);
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const { showChat } = useStore(chatStore);
  const canHideChat = showWorkbench || !showChat;

  /**
   * Return
   */
  return (
    <header
      className={cn('flex h-(--header-height) items-center px-4', {
        'border-transparent': !chat.started,
      })}
    >
      <div className="flex items-center gap-2">
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
      </div>
    </header>
  );
});
