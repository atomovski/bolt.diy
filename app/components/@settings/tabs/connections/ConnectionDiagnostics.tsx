import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from '~/components/ui/Button';
import { Badge } from '~/components/ui/Badge';
import { cn } from '~/utils/cn';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '~/components/ui/Collapsible';
import { CodeBracketIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

// Helper function to safely parse JSON
const safeJsonParse = (item: string | null) => {
  if (!item) {
    return null;
  }

  try {
    return JSON.parse(item);
  } catch (e) {
    console.error('Failed to parse JSON from localStorage:', e);
    return null;
  }
};

/**
 * A diagnostics component to help troubleshoot connection issues
 */
export default function ConnectionDiagnostics() {
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Run diagnostics when requested
  const runDiagnostics = async () => {
    try {
      setIsRunning(true);
      setDiagnosticResults(null);

      // Check browser-side storage
      const localStorageChecks = {
        githubConnection: localStorage.getItem('github_connection'),
        netlifyConnection: localStorage.getItem('netlify_connection'),
        vercelConnection: localStorage.getItem('vercel_connection'),
        supabaseConnection: localStorage.getItem('supabase_connection'),
      };

      // Get diagnostic data from server
      const response = await fetch('/api/system/diagnostics');

      if (!response.ok) {
        throw new Error(`Diagnostics API error: ${response.status}`);
      }

      const serverDiagnostics = await response.json();

      // === GitHub Checks ===
      const githubConnectionParsed = safeJsonParse(localStorageChecks.githubConnection);
      const githubToken = githubConnectionParsed?.token;
      const githubAuthHeaders = {
        ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
        'Content-Type': 'application/json',
      };
      console.log('Testing GitHub endpoints with token:', githubToken ? 'present' : 'missing');

      const githubEndpoints = [
        { name: 'User', url: '/api/system/git-info?action=getUser' },
        { name: 'Repos', url: '/api/system/git-info?action=getRepos' },
        { name: 'Default', url: '/api/system/git-info' },
      ];
      const githubResults = await Promise.all(
        githubEndpoints.map(async (endpoint) => {
          try {
            const resp = await fetch(endpoint.url, { headers: githubAuthHeaders });
            return { endpoint: endpoint.name, status: resp.status, ok: resp.ok };
          } catch (error) {
            return {
              endpoint: endpoint.name,
              error: error instanceof Error ? error.message : String(error),
              ok: false,
            };
          }
        }),
      );

      // === Netlify Checks ===
      const netlifyConnectionParsed = safeJsonParse(localStorageChecks.netlifyConnection);
      const netlifyToken = netlifyConnectionParsed?.token;
      let netlifyUserCheck = null;

      if (netlifyToken) {
        try {
          const netlifyResp = await fetch('https://api.netlify.com/api/v1/user', {
            headers: { Authorization: `Bearer ${netlifyToken}` },
          });
          netlifyUserCheck = { status: netlifyResp.status, ok: netlifyResp.ok };
        } catch (error) {
          netlifyUserCheck = {
            error: error instanceof Error ? error.message : String(error),
            ok: false,
          };
        }
      }

      // === Vercel Checks ===
      const vercelConnectionParsed = safeJsonParse(localStorageChecks.vercelConnection);
      const vercelToken = vercelConnectionParsed?.token;
      let vercelUserCheck = null;

      if (vercelToken) {
        try {
          const vercelResp = await fetch('https://api.vercel.com/v2/user', {
            headers: { Authorization: `Bearer ${vercelToken}` },
          });
          vercelUserCheck = { status: vercelResp.status, ok: vercelResp.ok };
        } catch (error) {
          vercelUserCheck = {
            error: error instanceof Error ? error.message : String(error),
            ok: false,
          };
        }
      }

      // === Supabase Checks ===
      const supabaseConnectionParsed = safeJsonParse(localStorageChecks.supabaseConnection);
      const supabaseUrl = supabaseConnectionParsed?.projectUrl;
      const supabaseAnonKey = supabaseConnectionParsed?.anonKey;
      let supabaseCheck = null;

      if (supabaseUrl && supabaseAnonKey) {
        supabaseCheck = { ok: true, status: 200, message: 'URL and Key present in localStorage' };
      } else {
        supabaseCheck = { ok: false, message: 'URL or Key missing in localStorage' };
      }

      // Compile results
      const results = {
        timestamp: new Date().toISOString(),
        localStorage: {
          hasGithubConnection: Boolean(localStorageChecks.githubConnection),
          hasNetlifyConnection: Boolean(localStorageChecks.netlifyConnection),
          hasVercelConnection: Boolean(localStorageChecks.vercelConnection),
          hasSupabaseConnection: Boolean(localStorageChecks.supabaseConnection),
          githubConnectionParsed,
          netlifyConnectionParsed,
          vercelConnectionParsed,
          supabaseConnectionParsed,
        },
        apiEndpoints: {
          github: githubResults,
          netlify: netlifyUserCheck,
          vercel: vercelUserCheck,
          supabase: supabaseCheck,
        },
        serverDiagnostics,
      };

      setDiagnosticResults(results);

      // Display simple results
      if (results.localStorage.hasGithubConnection && results.apiEndpoints.github.some((r: { ok: boolean }) => !r.ok)) {
        toast.error('GitHub API connections are failing. Try reconnecting.');
      }

      if (results.localStorage.hasNetlifyConnection && netlifyUserCheck && !netlifyUserCheck.ok) {
        toast.error('Netlify API connection is failing. Try reconnecting.');
      }

      if (results.localStorage.hasVercelConnection && vercelUserCheck && !vercelUserCheck.ok) {
        toast.error('Vercel API connection is failing. Try reconnecting.');
      }

      if (results.localStorage.hasSupabaseConnection && supabaseCheck && !supabaseCheck.ok) {
        toast.warning('Supabase connection check failed or missing details. Verify settings.');
      }

      if (
        !results.localStorage.hasGithubConnection &&
        !results.localStorage.hasNetlifyConnection &&
        !results.localStorage.hasVercelConnection &&
        !results.localStorage.hasSupabaseConnection
      ) {
        toast.info('No connection data found in browser storage.');
      }
    } catch (error) {
      console.error('Diagnostics error:', error);
      toast.error('Error running diagnostics');
      setDiagnosticResults({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsRunning(false);
    }
  };

  // Helper to reset GitHub connection
  const resetGitHubConnection = () => {
    try {
      localStorage.removeItem('github_connection');
      document.cookie = 'githubToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'githubUsername=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'git:github.com=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      toast.success('GitHub connection data cleared. Please refresh the page and reconnect.');
      setDiagnosticResults(null);
    } catch (error) {
      console.error('Error clearing GitHub data:', error);
      toast.error('Failed to clear GitHub connection data');
    }
  };

  // Helper to reset Netlify connection
  const resetNetlifyConnection = () => {
    try {
      localStorage.removeItem('netlify_connection');
      document.cookie = 'netlifyToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      toast.success('Netlify connection data cleared. Please refresh the page and reconnect.');
      setDiagnosticResults(null);
    } catch (error) {
      console.error('Error clearing Netlify data:', error);
      toast.error('Failed to clear Netlify connection data');
    }
  };

  // Helper to reset Vercel connection
  const resetVercelConnection = () => {
    try {
      localStorage.removeItem('vercel_connection');
      toast.success('Vercel connection data cleared. Please refresh the page and reconnect.');
      setDiagnosticResults(null);
    } catch (error) {
      console.error('Error clearing Vercel data:', error);
      toast.error('Failed to clear Vercel connection data');
    }
  };

  // Helper to reset Supabase connection
  const resetSupabaseConnection = () => {
    try {
      localStorage.removeItem('supabase_connection');
      toast.success('Supabase connection data cleared. Please refresh the page and reconnect.');
      setDiagnosticResults(null);
    } catch (error) {
      console.error('Error clearing Supabase data:', error);
      toast.error('Failed to clear Supabase connection data');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Connection Status Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* GitHub Connection Card */}
        <div className="bg-bolt-elements-background dark:bg-bolt-elements-background-depth-2 border-bolt-elements-border-color dark:border-bolt-elements-border-color hover:border-bolt-elements-border-color-active/70 dark:hover:border-bolt-elements-border-color-active/70 flex h-[180px] flex-col rounded-lg border p-4 transition-all duration-200">
          <div className="flex items-center gap-2">
            <div className="i-ph:github-logo text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent h-4 w-4" />
            <div className="text-sm font-medium text-black dark:text-black">GitHub Connection</div>
          </div>
          {diagnosticResults ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={cn(
                    'text-xl font-semibold',
                    diagnosticResults.localStorage.hasGithubConnection
                      ? 'text-green-500 dark:text-green-400'
                      : 'text-red-500 dark:text-red-400',
                  )}
                >
                  {diagnosticResults.localStorage.hasGithubConnection ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              {diagnosticResults.localStorage.hasGithubConnection && (
                <>
                  <div className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary mt-2 flex items-center gap-1.5 text-xs">
                    <div className="i-ph:user text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent h-3.5 w-3.5" />
                    User: {diagnosticResults.localStorage.githubConnectionParsed?.user?.login || 'N/A'}
                  </div>
                  <div className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary mt-2 flex items-center gap-1.5 text-xs">
                    <div className="i-ph:check-circle text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent h-3.5 w-3.5" />
                    API Status:{' '}
                    <Badge
                      variant={
                        diagnosticResults.apiEndpoints.github.every((r: { ok: boolean }) => r.ok)
                          ? 'default'
                          : 'destructive'
                      }
                      className="ml-1"
                    >
                      {diagnosticResults.apiEndpoints.github.every((r: { ok: boolean }) => r.ok) ? 'OK' : 'Failed'}
                    </Badge>
                  </div>
                </>
              )}
              {!diagnosticResults.localStorage.hasGithubConnection && (
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                  className="hover:bg-bolt-elements-item-backgroundActive/10 dark:hover:bg-bolt-elements-item-backgroundActive/10 mt-auto self-start transition-colors hover:text-black dark:hover:text-black"
                >
                  <div className="i-ph:plug mr-1 h-3.5 w-3.5" />
                  Connect Now
                </Button>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary flex items-center gap-2 text-sm">
                <div className="i-ph:info h-4 w-4" />
                Run diagnostics to check connection status
              </div>
            </div>
          )}
        </div>

        {/* Netlify Connection Card */}
        <div className="bg-bolt-elements-background dark:bg-bolt-elements-background-depth-2 border-bolt-elements-border-color dark:border-bolt-elements-border-color hover:border-bolt-elements-border-color-active/70 dark:hover:border-bolt-elements-border-color-active/70 flex h-[180px] flex-col rounded-lg border p-4 transition-all duration-200">
          <div className="flex items-center gap-2">
            <div className="i-bolt:netlify text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent h-4 w-4" />
            <div className="text-sm font-medium text-black dark:text-black">Netlify Connection</div>
          </div>
          {diagnosticResults ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={cn(
                    'text-xl font-semibold',
                    diagnosticResults.localStorage.hasNetlifyConnection
                      ? 'text-green-500 dark:text-green-400'
                      : 'text-red-500 dark:text-red-400',
                  )}
                >
                  {diagnosticResults.localStorage.hasNetlifyConnection ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              {diagnosticResults.localStorage.hasNetlifyConnection && (
                <>
                  <div className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary mt-2 flex items-center gap-1.5 text-xs">
                    <div className="i-ph:user text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent h-3.5 w-3.5" />
                    User:{' '}
                    {diagnosticResults.localStorage.netlifyConnectionParsed?.user?.full_name ||
                      diagnosticResults.localStorage.netlifyConnectionParsed?.user?.email ||
                      'N/A'}
                  </div>
                  <div className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary mt-2 flex items-center gap-1.5 text-xs">
                    <div className="i-ph:check-circle text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent h-3.5 w-3.5" />
                    API Status:{' '}
                    <Badge
                      variant={diagnosticResults.apiEndpoints.netlify?.ok ? 'default' : 'destructive'}
                      className="ml-1"
                    >
                      {diagnosticResults.apiEndpoints.netlify?.ok ? 'OK' : 'Failed'}
                    </Badge>
                  </div>
                </>
              )}
              {!diagnosticResults.localStorage.hasNetlifyConnection && (
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                  className="hover:bg-bolt-elements-item-backgroundActive/10 dark:hover:bg-bolt-elements-item-backgroundActive/10 mt-auto self-start transition-colors hover:text-black dark:hover:text-black"
                >
                  <div className="i-ph:plug mr-1 h-3.5 w-3.5" />
                  Connect Now
                </Button>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary flex items-center gap-2 text-sm">
                <div className="i-ph:info h-4 w-4" />
                Run diagnostics to check connection status
              </div>
            </div>
          )}
        </div>

        {/* Vercel Connection Card */}
        <div className="bg-bolt-elements-background dark:bg-bolt-elements-background-depth-2 border-bolt-elements-border-color dark:border-bolt-elements-border-color hover:border-bolt-elements-border-color-active/70 dark:hover:border-bolt-elements-border-color-active/70 flex h-[180px] flex-col rounded-lg border p-4 transition-all duration-200">
          <div className="flex items-center gap-2">
            <div className="i-si:vercel text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent h-4 w-4" />
            <div className="text-sm font-medium text-black dark:text-black">Vercel Connection</div>
          </div>
          {diagnosticResults ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={cn(
                    'text-xl font-semibold',
                    diagnosticResults.localStorage.hasVercelConnection
                      ? 'text-green-500 dark:text-green-400'
                      : 'text-red-500 dark:text-red-400',
                  )}
                >
                  {diagnosticResults.localStorage.hasVercelConnection ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              {diagnosticResults.localStorage.hasVercelConnection && (
                <>
                  <div className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary mt-2 flex items-center gap-1.5 text-xs">
                    <div className="i-ph:user text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent h-3.5 w-3.5" />
                    User:{' '}
                    {diagnosticResults.localStorage.vercelConnectionParsed?.user?.username ||
                      diagnosticResults.localStorage.vercelConnectionParsed?.user?.user?.username ||
                      'N/A'}
                  </div>
                  <div className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary mt-2 flex items-center gap-1.5 text-xs">
                    <div className="i-ph:check-circle text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent h-3.5 w-3.5" />
                    API Status:{' '}
                    <Badge
                      variant={diagnosticResults.apiEndpoints.vercel?.ok ? 'default' : 'destructive'}
                      className="ml-1"
                    >
                      {diagnosticResults.apiEndpoints.vercel?.ok ? 'OK' : 'Failed'}
                    </Badge>
                  </div>
                </>
              )}
              {!diagnosticResults.localStorage.hasVercelConnection && (
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                  className="hover:bg-bolt-elements-item-backgroundActive/10 dark:hover:bg-bolt-elements-item-backgroundActive/10 mt-auto self-start transition-colors hover:text-black dark:hover:text-black"
                >
                  <div className="i-ph:plug mr-1 h-3.5 w-3.5" />
                  Connect Now
                </Button>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary flex items-center gap-2 text-sm">
                <div className="i-ph:info h-4 w-4" />
                Run diagnostics to check connection status
              </div>
            </div>
          )}
        </div>

        {/* Supabase Connection Card */}
        <div className="bg-bolt-elements-background dark:bg-bolt-elements-background-depth-2 border-bolt-elements-border-color dark:border-bolt-elements-border-color hover:border-bolt-elements-border-color-active/70 dark:hover:border-bolt-elements-border-color-active/70 flex h-[180px] flex-col rounded-lg border p-4 transition-all duration-200">
          <div className="flex items-center gap-2">
            <div className="i-si:supabase text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent h-4 w-4" />
            <div className="text-sm font-medium text-black dark:text-black">Supabase Connection</div>
          </div>
          {diagnosticResults ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={cn(
                    'text-xl font-semibold',
                    diagnosticResults.localStorage.hasSupabaseConnection
                      ? 'text-green-500 dark:text-green-400'
                      : 'text-red-500 dark:text-red-400',
                  )}
                >
                  {diagnosticResults.localStorage.hasSupabaseConnection ? 'Configured' : 'Not Configured'}
                </span>
              </div>
              {diagnosticResults.localStorage.hasSupabaseConnection && (
                <>
                  <div className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary mt-2 flex items-center gap-1.5 truncate text-xs">
                    <div className="i-ph:link text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent h-3.5 w-3.5 shrink-0" />
                    Project URL: {diagnosticResults.localStorage.supabaseConnectionParsed?.projectUrl || 'N/A'}
                  </div>
                  <div className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary mt-2 flex items-center gap-1.5 text-xs">
                    <div className="i-ph:check-circle text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent h-3.5 w-3.5" />
                    Config Status:{' '}
                    <Badge
                      variant={diagnosticResults.apiEndpoints.supabase?.ok ? 'default' : 'destructive'}
                      className="ml-1"
                    >
                      {diagnosticResults.apiEndpoints.supabase?.ok ? 'OK' : 'Check Failed'}
                    </Badge>
                  </div>
                </>
              )}
              {!diagnosticResults.localStorage.hasSupabaseConnection && (
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                  className="hover:bg-bolt-elements-item-backgroundActive/10 dark:hover:bg-bolt-elements-item-backgroundActive/10 mt-auto self-start transition-colors hover:text-black dark:hover:text-black"
                >
                  <div className="i-ph:plug mr-1 h-3.5 w-3.5" />
                  Configure Now
                </Button>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary flex items-center gap-2 text-sm">
                <div className="i-ph:info h-4 w-4" />
                Run diagnostics to check connection status
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <Button
          onClick={runDiagnostics}
          disabled={isRunning}
          variant="outline"
          className="hover:bg-bolt-elements-item-backgroundActive/10 dark:hover:bg-bolt-elements-item-backgroundActive/10 flex items-center gap-2 transition-colors hover:text-black dark:hover:text-black"
        >
          {isRunning ? (
            <div className="i-ph:spinner-gap h-4 w-4 animate-spin" />
          ) : (
            <div className="i-ph:activity h-4 w-4" />
          )}
          {isRunning ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </Button>

        <Button
          onClick={resetGitHubConnection}
          disabled={isRunning || !diagnosticResults?.localStorage.hasGithubConnection}
          variant="outline"
          className="hover:bg-bolt-elements-item-backgroundActive/10 dark:hover:bg-bolt-elements-item-backgroundActive/10 flex items-center gap-2 transition-colors hover:text-black disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-black"
        >
          <div className="i-ph:github-logo h-4 w-4" />
          Reset GitHub
        </Button>

        <Button
          onClick={resetNetlifyConnection}
          disabled={isRunning || !diagnosticResults?.localStorage.hasNetlifyConnection}
          variant="outline"
          className="hover:bg-bolt-elements-item-backgroundActive/10 dark:hover:bg-bolt-elements-item-backgroundActive/10 flex items-center gap-2 transition-colors hover:text-black disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-black"
        >
          <div className="i-si:netlify h-4 w-4" />
          Reset Netlify
        </Button>

        <Button
          onClick={resetVercelConnection}
          disabled={isRunning || !diagnosticResults?.localStorage.hasVercelConnection}
          variant="outline"
          className="hover:bg-bolt-elements-item-backgroundActive/10 dark:hover:bg-bolt-elements-item-backgroundActive/10 flex items-center gap-2 transition-colors hover:text-black disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-black"
        >
          <div className="i-si:vercel h-4 w-4" />
          Reset Vercel
        </Button>

        <Button
          onClick={resetSupabaseConnection}
          disabled={isRunning || !diagnosticResults?.localStorage.hasSupabaseConnection}
          variant="outline"
          className="hover:bg-bolt-elements-item-backgroundActive/10 dark:hover:bg-bolt-elements-item-backgroundActive/10 flex items-center gap-2 transition-colors hover:text-black disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-black"
        >
          <div className="i-si:supabase h-4 w-4" />
          Reset Supabase
        </Button>
      </div>

      {/* Details Panel */}
      {diagnosticResults && (
        <div className="mt-4">
          <Collapsible open={showDetails} onOpenChange={setShowDetails} className="w-full">
            <CollapsibleTrigger className="w-full">
              <div className="bg-bolt-elements-background dark:bg-bolt-elements-background-depth-2 border-bolt-elements-border-color dark:border-bolt-elements-border-color hover:border-bolt-elements-border-color-active/70 dark:hover:border-bolt-elements-border-color-active/70 flex items-center justify-between rounded-lg border p-4 transition-all duration-200">
                <div className="flex items-center gap-2">
                  <CodeBracketIcon className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-black dark:text-black">Diagnostic Details</span>
                </div>
                <ChevronDownIcon
                  className={cn(
                    'text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary h-4 w-4 transform transition-transform duration-200',
                    showDetails ? 'rotate-180' : '',
                  )}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden">
              <div className="bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-1 border-bolt-elements-border-color dark:border-bolt-elements-border-color mt-2 rounded-lg border p-4">
                <pre className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary max-h-96 overflow-auto text-xs">
                  {JSON.stringify(diagnosticResults, null, 2)}
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
