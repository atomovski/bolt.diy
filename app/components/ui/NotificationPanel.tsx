import { useState } from 'react';
import { Icon } from '~/components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/Popover';

interface Notification {
  id: string;
  type: 'viewer' | 'editor';
  email: string;
  message: string;
  date: string;
  avatar: string;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'viewer',
    email: 'ash.bartholomew@unmind.com',
    message: 'Made you viewer • Nova',
    date: 'Jul 29',
    avatar: 'A',
  },
  {
    id: '2',
    type: 'editor',
    email: 'james.mcgann@unmind.com',
    message: 'Made you editor • Raleigh',
    date: 'Jun 11',
    avatar: 'J',
  },
];

export function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'requests' | 'unread'>('all');

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="hover:bg-sidebar-accent flex h-6 w-6 items-center justify-center rounded-md">
          <Icon.Bell className="text-sidebar-foreground/70 h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        <div className="border-border border-b">
          <div className="flex items-center justify-between p-4">
            <h3 className="text-lg font-semibold">Recents</h3>
            <button className="hover:bg-muted flex h-6 w-6 items-center justify-center rounded-md">
              <Icon.Settings className="text-muted-foreground h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-between px-4 pb-3">
            <span className="text-muted-foreground text-sm">All notifications</span>
          </div>

          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'all'
                  ? 'border-primary text-foreground border-b-2'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'requests'
                  ? 'border-primary text-foreground border-b-2'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Requests
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'unread'
                  ? 'border-primary text-foreground border-b-2'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Unread
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {mockNotifications.map((notification) => (
            <div key={notification.id} className="hover:bg-muted/50 flex items-center gap-3 p-4">
              <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
                {notification.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-medium">{notification.email}</p>
                <p className="text-muted-foreground text-sm">{notification.message}</p>
              </div>
              <span className="text-muted-foreground text-xs">{notification.date}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
