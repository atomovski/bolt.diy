import { type MetaFunction } from '@remix-run/cloudflare';
import { AppLayout } from '~/components/layout/AppLayout';

export const meta: MetaFunction = () => {
  return [{ title: 'Profile - Bolt' }, { name: 'description', content: 'Manage your profile settings' }];
};

export default function Profile() {
  return (
    <AppLayout>
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-8 text-3xl font-bold text-black">Profile</h1>
          <p className="text-bolt-elements-text-secondary">Manage your profile settings and account information.</p>
        </div>
      </main>
    </AppLayout>
  );
}
