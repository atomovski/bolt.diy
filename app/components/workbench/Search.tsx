import { useState, useMemo, useCallback, useEffect } from 'react';
import type { TextSearchOptions, TextSearchOnProgressCallback, WebContainer } from '@webcontainer/api';
import { workbenchStore } from '~/lib/stores/workbench';
import { webcontainer } from '~/lib/webcontainer';
import { WORK_DIR } from '~/utils/constants';
import { debounce } from '~/utils/debounce';

interface DisplayMatch {
  path: string;
  lineNumber: number;
  previewText: string;
  matchCharStart: number;
  matchCharEnd: number;
}

async function performTextSearch(
  instance: WebContainer,
  query: string,
  options: Omit<TextSearchOptions, 'folders'>,
  onProgress: (results: DisplayMatch[]) => void,
): Promise<void> {
  if (!instance || typeof instance.internal?.textSearch !== 'function') {
    console.error('WebContainer instance not available or internal searchText method is missing/not a function.');

    return;
  }

  const searchOptions: TextSearchOptions = {
    ...options,
    folders: [WORK_DIR],
  };

  const progressCallback: TextSearchOnProgressCallback = (filePath: any, apiMatches: any[]) => {
    const displayMatches: DisplayMatch[] = [];

    apiMatches.forEach((apiMatch: { preview: { text: string; matches: string | any[] }; ranges: any[] }) => {
      const previewLines = apiMatch.preview.text.split('\n');

      apiMatch.ranges.forEach((range: { startLineNumber: number; startColumn: any; endColumn: any }) => {
        let previewLineText = '(Preview line not found)';
        let lineIndexInPreview = -1;

        if (apiMatch.preview.matches.length > 0) {
          const previewStartLine = apiMatch.preview.matches[0].startLineNumber;
          lineIndexInPreview = range.startLineNumber - previewStartLine;
        }

        if (lineIndexInPreview >= 0 && lineIndexInPreview < previewLines.length) {
          previewLineText = previewLines[lineIndexInPreview];
        } else {
          previewLineText = previewLines[0] ?? '(Preview unavailable)';
        }

        displayMatches.push({
          path: filePath,
          lineNumber: range.startLineNumber,
          previewText: previewLineText,
          matchCharStart: range.startColumn,
          matchCharEnd: range.endColumn,
        });
      });
    });

    if (displayMatches.length > 0) {
      onProgress(displayMatches);
    }
  };

  try {
    await instance.internal.textSearch(query, searchOptions, progressCallback);
  } catch (error) {
    console.error('Error during internal text search:', error);
  }
}

function groupResultsByFile(results: DisplayMatch[]): Record<string, DisplayMatch[]> {
  return results.reduce(
    (acc, result) => {
      if (!acc[result.path]) {
        acc[result.path] = [];
      }

      acc[result.path].push(result);

      return acc;
    },
    {} as Record<string, DisplayMatch[]>,
  );
}

