import { Icon } from '~/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui';
import { Button } from '~/components/ui/Button';

export function UserMenu() {
  const handleProfileClick = () => {
    // Navigate to profile/settings
    window.location.href = '/profile';
  };

  const handleSettingsClick = () => {
    // Navigate to settings
    window.location.href = '/settings';
  };

  const handleHelpClick = () => {
    // Navigate to help/documentation
    window.location.href = '/help';
  };

  const handleSignOutClick = () => {
    // Handle sign out logic
    console.log('Sign out clicked');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <Icon.UserCircle className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={handleProfileClick}>
          <Icon.ProfileCircle className="h-4 w-4" />
          Profile
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={handleSettingsClick}>
          <Icon.Settings className="h-4 w-4" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={handleHelpClick}>
          <Icon.HelpCircle className="h-4 w-4" />
          Help & Support
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={handleSignOutClick}>
          <Icon.LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
