import { json, type MetaFunction } from '@remix-run/cloudflare';
import { AppLayout } from '~/components/layout/AppLayout';
import { ChatPage } from '~/components/pages/ChatPage';

export const meta: MetaFunction = () => {
  return [
    { title: 'Chat - Bolt' },
    { name: 'description', content: 'Talk with Bolt, an AI assistant from StackBlitz' },
  ];
};

export const loader = () => json({});

export default function ChatNew() {
  return (
    <AppLayout>
      <ChatPage />
    </AppLayout>
  );
}
