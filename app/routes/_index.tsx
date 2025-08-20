import { json, type MetaFunction } from '@remix-run/cloudflare';
import { AppLayout } from '~/components/layout/AppLayout';
import { HomePage } from '~/components/pages/HomePage';

export const meta: MetaFunction = () => {
  return [{ title: 'Projects - Bolt' }, { name: 'description', content: 'Manage your Bolt projects' }];
};

export const loader = () => json({});

export default function Index() {
  return (
    <AppLayout>
      <HomePage />
    </AppLayout>
  );
}
