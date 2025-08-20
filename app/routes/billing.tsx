import { AppLayout } from '~/components/layout/AppLayout';
import { Icon } from '~/components/ui';

export default function BillingPage() {
  return (
    <AppLayout>
      <div className="flex h-full w-full flex-col items-center justify-center p-8">
        <Icon.CreditCard className="text-bolt-elements-textTertiary mb-4 h-16 w-16" />
        <h1 className="text-bolt-elements-textPrimary mb-2 text-3xl font-bold">Billing</h1>
        <p className="text-bolt-elements-textSecondary max-w-md text-center">
          Manage your subscription, payment methods, and view billing history.
        </p>
      </div>
    </AppLayout>
  );
}
