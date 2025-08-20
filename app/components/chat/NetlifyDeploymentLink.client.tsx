import { useStore } from '@nanostores/react';
import { netlifyConnection, fetchNetlifyStats } from '~/lib/stores/netlify';
import { chatId } from '~/lib/persistence/useChatHistory';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useEffect } from 'react';

export function NetlifyDeploymentLink() {
  const connection = useStore(netlifyConnection);
  const currentChatId = useStore(chatId);

  useEffect(() => {
    if (connection.token && currentChatId) {
      fetchNetlifyStats(connection.token);
    }
  }, [connection.token, currentChatId]);

  const deployedSite = connection.stats?.sites?.find((site) => site.name.includes(`bolt-diy-${currentChatId}`));

  if (!deployedSite) {
    return null;
  }

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <a
            href={deployedSite.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-bolt-elements-item-backgroundActive text-bolt-elements-text-secondary z-50 inline-flex h-8 w-8 items-center justify-center rounded-sm hover:text-[#00AD9F]"
            onClick={(e) => {
              e.stopPropagation(); // This is to prevent click from bubbling up
            }}
          >
            <div className="i-ph:link h-4 w-4 hover:text-blue-400" />
          </a>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="bg-darken-50 z-50 rounded-sm px-3 py-2 text-xs text-black" sideOffset={5}>
            {deployedSite.url}
            <Tooltip.Arrow className="fill-bolt-elements-background-depth-3" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
