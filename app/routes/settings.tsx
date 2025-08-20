import { type MetaFunction } from '@remix-run/cloudflare';
import { AppLayout } from '~/components/layout/AppLayout';

export const meta: MetaFunction = () => {
  return [{ title: 'Settings - Bolt' }, { name: 'description', content: 'Application settings and preferences' }];
};

export default function Settings() {
  return (
    <AppLayout>
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-8 text-3xl font-bold text-black">Settings</h1>
          <p className="text-bolt-elements-text-secondary">Configure your application settings and preferences.</p>
        </div>
      </main>
    </AppLayout>
  );
}
