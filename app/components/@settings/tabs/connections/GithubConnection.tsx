import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { logStore } from '~/lib/stores/logs';
import { cn } from '~/utils/cn';
import Cookies from 'js-cookie';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '~/components/ui/Collapsible';
import { Button } from '~/components/ui/Button';

interface GitHubUserResponse {
  login: string;
  avatar_url: string;
  html_url: string;
  name: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  public_gists: number;
}

interface GitHubRepoInfo {
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  updated_at: string;
  languages_url: string;
}

interface GitHubOrganization {
  login: string;
  avatar_url: string;
  html_url: string;
}

interface GitHubEvent {
  id: string;
  type: string;
  repo: {
    name: string;
  };
  created_at: string;
}

interface GitHubLanguageStats {
  [language: string]: number;
}

interface GitHubStats {
  repos: GitHubRepoInfo[];
  recentActivity: GitHubEvent[];
  languages: GitHubLanguageStats;
  totalGists: number;
  publicRepos: number;
  privateRepos: number;
  stars: number;
  forks: number;
  followers: number;
  publicGists: number;
  privateGists: number;
  lastUpdated: string;

  // Keep these for backward compatibility
  totalStars?: number;
  totalForks?: number;
  organizations?: GitHubOrganization[];
}

interface GitHubConnection {
  user: GitHubUserResponse | null;
  token: string;
  tokenType: 'classic' | 'fine-grained';
  stats?: GitHubStats;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

// Add the GitHub logo SVG component
const GithubLogo = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <path
      fill="currentColor"
      d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
    />
  </svg>
);

