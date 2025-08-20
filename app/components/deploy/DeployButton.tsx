import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useStore } from '@nanostores/react';
import { netlifyConnection } from '~/lib/stores/netlify';
import { vercelConnection } from '~/lib/stores/vercel';
import { workbenchStore } from '~/lib/stores/workbench';
import { streamingState } from '~/lib/stores/streaming';
import { cn } from '~/utils/cn';
import { useState } from 'react';
import { NetlifyDeploymentLink } from '~/components/chat/NetlifyDeploymentLink.client';
import { VercelDeploymentLink } from '~/components/chat/VercelDeploymentLink.client';
import { useVercelDeploy } from '~/components/deploy/VercelDeploy.client';
import { useNetlifyDeploy } from '~/components/deploy/NetlifyDeploy.client';
import { Button, Icon } from '~/components/ui';

interface DeployButtonProps {
  onVercelDeploy?: () => Promise<void>;
  onNetlifyDeploy?: () => Promise<void>;
}

export const DeployButton = ({ onVercelDeploy, onNetlifyDeploy }: DeployButtonProps) => {
  const netlifyConn = useStore(netlifyConnection);
  const vercelConn = useStore(vercelConnection);
  const [activePreviewIndex] = useState(0);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployingTo, setDeployingTo] = useState<'netlify' | 'vercel' | null>(null);
  const isStreaming = useStore(streamingState);
  const { handleVercelDeploy } = useVercelDeploy();
  const { handleNetlifyDeploy } = useNetlifyDeploy();

  const handleVercelDeployClick = async () => {
    setIsDeploying(true);
    setDeployingTo('vercel');

    try {
      if (onVercelDeploy) {
        await onVercelDeploy();
      } else {
        await handleVercelDeploy();
      }
    } finally {
      setIsDeploying(false);
      setDeployingTo(null);
    }
  };

  const handleNetlifyDeployClick = async () => {
    setIsDeploying(true);
    setDeployingTo('netlify');

    try {
      if (onNetlifyDeploy) {
        await onNetlifyDeploy();
      } else {
        await handleNetlifyDeploy();
      }
    } finally {
      setIsDeploying(false);
      setDeployingTo(null);
    }
  };

  return (
    <div>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger disabled={isDeploying || !activePreview || isStreaming} asChild>
          <Button variant="primary" size="sm" className="flex items-center gap-1">
            {isDeploying ? `Deploying to ${deployingTo}...` : 'Deploy'}
            <Icon.NavArrowDown />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          className={cn(
            'z-250',
            'bg-bolt-elements-background-depth-2',
            'rounded-lg shadow-lg',
            'border-bolt-elements-border-color border',
            'animate-in fade-in-0 zoom-in-95',
            'py-1',
          )}
          sideOffset={5}
          align="end"
        >
          <DropdownMenu.Item
            className={cn(
              'hover:bg-bolt-elements-item-backgroundActive group relative flex w-full cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm text-black',
              {
                'cursor-not-allowed opacity-60': isDeploying || !activePreview || !netlifyConn.user,
              },
            )}
            disabled={isDeploying || !activePreview || !netlifyConn.user}
            onClick={handleNetlifyDeployClick}
          >
            <img
              className="h-5 w-5"
              height="24"
              width="24"
              crossOrigin="anonymous"
              src="https://cdn.simpleicons.org/netlify"
            />
            <span className="mx-auto">{!netlifyConn.user ? 'No Netlify Account Connected' : 'Deploy to Netlify'}</span>
            {netlifyConn.user && <NetlifyDeploymentLink />}
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className={cn(
              'hover:bg-bolt-elements-item-backgroundActive group relative flex w-full cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm text-black',
              {
                'cursor-not-allowed opacity-60': isDeploying || !activePreview || !vercelConn.user,
              },
            )}
            disabled={isDeploying || !activePreview || !vercelConn.user}
            onClick={handleVercelDeployClick}
          >
            <img
              className="h-5 w-5 rounded-sm bg-black p-1"
              height="24"
              width="24"
              crossOrigin="anonymous"
              src="https://cdn.simpleicons.org/vercel/white"
              alt="vercel"
            />
            <span className="mx-auto">{!vercelConn.user ? 'No Vercel Account Connected' : 'Deploy to Vercel'}</span>
            {vercelConn.user && <VercelDeploymentLink />}
          </DropdownMenu.Item>

          <DropdownMenu.Item
            disabled
            className="text-bolt-elements-text-tertiary flex w-full cursor-not-allowed items-center gap-2 rounded-md px-4 py-2 text-sm opacity-60"
          >
            <img
              className="h-5 w-5"
              height="24"
              width="24"
              crossOrigin="anonymous"
              src="https://cdn.simpleicons.org/cloudflare"
              alt="cloudflare"
            />
            <span className="mx-auto">Deploy to Cloudflare (Coming Soon)</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
};
