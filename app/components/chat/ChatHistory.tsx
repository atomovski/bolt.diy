import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '~/components/ui';
import { cn } from '~/utils/cn';
import { db, getAll, type ChatHistoryItem } from '~/lib/persistence';
import { useNavigate } from '@remix-run/react';

interface ChatHistoryProps {
  isVisible: boolean;
  onToggle: () => void;
}

export function ChatHistory({ isVisible, onToggle }: ChatHistoryProps) {
  const [chatList, setChatList] = useState<ChatHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Load chat history from IndexedDB
  const loadChats = useCallback(() => {
    if (db) {
      setIsLoading(true);
      getAll(db)
        .then((list) => {
          // Filter and sort chats, limit to recent 10
          const filteredList = list
            .filter((item) => item.urlId && item.description)
            .sort((a, b) => {
              const dateA = new Date(a.timestamp || 0).getTime();
              const dateB = new Date(b.timestamp || 0).getTime();

              return dateB - dateA;
            })
            .slice(0, 10); // Show only recent 10 chats
          setChatList(filteredList);
        })
        .catch((error) => {
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

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    }

    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }

    if (diffInHours < 48) {
      return 'Yesterday';
    }

    return date.toLocaleDateString();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="border-bolt-elements-borderColor bg-bolt-elements-bg-depth-1 fixed inset-x-0 z-40 border-t shadow-lg"
          style={{
            bottom: '80px', // Position above docked chat
            maxHeight: '300px',
            width: '100vw',
          }}
        >
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-bolt-elements-borderColor flex items-center justify-between border-b px-6 py-3">
              <div className="flex items-center gap-2">
                <Icon.ChatBubble className="text-bolt-elements-textPrimary h-5 w-5" />
                <h3 className="text-bolt-elements-textPrimary text-sm font-medium">Recent Chats</h3>
                <span className="text-bolt-elements-textSecondary text-xs">({chatList.length} conversations)</span>
              </div>
              <button
                onClick={onToggle}
                className="text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
                aria-label="Close chat history"
              >
                <Icon.NavArrowDown className="h-4 w-4" />
              </button>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center p-6">
                  <div className="text-bolt-elements-textSecondary text-sm">Loading chats...</div>
                </div>
              ) : chatList.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6">
                  <Icon.ChatBubble className="text-bolt-elements-textTertiary mb-2 h-8 w-8" />
                  <div className="text-bolt-elements-textSecondary text-sm">No recent chats</div>
                </div>
              ) : (
                <div className="p-2">
                  {chatList.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => handleChatClick(chat)}
                      className={cn(
                        'hover:bg-bolt-elements-bg-depth-2 w-full rounded-lg p-3 text-left transition-colors',
                        'hover:border-bolt-elements-borderColor border border-transparent',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-bolt-elements-textPrimary truncate text-sm font-medium">
                            {chat.description || 'Untitled Chat'}
                          </div>
                          <div className="text-bolt-elements-textTertiary mt-1 text-xs">
                            {chat.timestamp &&
                              formatTime(
                                typeof chat.timestamp === 'string'
                                  ? new Date(chat.timestamp).getTime()
                                  : chat.timestamp,
                              )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center">
                          <Icon.NavArrowRight className="text-bolt-elements-textTertiary h-4 w-4" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
