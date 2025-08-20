import { memo, useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import type { BundledLanguage } from 'shiki';
import { createScopedLogger } from '~/utils/logger';
import { rehypePlugins, remarkPlugins, allowedHTMLElements } from '~/utils/markdown';
import { Artifact, openArtifactInWorkbench } from './Artifact';
import { CodeBlock } from './CodeBlock';
import type { Message } from 'ai';
import styles from './Markdown.module.scss';
import ThoughtBox from './ThoughtBox';
import type { ProviderInfo } from '~/types/model';
import { cn } from '~/utils/cn';

const logger = createScopedLogger('MarkdownComponent');

interface MarkdownProps {
  children: string;
  html?: boolean;
  limitedMarkdown?: boolean;
  append?: (message: Message) => void;
  chatMode?: 'discuss' | 'build';
  setChatMode?: (mode: 'discuss' | 'build') => void;
  model?: string;
  provider?: ProviderInfo;
}

export const Markdown = memo(
  ({ children, html = false, limitedMarkdown = false, append, setChatMode, model, provider }: MarkdownProps) => {
    logger.trace('Render');

    const components = useMemo(() => {
      return {
        div: ({ className, children, node, ...props }) => {
          const dataProps = node?.properties as Record<string, unknown>;

          if (className?.includes('__boltArtifact__')) {
            const messageId = node?.properties.dataMessageId as string;

            if (!messageId) {
              logger.error(`Invalid message id ${messageId}`);
            }

            return <Artifact messageId={messageId} />;
          }

          if (className?.includes('__boltSelectedElement__')) {
            const messageId = node?.properties.dataMessageId as string;
            const elementDataAttr = node?.properties.dataElement as string;

            // Parse the element data if it exists
            let elementData: any = null;

            if (elementDataAttr) {
              try {
                elementData = JSON.parse(elementDataAttr);
              } catch (e) {
                console.error('Failed to parse element data:', e);
              }
            }

            if (!messageId) {
              logger.error(`Invalid message id ${messageId}`);
            }

            return (
              <div className="bg-darken-50 border-bolt-elements-border-color my-2 rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="bg-bolt-elements-background-depth-2 text-bolt-elements-textTer rounded-sm px-2 py-1 font-mono text-xs">
                    {elementData?.tagName}
                  </span>
                  {elementData?.className && (
                    <span className="text-bolt-elements-text-secondary text-xs">.{elementData.className}</span>
                  )}
                </div>
                <code className="text-bolt-elements-text-secondary! bg-bolt-elements-background-depth-2! border-bolt-elements-border-color block rounded-sm border p-2 text-sm">
                  {elementData?.displayText}
                </code>
              </div>
            );
          }

          if (className?.includes('__boltThought__')) {
            return <ThoughtBox title="Thought process">{children}</ThoughtBox>;
          }

          if (className?.includes('__boltQuickAction__') || dataProps?.dataBoltQuickAction) {
            return <div className="mt-3.5 flex flex-wrap items-center gap-2">{children}</div>;
          }

          return (
            <div className={className} {...props}>
              {children}
            </div>
          );
        },
        pre: (props) => {
          const { children, node, ...rest } = props;

          const [firstChild] = node?.children ?? [];

          if (
            firstChild &&
            firstChild.type === 'element' &&
            firstChild.tagName === 'code' &&
            firstChild.children[0].type === 'text'
          ) {
            const { className, ...rest } = firstChild.properties;
            const [, language = 'plaintext'] = /language-(\w+)/.exec(String(className) || '') ?? [];

            return <CodeBlock code={firstChild.children[0].value} language={language as BundledLanguage} {...rest} />;
          }

          return <pre {...rest}>{children}</pre>;
        },
        button: ({ node, children, ...props }) => {
          const dataProps = node?.properties as Record<string, unknown>;

          if (
            dataProps?.class?.toString().includes('__boltQuickAction__') ||
            dataProps?.dataBoltQuickAction === 'true'
          ) {
            const type = dataProps['data-type'] || dataProps.dataType;
            const message = dataProps['data-message'] || dataProps.dataMessage;
            const path = dataProps['data-path'] || dataProps.dataPath;
            const href = dataProps['data-href'] || dataProps.dataHref;

            const iconClassMap: Record<string, string> = {
              file: 'i-ph:file',
              message: 'i-ph:chats',
              implement: 'i-ph:code',
              link: 'i-ph:link',
            };

            const safeType = typeof type === 'string' ? type : '';
            const iconClass = iconClassMap[safeType] ?? 'i-ph:question';

            return (
              <button
                className="bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent flex cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs opacity-90 hover:opacity-100"
                data-type={type}
                data-message={message}
                data-path={path}
                data-href={href}
                onClick={() => {
                  if (type === 'file') {
                    openArtifactInWorkbench(path);
                  } else if (type === 'message' && append) {
                    append({
                      id: `quick-action-message-${Date.now()}`,
                      content: [
                        {
                          type: 'text',
                          text: `[Model: ${model}]\n\n[Provider: ${provider?.name}]\n\n${message}`,
                        },
                      ] as any,
                      role: 'user',
                    });
                    console.log('Message appended:', message);
                  } else if (type === 'implement' && append && setChatMode) {
                    setChatMode('build');
                    append({
                      id: `quick-action-implement-${Date.now()}`,
                      content: [
                        {
                          type: 'text',
                          text: `[Model: ${model}]\n\n[Provider: ${provider?.name}]\n\n${message}`,
                        },
                      ] as any,
                      role: 'user',
                    });
                  } else if (type === 'link' && typeof href === 'string') {
                    try {
                      const url = new URL(href, window.location.origin);
                      window.open(url.toString(), '_blank', 'noopener,noreferrer');
                    } catch (error) {
                      console.error('Invalid URL:', href, error);
                    }
                  }
                }}
              >
                <div className={`text-lg ${iconClass}`} />
                {children}
              </button>
            );
          }

          return <button {...props}>{children}</button>;
        },
        p: ({ children, ...props }) => {
          return (
            <p className="text-base" {...props}>
              {children}
            </p>
          );
        },
        li: ({ children, ...props }) => {
          return (
            <li {...props}>
              <div className="[&>*:not(:last-child)]:mb-4 [&>*:not(:last-child)]:flex">{children}</div>
            </li>
          );
        },
      } satisfies Components;
    }, []);

    return (
      <ReactMarkdown
        allowedElements={allowedHTMLElements}
        className={cn(styles.MarkdownContent, 'text-base')}
        components={components}
        remarkPlugins={remarkPlugins(limitedMarkdown)}
        rehypePlugins={rehypePlugins(html)}
      >
        {stripCodeFenceFromArtifact(children)}
      </ReactMarkdown>
    );
  },
);

/**
 * Removes code fence markers (```) surrounding an artifact element while preserving the artifact content.
 * This is necessary because artifacts should not be wrapped in code blocks when rendered for rendering action list.
 *
 * @param content - The markdown content to process
 * @returns The processed content with code fence markers removed around artifacts
 *
 * @example
 * // Removes code fences around artifact
 * const input = "```xml\n<div class='__boltArtifact__'></div>\n```";
 * stripCodeFenceFromArtifact(input);
 * // Returns: "\n<div class='__boltArtifact__'></div>\n"
 *
 * @remarks
 * - Only removes code fences that directly wrap an artifact (marked with __boltArtifact__ class)
 * - Handles code fences with optional language specifications (e.g. ```xml, ```typescript)
 * - Preserves original content if no artifact is found
 * - Safely handles edge cases like empty input or artifacts at start/end of content
 */
export const stripCodeFenceFromArtifact = (content: string) => {
  if (!content || !content.includes('__boltArtifact__')) {
    return content;
  }

  const lines = content.split('\n');
  const artifactLineIndex = lines.findIndex((line) => line.includes('__boltArtifact__'));

  // Return original content if artifact line not found
  if (artifactLineIndex === -1) {
    return content;
  }

  // Check previous line for code fence
  if (artifactLineIndex > 0 && lines[artifactLineIndex - 1]?.trim().match(/^```\w*$/)) {
    lines[artifactLineIndex - 1] = '';
  }

  if (artifactLineIndex < lines.length - 1 && lines[artifactLineIndex + 1]?.trim().match(/^```$/)) {
    lines[artifactLineIndex + 1] = '';
  }

  return lines.join('\n');
};