export function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DisplayMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
  const [hasSearched, setHasSearched] = useState(false);

  const groupedResults = useMemo(() => groupResultsByFile(searchResults), [searchResults]);

  useEffect(() => {
    if (searchResults.length > 0) {
      const allExpanded: Record<string, boolean> = {};
      Object.keys(groupedResults).forEach((file) => {
        allExpanded[file] = true;
      });
      setExpandedFiles(allExpanded);
    }
  }, [groupedResults, searchResults]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setExpandedFiles({});
      setHasSearched(false);

      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setExpandedFiles({});
    setHasSearched(true);

    const minLoaderTime = 300; // ms
    const start = Date.now();

    try {
      const instance = await webcontainer;
      const options: Omit<TextSearchOptions, 'folders'> = {
        homeDir: WORK_DIR, // Adjust this path as needed
        includes: ['**/*.*'],
        excludes: ['**/node_modules/**', '**/package-lock.json', '**/.git/**', '**/dist/**', '**/*.lock'],
        gitignore: true,
        requireGit: false,
        globalIgnoreFiles: true,
        ignoreSymlinks: false,
        resultLimit: 500,
        isRegex: false,
        caseSensitive: false,
        isWordMatch: false,
      };

      const progressHandler = (batchResults: DisplayMatch[]) => {
        setSearchResults((prevResults) => [...prevResults, ...batchResults]);
      };

      await performTextSearch(instance, query, options, progressHandler);
    } catch (error) {
      console.error('Failed to initiate search:', error);
    } finally {
      const elapsed = Date.now() - start;

      if (elapsed < minLoaderTime) {
        setTimeout(() => setIsSearching(false), minLoaderTime - elapsed);
      } else {
        setIsSearching(false);
      }
    }
  }, []);

  const debouncedSearch = useCallback(debounce(handleSearch, 300), [handleSearch]);

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handleResultClick = (filePath: string, line?: number) => {
    workbenchStore.setSelectedFile(filePath);

    /*
     * Adjust line number to be 0-based if it's defined
     * The search results use 1-based line numbers, but CodeMirrorEditor expects 0-based
     */
    const adjustedLine = typeof line === 'number' ? Math.max(0, line - 1) : undefined;

    workbenchStore.setCurrentDocumentScrollPosition({ line: adjustedLine, column: 0 });
  };

  return (
    <div className="bg-bolt-elements-background-depth-2 flex h-full flex-col">
      {/* Search Bar */}
      <div className="flex items-center px-3 py-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="bg-darken-50 placeholder-bolt-elements-text-tertiary w-full rounded-md px-2 py-1 text-black transition-all focus:outline-hidden"
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto py-2">
        {isSearching && (
          <div className="text-bolt-elements-text-tertiary flex h-32 items-center justify-center">
            <div className="i-ph:circle-notch mr-2 animate-spin" /> Searching...
          </div>
        )}
        {!isSearching && hasSearched && searchResults.length === 0 && searchQuery.trim() !== '' && (
          <div className="flex h-32 items-center justify-center text-gray-500">No results found.</div>
        )}
        {!isSearching &&
          Object.keys(groupedResults).map((file) => (
            <div key={file} className="mb-2">
              <button
                className="text-bolt-elements-text-secondary hover:bg-darken-50 group flex w-full items-center gap-2 bg-transparent px-2 py-1 text-left"
                onClick={() => setExpandedFiles((prev) => ({ ...prev, [file]: !prev[file] }))}
              >
                <span
                  className="i-ph:caret-down-thin text-bolt-elements-text-secondary h-3 w-3 transition-transform"
                  style={{ transform: expandedFiles[file] ? 'rotate(180deg)' : undefined }}
                />
                <span className="text-sm font-normal">{file.split('/').pop()}</span>
                <span className="bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent ml-auto flex h-5.5 w-5.5 items-center justify-center rounded-full text-xs">
                  {groupedResults[file].length}
                </span>
              </button>
              {expandedFiles[file] && (
                <div className="">
                  {groupedResults[file].map((match, idx) => {
                    const contextChars = 7;
                    const isStart = match.matchCharStart <= contextChars;
                    const previewStart = isStart ? 0 : match.matchCharStart - contextChars;
                    const previewText = match.previewText.slice(previewStart);
                    const matchStart = isStart ? match.matchCharStart : contextChars;
                    const matchEnd = isStart
                      ? match.matchCharEnd
                      : contextChars + (match.matchCharEnd - match.matchCharStart);

                    return (
                      <div
                        key={idx}
                        className="hover:bg-darken-50 cursor-pointer py-1 pl-6 transition-colors"
                        onClick={() => handleResultClick(match.path, match.lineNumber)}
                      >
                        <pre className="text-bolt-elements-text-tertiary truncate font-mono text-xs">
                          {!isStart && <span>...</span>}
                          {previewText.slice(0, matchStart)}
                          <span className="bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent rounded-sm px-1">
                            {previewText.slice(matchStart, matchEnd)}
                          </span>
                          {previewText.slice(matchEnd)}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
