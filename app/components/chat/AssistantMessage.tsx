/* eslint-disable @blitz/lines-around-comment */
import { memo, Fragment } from 'react';
import { Markdown } from './Markdown';
import type { JSONValue } from 'ai';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/Popover';
import { workbenchStore } from '~/lib/stores/workbench';
import { WORK_DIR } from '~/utils/constants';
import type { Message } from 'ai';
import type { ProviderInfo } from '~/types/model';
import type {
  TextUIPart,
  ReasoningUIPart,
  ToolInvocationUIPart,
  SourceUIPart,
  FileUIPart,
  StepStartUIPart,
} from '@ai-sdk/ui-utils';
import { ToolInvocations } from './ToolInvocations';
import type { ToolCallAnnotation } from '~/types/context';
import { Button, Icon } from '~/components/ui';

interface AssistantMessageProps {
  content: string;
  annotations?: JSONValue[];
  messageId?: string;
  onRewind?: (messageId: string) => void;
  onFork?: (messageId: string) => void;
  append?: (message: Message) => void;
  chatMode?: 'discuss' | 'build';
  setChatMode?: (mode: 'discuss' | 'build') => void;
  model?: string;
  provider?: ProviderInfo;
  parts:
    | (TextUIPart | ReasoningUIPart | ToolInvocationUIPart | SourceUIPart | FileUIPart | StepStartUIPart)[]
    | undefined;
  addToolResult: ({ toolCallId, result }: { toolCallId: string; result: any }) => void;
}

function openArtifactInWorkbench(filePath: string) {
  filePath = normalizedFilePath(filePath);

  if (workbenchStore.currentView.get() !== 'code') {
    workbenchStore.currentView.set('code');
  }

  workbenchStore.setSelectedFile(`${WORK_DIR}/${filePath}`);
}

function normalizedFilePath(path: string) {
  let normalizedPath = path;

  if (normalizedPath.startsWith(WORK_DIR)) {
    normalizedPath = path.replace(WORK_DIR, '');
  }

  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.slice(1);
  }

  return normalizedPath;
}

export const AssistantMessage = memo(
  ({
    content,
    annotations,
    messageId,
    onRewind,
    onFork,
    append,
    chatMode,
    setChatMode,
    model,
    provider,
    parts,
    addToolResult,
  }: AssistantMessageProps) => {
    const filteredAnnotations = (annotations?.filter(
      (annotation: JSONValue) =>
        annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
    ) || []) as { type: string; value: any } & { [key: string]: any }[];

    let chatSummary: string | undefined = undefined;

    if (filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')) {
      chatSummary = filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')?.summary;
    }

    let codeContext: string[] | undefined = undefined;

    if (filteredAnnotations.find((annotation) => annotation.type === 'codeContext')) {
      codeContext = filteredAnnotations.find((annotation) => annotation.type === 'codeContext')?.files;
    }

    const usage: {
      completionTokens: number;
      promptTokens: number;
      totalTokens: number;
    } = filteredAnnotations.find((annotation) => annotation.type === 'usage')?.value;

    const toolInvocations = parts?.filter((part) => part.type === 'tool-invocation');
    const toolCallAnnotations = filteredAnnotations.filter(
      (annotation) => annotation.type === 'toolCall',
    ) as ToolCallAnnotation[];

    return (
      <div className="flex w-full flex-col gap-4 overflow-hidden">
        <>
          <div className="mb-2 flex items-center justify-between gap-4">
            <div className="flex flex-1 flex-col gap-2">
              {(codeContext || chatSummary) && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex w-fit items-center gap-1 rounded-md px-2 py-1 text-base transition-colors"
                    >
                      <Icon.InfoCircle className="size-4" />
                      {chatSummary ? 'Summary' : 'Context'}
                      {codeContext && ` (${codeContext.length} files)`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 max-w-[90vw]" align="start">
                    {chatSummary && (
                      <div className="mb-4">
                        <div className="summary flex max-h-96 flex-col">
                          <h3 className="mb-2 text-sm font-medium">Summary</h3>
                          <div className="overflow-y-auto">
                            <Markdown>{chatSummary}</Markdown>
                          </div>
                        </div>
                      </div>
                    )}
                    {codeContext && (
                      <div className="code-context">
                        <h3 className="mb-2 text-sm font-medium">Context Files</h3>
                        <div className="flex flex-wrap gap-2">
                          {codeContext.map((x) => {
                            const normalized = normalizedFilePath(x);
                            return (
                              <Fragment key={normalized}>
                                <code
                                  className="bg-bolt-elements-artifacts-inlineCode-background text-bolt-elements-artifacts-inlineCode-text text-bolt-elements-item-contentAccent cursor-pointer rounded-md px-1.5 py-1 text-xs hover:underline"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openArtifactInWorkbench(normalized);
                                  }}
                                >
                                  {normalized}
                                </code>
                              </Fragment>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              )}
              {usage && (
                <div className="text-sm">
                  Tokens: {usage.totalTokens} (prompt: {usage.promptTokens}, completion: {usage.completionTokens})
                </div>
              )}
            </div>
            {(onRewind || onFork) && messageId && (
              <div className="flex flex-shrink-0 items-center gap-2">
                {onRewind && (
                  // <WithTooltip tooltip="Revert to this message">
                  <Icon.Rewind
                    onClick={() => onRewind(messageId)}
                    className="text-bolt-elements-text-secondary size-4 cursor-pointer transition-colors hover:text-black"
                  />
                  // </WithTooltip>
                )}
                {onFork && (
                  // <WithTooltip tooltip="Fork chat from this message">
                  <Icon.GitFork
                    onClick={() => onFork(messageId)}
                    className="text-bolt-elements-text-secondary size-4 cursor-pointer transition-colors hover:text-black"
                  />
                  // </WithTooltip>
                )}
              </div>
            )}
          </div>
        </>
        <Markdown append={append} chatMode={chatMode} setChatMode={setChatMode} model={model} provider={provider} html>
          {content}
        </Markdown>
        {toolInvocations && toolInvocations.length > 0 && (
          <ToolInvocations
            toolInvocations={toolInvocations}
            toolCallAnnotations={toolCallAnnotations}
            addToolResult={addToolResult}
          />
        )}
      </div>
    );
  },
);
