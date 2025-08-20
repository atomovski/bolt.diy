import { useState, useEffect, useCallback } from 'react';
import { ProjectCard } from '~/components/projects/ProjectCard';
import { Icon, Button } from '~/components/ui';
import { cn } from '~/utils/cn';
import { Chat } from '~/components/chat/Chat.client';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { db, getAll, type ChatHistoryItem } from '~/lib/persistence';
import { toast } from 'react-toastify';
import { useNavigate } from '@remix-run/react';

export function HomePage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [chatList, setChatList] = useState<ChatHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Load chat history from IndexedDB
  const loadChats = useCallback(() => {
    if (db) {
      setIsLoading(true);
      getAll(db)
        .then((list) => {
          // Filter out chats that don't have urlId and description (same as Menu.client.tsx)
          const filteredList = list.filter((item) => item.urlId && item.description);

          // Sort by timestamp, most recent first
          const sortedList = filteredList.sort((a, b) => {
            const dateA = new Date(a.timestamp || 0).getTime();
            const dateB = new Date(b.timestamp || 0).getTime();

            return dateB - dateA;
          });
          setChatList(sortedList);
        })
        .catch((error) => {
          toast.error('Failed to load chat history');
          console.error('Error loading chats:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const handleChatClick = (chat: ChatHistoryItem) => {
    if (chat.urlId) {
      navigate(`/chat/${chat.urlId}`);
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
        {/* Header bar */}
        <div className="bg-bolt-elements-background-depth-1 border-bolt-elements-border-color sticky top-0 z-10 border-b">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-4">
              {/* Filter dropdown */}
              <button
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5',
                  'text-sm font-medium',
                  'bg-bolt-elements-background-depth-2',
                  'hover:bg-darken-50',
                  'text-black',
                  'border-bolt-elements-border-color border',
                )}
              >
                <span>All files</span>
                <Icon.NavArrowDown className="h-3 w-3" />
              </button>

              {/* Sort dropdown */}
              <button
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5',
                  'text-sm font-medium',
                  'hover:bg-bolt-elements-background-depth-2',
                  'text-bolt-elements-text-secondary',
                )}
              >
                <span>Last modified</span>
                <Icon.NavArrowDown className="h-3 w-3" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="bg-bolt-elements-background-depth-2 flex items-center rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'rounded p-1.5',
                    viewMode === 'grid'
                      ? 'bg-bolt-elements-background-depth-1 text-black'
                      : 'text-bolt-elements-text-tertiary hover:text-bolt-elements-text-secondary',
                  )}
                >
                  <Icon.ViewGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'rounded p-1.5',
                    viewMode === 'list'
                      ? 'bg-bolt-elements-background-depth-1 text-black'
                      : 'text-bolt-elements-text-tertiary hover:text-bolt-elements-text-secondary',
                  )}
                >
                  <Icon.List className="h-4 w-4" />
                </button>
              </div>

              {/* Action buttons */}
              <Button size="sm" onClick={() => navigate('/chat/new')}>
                <Icon.Plus className="mr-1 size-4" />
                New Chat
              </Button>
            </div>
          </div>
        </div>

        {/* Projects grid */}
        <div className="px-6 py-6">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-bolt-elements-text-secondary">Loading chats...</div>
            </div>
          ) : chatList.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center">
              <Icon.ChatBubble className="text-bolt-elements-text-tertiary mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-medium text-black">No chats yet</h3>
              <p className="text-bolt-elements-text-secondary mb-4 text-sm">Start a new chat to begin building</p>
              <Button onClick={() => navigate('/chat/new')} className="flex items-center gap-2">
                <Icon.Plus className="h-4 w-4" />
                New Chat
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'space-y-2',
              )}
            >
              {chatList.map((chat) => (
                <ProjectCard
                  key={chat.id}
                  id={chat.id}
                  title={chat.description || 'Untitled Chat'}
                  type="design"
                  lastModified={chat.timestamp ? new Date(chat.timestamp) : undefined}
                  isFavorite={false}
                  onClick={() => handleChatClick(chat)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
