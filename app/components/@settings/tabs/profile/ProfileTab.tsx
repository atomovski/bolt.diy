import { useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { cn } from '~/utils/cn';
import { profileStore, updateProfile } from '~/lib/stores/profile';
import { toast } from 'react-toastify';
import { debounce } from '~/utils/debounce';

export default function ProfileTab() {
  const profile = useStore(profileStore);
  const [isUploading, setIsUploading] = useState(false);

  // Create debounced update functions
  const debouncedUpdate = useCallback(
    debounce((field: 'username' | 'bio', value: string) => {
      updateProfile({ [field]: value });
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
    }, 1000),
    [],
  );

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setIsUploading(true);

      // Convert the file to base64
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateProfile({ avatar: base64String });
        setIsUploading(false);
        toast.success('Profile picture updated');
      };

      reader.onerror = () => {
        console.error('Error reading file:', reader.error);
        setIsUploading(false);
        toast.error('Failed to update profile picture');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setIsUploading(false);
      toast.error('Failed to update profile picture');
    }
  };

  const handleProfileUpdate = (field: 'username' | 'bio', value: string) => {
    // Update the store immediately for UI responsiveness
    updateProfile({ [field]: value });

    // Debounce the toast notification
    debouncedUpdate(field, value);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="space-y-6">
        {/* Personal Information Section */}
        <div>
          {/* Avatar Upload */}
          <div className="mb-8 flex items-start gap-6">
            <div
              className={cn(
                'h-24 w-24 overflow-hidden rounded-full',
                'bg-gray-100 dark:bg-gray-800/50',
                'flex items-center justify-center',
                'ring-1 ring-gray-200 dark:ring-gray-700',
                'group relative',
                'transition-all duration-300 ease-out',
                'hover:ring-purple-500/30 dark:hover:ring-purple-500/30',
                'hover:shadow-lg hover:shadow-purple-500/10',
              )}
            >
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt="Profile"
                  className={cn(
                    'h-full w-full object-cover',
                    'transition-all duration-300 ease-out',
                    'group-hover:scale-105 group-hover:brightness-90',
                  )}
                />
              ) : (
                <div className="i-ph:robot-fill h-16 w-16 -translate-y-1 transform text-gray-400 transition-colors group-hover:text-purple-500/70 dark:text-gray-500" />
              )}

              <label
                className={cn(
                  'absolute inset-0',
                  'flex items-center justify-center',
                  'bg-black/0 group-hover:bg-black/40',
                  'cursor-pointer transition-all duration-300 ease-out',
                  isUploading ? 'cursor-wait' : '',
                )}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
                {isUploading ? (
                  <div className="i-ph:spinner-gap h-6 w-6 animate-spin text-white" />
                ) : (
                  <div className="i-ph:camera-plus h-6 w-6 transform text-white opacity-0 transition-all duration-300 ease-out group-hover:scale-110 group-hover:opacity-100" />
                )}
              </label>
            </div>

            <div className="flex-1 pt-1">
              <label className="mb-1 block text-base font-medium text-gray-900 dark:text-gray-100">
                Profile Picture
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Upload a profile picture or avatar</p>
            </div>
          </div>

          {/* Username Input */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-gray-100">Username</label>
            <div className="group relative">
              <div className="absolute top-1/2 left-3.5 -translate-y-1/2">
                <div className="i-ph:user-circle-fill h-5 w-5 text-gray-400 transition-colors group-focus-within:text-purple-500 dark:text-gray-500" />
              </div>
              <input
                type="text"
                value={profile.username}
                onChange={(e) => handleProfileUpdate('username', e.target.value)}
                className={cn(
                  'w-full rounded-xl py-2.5 pr-4 pl-11',
                  'bg-white dark:bg-gray-800/50',
                  'border border-gray-200 dark:border-gray-700/50',
                  'text-gray-900 dark:text-white',
                  'placeholder-gray-400 dark:placeholder-gray-500',
                  'focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:outline-hidden',
                  'transition-all duration-300 ease-out',
                )}
                placeholder="Enter your username"
              />
            </div>
          </div>

          {/* Bio Input */}
          <div className="mb-8">
            <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-gray-100">Bio</label>
            <div className="group relative">
              <div className="absolute top-3 left-3.5">
                <div className="i-ph:text-aa h-5 w-5 text-gray-400 transition-colors group-focus-within:text-purple-500 dark:text-gray-500" />
              </div>
              <textarea
                value={profile.bio}
                onChange={(e) => handleProfileUpdate('bio', e.target.value)}
                className={cn(
                  'w-full rounded-xl py-2.5 pr-4 pl-11',
                  'bg-white dark:bg-gray-800/50',
                  'border border-gray-200 dark:border-gray-700/50',
                  'text-gray-900 dark:text-white',
                  'placeholder-gray-400 dark:placeholder-gray-500',
                  'focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:outline-hidden',
                  'transition-all duration-300 ease-out',
                  'resize-none',
                  'h-32',
                )}
                placeholder="Tell us about yourself"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
