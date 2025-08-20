import { type MetaFunction } from '@remix-run/cloudflare';
import { AppLayout } from '~/components/layout/AppLayout';

export const meta: MetaFunction = () => {
  return [{ title: 'Help & Support - Bolt' }, { name: 'description', content: 'Get help and support for Bolt' }];
};

export default function Help() {
  return (
    <AppLayout>
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-8 text-3xl font-bold text-black">Help & Support</h1>
          <p className="text-bolt-elements-text-secondary">
            Find answers to common questions and get support for using Bolt.
          </p>
        </div>
      </main>
    </AppLayout>
  );
}
