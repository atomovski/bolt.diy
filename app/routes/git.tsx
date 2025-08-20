import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { GitUrlImport } from '~/components/git/GitUrlImport.client';
import { AppLayout } from '~/components/layout/AppLayout';

export const meta: MetaFunction = () => {
  return [{ title: 'Bolt' }, { name: 'description', content: 'Talk with Bolt, an AI assistant from StackBlitz' }];
};

export async function loader(args: LoaderFunctionArgs) {
  return json({ url: args.params.url });
}

export default function Index() {
  return (
    <AppLayout>
      <ClientOnly fallback={<BaseChat />}>{() => <GitUrlImport />}</ClientOnly>
    </AppLayout>
  );
}
