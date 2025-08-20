import type { Tool } from 'ai';

type ParameterProperty = {
  type?: string;
  description?: string;
};

type ToolParameters = {
  jsonSchema: {
    properties?: Record<string, ParameterProperty>;
    required?: string[];
  };
};

type McpToolProps = {
  toolName: string;
  toolSchema: Tool;
};

export default function McpServerListItem({ toolName, toolSchema }: McpToolProps) {
  if (!toolSchema) {
    return null;
  }

  const parameters = (toolSchema.parameters as ToolParameters)?.jsonSchema.properties || {};
  const requiredParams = (toolSchema.parameters as ToolParameters)?.jsonSchema.required || [];

  return (
    <div className="bg-bolt-elements-background-depth-2 mt-2 ml-4 rounded-md p-3 text-xs">
      <div className="flex flex-col gap-1.5">
        <h3 className="truncate font-semibold text-black" title={toolName}>
          {toolName}
        </h3>

        <p className="text-bolt-elements-text-secondary">{toolSchema.description || 'No description available'}</p>

        {Object.keys(parameters).length > 0 && (
          <div className="mt-2.5">
            <h4 className="text-bolt-elements-text-secondary mb-1.5 font-semibold">Parameters:</h4>
            <ul className="ml-1 space-y-2">
              {Object.entries(parameters).map(([paramName, paramDetails]) => (
                <li key={paramName} className="break-words">
                  <div className="flex items-start">
                    <span className="font-medium text-black">
                      {paramName}
                      {requiredParams.includes(paramName) && (
                        <span className="ml-1 text-red-600 dark:text-red-400">*</span>
                      )}
                    </span>

                    <span className="text-bolt-elements-text-secondary mx-2">•</span>

                    <div className="flex-1">
                      {paramDetails.type && (
                        <span className="text-bolt-elements-text-secondary italic">{paramDetails.type}</span>
                      )}
                      {paramDetails.description && (
                        <div className="text-bolt-elements-text-secondary mt-0.5">{paramDetails.description}</div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