export default function GitHubConnection() {
  const [connection, setConnection] = useState<GitHubConnection>({
    user: null,
    token: '',
    tokenType: 'classic',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetchingStats, setIsFetchingStats] = useState(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const tokenTypeRef = React.useRef<'classic' | 'fine-grained'>('classic');

  const fetchGithubUser = async (token: string) => {
    try {
      console.log('Fetching GitHub user with token:', token.substring(0, 5) + '...');

      // Use server-side API endpoint instead of direct GitHub API call
      const response = await fetch(`/api/system/git-info?action=getUser`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // Include token in headers for validation
        },
      });

      if (!response.ok) {
        console.error('Error fetching GitHub user. Status:', response.status);
        throw new Error(`Error: ${response.status}`);
      }

      // Get rate limit information from headers
      const rateLimit = {
        limit: parseInt(response.headers.get('x-ratelimit-limit') || '0'),
        remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0'),
        reset: parseInt(response.headers.get('x-ratelimit-reset') || '0'),
      };

      const data = await response.json();
      console.log('GitHub user API response:', data);

      const { user } = data as { user: GitHubUserResponse };

      // Validate that we received a user object
      if (!user || !user.login) {
        console.error('Invalid user data received:', user);
        throw new Error('Invalid user data received');
      }

      // Use the response data
      setConnection((prev) => ({
        ...prev,
        user,
        token,
        tokenType: tokenTypeRef.current,
        rateLimit,
      }));

      // Set cookies for client-side access
      Cookies.set('githubUsername', user.login);
      Cookies.set('githubToken', token);
      Cookies.set('git:github.com', JSON.stringify({ username: token, password: 'x-oauth-basic' }));

      // Store connection details in localStorage
      localStorage.setItem(
        'github_connection',
        JSON.stringify({
          user,
          token,
          tokenType: tokenTypeRef.current,
        }),
      );

      logStore.logInfo('Connected to GitHub', {
        type: 'system',
        message: `Connected to GitHub as ${user.login}`,
      });

      // Fetch additional GitHub stats
      fetchGitHubStats(token);
    } catch (error) {
      console.error('Failed to fetch GitHub user:', error);
      logStore.logError(`GitHub authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        type: 'system',
        message: 'GitHub authentication failed',
      });

      toast.error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error; // Rethrow to allow handling in the calling function
    }
  };

  const fetchGitHubStats = async (token: string) => {
    setIsFetchingStats(true);

    try {
      // Get the current user first to ensure we have the latest value
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `${connection.tokenType === 'classic' ? 'token' : 'Bearer'} ${token}`,
        },
      });

      if (!userResponse.ok) {
        if (userResponse.status === 401) {
          toast.error('Your GitHub token has expired. Please reconnect your account.');
          handleDisconnect();

          return;
        }

        throw new Error(`Failed to fetch user data: ${userResponse.statusText}`);
      }

      const userData = (await userResponse.json()) as any;

      // Fetch repositories with pagination
      let allRepos: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const reposResponse = await fetch(`https://api.github.com/user/repos?per_page=100&page=${page}`, {
          headers: {
            Authorization: `${connection.tokenType === 'classic' ? 'token' : 'Bearer'} ${token}`,
          },
        });

        if (!reposResponse.ok) {
          throw new Error(`Failed to fetch repositories: ${reposResponse.statusText}`);
        }

        const repos = (await reposResponse.json()) as any[];
        allRepos = [...allRepos, ...repos];

        // Check if there are more pages
        const linkHeader = reposResponse.headers.get('Link');
        hasMore = linkHeader?.includes('rel="next"') ?? false;
        page++;
      }

      // Calculate stats
      const repoStats = calculateRepoStats(allRepos);

      // Fetch recent activity
      const eventsResponse = await fetch(`https://api.github.com/users/${userData.login}/events?per_page=10`, {
        headers: {
          Authorization: `${connection.tokenType === 'classic' ? 'token' : 'Bearer'} ${token}`,
        },
      });

      if (!eventsResponse.ok) {
        throw new Error(`Failed to fetch events: ${eventsResponse.statusText}`);
      }

      const events = (await eventsResponse.json()) as any[];
      const recentActivity = events.slice(0, 5).map((event: any) => ({
        id: event.id,
        type: event.type,
        repo: event.repo.name,
        created_at: event.created_at,
      }));

      // Calculate total stars and forks
      const totalStars = allRepos.reduce((sum: number, repo: any) => sum + repo.stargazers_count, 0);
      const totalForks = allRepos.reduce((sum: number, repo: any) => sum + repo.forks_count, 0);
      const privateRepos = allRepos.filter((repo: any) => repo.private).length;

      // Update the stats in the store
      const stats: GitHubStats = {
        repos: repoStats.repos,
        recentActivity,
        languages: repoStats.languages || {},
        totalGists: repoStats.totalGists || 0,
        publicRepos: userData.public_repos || 0,
        privateRepos: privateRepos || 0,
        stars: totalStars || 0,
        forks: totalForks || 0,
        followers: userData.followers || 0,
        publicGists: userData.public_gists || 0,
        privateGists: userData.private_gists || 0,
        lastUpdated: new Date().toISOString(),

        // For backward compatibility
        totalStars: totalStars || 0,
        totalForks: totalForks || 0,
        organizations: [],
      };

      // Get the current user first to ensure we have the latest value
      const currentConnection = JSON.parse(localStorage.getItem('github_connection') || '{}');
      const currentUser = currentConnection.user || connection.user;

      // Update connection with stats
      const updatedConnection: GitHubConnection = {
        user: currentUser,
        token,
        tokenType: connection.tokenType,
        stats,
        rateLimit: connection.rateLimit,
      };

      // Update localStorage
      localStorage.setItem('github_connection', JSON.stringify(updatedConnection));

      // Update state
      setConnection(updatedConnection);

      toast.success('GitHub stats refreshed');
    } catch (error) {
      console.error('Error fetching GitHub stats:', error);
      toast.error(`Failed to fetch GitHub stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFetchingStats(false);
    }
  };

  const calculateRepoStats = (repos: any[]) => {
    const repoStats = {
      repos: repos.map((repo: any) => ({
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url,
        description: repo.description,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        default_branch: repo.default_branch,
        updated_at: repo.updated_at,
        languages_url: repo.languages_url,
      })),

      languages: {} as Record<string, number>,
      totalGists: 0,
    };

    repos.forEach((repo: any) => {
      fetch(repo.languages_url)
        .then((response) => response.json())
        .then((languages: any) => {
          const typedLanguages = languages as Record<string, number>;
          Object.keys(typedLanguages).forEach((language) => {
            if (!repoStats.languages[language]) {
              repoStats.languages[language] = 0;
            }

            repoStats.languages[language] += 1;
          });
        });
    });

    return repoStats;
  };

  useEffect(() => {
    const loadSavedConnection = async () => {
      setIsLoading(true);

      const savedConnection = localStorage.getItem('github_connection');

      if (savedConnection) {
        try {
          const parsed = JSON.parse(savedConnection);

          if (!parsed.tokenType) {
            parsed.tokenType = 'classic';
          }

          // Update the ref with the parsed token type
          tokenTypeRef.current = parsed.tokenType;

          // Set the connection
          setConnection(parsed);

          // If we have a token but no stats or incomplete stats, fetch them
          if (
            parsed.user &&
            parsed.token &&
            (!parsed.stats || !parsed.stats.repos || parsed.stats.repos.length === 0)
          ) {
            console.log('Fetching missing GitHub stats for saved connection');
            await fetchGitHubStats(parsed.token);
          }
        } catch (error) {
          console.error('Error parsing saved GitHub connection:', error);
          localStorage.removeItem('github_connection');
        }
      } else {
        // Check for environment variable token
        const envToken = import.meta.env.VITE_GITHUB_ACCESS_TOKEN;

        if (envToken) {
          // Check if token type is specified in environment variables
          const envTokenType = import.meta.env.VITE_GITHUB_TOKEN_TYPE;
          console.log('Environment token type:', envTokenType);

          const tokenType =
            envTokenType === 'classic' || envTokenType === 'fine-grained'
              ? (envTokenType as 'classic' | 'fine-grained')
              : 'classic';

          console.log('Using token type:', tokenType);

          // Update both the state and the ref
          tokenTypeRef.current = tokenType;
          setConnection((prev) => ({
            ...prev,
            tokenType,
          }));

          try {
            // Fetch user data with the environment token
            await fetchGithubUser(envToken);
          } catch (error) {
            console.error('Failed to connect with environment token:', error);
          }
        }
      }

      setIsLoading(false);
    };

    loadSavedConnection();
  }, []);

  // Ensure cookies are updated when connection changes
  useEffect(() => {
    if (!connection) {
      return;
    }

    const token = connection.token;
    const data = connection.user;

    if (token) {
      Cookies.set('githubToken', token);
      Cookies.set('git:github.com', JSON.stringify({ username: token, password: 'x-oauth-basic' }));
    }

    if (data) {
      Cookies.set('githubUsername', data.login);
    }
  }, [connection]);

  // Add function to update rate limits
  const updateRateLimits = async (token: string) => {
    try {
      const response = await fetch('https://api.github.com/rate_limit', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (response.ok) {
        const rateLimit = {
          limit: parseInt(response.headers.get('x-ratelimit-limit') || '0'),
          remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0'),
          reset: parseInt(response.headers.get('x-ratelimit-reset') || '0'),
        };

        setConnection((prev) => ({
          ...prev,
          rateLimit,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch rate limits:', error);
    }
  };

  // Add effect to update rate limits periodically
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (connection.token && connection.user) {
      updateRateLimits(connection.token);
      interval = setInterval(() => updateRateLimits(connection.token), 60000); // Update every minute
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [connection.token, connection.user]);

  if (isLoading || isConnecting || isFetchingStats) {
    return <LoadingSpinner />;
  }

  const handleConnect = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsConnecting(true);

    try {
      // Update the ref with the current state value before connecting
      tokenTypeRef.current = connection.tokenType;

      /*
       * Save token type to localStorage even before connecting
       * This ensures the token type is persisted even if connection fails
       */
      localStorage.setItem(
        'github_connection',
        JSON.stringify({
          user: null,
          token: connection.token,
          tokenType: connection.tokenType,
        }),
      );

      // Attempt to fetch the user info which validates the token
      await fetchGithubUser(connection.token);

      toast.success('Connected to GitHub successfully');
    } catch (error) {
      console.error('Failed to connect to GitHub:', error);

      // Reset connection state on failure
      setConnection({ user: null, token: connection.token, tokenType: connection.tokenType });

      toast.error(`Failed to connect to GitHub: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('github_connection');

    // Remove all GitHub-related cookies
    Cookies.remove('githubToken');
    Cookies.remove('githubUsername');
    Cookies.remove('git:github.com');

    // Reset the token type ref
    tokenTypeRef.current = 'classic';
    setConnection({ user: null, token: '', tokenType: 'classic' });
    toast.success('Disconnected from GitHub');
  };

  return (
    <motion.div
      className="bg-bolt-elements-background dark:bg-bolt-elements-background border-bolt-elements-border-color dark:border-bolt-elements-border-color rounded-lg border"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GithubLogo />
            <h3 className="text-base font-medium text-black dark:text-black">GitHub Connection</h3>
          </div>
        </div>

        {!connection.user && (
          <div className="text-bolt-elements-text-secondary bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1 mb-4 rounded-lg p-3 text-xs">
            <p className="mb-1 flex items-center gap-1">
              <span className="i-ph:lightbulb text-bolt-elements-icon-success dark:text-bolt-elements-icon-success h-3.5 w-3.5" />
              <span className="font-medium">Tip:</span> You can also set the{' '}
              <code className="bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 rounded-sm px-1 py-0.5">
                VITE_GITHUB_ACCESS_TOKEN
              </code>{' '}
              environment variable to connect automatically.
            </p>
            <p>
              For fine-grained tokens, also set{' '}
              <code className="bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 rounded-sm px-1 py-0.5">
                VITE_GITHUB_TOKEN_TYPE=fine-grained
              </code>
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary mb-2 block text-sm">
              Token Type
            </label>
            <select
              value={connection.tokenType}
              onChange={(e) => {
                const newTokenType = e.target.value as 'classic' | 'fine-grained';
                tokenTypeRef.current = newTokenType;
                setConnection((prev) => ({ ...prev, tokenType: newTokenType }));
              }}
              disabled={isConnecting || !!connection.user}
              className={cn(
                'w-full rounded-lg px-3 py-2 text-sm',
                'bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1',
                'border-bolt-elements-border-color dark:border-bolt-elements-border-color border',
                'text-black dark:text-black',
                'focus:ring-bolt-elements-item-contentAccent dark:focus:ring-bolt-elements-item-contentAccent focus:ring-1 focus:outline-hidden',
                'disabled:opacity-50',
              )}
            >
              <option value="classic">Personal Access Token (Classic)</option>
              <option value="fine-grained">Fine-grained Token</option>
            </select>
          </div>

          <div>
            <label className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary mb-2 block text-sm">
              {connection.tokenType === 'classic' ? 'Personal Access Token' : 'Fine-grained Token'}
            </label>
            <input
              type="password"
              value={connection.token}
              onChange={(e) => setConnection((prev) => ({ ...prev, token: e.target.value }))}
              disabled={isConnecting || !!connection.user}
              placeholder={`Enter your GitHub ${
                connection.tokenType === 'classic' ? 'personal access token' : 'fine-grained token'
              }`}
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
                href={`https://github.com/settings/tokens${connection.tokenType === 'fine-grained' ? '/beta' : '/new'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-bolt-elements-border-color-active inline-flex items-center gap-1 hover:underline"
              >
                Get your token
                <div className="i-ph:arrow-square-out h-4 w-4" />
              </a>
              <span className="mx-2">•</span>
              <span>
                Required scopes:{' '}
                {connection.tokenType === 'classic'
                  ? 'repo, read:org, read:user'
                  : 'Repository access, Organization access'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {!connection.user ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting || !connection.token}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm',
                'bg-[#303030] text-white',
                'hover:bg-[#5E41D0] hover:text-white',
                'transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
                'transform active:scale-95',
              )}
            >
              {isConnecting ? (
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
          ) : (
            <>
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-4">
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
                    Connected to GitHub
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open('https://github.com/dashboard', '_blank', 'noopener,noreferrer')}
                    className="hover:bg-bolt-elements-item-backgroundActive/10 flex items-center gap-2 transition-colors hover:text-black dark:hover:text-black"
                  >
                    <div className="i-ph:layout h-4 w-4" />
                    Dashboard
                  </Button>
                  <Button
                    onClick={() => {
                      fetchGitHubStats(connection.token);
                      updateRateLimits(connection.token);
                    }}
                    disabled={isFetchingStats}
                    variant="outline"
                    className="hover:bg-bolt-elements-item-backgroundActive/10 flex items-center gap-2 transition-colors hover:text-black dark:hover:text-black"
                  >
                    {isFetchingStats ? (
                      <>
                        <div className="i-ph:spinner-gap h-4 w-4 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <div className="i-ph:arrows-clockwise h-4 w-4" />
                        Refresh Stats
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {connection.user && connection.stats && (
          <div className="border-bolt-elements-border-color dark:border-bolt-elements-border-color mt-6 border-t pt-6">
            <div className="bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1 mb-4 flex items-center gap-4 rounded-lg p-4">
              <img
                src={connection.user.avatar_url}
                alt={connection.user.login}
                className="border-bolt-elements-item-contentAccent dark:border-bolt-elements-item-contentAccent h-12 w-12 rounded-full border-2"
              />
              <div>
                <h4 className="text-sm font-medium text-black dark:text-black">
                  {connection.user.name || connection.user.login}
                </h4>
                <p className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary text-sm">
                  {connection.user.login}
                </p>
              </div>
            </div>

            <Collapsible open={isStatsExpanded} onOpenChange={setIsStatsExpanded}>
              <CollapsibleTrigger asChild>
                <div className="bg-bolt-elements-background dark:bg-bolt-elements-background-depth-2 border-bolt-elements-border-color dark:border-bolt-elements-border-color hover:border-bolt-elements-border-color-active/70 dark:hover:border-bolt-elements-border-color-active/70 flex items-center justify-between rounded-lg border p-4 transition-all duration-200">
                  <div className="flex items-center gap-2">
                    <div className="i-ph:chart-bar text-bolt-elements-item-contentAccent h-4 w-4" />
                    <span className="text-sm font-medium text-black">GitHub Stats</span>
                  </div>
                  <div
                    className={cn(
                      'i-ph:caret-down text-bolt-elements-text-secondary h-4 w-4 transform transition-transform duration-200',
                      isStatsExpanded ? 'rotate-180' : '',
                    )}
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden">
                <div className="mt-4 space-y-4">
                  {/* Languages Section */}
                  <div className="mb-6">
                    <h4 className="mb-3 text-sm font-medium text-black">Top Languages</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(connection.stats.languages)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([language]) => (
                          <span
                            key={language}
                            className="bg-bolt-elements-sidebar-buttonBackgroundDefault text-bolt-elements-sidebar-buttonText rounded-full px-3 py-1 text-xs"
                          >
                            {language}
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* Additional Stats */}
                  <div className="mb-6 grid grid-cols-4 gap-4">
                    {[
                      {
                        label: 'Member Since',
                        value: new Date(connection.user.created_at).toLocaleDateString(),
                      },
                      {
                        label: 'Public Gists',
                        value: connection.stats.publicGists,
                      },
                      {
                        label: 'Organizations',
                        value: connection.stats.organizations ? connection.stats.organizations.length : 0,
                      },
                      {
                        label: 'Languages',
                        value: Object.keys(connection.stats.languages).length,
                      },
                    ].map((stat, index) => (
                      <div
                        key={index}
                        className="bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 border-bolt-elements-border-color dark:border-bolt-elements-border-color flex flex-col rounded-lg border p-3"
                      >
                        <span className="text-bolt-elements-text-secondary text-xs">{stat.label}</span>
                        <span className="text-lg font-medium text-black">{stat.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Repository Stats */}
                  <div className="mt-4">
                    <div className="space-y-4">
                      <div>
                        <h5 className="mb-2 text-sm font-medium text-black">Repository Stats</h5>
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            {
                              label: 'Public Repos',
                              value: connection.stats.publicRepos,
                            },
                            {
                              label: 'Private Repos',
                              value: connection.stats.privateRepos,
                            },
                          ].map((stat, index) => (
                            <div
                              key={index}
                              className="bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 border-bolt-elements-border-color dark:border-bolt-elements-border-color flex flex-col rounded-lg border p-3"
                            >
                              <span className="text-bolt-elements-text-secondary text-xs">{stat.label}</span>
                              <span className="text-lg font-medium text-black">{stat.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h5 className="mb-2 text-sm font-medium text-black">Contribution Stats</h5>
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            {
                              label: 'Stars',
                              value: connection.stats.stars || 0,
                              icon: 'i-ph:star',
                              iconColor: 'text-bolt-elements-icon-warning',
                            },
                            {
                              label: 'Forks',
                              value: connection.stats.forks || 0,
                              icon: 'i-ph:git-fork',
                              iconColor: 'text-bolt-elements-icon-info',
                            },
                            {
                              label: 'Followers',
                              value: connection.stats.followers || 0,
                              icon: 'i-ph:users',
                              iconColor: 'text-bolt-elements-icon-success',
                            },
                          ].map((stat, index) => (
                            <div
                              key={index}
                              className="bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 border-bolt-elements-border-color dark:border-bolt-elements-border-color flex flex-col rounded-lg border p-3"
                            >
                              <span className="text-bolt-elements-text-secondary text-xs">{stat.label}</span>
                              <span className="flex items-center gap-1 text-lg font-medium text-black">
                                <div className={`${stat.icon} h-4 w-4 ${stat.iconColor}`} />
                                {stat.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h5 className="mb-2 text-sm font-medium text-black">Gists</h5>
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            {
                              label: 'Public',
                              value: connection.stats.publicGists,
                            },
                            {
                              label: 'Private',
                              value: connection.stats.privateGists || 0,
                            },
                          ].map((stat, index) => (
                            <div
                              key={index}
                              className="bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 border-bolt-elements-border-color dark:border-bolt-elements-border-color flex flex-col rounded-lg border p-3"
                            >
                              <span className="text-bolt-elements-text-secondary text-xs">{stat.label}</span>
                              <span className="text-lg font-medium text-black">{stat.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-bolt-elements-border-color border-t pt-2">
                        <span className="text-bolt-elements-text-secondary text-xs">
                          Last updated: {new Date(connection.stats.lastUpdated).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Repositories Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-black">Recent Repositories</h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {connection.stats.repos.map((repo) => (
                        <a
                          key={repo.full_name}
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1 border-bolt-elements-border-color dark:border-bolt-elements-border-color hover:border-bolt-elements-border-color-active dark:hover:border-bolt-elements-border-color-active block rounded-lg border p-4 transition-all duration-200"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <div className="i-ph:git-branch text-bolt-elements-icon-tertiary h-4 w-4" />
                                <h5 className="group-hover:text-bolt-elements-item-contentAccent text-sm font-medium text-black transition-colors">
                                  {repo.name}
                                </h5>
                              </div>
                              <div className="text-bolt-elements-text-secondary flex items-center gap-3 text-xs">
                                <span className="flex items-center gap-1" title="Stars">
                                  <div className="i-ph:star text-bolt-elements-icon-warning h-3.5 w-3.5" />
                                  {repo.stargazers_count.toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1" title="Forks">
                                  <div className="i-ph:git-fork text-bolt-elements-icon-info h-3.5 w-3.5" />
                                  {repo.forks_count.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {repo.description && (
                              <p className="text-bolt-elements-text-secondary line-clamp-2 text-xs">
                                {repo.description}
                              </p>
                            )}

                            <div className="text-bolt-elements-text-secondary flex items-center gap-3 text-xs">
                              <span className="flex items-center gap-1" title="Default Branch">
                                <div className="i-ph:git-branch h-3.5 w-3.5" />
                                {repo.default_branch}
                              </span>
                              <span className="flex items-center gap-1" title="Last Updated">
                                <div className="i-ph:clock h-3.5 w-3.5" />
                                {new Date(repo.updated_at).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                              <span className="group-hover:text-bolt-elements-item-contentAccent ml-auto flex items-center gap-1 transition-colors">
                                <div className="i-ph:arrow-square-out h-3.5 w-3.5" />
                                View
                              </span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="flex items-center gap-2">
        <div className="i-ph:spinner-gap-bold h-4 w-4 animate-spin" />
        <span className="text-bolt-elements-text-secondary">Loading...</span>
      </div>
    </div>
  );
}
