import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { cn } from '~/utils/cn';
import { Switch } from '~/components/ui/Switch';
import type { UserProfile } from '~/components/@settings/core/types';
import { isMac } from '~/utils/os';

// Helper to get modifier key symbols/text
const getModifierSymbol = (modifier: string): string => {
  switch (modifier) {
    case 'meta':
      return isMac ? '⌘' : 'Win';
    case 'alt':
      return isMac ? '⌥' : 'Alt';
    case 'shift':
      return '⇧';
    default:
      return modifier;
  }
};

export default function SettingsTab() {
  const [currentTimezone, setCurrentTimezone] = useState('');
  const [settings, setSettings] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('bolt_user_profile');
    return saved
      ? JSON.parse(saved)
      : {
          notifications: true,
          language: 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
  });

  useEffect(() => {
    setCurrentTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  // Save settings automatically when they change
  useEffect(() => {
    try {
      // Get existing profile data
      const existingProfile = JSON.parse(localStorage.getItem('bolt_user_profile') || '{}');

      // Merge with new settings
      const updatedProfile = {
        ...existingProfile,
        notifications: settings.notifications,
        language: settings.language,
        timezone: settings.timezone,
      };

      localStorage.setItem('bolt_user_profile', JSON.stringify(updatedProfile));
      toast.success('Settings updated');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to update settings');
    }
  }, [settings]);

  return (
    <div className="space-y-4">
      {/* Language & Notifications */}
      <motion.div
        className="space-y-4 rounded-lg bg-white p-4 shadow-xs dark:bg-[#0A0A0A] dark:shadow-none"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="mb-4 flex items-center gap-2">
          <div className="i-ph:palette-fill h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium text-black">Preferences</span>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="i-ph:translate-fill text-bolt-elements-text-secondary h-4 w-4" />
            <label className="text-bolt-elements-text-secondary block text-sm">Language</label>
          </div>
          <select
            value={settings.language}
            onChange={(e) => setSettings((prev) => ({ ...prev, language: e.target.value }))}
            className={cn(
              'w-full rounded-lg px-3 py-2 text-sm',
              'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
              'border border-[#E5E5E5] dark:border-[#1A1A1A]',
              'text-black',
              'focus:ring-2 focus:ring-purple-500/30 focus:outline-hidden',
              'transition-all duration-200',
            )}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="it">Italiano</option>
            <option value="pt">Português</option>
            <option value="ru">Русский</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
          </select>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="i-ph:bell-fill text-bolt-elements-text-secondary h-4 w-4" />
            <label className="text-bolt-elements-text-secondary block text-sm">Notifications</label>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-bolt-elements-text-secondary text-sm">
              {settings.notifications ? 'Notifications are enabled' : 'Notifications are disabled'}
            </span>
            <Switch
              checked={settings.notifications}
              onCheckedChange={(checked) => {
                // Update local state
                setSettings((prev) => ({ ...prev, notifications: checked }));

                // Update localStorage immediately
                const existingProfile = JSON.parse(localStorage.getItem('bolt_user_profile') || '{}');
                const updatedProfile = {
                  ...existingProfile,
                  notifications: checked,
                };
                localStorage.setItem('bolt_user_profile', JSON.stringify(updatedProfile));

                // Dispatch storage event for other components
                window.dispatchEvent(
                  new StorageEvent('storage', {
                    key: 'bolt_user_profile',
                    newValue: JSON.stringify(updatedProfile),
                  }),
                );

                toast.success(`Notifications ${checked ? 'enabled' : 'disabled'}`);
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Timezone */}
      <motion.div
        className="rounded-lg bg-white p-4 shadow-xs dark:bg-[#0A0A0A] dark:shadow-none"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="mb-4 flex items-center gap-2">
          <div className="i-ph:clock-fill h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium text-black">Time Settings</span>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="i-ph:globe-fill text-bolt-elements-text-secondary h-4 w-4" />
            <label className="text-bolt-elements-text-secondary block text-sm">Timezone</label>
          </div>
          <select
            value={settings.timezone}
            onChange={(e) => setSettings((prev) => ({ ...prev, timezone: e.target.value }))}
            className={cn(
              'w-full rounded-lg px-3 py-2 text-sm',
              'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
              'border border-[#E5E5E5] dark:border-[#1A1A1A]',
              'text-black',
              'focus:ring-2 focus:ring-purple-500/30 focus:outline-hidden',
              'transition-all duration-200',
            )}
          >
            <option value={currentTimezone}>{currentTimezone}</option>
          </select>
        </div>
      </motion.div>

      {/* Simplified Keyboard Shortcuts */}
      <motion.div
        className="rounded-lg bg-white p-4 shadow-xs dark:bg-[#0A0A0A] dark:shadow-none"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="mb-4 flex items-center gap-2">
          <div className="i-ph:keyboard-fill h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium text-black">Keyboard Shortcuts</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-[#FAFAFA] p-2 dark:bg-[#1A1A1A]">
            <div className="flex flex-col">
              <span className="text-sm text-black">Toggle Theme</span>
              <span className="text-bolt-elements-text-secondary text-xs">Switch between light and dark mode</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="text-bolt-elements-text-secondary rounded-sm border border-[#E5E5E5] bg-white px-2 py-1 text-xs font-semibold shadow-xs dark:border-[#1A1A1A] dark:bg-[#0A0A0A]">
                {getModifierSymbol('meta')}
              </kbd>
              <kbd className="text-bolt-elements-text-secondary rounded-sm border border-[#E5E5E5] bg-white px-2 py-1 text-xs font-semibold shadow-xs dark:border-[#1A1A1A] dark:bg-[#0A0A0A]">
                {getModifierSymbol('alt')}
              </kbd>
              <kbd className="text-bolt-elements-text-secondary rounded-sm border border-[#E5E5E5] bg-white px-2 py-1 text-xs font-semibold shadow-xs dark:border-[#1A1A1A] dark:bg-[#0A0A0A]">
                {getModifierSymbol('shift')}
              </kbd>
              <kbd className="text-bolt-elements-text-secondary rounded-sm border border-[#E5E5E5] bg-white px-2 py-1 text-xs font-semibold shadow-xs dark:border-[#1A1A1A] dark:bg-[#0A0A0A]">
                D
              </kbd>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
