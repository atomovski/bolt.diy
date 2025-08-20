import { useEffect } from 'react';
import { useSupabaseConnection } from '~/lib/hooks/useSupabaseConnection';
import { cn } from '~/utils/cn';
import { useStore } from '@nanostores/react';
import { chatId } from '~/lib/persistence/useChatHistory';
import { fetchSupabaseStats } from '~/lib/stores/supabase';
import { Dialog, DialogRoot, DialogClose, DialogTitle, DialogButton } from '~/components/ui/Dialog';

export function SupabaseConnection() {
  const {
    connection: supabaseConn,
    connecting,
    fetchingStats,
    isProjectsExpanded,
    setIsProjectsExpanded,
    isDropdownOpen: isDialogOpen,
    setIsDropdownOpen: setIsDialogOpen,
    handleConnect,
    handleDisconnect,
    selectProject,
    handleCreateProject,
    updateToken,
    isConnected,
    fetchProjectApiKeys,
  } = useSupabaseConnection();

  const currentChatId = useStore(chatId);

  useEffect(() => {
    const handleOpenConnectionDialog = () => {
      setIsDialogOpen(true);
    };

    document.addEventListener('open-supabase-connection', handleOpenConnectionDialog);

    return () => {
      document.removeEventListener('open-supabase-connection', handleOpenConnectionDialog);
    };
  }, [setIsDialogOpen]);

  useEffect(() => {
    if (isConnected && currentChatId) {
      const savedProjectId = localStorage.getItem(`supabase-project-${currentChatId}`);

      /*
       * If there's no saved project for this chat but there is a global selected project,
       * use the global one instead of clearing it
       */
      if (!savedProjectId && supabaseConn.selectedProjectId) {
        // Save the current global project to this chat
        localStorage.setItem(`supabase-project-${currentChatId}`, supabaseConn.selectedProjectId);
      } else if (savedProjectId && savedProjectId !== supabaseConn.selectedProjectId) {
        selectProject(savedProjectId);
      }
    }
  }, [isConnected, currentChatId]);

  useEffect(() => {
    if (currentChatId && supabaseConn.selectedProjectId) {
      localStorage.setItem(`supabase-project-${currentChatId}`, supabaseConn.selectedProjectId);
    } else if (currentChatId && !supabaseConn.selectedProjectId) {
      localStorage.removeItem(`supabase-project-${currentChatId}`);
    }
  }, [currentChatId, supabaseConn.selectedProjectId]);

  useEffect(() => {
    if (isConnected && supabaseConn.token) {
      fetchSupabaseStats(supabaseConn.token).catch(console.error);
    }
  }, [isConnected, supabaseConn.token]);

  useEffect(() => {
    if (isConnected && supabaseConn.selectedProjectId && supabaseConn.token && !supabaseConn.credentials) {
      fetchProjectApiKeys(supabaseConn.selectedProjectId).catch(console.error);
    }
  }, [isConnected, supabaseConn.selectedProjectId, supabaseConn.token, supabaseConn.credentials]);

  return (
    <div className="relative">
      {/* <div className="border-bolt-elements-border-color mr-2 flex overflow-hidden rounded-md border text-sm">
        <Button
          active
          disabled={connecting}
          onClick={() => setIsDialogOpen(!isDialogOpen)}
          className="hover:bg-bolt-elements-item-backgroundActive flex items-center gap-2 text-white!"
        >
          <img
            className="h-4 w-4"
            height="20"
            width="20"
            crossOrigin="anonymous"
            src="https://cdn.simpleicons.org/supabase"
          />
          {isConnected && supabaseConn.project && (
            <span className="ml-1 max-w-[100px] truncate text-xs">{supabaseConn.project.name}</span>
          )}
        </Button>
      </div> */}

      <DialogRoot open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {isDialogOpen && (
          <Dialog className="max-w-[520px] p-6">
            {!isConnected ? (
              <div className="space-y-4">
                <DialogTitle>
                  <img
                    className="h-5 w-5"
                    height="24"
                    width="24"
                    crossOrigin="anonymous"
                    src="https://cdn.simpleicons.org/supabase"
                  />
                  Connect to Supabase
                </DialogTitle>

                <div>
                  <label className="text-bolt-elements-text-secondary mb-2 block text-sm">Access Token</label>
                  <input
                    type="password"
                    value={supabaseConn.token}
                    onChange={(e) => updateToken(e.target.value)}
                    disabled={connecting}
                    placeholder="Enter your Supabase access token"
                    className={cn(
                      'w-full rounded-lg px-3 py-2 text-sm',
                      'bg-[#F8F8F8] dark:bg-[#1A1A1A]',
                      'border border-[#E5E5E5] dark:border-[#333333]',
                      'placeholder-bolt-elements-text-tertiary text-black',
                      'focus:ring-1 focus:ring-[#3ECF8E] focus:outline-hidden',
                      'disabled:opacity-50',
                    )}
                  />
                  <div className="text-bolt-elements-text-secondary mt-2 text-sm">
                    <a
                      href="https://app.supabase.com/account/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#3ECF8E] hover:underline"
                    >
                      Get your token
                      <div className="i-ph:arrow-square-out h-4 w-4" />
                    </a>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <DialogClose asChild>
                    <DialogButton type="secondary">Cancel</DialogButton>
                  </DialogClose>
                  <button
                    onClick={handleConnect}
                    disabled={connecting || !supabaseConn.token}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-4 py-2 text-sm',
                      'bg-[#3ECF8E] text-white',
                      'hover:bg-[#3BBF84]',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                    )}
                  >
                    {connecting ? (
                      <>
                        <div className="i-ph:spinner-gap animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <div className="i-ph:plug-charging h-4 w-4" />
                        Connect
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mb-2 flex items-center justify-between">
                  <DialogTitle>
                    <img
                      className="h-5 w-5"
                      height="24"
                      width="24"
                      crossOrigin="anonymous"
                      src="https://cdn.simpleicons.org/supabase"
                    />
                    Supabase Connection
                  </DialogTitle>
                </div>

                <div className="flex items-center gap-4 rounded-lg bg-[#F8F8F8] p-3 dark:bg-[#1A1A1A]">
                  <div>
                    <h4 className="text-sm font-medium text-black">{supabaseConn.user?.email}</h4>
                    <p className="text-bolt-elements-text-secondary text-xs">Role: {supabaseConn.user?.role}</p>
                  </div>
                </div>

                {fetchingStats ? (
                  <div className="text-bolt-elements-text-secondary flex items-center gap-2 text-sm">
                    <div className="i-ph:spinner-gap h-4 w-4 animate-spin" />
                    Fetching projects...
                  </div>
                ) : (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <button
                        onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
                        className="flex items-center gap-2 bg-transparent text-left text-sm font-medium text-black"
                      >
                        <div className="i-ph:database h-4 w-4" />
                        Your Projects ({supabaseConn.stats?.totalProjects || 0})
                        <div
                          className={cn(
                            'i-ph:caret-down h-4 w-4 transition-transform',
                            isProjectsExpanded ? 'rotate-180' : '',
                          )}
                        />
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => fetchSupabaseStats(supabaseConn.token)}
                          className="text-bolt-elements-text-secondary flex items-center gap-1 rounded-md bg-[#F0F0F0] px-2 py-1 text-xs hover:bg-[#E5E5E5] dark:bg-[#252525] dark:hover:bg-[#333333]"
                          title="Refresh projects list"
                        >
                          <div className="i-ph:arrows-clockwise h-3 w-3" />
                          Refresh
                        </button>
                        <button
                          onClick={() => handleCreateProject()}
                          className="flex items-center gap-1 rounded-md bg-[#3ECF8E] px-2 py-1 text-xs text-white hover:bg-[#3BBF84]"
                        >
                          <div className="i-ph:plus h-3 w-3" />
                          New Project
                        </button>
                      </div>
                    </div>

                    {isProjectsExpanded && (
                      <>
                        {!supabaseConn.selectedProjectId && (
                          <div className="text-bolt-elements-text-secondary mb-2 rounded-lg bg-[#F8F8F8] p-3 text-sm dark:bg-[#1A1A1A]">
                            Select a project or create a new one for this chat
                          </div>
                        )}

                        {supabaseConn.stats?.projects?.length ? (
                          <div className="grid max-h-60 gap-2 overflow-y-auto">
                            {supabaseConn.stats.projects.map((project) => (
                              <div
                                key={project.id}
                                className="block rounded-lg border border-[#E5E5E5] p-3 transition-colors hover:border-[#3ECF8E] dark:border-[#1A1A1A] dark:hover:border-[#3ECF8E]"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h5 className="flex items-center gap-1 text-sm font-medium text-black">
                                      <div className="i-ph:database h-3 w-3 text-[#3ECF8E]" />
                                      {project.name}
                                    </h5>
                                    <div className="text-bolt-elements-text-secondary mt-1 text-xs">
                                      {project.region}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => selectProject(project.id)}
                                    className={cn(
                                      'rounded-md px-3 py-1 text-xs',
                                      supabaseConn.selectedProjectId === project.id
                                        ? 'bg-[#3ECF8E] text-white'
                                        : 'text-bolt-elements-text-secondary bg-[#F0F0F0] hover:bg-[#3ECF8E] hover:text-white dark:bg-[#252525]',
                                    )}
                                  >
                                    {supabaseConn.selectedProjectId === project.id ? (
                                      <span className="flex items-center gap-1">
                                        <div className="i-ph:check h-3 w-3" />
                                        Selected
                                      </span>
                                    ) : (
                                      'Select'
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-bolt-elements-text-secondary flex items-center gap-2 text-sm">
                            <div className="i-ph:info h-4 w-4" />
                            No projects found
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-2">
                  <DialogClose asChild>
                    <DialogButton type="secondary">Close</DialogButton>
                  </DialogClose>
                  <DialogButton type="danger" onClick={handleDisconnect}>
                    <div className="i-ph:plugs h-4 w-4" />
                    Disconnect
                  </DialogButton>
                </div>
              </div>
            )}
          </Dialog>
        )}
      </DialogRoot>
    </div>
  );
}
