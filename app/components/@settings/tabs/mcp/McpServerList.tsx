import type { MCPServer } from '~/lib/services/mcpService';
import McpStatusBadge from '~/components/@settings/tabs/mcp/McpStatusBadge';
import McpServerListItem from '~/components/@settings/tabs/mcp/McpServerListItem';

type McpServerListProps = {
  serverEntries: [string, MCPServer][];
  expandedServer: string | null;
  checkingServers: boolean;
  onlyShowAvailableServers?: boolean;
  toggleServerExpanded: (serverName: string) => void;
};

export default function McpServerList({
  serverEntries,
  expandedServer,
  checkingServers,
  onlyShowAvailableServers = false,
  toggleServerExpanded,
}: McpServerListProps) {
  if (serverEntries.length === 0) {
    return <p className="text-bolt-elements-text-secondary text-sm">No MCP servers configured</p>;
  }

  const filteredEntries = onlyShowAvailableServers
    ? serverEntries.filter(([, s]) => s.status === 'available')
    : serverEntries;

  return (
    <div className="space-y-2">
      {filteredEntries.map(([serverName, mcpServer]) => {
        const isAvailable = mcpServer.status === 'available';
        const isExpanded = expandedServer === serverName;
        const serverTools = isAvailable ? Object.entries(mcpServer.tools) : [];

        return (
          <div key={serverName} className="bg-bolt-elements-background-depth-1 flex flex-col rounded-md p-2">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div
                  onClick={() => toggleServerExpanded(serverName)}
                  className="flex items-center gap-1.5 text-black"
                  aria-expanded={isExpanded}
                >
                  <div
                    className={`i-ph:${isExpanded ? 'caret-down' : 'caret-right'} h-3 w-3 transition-transform duration-150`}
                  />
                  <span className="truncate text-left font-medium">{serverName}</span>
                </div>

                <div className="min-w-0 flex-1 truncate">
                  {mcpServer.config.type === 'sse' || mcpServer.config.type === 'streamable-http' ? (
                    <span className="text-bolt-elements-text-secondary truncate text-xs">{mcpServer.config.url}</span>
                  ) : (
                    <span className="text-bolt-elements-text-secondary truncate text-xs">
                      {mcpServer.config.command} {mcpServer.config.args?.join(' ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="ml-2 shrink-0">
                {checkingServers ? (
                  <McpStatusBadge status="checking" />
                ) : (
                  <McpStatusBadge status={isAvailable ? 'available' : 'unavailable'} />
                )}
              </div>
            </div>

            {/* Error message */}
            {!isAvailable && mcpServer.error && (
              <div className="mt-1.5 ml-6 text-xs text-red-600 dark:text-red-400">Error: {mcpServer.error}</div>
            )}

            {/* Tool list */}
            {isExpanded && isAvailable && (
              <div className="mt-2">
                <div className="text-bolt-elements-text-secondary mb-1.5 ml-1 text-xs font-medium">
                  Available Tools:
                </div>
                {serverTools.length === 0 ? (
                  <div className="text-bolt-elements-text-secondary ml-4 text-xs">No tools available</div>
                ) : (
                  <div className="mt-1 space-y-2">
                    {serverTools.map(([toolName, toolSchema]) => (
                      <McpServerListItem
                        key={`${serverName}-${toolName}`}
                        toolName={toolName}
                        toolSchema={toolSchema}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
