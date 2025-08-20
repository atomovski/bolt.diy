import { cn } from '~/utils/cn';
import { IconButton } from '~/components/ui';

export function DiscussMode() {
  return (
    <div>
      <IconButton
        title="Discuss"
        className={cn(
          'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent flex items-center gap-1 transition-all',
        )}
      >
        <div className={`i-ph:chats text-xl`} />
      </IconButton>
    </div>
  );
}
