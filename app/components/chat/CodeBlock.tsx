import { memo, useEffect, useState } from 'react';
import { bundledLanguages, codeToHtml, isSpecialLang, type BundledLanguage, type SpecialLanguage } from 'shiki';
import { cn } from '~/utils/cn';
import { createScopedLogger } from '~/utils/logger';

import styles from './CodeBlock.module.scss';

const logger = createScopedLogger('CodeBlock');

interface CodeBlockProps {
  className?: string;
  code: string;
  language?: BundledLanguage | SpecialLanguage;
  theme?: 'light-plus' | 'dark-plus';
  disableCopy?: boolean;
}

export const CodeBlock = memo(
  ({ className, code, language = 'plaintext', theme = 'dark-plus', disableCopy = false }: CodeBlockProps) => {
    const [html, setHTML] = useState<string | undefined>(undefined);
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
      if (copied) {
        return;
      }

      navigator.clipboard.writeText(code);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    };

    useEffect(() => {
      let effectiveLanguage = language;

      if (language && !isSpecialLang(language) && !(language in bundledLanguages)) {
        logger.warn(`Unsupported language '${language}', falling back to plaintext`);
        effectiveLanguage = 'plaintext';
      }

      logger.trace(`Language = ${effectiveLanguage}`);

      const processCode = async () => {
        setHTML(await codeToHtml(code, { lang: effectiveLanguage, theme }));
      };

      processCode();
    }, [code, language, theme]);

    return (
      <div className={cn('group relative text-left', className)}>
        <div
          className={cn(
            styles.CopyButtonContainer,
            'bg-transparant absolute top-[10px] right-[10px] z-10 flex items-center justify-center rounded-md text-lg opacity-0 group-hover:opacity-100',
            {
              'rounded-l-0 opacity-100': copied,
            },
          )}
        >
          {!disableCopy && (
            <button
              className={cn(
                'bg-accent-500 transition-theme flex items-center justify-center rounded-md p-[6px] before:rounded-l-md before:border-r before:border-gray-300 before:bg-white before:text-gray-500',
                {
                  'before:opacity-0': !copied,
                  'before:opacity-100': copied,
                },
              )}
              title="Copy Code"
              onClick={() => copyToClipboard()}
            >
              <div className="i-ph:clipboard-text-duotone"></div>
            </button>
          )}
        </div>
        <div dangerouslySetInnerHTML={{ __html: html ?? '' }}></div>
      </div>
    );
  },
);
