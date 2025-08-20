import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { motion } from 'framer-motion';
import { useStore } from '@nanostores/react';
import { cn } from '~/utils/cn';
import { profileStore } from '~/lib/stores/profile';
import type { TabType, Profile } from './types';

const BetaLabel = () => (
  <span className="ml-2 rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
    BETA
  </span>
);

interface AvatarDropdownProps {
  onSelectTab: (tab: TabType) => void;
}

export const AvatarDropdown = ({ onSelectTab }: AvatarDropdownProps) => {
  const profile = useStore(profileStore) as Profile;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <motion.button
          className="flex h-10 w-10 items-center justify-center rounded-full bg-transparent focus:outline-hidden"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {profile?.avatar ? (
            <img
              src={profile.avatar}
              alt={profile?.username || 'Profile'}
              className="h-full w-full rounded-full object-cover"
              loading="eager"
              decoding="sync"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-gray-400 dark:bg-gray-800 dark:text-gray-500">
              <div className="i-ph:user h-6 w-6" />
            </div>
          )}
        </motion.button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            'z-250 min-w-[240px]',
            'bg-white dark:bg-[#141414]',
            'rounded-lg shadow-lg',
            'border border-gray-200/50 dark:border-gray-800/50',
            'animate-in fade-in-0 zoom-in-95',
            'py-1',
          )}
          sideOffset={5}
          align="end"
        >
          <div
            className={cn('flex items-center gap-3 px-4 py-3', 'border-b border-gray-200/50 dark:border-gray-800/50')}
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white shadow-xs dark:bg-gray-800">
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile?.username || 'Profile'}
                  className={cn('h-full w-full', 'object-cover', 'transform-gpu', 'image-rendering-crisp')}
                  loading="eager"
                  decoding="sync"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-medium text-gray-400 dark:text-gray-500">
                  <div className="i-ph:user h-6 w-6" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {profile?.username || 'Guest User'}
              </div>
              {profile?.bio && <div className="truncate text-xs text-gray-500 dark:text-gray-400">{profile.bio}</div>}
            </div>
          </div>

          <DropdownMenu.Item
            className={cn(
              'flex items-center gap-2 px-4 py-2.5',
              'text-sm text-gray-700 dark:text-gray-200',
              'hover:bg-purple-50 dark:hover:bg-purple-500/10',
              'hover:text-purple-500 dark:hover:text-purple-400',
              'cursor-pointer transition-all duration-200',
              'outline-hidden',
              'group',
            )}
            onClick={() => onSelectTab('profile')}
          >
            <div className="i-ph:user-circle h-4 w-4 text-gray-400 transition-colors group-hover:text-purple-500 dark:group-hover:text-purple-400" />
            Edit Profile
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className={cn(
              'flex items-center gap-2 px-4 py-2.5',
              'text-sm text-gray-700 dark:text-gray-200',
              'hover:bg-purple-50 dark:hover:bg-purple-500/10',
              'hover:text-purple-500 dark:hover:text-purple-400',
              'cursor-pointer transition-all duration-200',
              'outline-hidden',
              'group',
            )}
            onClick={() => onSelectTab('settings')}
          >
            <div className="i-ph:gear-six h-4 w-4 text-gray-400 transition-colors group-hover:text-purple-500 dark:group-hover:text-purple-400" />
            Settings
          </DropdownMenu.Item>

          <div className="my-1 border-t border-gray-200/50 dark:border-gray-800/50" />
          <DropdownMenu.Item
            className={cn(
              'flex items-center gap-2 px-4 py-2.5',
              'text-sm text-gray-700 dark:text-gray-200',
              'hover:bg-purple-50 dark:hover:bg-purple-500/10',
              'hover:text-purple-500 dark:hover:text-purple-400',
              'cursor-pointer transition-all duration-200',
              'outline-hidden',
              'group',
            )}
            onClick={() => onSelectTab('service-status')}
          >
            <div className="i-ph:heartbeat h-4 w-4 text-gray-400 transition-colors group-hover:text-purple-500 dark:group-hover:text-purple-400" />
            Service Status
            <BetaLabel />
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
