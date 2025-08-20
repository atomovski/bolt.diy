import { AnimatePresence, motion } from 'framer-motion';
import type { SupabaseAlert } from '~/types/actions';
import { cn } from '~/utils/cn';
import { supabaseConnection } from '~/lib/stores/supabase';
import { useStore } from '@nanostores/react';
import { useState } from 'react';

interface Props {
  alert: SupabaseAlert;
  clearAlert: () => void;
  postMessage: (message: string) => void;
}

export function SupabaseChatAlert({ alert, clearAlert, postMessage }: Props) {
  const { content } = alert;
  const connection = useStore(supabaseConnection);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Determine connection state
  const isConnected = !!(connection.token && connection.selectedProjectId);

  // Set title and description based on connection state
  const title = isConnected ? 'Supabase Query' : 'Supabase Connection Required';
  const description = isConnected ? 'Execute database query' : 'Supabase connection required';
  const message = isConnected
    ? 'Please review the proposed changes and apply them to your database.'
    : 'Please connect to Supabase to continue with this operation.';

  const handleConnectClick = () => {
    // Dispatch an event to open the Supabase connection dialog
    document.dispatchEvent(new CustomEvent('open-supabase-connection'));
  };

  // Determine if we should show the Connect button or Apply Changes button
  const showConnectButton = !isConnected;

  const executeSupabaseAction = async (sql: string) => {
    if (!connection.token || !connection.selectedProjectId) {
      console.error('No Supabase token or project selected');
      return;
    }

    setIsExecuting(true);

    try {
      const response = await fetch('/api/supabase/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${connection.token}`,
        },
        body: JSON.stringify({
          projectId: connection.selectedProjectId,
          query: sql,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as any;
        throw new Error(`Supabase query failed: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('Supabase query executed successfully:', result);
      clearAlert();
    } catch (error) {
      console.error('Failed to execute Supabase action:', error);
      postMessage(
        `*Error executing Supabase query please fix and return the query again*\n\`\`\`\n${error instanceof Error ? error.message : String(error)}\n\`\`\`\n`,
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const cleanSqlContent = (content: string) => {
    if (!content) {
      return '';
    }

    let cleaned = content.replace(/\/\*[\s\S]*?\*\//g, '');

    cleaned = cleaned.replace(/(--).*$/gm, '').replace(/(#).*$/gm, '');

    const statements = cleaned
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0)
      .join(';\n\n');

    return statements;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="max-w-chat border-bolt-elements-border-color bg-bolt-elements-background-depth-2 rounded-lg border border-l-2 border-l-[#098F5F]"
      >
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-center gap-2">
            <img height="10" width="18" crossOrigin="anonymous" src="https://cdn.simpleicons.org/supabase" />
            <h3 className="text-sm font-medium text-[#3DCB8F]">{title}</h3>
          </div>
        </div>

        {/* SQL Content */}
        <div className="px-4">
          {!isConnected ? (
            <div className="bg-darken-50 rounded-md p-3">
              <span className="text-sm text-black">You must first connect to Supabase and select a project.</span>
            </div>
          ) : (
            <>
              <div
                className="bg-darken-50 flex cursor-pointer items-center rounded-md p-2"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                <div className="i-ph:database mr-2 text-black"></div>
                <span className="grow text-sm text-black">{description || 'Create table and setup auth'}</span>
                <div
                  className={`i-ph:caret-up text-black transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                ></div>
              </div>

              {!isCollapsed && content && (
                <div className="bg-bolt-elements-background-depth-4 text-bolt-elements-text-secondary mt-2 max-h-60 overflow-auto rounded-md p-3 font-mono text-xs">
                  <pre>{cleanSqlContent(content)}</pre>
                </div>
              )}
            </>
          )}
        </div>

        {/* Message and Actions */}
        <div className="p-4">
          <p className="text-bolt-elements-text-secondary mb-4 text-sm">{message}</p>

          <div className="flex gap-2">
            {showConnectButton ? (
              <button
                onClick={handleConnectClick}
                className={cn(
                  `rounded-md px-3 py-2 text-sm font-medium`,
                  'bg-[#098F5F]',
                  'hover:bg-[#0aa06c]',
                  'focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-hidden',
                  'text-white',
                  'flex items-center gap-1.5',
                )}
              >
                Connect to Supabase
              </button>
            ) : (
              <button
                onClick={() => executeSupabaseAction(content)}
                disabled={isExecuting}
                className={cn(
                  `rounded-md px-3 py-2 text-sm font-medium`,
                  'bg-[#098F5F]',
                  'hover:bg-[#0aa06c]',
                  'focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-hidden',
                  'text-white',
                  'flex items-center gap-1.5',
                  isExecuting ? 'cursor-not-allowed opacity-70' : '',
                )}
              >
                {isExecuting ? 'Applying...' : 'Apply Changes'}
              </button>
            )}
            <button
              onClick={clearAlert}
              disabled={isExecuting}
              className={cn(
                `rounded-md px-3 py-2 text-sm font-medium`,
                'bg-[#503B26]',
                'hover:bg-[#774f28]',
                'focus:outline-hidden',
                'text-[#F79007]',
                isExecuting ? 'cursor-not-allowed opacity-70' : '',
              )}
            >
              Dismiss
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
