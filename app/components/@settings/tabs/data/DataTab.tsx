import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '~/components/ui/Button';
import { ConfirmationDialog, SelectionDialog } from '~/components/ui/Dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '~/components/ui/Card';
import { motion } from 'framer-motion';
import { useDataOperations } from '~/lib/hooks/useDataOperations';
import { openDatabase } from '~/lib/persistence/db';
import { getAllChats, type Chat } from '~/lib/persistence/chats';
import { DataVisualization } from './DataVisualization';
import { cn } from '~/utils/cn';
import { toast } from 'react-toastify';

// Create a custom hook to connect to the boltHistory database
function useBoltHistoryDB() {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        setIsLoading(true);

        const database = await openDatabase();
        setDb(database || null);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error initializing database'));
        setIsLoading(false);
      }
    };

    initDB();

    return () => {
      if (db) {
        db.close();
      }
    };
  }, []);

  return { db, isLoading, error };
}

// Extend the Chat interface to include the missing properties
interface ExtendedChat extends Chat {
  title?: string;
  updatedAt?: number;
}

// Helper function to create a chat label and description
function createChatItem(chat: Chat): ChatItem {
  return {
    id: chat.id,

    // Use description as title if available, or format a short ID
    label: (chat as ExtendedChat).title || chat.description || `Chat ${chat.id.slice(0, 8)}`,

    // Format the description with message count and timestamp
    description: `${chat.messages.length} messages - Last updated: ${new Date((chat as ExtendedChat).updatedAt || Date.parse(chat.timestamp)).toLocaleString()}`,
  };
}

interface SettingsCategory {
  id: string;
  label: string;
  description: string;
}

interface ChatItem {
  id: string;
  label: string;
  description: string;
}

