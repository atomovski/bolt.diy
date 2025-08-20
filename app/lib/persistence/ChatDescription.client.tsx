import { useStore } from '@nanostores/react';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { useEditChatDescription } from '~/lib/hooks';
import { description as descriptionStore } from '~/lib/persistence';

export function ChatDescription() {
  const initialDescription = useStore(descriptionStore)!;

  const { editing, handleChange, handleBlur, handleSubmit, handleKeyDown, currentDescription, toggleEditMode } =
    useEditChatDescription({
      initialDescription,
      syncWithGlobalStore: true,
    });

  if (!initialDescription) {
    // doing this to prevent showing edit button until chat description is set
    return null;
  }

  return (
    <div className="flex items-center justify-center text-base font-medium">
      {editing ? (
        <form onSubmit={handleSubmit} className="flex items-center justify-center">
          <input
            type="text"
            className="mr-2 w-fit rounded-sm px-2"
            autoFocus
            value={currentDescription}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{ width: `${Math.max(currentDescription.length * 8, 100)}px` }}
          />
          <TooltipProvider>
            {/* <WithTooltip tooltip="Save title"> */}
            <div className="bg-bolt-elements-item-backgroundAccent flex items-center justify-between rounded-md p-2">
              <button
                type="submit"
                className="i-ph:check-bold hover:text-bolt-elements-item-contentAccent scale-110"
                onMouseDown={handleSubmit}
              />
            </div>
            {/* </WithTooltip> */}
          </TooltipProvider>
        </form>
      ) : (
        <>
          {currentDescription}
          <TooltipProvider>
            {/* <WithTooltip tooltip="Rename chat"> */}
            <button
              type="button"
              className="i-ph:pencil-fill hover:text-bolt-elements-item-contentAccent ml-2 scale-110"
              onClick={(event) => {
                event.preventDefault();
                toggleEditMode();
              }}
            />
            {/* </WithTooltip> */}
          </TooltipProvider>
        </>
      )}
    </div>
  );
}
