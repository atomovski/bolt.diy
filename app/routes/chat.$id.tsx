import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { AppLayout } from '~/components/layout/AppLayout';
import { ChatPage } from '~/components/pages/ChatPage';

export async function loader(args: LoaderFunctionArgs) {
  return json({ id: args.params.id });
}

export default function Chat() {
  return (
    <AppLayout>
      <ChatPage />
    </AppLayout>
  );
}
