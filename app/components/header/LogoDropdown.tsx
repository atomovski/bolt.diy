import { Icon } from '~/components/ui';
import { Logo } from '~/components/ui/logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '~/components/ui';
import { ClientOnly } from 'remix-utils/client-only';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { useNavigate } from '@remix-run/react';

interface LogoDropdownProps {
  size?: 'sm' | 'md' | 'lg';
}

export function LogoDropdown({ size }: LogoDropdownProps) {
  const navigate = useNavigate();

  const handleBackToDashboard = () => {
    navigate('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <Logo size={size} />
          <div className="flex flex-col items-start">
            <div className="flex flex-row items-center">
              <ClientOnly>{() => <ChatDescription />}</ClientOnly>
              <Icon.NavArrowDown className="h-3 w-3" />
            </div>
            <span className="text-xs">Previewing last saved version</span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-80">
        <div className="py-2">
          <DropdownMenuItem onSelect={handleBackToDashboard}>
            <div className="flex items-center gap-2">
              <Icon.ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem className="justify-between">
            <div className="flex items-center gap-2">
              <Icon.Settings className="h-4 w-4" />
              Settings
            </div>
            <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem>
            <Icon.EditPencil className="h-4 w-4" />
            Rename project
          </DropdownMenuItem>

          <DropdownMenuItem className="justify-between">
            <div className="flex items-center gap-2">
              <Icon.HalfMoon className="h-4 w-4" />
              Appearance
            </div>
            <Icon.NavArrowRight className="h-3 w-3" />
          </DropdownMenuItem>

          <DropdownMenuItem className="justify-between">
            <div className="flex items-center gap-2">
              <Icon.HelpCircle className="h-4 w-4" />
              Help
            </div>
            <Icon.OpenInWindow className="h-3 w-3" />
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
