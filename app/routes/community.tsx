import { type MetaFunction } from '@remix-run/cloudflare';
import { AppLayout } from '~/components/layout/AppLayout';

export const meta: MetaFunction = () => {
  return [{ title: 'Community - Bolt' }, { name: 'description', content: 'Join the Bolt community' }];
};

export default function Community() {
  return (
    <AppLayout>
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-8 text-3xl font-bold text-black">Community</h1>
          <p className="text-bolt-elements-text-secondary">Connect with other developers and share your projects.</p>
        </div>
      </main>
    </AppLayout>
  );
}
