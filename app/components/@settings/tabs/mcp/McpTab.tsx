import { useEffect, useMemo, useState } from 'react';
import { cn } from '~/utils/cn';
import type { MCPConfig } from '~/lib/services/mcpService';
import { toast } from 'react-toastify';
import { useMCPStore } from '~/lib/stores/mcp';
import McpServerList from '~/components/@settings/tabs/mcp/McpServerList';

const EXAMPLE_MCP_CONFIG: MCPConfig = {
  mcpServers: {
    everything: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-everything'],
    },
    deepwiki: {
      type: 'streamable-http',
      url: 'https://mcp.deepwiki.com/mcp',
    },
    'local-sse': {
      type: 'sse',
      url: 'http://localhost:8000/sse',
      headers: {
        Authorization: 'Bearer mytoken123',
      },
    },
  },
};

export default function McpTab() {
  const settings = useMCPStore((state) => state.settings);
  const isInitialized = useMCPStore((state) => state.isInitialized);
  const serverTools = useMCPStore((state) => state.serverTools);
  const initialize = useMCPStore((state) => state.initialize);
  const updateSettings = useMCPStore((state) => state.updateSettings);
  const checkServersAvailabilities = useMCPStore((state) => state.checkServersAvailabilities);

  const [isSaving, setIsSaving] = useState(false);
  const [mcpConfigText, setMCPConfigText] = useState('');
  const [maxLLMSteps, setMaxLLMSteps] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingServers, setIsCheckingServers] = useState(false);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized) {
      initialize().catch((err) => {
        setError(`Failed to initialize MCP settings: ${err instanceof Error ? err.message : String(err)}`);
        toast.error('Failed to load MCP configuration');
      });
    }
  }, [isInitialized]);

  useEffect(() => {
    setMCPConfigText(JSON.stringify(settings.mcpConfig, null, 2));
    setMaxLLMSteps(settings.maxLLMSteps);
    setError(null);
  }, [settings]);

  const parsedConfig = useMemo(() => {
    try {
      setError(null);
      return JSON.parse(mcpConfigText) as MCPConfig;
    } catch (e) {
      setError(`Invalid JSON format: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }, [mcpConfigText]);

  const handleMaxLLMCallChange = (value: string) => {
    setMaxLLMSteps(parseInt(value, 10));
  };

  const handleSave = async () => {
    if (!parsedConfig) {
      return;
    }

    setIsSaving(true);

    try {
      await updateSettings({
        mcpConfig: parsedConfig,
        maxLLMSteps,
      });
      toast.success('MCP configuration saved');

      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save configuration');
      toast.error('Failed to save MCP configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadExample = () => {
    setMCPConfigText(JSON.stringify(EXAMPLE_MCP_CONFIG, null, 2));
    setError(null);
  };

  const checkServerAvailability = async () => {
    if (serverEntries.length === 0) {
      return;
    }

    setIsCheckingServers(true);
    setError(null);

    try {
      await checkServersAvailabilities();
    } catch (e) {
      setError(`Failed to check server availability: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsCheckingServers(false);
    }
  };

  const toggleServerExpanded = (serverName: string) => {
    setExpandedServer(expandedServer === serverName ? null : serverName);
  };

  const serverEntries = useMemo(() => Object.entries(serverTools), [serverTools]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section aria-labelledby="server-status-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-medium text-black">MCP Servers Configured</h2>{' '}
          <button
            onClick={checkServerAvailability}
            disabled={isCheckingServers || !parsedConfig || serverEntries.length === 0}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm',
              'bg-darken-50 hover:bg-bolt-elements-background-depth-4',
              'text-black',
              'transition-all duration-200',
              'flex items-center gap-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {isCheckingServers ? (
              <div className="i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress h-3 w-3 animate-spin" />
            ) : (
              <div className="i-ph:arrow-counter-clockwise h-3 w-3" />
            )}
            Check availability
          </button>
        </div>
        <McpServerList
          checkingServers={isCheckingServers}
          expandedServer={expandedServer}
          serverEntries={serverEntries}
          toggleServerExpanded={toggleServerExpanded}
        />
      </section>

      <section aria-labelledby="config-section-heading">
        <h2 className="mb-3 text-base font-medium text-black">Configuration</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="mcp-config" className="text-bolt-elements-text-secondary mb-2 block text-sm">
              Configuration JSON
            </label>
            <textarea
              id="mcp-config"
              value={mcpConfigText}
              onChange={(e) => setMCPConfigText(e.target.value)}
              className={cn(
                'h-72 w-full rounded-lg px-3 py-2 font-mono text-sm',
                'bg-[#F8F8F8] dark:bg-[#1A1A1A]',
                'border',
                error ? 'border-bolt-elements-icon-error' : 'border-[#E5E5E5] dark:border-[#333333]',
                'text-black',
                'focus:ring-bolt-elements-focus focus:ring-1 focus:outline-hidden',
              )}
            />
          </div>
          <div>{error && <p className="text-bolt-elements-icon-error mt-2 mb-2 text-sm">{error}</p>}</div>
          <div>
            <label htmlFor="max-llm-steps" className="text-bolt-elements-text-secondary mb-2 block text-sm">
              Maximum number of sequential LLM calls (steps)
            </label>
            <input
              id="max-llm-steps"
              type="number"
              placeholder="Maximum number of sequential LLM calls"
              min="1"
              max="20"
              value={maxLLMSteps}
              onChange={(e) => handleMaxLLMCallChange(e.target.value)}
              className="dark:bg-bolt-elements-background-depth-4 border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark w-full rounded-lg border bg-white px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <div className="text-bolt-elements-text-secondary mt-2 text-sm">
            The MCP configuration format is identical to the one used in Claude Desktop.
            <a
              href="https://modelcontextprotocol.io/examples"
              target="_blank"
              rel="noopener noreferrer"
              className="text-bolt-elements-link inline-flex items-center gap-1 hover:underline"
            >
              View example servers
              <div className="i-ph:arrow-square-out h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap justify-between gap-3">
        <button
          onClick={handleLoadExample}
          className="border-bolt-elements-border-color bg-bolt-elements-background-depth-2 text-bolt-elements-text-secondary hover:bg-darken-50 rounded-lg border px-4 py-2 text-sm"
        >
          Load Example
        </button>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving || !parsedConfig}
            aria-disabled={isSaving || !parsedConfig}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm',
              'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent',
              'hover:bg-bolt-elements-item-backgroundActive',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <div className="i-ph:floppy-disk h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
