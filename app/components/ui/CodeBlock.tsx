import React, { useState } from 'react';
import { cn } from '~/utils/cn';
import { motion } from 'framer-motion';
import { FileIcon } from './FileIcon';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  maxHeight?: string;
  className?: string;
  onCopy?: () => void;
}

export function CodeBlock({
  code,
  language,
  filename,
  showLineNumbers = true,
  highlightLines = [],
  maxHeight = '400px',
  className,
  onCopy,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  const lines = code.split('\n');

  return (
    <div
      className={cn(
        'border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark overflow-hidden rounded-lg border',
        'bg-bolt-elements-background-depth-2 dark:bg-darken-50',
        className,
      )}
    >
      {/* Header */}
      <div className="bg-darken-50 dark:bg-bolt-elements-background-depth-4 border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          {filename && (
            <>
              <FileIcon filename={filename} size="sm" />
              <span className="text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark text-xs font-medium">
                {filename}
              </span>
            </>
          )}
          {language && !filename && (
            <span className="text-bolt-elements-text-secondary dark:text-bolt-elements-textSecondary-dark text-xs font-medium uppercase">
              {language}
            </span>
          )}
        </div>
        {/* <Tooltip content={copied ? 'Copied!' : 'Copy code'}> */}
        <motion.button
          onClick={handleCopy}
          className="text-bolt-elements-text-tertiary hover:text-bolt-elements-text-secondary dark:text-bolt-elements-textTertiary-dark dark:hover:text-bolt-elements-textSecondary-dark hover:bg-bolt-elements-background-depth-2 dark:hover:bg-darken-50 rounded-md p-1.5 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {copied ? <span className="i-ph:check h-4 w-4 text-green-500" /> : <span className="i-ph:copy h-4 w-4" />}
        </motion.button>
        {/* </Tooltip> */}
      </div>

      {/* Code content */}
      <div className={cn('overflow-auto', 'font-mono text-sm', 'custom-scrollbar')} style={{ maxHeight }}>
        <table className="min-w-full border-collapse">
          <tbody>
            {lines.map((line, index) => (
              <tr
                key={index}
                className={cn(
                  highlightLines.includes(index + 1) ? 'bg-purple-500/10 dark:bg-purple-500/20' : '',
                  'hover:bg-darken-50 dark:hover:bg-bolt-elements-background-depth-4',
                )}
              >
                {showLineNumbers && (
                  <td className="text-bolt-elements-text-tertiary dark:text-bolt-elements-textTertiary-dark border-bolt-elements-border-color dark:border-bolt-elements-borderColor-dark border-r py-1 pr-2 pl-4 text-right select-none">
                    <span className="inline-block min-w-6 text-xs">{index + 1}</span>
                  </td>
                )}
                <td className="dark:text-bolt-elements-textPrimary-dark py-1 pr-4 pl-4 whitespace-pre text-black">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
