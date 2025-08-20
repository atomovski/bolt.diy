import { type MetaFunction } from '@remix-run/cloudflare';
import { AppLayout } from '~/components/layout/AppLayout';

export const meta: MetaFunction = () => {
  return [
    { title: 'Templates & Tools - Bolt' },
    { name: 'description', content: 'Browse templates and tools for your projects' },
  ];
};

export default function Templates() {
  return (
    <AppLayout>
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-8 text-3xl font-bold text-black">Templates & Tools</h1>
          <p className="text-bolt-elements-text-secondary">
            Explore our collection of starter templates and development tools.
          </p>
        </div>
      </main>
    </AppLayout>
  );
}
