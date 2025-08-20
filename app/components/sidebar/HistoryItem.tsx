/* eslint-disable @blitz/lines-around-comment */
import { useParams } from '@remix-run/react';
import { cn } from '~/utils/cn';
import { type ChatHistoryItem } from '~/lib/persistence';
import { useEditChatDescription } from '~/lib/hooks';
import { forwardRef, type ForwardedRef, useCallback } from 'react';
import { Checkbox } from '~/components/ui/Checkbox';

interface HistoryItemProps {
  item: ChatHistoryItem;
  onDelete?: (event: React.UIEvent) => void;
  onDuplicate?: (id: string) => void;
  exportChat: (id?: string) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
}

export function HistoryItem({
  item,
  onDelete,
  onDuplicate,
  exportChat,
  selectionMode = false,
  isSelected = false,
  onToggleSelection,
}: HistoryItemProps) {
  const { id: urlId } = useParams();
  const isActiveChat = urlId === item.urlId;

  const { editing, handleChange, handleBlur, handleSubmit, handleKeyDown, currentDescription, toggleEditMode } =
    useEditChatDescription({
      initialDescription: item.description,
      customChatId: item.id,
      syncWithGlobalStore: isActiveChat,
    });

  const handleItemClick = useCallback(
    (e: React.MouseEvent) => {
      if (selectionMode) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Item clicked in selection mode:', item.id);
        onToggleSelection?.(item.id);
      }
    },
    [selectionMode, item.id, onToggleSelection],
  );

  const handleCheckboxChange = useCallback(() => {
    console.log('Checkbox changed for item:', item.id);
    onToggleSelection?.(item.id);
  }, [item.id, onToggleSelection]);

  const handleDeleteClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      event.preventDefault();
      event.stopPropagation();
      console.log('Delete button clicked for item:', item.id);

      if (onDelete) {
        onDelete(event as unknown as React.UIEvent);
      }
    },
    [onDelete, item.id],
  );

  return (
    <div
      className={cn(
        'group flex items-center justify-between overflow-hidden rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50/80 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/30 dark:hover:text-white',
        { 'bg-gray-50/80 text-gray-900 dark:bg-gray-800/30 dark:text-white': isActiveChat },
        { 'cursor-pointer': selectionMode },
      )}
      onClick={selectionMode ? handleItemClick : undefined}
    >
      {selectionMode && (
        <div className="mr-2 flex items-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            id={`select-${item.id}`}
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
            className="h-4 w-4"
          />
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSubmit} className="flex flex-1 items-center gap-2">
          <input
            type="text"
            className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-purple-500/50 focus:outline-hidden dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            autoFocus
            value={currentDescription}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
          <button
            type="submit"
            className="i-ph:check h-4 w-4 text-gray-500 transition-colors hover:text-purple-500"
            onMouseDown={handleSubmit}
          />
        </form>
      ) : (
        <a
          href={`/chat/${item.urlId}`}
          className="relative block flex w-full truncate"
          onClick={selectionMode ? handleItemClick : undefined}
        >
          {/* <WithTooltip tooltip={currentDescription}> */}
          <span className="truncate pr-24">{currentDescription}</span>
          {/* </WithTooltip> */}
          <div
            className={cn('absolute top-0 right-0 bottom-0 flex items-center bg-transparent px-2 transition-colors')}
          >
            <div className="flex items-center gap-2.5 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-500">
              <ChatActionButton
                // toolTipContent="Export"
                icon="i-ph:download-simple h-4 w-4"
                onClick={(event) => {
                  event.preventDefault();
                  exportChat(item.id);
                }}
              />
              {onDuplicate && (
                <ChatActionButton
                  // toolTipContent="Duplicate"
                  icon="i-ph:copy h-4 w-4"
                  onClick={(event) => {
                    event.preventDefault();
                    onDuplicate?.(item.id);
                  }}
                />
              )}
              <ChatActionButton
                // toolTipContent="Rename"
                icon="i-ph:pencil-fill h-4 w-4"
                onClick={(event) => {
                  event.preventDefault();
                  toggleEditMode();
                }}
              />
              <ChatActionButton
                // toolTipContent="Delete"
                icon="i-ph:trash h-4 w-4"
                className="hover:text-red-500 dark:hover:text-red-400"
                onClick={handleDeleteClick}
              />
            </div>
          </div>
        </a>
      )}
    </div>
  );
}

const ChatActionButton = forwardRef(
  (
    {
      icon,
      className,
      onClick,
    }: {
      icon: string;
      className?: string;
      onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
      btnTitle?: string;
    },
    ref: ForwardedRef<HTMLButtonElement>,
  ) => {
    return (
      // <WithTooltip tooltip={toolTipContent} position="bottom" sideOffset={4}>
      <button
        ref={ref}
        type="button"
        className={`text-gray-400 transition-colors hover:text-purple-500 dark:text-gray-500 dark:hover:text-purple-400 ${icon} ${className ? className : ''}`}
        onClick={onClick}
      />

      // </WithTooltip>
    );
  },
);
