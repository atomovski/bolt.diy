import { type MetaFunction } from '@remix-run/cloudflare';
import { AppLayout } from '~/components/layout/AppLayout';

export const meta: MetaFunction = () => {
  return [{ title: 'Insights - Bolt' }, { name: 'description', content: 'Analytics and insights for your projects' }];
};

export default function Insights() {
  return (
    <AppLayout>
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-8 text-3xl font-bold text-black">Insights</h1>
          <p className="text-bolt-elements-text-secondary">
            View analytics and insights for your development projects.
          </p>
        </div>
      </main>
    </AppLayout>
  );
}
