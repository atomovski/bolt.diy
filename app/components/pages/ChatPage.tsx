import { Chat } from '~/components/chat/Chat.client';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';

export function ChatPage() {
  return (
    <div className="flex h-full w-full flex-1 overflow-hidden">
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </div>
  );
}