export function DataTab() {
  // Use our custom hook for the boltHistory database
  const { db, isLoading: dbLoading } = useBoltHistoryDB();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiKeyFileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  // State for confirmation dialogs
  const [showResetInlineConfirm, setShowResetInlineConfirm] = useState(false);
  const [showDeleteInlineConfirm, setShowDeleteInlineConfirm] = useState(false);
  const [showSettingsSelection, setShowSettingsSelection] = useState(false);
  const [showChatsSelection, setShowChatsSelection] = useState(false);

  // State for settings categories and available chats
  const [settingsCategories] = useState<SettingsCategory[]>([
    { id: 'core', label: 'Core Settings', description: 'User profile and main settings' },
    { id: 'providers', label: 'Providers', description: 'API keys and provider configurations' },
    { id: 'features', label: 'Features', description: 'Feature flags and settings' },
    { id: 'ui', label: 'UI', description: 'UI configuration and preferences' },
    { id: 'connections', label: 'Connections', description: 'External service connections' },
    { id: 'debug', label: 'Debug', description: 'Debug settings and logs' },
    { id: 'updates', label: 'Updates', description: 'Update settings and notifications' },
  ]);

  const [availableChats, setAvailableChats] = useState<ExtendedChat[]>([]);
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);

  // Data operations hook with boltHistory database
  const {
    isExporting,
    isImporting,
    isResetting,
    isDownloadingTemplate,
    handleExportSettings,
    handleExportSelectedSettings,
    handleExportAllChats,
    handleExportSelectedChats,
    handleImportSettings,
    handleImportChats,
    handleResetSettings,
    handleResetChats,
    handleDownloadTemplate,
    handleImportAPIKeys,
  } = useDataOperations({
    customDb: db || undefined, // Pass the boltHistory database, converting null to undefined
    onReloadSettings: () => window.location.reload(),
    onReloadChats: () => {
      // Reload chats after reset
      if (db) {
        getAllChats(db).then((chats) => {
          // Cast to ExtendedChat to handle additional properties
          const extendedChats = chats as ExtendedChat[];
          setAvailableChats(extendedChats);
          setChatItems(extendedChats.map((chat) => createChatItem(chat)));
        });
      }
    },
    onResetSettings: () => setShowResetInlineConfirm(false),
    onResetChats: () => setShowDeleteInlineConfirm(false),
  });

  // Loading states for operations not provided by the hook
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportingKeys, setIsImportingKeys] = useState(false);

  // Load available chats
  useEffect(() => {
    if (db) {
      console.log('Loading chats from boltHistory database', {
        name: db.name,
        version: db.version,
        objectStoreNames: Array.from(db.objectStoreNames),
      });

      getAllChats(db)
        .then((chats) => {
          console.log('Found chats:', chats.length);

          // Cast to ExtendedChat to handle additional properties
          const extendedChats = chats as ExtendedChat[];
          setAvailableChats(extendedChats);

          // Create ChatItems for selection dialog
          setChatItems(extendedChats.map((chat) => createChatItem(chat)));
        })
        .catch((error) => {
          console.error('Error loading chats:', error);
          toast.error('Failed to load chats: ' + (error instanceof Error ? error.message : 'Unknown error'));
        });
    }
  }, [db]);

  // Handle file input changes
  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (file) {
        handleImportSettings(file);
      }
    },
    [handleImportSettings],
  );

  const handleAPIKeyFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (file) {
        setIsImportingKeys(true);
        handleImportAPIKeys(file).finally(() => setIsImportingKeys(false));
      }
    },
    [handleImportAPIKeys],
  );

  const handleChatFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (file) {
        handleImportChats(file);
      }
    },
    [handleImportChats],
  );

  // Wrapper for reset chats to handle loading state
  const handleResetChatsWithState = useCallback(() => {
    setIsDeleting(true);
    handleResetChats().finally(() => setIsDeleting(false));
  }, [handleResetChats]);

  return (
    <div className="space-y-12">
      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileInputChange} className="hidden" />
      <input
        ref={apiKeyFileInputRef}
        type="file"
        accept=".json"
        onChange={handleAPIKeyFileInputChange}
        className="hidden"
      />
      <input
        ref={chatFileInputRef}
        type="file"
        accept=".json"
        onChange={handleChatFileInputChange}
        className="hidden"
      />

      {/* Reset Settings Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showResetInlineConfirm}
        onClose={() => setShowResetInlineConfirm(false)}
        title="Reset All Settings?"
        description="This will reset all your settings to their default values. This action cannot be undone."
        confirmLabel="Reset Settings"
        cancelLabel="Cancel"
        variant="destructive"
        isLoading={isResetting}
        onConfirm={handleResetSettings}
      />

      {/* Delete Chats Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteInlineConfirm}
        onClose={() => setShowDeleteInlineConfirm(false)}
        title="Delete All Chats?"
        description="This will permanently delete all your chat history. This action cannot be undone."
        confirmLabel="Delete All"
        cancelLabel="Cancel"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleResetChatsWithState}
      />

      {/* Settings Selection Dialog */}
      <SelectionDialog
        isOpen={showSettingsSelection}
        onClose={() => setShowSettingsSelection(false)}
        title="Select Settings to Export"
        items={settingsCategories}
        onConfirm={(selectedIds) => {
          handleExportSelectedSettings(selectedIds);
          setShowSettingsSelection(false);
        }}
        confirmLabel="Export Selected"
      />

      {/* Chats Selection Dialog */}
      <SelectionDialog
        isOpen={showChatsSelection}
        onClose={() => setShowChatsSelection(false)}
        title="Select Chats to Export"
        items={chatItems}
        onConfirm={(selectedIds) => {
          handleExportSelectedChats(selectedIds);
          setShowChatsSelection(false);
        }}
        confirmLabel="Export Selected"
      />

      {/* Chats Section */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-black">Chats</h2>
        {dbLoading ? (
          <div className="flex items-center justify-center p-4">
            <div className="i-ph-spinner-gap-bold mr-2 h-6 w-6 animate-spin" />
            <span>Loading chats database...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="mb-2 flex items-center">
                  <motion.div className="text-accent-500 mr-2" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <div className="i-ph-download-duotone h-5 w-5" />
                  </motion.div>
                  <CardTitle className="group-hover:text-bolt-elements-item-contentAccent text-lg transition-colors">
                    Export All Chats
                  </CardTitle>
                </div>
                <CardDescription>Export all your chats to a JSON file.</CardDescription>
              </CardHeader>
              <CardFooter>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                  <Button
                    onClick={async () => {
                      try {
                        if (!db) {
                          toast.error('Database not available');
                          return;
                        }

                        console.log('Database information:', {
                          name: db.name,
                          version: db.version,
                          objectStoreNames: Array.from(db.objectStoreNames),
                        });

                        if (availableChats.length === 0) {
                          toast.warning('No chats available to export');
                          return;
                        }

                        await handleExportAllChats();
                      } catch (error) {
                        console.error('Error exporting chats:', error);
                        toast.error(
                          `Failed to export chats: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        );
                      }
                    }}
                    disabled={isExporting || availableChats.length === 0}
                    variant="outline"
                    size="sm"
                    className={cn(
                      'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent w-full justify-center transition-colors',
                      isExporting || availableChats.length === 0 ? 'cursor-not-allowed' : '',
                    )}
                  >
                    {isExporting ? (
                      <>
                        <div className="i-ph-spinner-gap-bold mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : availableChats.length === 0 ? (
                      'No Chats to Export'
                    ) : (
                      'Export All'
                    )}
                  </Button>
                </motion.div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex items-center">
                  <motion.div className="text-accent-500 mr-2" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <div className="i-ph:list-checks h-5 w-5" />
                  </motion.div>
                  <CardTitle className="group-hover:text-bolt-elements-item-contentAccent text-lg transition-colors">
                    Export Selected Chats
                  </CardTitle>
                </div>
                <CardDescription>Choose specific chats to export.</CardDescription>
              </CardHeader>
              <CardFooter>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                  <Button
                    onClick={() => setShowChatsSelection(true)}
                    disabled={isExporting || chatItems.length === 0}
                    variant="outline"
                    size="sm"
                    className={cn(
                      'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent w-full justify-center transition-colors',
                      isExporting || chatItems.length === 0 ? 'cursor-not-allowed' : '',
                    )}
                  >
                    {isExporting ? (
                      <>
                        <div className="i-ph-spinner-gap-bold mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      'Select Chats'
                    )}
                  </Button>
                </motion.div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex items-center">
                  <motion.div className="text-accent-500 mr-2" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <div className="i-ph-upload-duotone h-5 w-5" />
                  </motion.div>
                  <CardTitle className="group-hover:text-bolt-elements-item-contentAccent text-lg transition-colors">
                    Import Chats
                  </CardTitle>
                </div>
                <CardDescription>Import chats from a JSON file.</CardDescription>
              </CardHeader>
              <CardFooter>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                  <Button
                    onClick={() => chatFileInputRef.current?.click()}
                    disabled={isImporting}
                    variant="outline"
                    size="sm"
                    className={cn(
                      'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent w-full justify-center transition-colors',
                      isImporting ? 'cursor-not-allowed' : '',
                    )}
                  >
                    {isImporting ? (
                      <>
                        <div className="i-ph-spinner-gap-bold mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      'Import Chats'
                    )}
                  </Button>
                </motion.div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex items-center">
                  <motion.div
                    className="mr-2 text-red-500 dark:text-red-400"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <div className="i-ph-trash-duotone h-5 w-5" />
                  </motion.div>
                  <CardTitle className="group-hover:text-bolt-elements-item-contentAccent text-lg transition-colors">
                    Delete All Chats
                  </CardTitle>
                </div>
                <CardDescription>Delete all your chat history.</CardDescription>
              </CardHeader>
              <CardFooter>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                  <Button
                    onClick={() => setShowDeleteInlineConfirm(true)}
                    disabled={isDeleting || chatItems.length === 0}
                    variant="outline"
                    size="sm"
                    className={cn(
                      'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent w-full justify-center transition-colors',
                      isDeleting || chatItems.length === 0 ? 'cursor-not-allowed' : '',
                    )}
                  >
                    {isDeleting ? (
                      <>
                        <div className="i-ph-spinner-gap-bold mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete All'
                    )}
                  </Button>
                </motion.div>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>

      {/* Settings Section */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-black">Settings</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="mb-2 flex items-center">
                <motion.div className="text-accent-500 mr-2" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <div className="i-ph-download-duotone h-5 w-5" />
                </motion.div>
                <CardTitle className="group-hover:text-bolt-elements-item-contentAccent text-lg transition-colors">
                  Export All Settings
                </CardTitle>
              </div>
              <CardDescription>Export all your settings to a JSON file.</CardDescription>
            </CardHeader>
            <CardFooter>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                <Button
                  onClick={handleExportSettings}
                  disabled={isExporting}
                  variant="outline"
                  size="sm"
                  className={cn(
                    'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent w-full justify-center transition-colors',
                    isExporting ? 'cursor-not-allowed' : '',
                  )}
                >
                  {isExporting ? (
                    <>
                      <div className="i-ph-spinner-gap-bold mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    'Export All'
                  )}
                </Button>
              </motion.div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex items-center">
                <motion.div className="text-accent-500 mr-2" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <div className="i-ph-filter-duotone h-5 w-5" />
                </motion.div>
                <CardTitle className="group-hover:text-bolt-elements-item-contentAccent text-lg transition-colors">
                  Export Selected Settings
                </CardTitle>
              </div>
              <CardDescription>Choose specific settings to export.</CardDescription>
            </CardHeader>
            <CardFooter>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                <Button
                  onClick={() => setShowSettingsSelection(true)}
                  disabled={isExporting || settingsCategories.length === 0}
                  variant="outline"
                  size="sm"
                  className={cn(
                    'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent w-full justify-center transition-colors',
                    isExporting || settingsCategories.length === 0 ? 'cursor-not-allowed' : '',
                  )}
                >
                  {isExporting ? (
                    <>
                      <div className="i-ph-spinner-gap-bold mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    'Select Settings'
                  )}
                </Button>
              </motion.div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex items-center">
                <motion.div className="text-accent-500 mr-2" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <div className="i-ph-upload-duotone h-5 w-5" />
                </motion.div>
                <CardTitle className="group-hover:text-bolt-elements-item-contentAccent text-lg transition-colors">
                  Import Settings
                </CardTitle>
              </div>
              <CardDescription>Import settings from a JSON file.</CardDescription>
            </CardHeader>
            <CardFooter>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  variant="outline"
                  size="sm"
                  className={cn(
                    'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent w-full justify-center transition-colors',
                    isImporting ? 'cursor-not-allowed' : '',
                  )}
                >
                  {isImporting ? (
                    <>
                      <div className="i-ph-spinner-gap-bold mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import Settings'
                  )}
                </Button>
              </motion.div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex items-center">
                <motion.div
                  className="mr-2 text-red-500 dark:text-red-400"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <div className="i-ph-arrow-counter-clockwise-duotone h-5 w-5" />
                </motion.div>
                <CardTitle className="group-hover:text-bolt-elements-item-contentAccent text-lg transition-colors">
                  Reset All Settings
                </CardTitle>
              </div>
              <CardDescription>Reset all settings to their default values.</CardDescription>
            </CardHeader>
            <CardFooter>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                <Button
                  onClick={() => setShowResetInlineConfirm(true)}
                  disabled={isResetting}
                  variant="outline"
                  size="sm"
                  className={cn(
                    'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent w-full justify-center transition-colors',
                    isResetting ? 'cursor-not-allowed' : '',
                  )}
                >
                  {isResetting ? (
                    <>
                      <div className="i-ph-spinner-gap-bold mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    'Reset All'
                  )}
                </Button>
              </motion.div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* API Keys Section */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-black">API Keys</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="mb-2 flex items-center">
                <motion.div className="text-accent-500 mr-2" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <div className="i-ph-file-text-duotone h-5 w-5" />
                </motion.div>
                <CardTitle className="group-hover:text-bolt-elements-item-contentAccent text-lg transition-colors">
                  Download Template
                </CardTitle>
              </div>
              <CardDescription>Download a template file for your API keys.</CardDescription>
            </CardHeader>
            <CardFooter>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                <Button
                  onClick={handleDownloadTemplate}
                  disabled={isDownloadingTemplate}
                  variant="outline"
                  size="sm"
                  className={cn(
                    'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent w-full justify-center transition-colors',
                    isDownloadingTemplate ? 'cursor-not-allowed' : '',
                  )}
                >
                  {isDownloadingTemplate ? (
                    <>
                      <div className="i-ph-spinner-gap-bold mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    'Download'
                  )}
                </Button>
              </motion.div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex items-center">
                <motion.div className="text-accent-500 mr-2" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <div className="i-ph-upload-duotone h-5 w-5" />
                </motion.div>
                <CardTitle className="group-hover:text-bolt-elements-item-contentAccent text-lg transition-colors">
                  Import API Keys
                </CardTitle>
              </div>
              <CardDescription>Import API keys from a JSON file.</CardDescription>
            </CardHeader>
            <CardFooter>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                <Button
                  onClick={() => apiKeyFileInputRef.current?.click()}
                  disabled={isImportingKeys}
                  variant="outline"
                  size="sm"
                  className={cn(
                    'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent w-full justify-center transition-colors',
                    isImportingKeys ? 'cursor-not-allowed' : '',
                  )}
                >
                  {isImportingKeys ? (
                    <>
                      <div className="i-ph-spinner-gap-bold mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import Keys'
                  )}
                </Button>
              </motion.div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Data Visualization */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-black">Data Usage</h2>
        <Card>
          <CardContent className="p-5">
            <DataVisualization chats={availableChats} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
