import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useStore } from '@nanostores/react';
import { logStore } from '~/lib/stores/logs';
import { cn } from '~/utils/cn';
import {
  vercelConnection,
  isConnecting,
  isFetchingStats,
  updateVercelConnection,
  fetchVercelStats,
} from '~/lib/stores/vercel';

export default function VercelConnection() {
  const connection = useStore(vercelConnection);
  const connecting = useStore(isConnecting);
  const fetchingStats = useStore(isFetchingStats);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      if (connection.user && connection.token) {
        await fetchVercelStats(connection.token);
      }
    };
    fetchProjects();
  }, [connection.user, connection.token]);

  const handleConnect = async (event: React.FormEvent) => {
    event.preventDefault();
    isConnecting.set(true);

    try {
      const response = await fetch('https://api.vercel.com/v2/user', {
        headers: {
          Authorization: `Bearer ${connection.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Invalid token or unauthorized');
      }

      const userData = (await response.json()) as any;
      updateVercelConnection({
        user: userData.user || userData, // Handle both possible structures
        token: connection.token,
      });

      await fetchVercelStats(connection.token);
      toast.success('Successfully connected to Vercel');
    } catch (error) {
      console.error('Auth error:', error);
      logStore.logError('Failed to authenticate with Vercel', { error });
      toast.error('Failed to connect to Vercel');
      updateVercelConnection({ user: null, token: '' });
    } finally {
      isConnecting.set(false);
    }
  };

  const handleDisconnect = () => {
    updateVercelConnection({ user: null, token: '' });
    toast.success('Disconnected from Vercel');
  };

  console.log('connection', connection);

  return (
    <motion.div
      className="rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] dark:border-[#1A1A1A] dark:bg-[#0A0A0A]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              className="h-5 w-5 dark:invert"
              height="24"
              width="24"
              crossOrigin="anonymous"
              src={`https://cdn.simpleicons.org/vercel/black`}
            />
            <h3 className="text-base font-medium text-black">Vercel Connection</h3>
          </div>
        </div>

        {!connection.user ? (
          <div className="space-y-4">
            <div>
              <label className="text-bolt-elements-text-secondary mb-2 block text-sm">Personal Access Token</label>
              <input
                type="password"
                value={connection.token}
                onChange={(e) => updateVercelConnection({ ...connection, token: e.target.value })}
                disabled={connecting}
                placeholder="Enter your Vercel personal access token"
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-sm',
                  'bg-[#F8F8F8] dark:bg-[#1A1A1A]',
                  'border border-[#E5E5E5] dark:border-[#333333]',
                  'placeholder-bolt-elements-text-tertiary text-black',
                  'focus:ring-bolt-elements-border-color-active focus:ring-1 focus:outline-hidden',
                  'disabled:opacity-50',
                )}
              />
              <div className="text-bolt-elements-text-secondary mt-2 text-sm">
                <a
                  href="https://vercel.com/account/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-bolt-elements-border-color-active inline-flex items-center gap-1 hover:underline"
                >
                  Get your token
                  <div className="i-ph:arrow-square-out h-4 w-4" />
                </a>
              </div>
            </div>

            <button
              onClick={handleConnect}
              disabled={connecting || !connection.token}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm',
                'bg-[#303030] text-white',
                'hover:bg-[#5E41D0] hover:text-white',
                'transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
                'transform active:scale-95',
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
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDisconnect}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-4 py-2 text-sm',
                    'bg-red-500 text-white',
                    'hover:bg-red-600',
                  )}
                >
                  <div className="i-ph:plug h-4 w-4" />
                  Disconnect
                </button>
                <span className="text-bolt-elements-text-secondary flex items-center gap-1 text-sm">
                  <div className="i-ph:check-circle h-4 w-4 text-green-500" />
                  Connected to Vercel
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-lg bg-[#F8F8F8] p-4 dark:bg-[#1A1A1A]">
              {/* Debug output */}
              <pre className="hidden">{JSON.stringify(connection.user, null, 2)}</pre>

              <img
                src={`https://vercel.com/api/www/avatar?u=${connection.user?.username || connection.user?.user?.username}`}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                alt="User Avatar"
                className="border-bolt-elements-border-color-active h-12 w-12 rounded-full border-2"
              />
              <div>
                <h4 className="text-sm font-medium text-black">
                  {connection.user?.username || connection.user?.user?.username || 'Vercel User'}
                </h4>
                <p className="text-bolt-elements-text-secondary text-sm">
                  {connection.user?.email || connection.user?.user?.email || 'No email available'}
                </p>
              </div>
            </div>

            {fetchingStats ? (
              <div className="text-bolt-elements-text-secondary flex items-center gap-2 text-sm">
                <div className="i-ph:spinner-gap h-4 w-4 animate-spin" />
                Fetching Vercel projects...
              </div>
            ) : (
              <div>
                <button
                  onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
                  className="mb-3 flex w-full items-center gap-2 bg-transparent text-left text-sm font-medium text-black"
                >
                  <div className="i-ph:buildings h-4 w-4" />
                  Your Projects ({connection.stats?.totalProjects || 0})
                  <div
                    className={cn(
                      'i-ph:caret-down ml-auto h-4 w-4 transition-transform',
                      isProjectsExpanded ? 'rotate-180' : '',
                    )}
                  />
                </button>
                {isProjectsExpanded && connection.stats?.projects?.length ? (
                  <div className="grid gap-3">
                    {connection.stats.projects.map((project) => (
                      <a
                        key={project.id}
                        href={`https://vercel.com/dashboard/${project.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-bolt-elements-border-color hover:border-bolt-elements-border-color-active block rounded-lg border p-4 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="flex items-center gap-2 text-sm font-medium text-black">
                              <div className="i-ph:globe text-bolt-elements-border-color-active h-4 w-4" />
                              {project.name}
                            </h5>
                            <div className="text-bolt-elements-text-secondary mt-2 flex items-center gap-2 text-xs">
                              {project.targets?.production?.alias && project.targets.production.alias.length > 0 ? (
                                <>
                                  <a
                                    href={`https://${project.targets.production.alias.find((a: string) => a.endsWith('.vercel.app') && !a.includes('-projects.vercel.app')) || project.targets.production.alias[0]}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-bolt-elements-border-color-active"
                                  >
                                    {project.targets.production.alias.find(
                                      (a: string) => a.endsWith('.vercel.app') && !a.includes('-projects.vercel.app'),
                                    ) || project.targets.production.alias[0]}
                                  </a>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <div className="i-ph:clock h-3 w-3" />
                                    {new Date(project.createdAt).toLocaleDateString()}
                                  </span>
                                </>
                              ) : project.latestDeployments && project.latestDeployments.length > 0 ? (
                                <>
                                  <a
                                    href={`https://${project.latestDeployments[0].url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-bolt-elements-border-color-active"
                                  >
                                    {project.latestDeployments[0].url}
                                  </a>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <div className="i-ph:clock h-3 w-3" />
                                    {new Date(project.latestDeployments[0].created).toLocaleDateString()}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>
                          {project.framework && (
                            <div className="text-bolt-elements-text-secondary rounded-md bg-[#F0F0F0] px-2 py-1 text-xs dark:bg-[#252525]">
                              <span className="flex items-center gap-1">
                                <div className="i-ph:code h-3 w-3" />
                                {project.framework}
                              </span>
                            </div>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                ) : isProjectsExpanded ? (
                  <div className="text-bolt-elements-text-secondary flex items-center gap-2 text-sm">
                    <div className="i-ph:info h-4 w-4" />
                    No projects found in your Vercel account
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
