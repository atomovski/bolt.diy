import {
  Button,
  Icon,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '~/components/ui';
import { workbenchStore } from '~/lib/stores/workbench';

export const ExportChatButton = ({ exportChat }: { exportChat?: () => void }) => {
  return (
    <div className="border-bolt-elements-border-color mr-2 flex overflow-hidden rounded-md text-sm">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            Export
            <Icon.Download />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent sideOffset={5} align="end">
          <DropdownMenuItem
            onClick={() => {
              workbenchStore.downloadZip();
            }}
          >
            <div className="i-ph:code size-4.5"></div>
            <span>Download Code</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportChat?.()}>
            <div className="i-ph:chat size-4.5"></div>
            <span>Export Chat</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
