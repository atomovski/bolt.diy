import { motion } from 'framer-motion';
import React, { Suspense, useState } from 'react';
import { cn } from '~/utils/cn';
import ConnectionDiagnostics from './ConnectionDiagnostics';
import { Button } from '~/components/ui/Button';
import VercelConnection from './VercelConnection';

// Use React.lazy for dynamic imports
const GitHubConnection = React.lazy(() => import('./GithubConnection'));
const NetlifyConnection = React.lazy(() => import('./NetlifyConnection'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1 border-bolt-elements-border-color dark:border-bolt-elements-border-color rounded-lg border p-4">
    <div className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary flex items-center justify-center gap-2">
      <div className="i-ph:spinner-gap h-4 w-4 animate-spin" />
      <span>Loading connection...</span>
    </div>
  </div>
);

export default function ConnectionsTab() {
  const [isEnvVarsExpanded, setIsEnvVarsExpanded] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2">
          <div className="i-ph:plugs-connected text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent h-5 w-5" />
          <h2 className="text-lg font-medium text-black dark:text-black">Connection Settings</h2>
        </div>
        <Button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          variant="outline"
          className="hover:bg-bolt-elements-item-backgroundActive/10 dark:hover:bg-bolt-elements-item-backgroundActive/10 flex items-center gap-2 transition-colors hover:text-black dark:hover:text-black"
        >
          {showDiagnostics ? (
            <>
              <div className="i-ph:eye-slash h-4 w-4" />
              Hide Diagnostics
            </>
          ) : (
            <>
              <div className="i-ph:wrench h-4 w-4" />
              Troubleshoot Connections
            </>
          )}
        </Button>
      </motion.div>
      <p className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary text-sm">
        Manage your external service connections and integrations
      </p>

      {/* Diagnostics Tool - Conditionally rendered */}
      {showDiagnostics && <ConnectionDiagnostics />}

      {/* Environment Variables Info - Collapsible */}
      <motion.div
        className="bg-bolt-elements-background dark:bg-bolt-elements-background border-bolt-elements-border-color dark:border-bolt-elements-border-color rounded-lg border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="p-6">
          <button
            onClick={() => setIsEnvVarsExpanded(!isEnvVarsExpanded)}
            className={cn(
              'flex w-full items-center justify-between bg-transparent',
              'hover:bg-bolt-elements-item-backgroundActive/10 hover:text-black',
              'dark:hover:bg-bolt-elements-item-backgroundActive/10 dark:hover:text-black',
              '-m-2 rounded-md p-2 transition-colors',
            )}
          >
            <div className="flex items-center gap-2">
              <div className="i-ph:info text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent h-5 w-5" />
              <h3 className="text-base font-medium text-black dark:text-black">Environment Variables</h3>
            </div>
            <div
              className={cn(
                'i-ph:caret-down text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary h-4 w-4 transition-transform',
                isEnvVarsExpanded ? 'rotate-180' : '',
              )}
            />
          </button>

          {isEnvVarsExpanded && (
            <div className="mt-4">
              <p className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary mb-2 text-sm">
                You can configure connections using environment variables in your{' '}
                <code className="bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 rounded-sm px-1 py-0.5">
                  .env.local
                </code>{' '}
                file:
              </p>
              <div className="bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 overflow-x-auto rounded-md p-3 font-mono text-xs">
                <div className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary">
                  # GitHub Authentication
                </div>
                <div className="text-black dark:text-black">VITE_GITHUB_ACCESS_TOKEN=your_token_here</div>
                <div className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary">
                  # Optional: Specify token type (defaults to 'classic' if not specified)
                </div>
                <div className="text-black dark:text-black">VITE_GITHUB_TOKEN_TYPE=classic|fine-grained</div>
                <div className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary mt-2">
                  # Netlify Authentication
                </div>
                <div className="text-black dark:text-black">VITE_NETLIFY_ACCESS_TOKEN=your_token_here</div>
              </div>
              <div className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary mt-3 space-y-1 text-xs">
                <p>
                  <span className="font-medium">Token types:</span>
                </p>
                <ul className="list-inside list-disc space-y-1 pl-2">
                  <li>
                    <span className="font-medium">classic</span> - Personal Access Token with{' '}
                    <code className="bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 rounded-sm px-1 py-0.5">
                      repo, read:org, read:user
                    </code>{' '}
                    scopes
                  </li>
                  <li>
                    <span className="font-medium">fine-grained</span> - Fine-grained token with Repository and
                    Organization access
                  </li>
                </ul>
                <p className="mt-2">
                  When set, these variables will be used automatically without requiring manual connection.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6">
        <Suspense fallback={<LoadingFallback />}>
          <GitHubConnection />
        </Suspense>
        <Suspense fallback={<LoadingFallback />}>
          <NetlifyConnection />
        </Suspense>
        <Suspense fallback={<LoadingFallback />}>
          <VercelConnection />
        </Suspense>
      </div>

      {/* Additional help text */}
      <div className="text-bolt-elements-text-secondary dark:text-bolt-elements-text-secondary bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 rounded-lg p-4 text-sm">
        <p className="mb-2 flex items-center gap-1">
          <span className="i-ph:lightbulb text-bolt-elements-icon-success dark:text-bolt-elements-icon-success h-4 w-4" />
          <span className="font-medium">Troubleshooting Tip:</span>
        </p>
        <p className="mb-2">
          If you're having trouble with connections, try using the troubleshooting tool at the top of this page. It can
          help diagnose and fix common connection issues.
        </p>
        <p>For persistent issues:</p>
        <ol className="mt-1 list-inside list-decimal pl-4">
          <li>Check your browser console for errors</li>
          <li>Verify that your tokens have the correct permissions</li>
          <li>Try clearing your browser cache and cookies</li>
          <li>Ensure your browser allows third-party cookies if using integrations</li>
        </ol>
      </div>
    </div>
  );
}
