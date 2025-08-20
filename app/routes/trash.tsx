import { AppLayout } from '~/components/layout/AppLayout';
import { Icon } from '~/components/ui';

export default function TrashPage() {
  return (
    <AppLayout>
      <div className="flex h-full w-full flex-col items-center justify-center p-8">
        <Icon.Trash className="text-bolt-elements-textTertiary mb-4 h-16 w-16" />
        <h1 className="text-bolt-elements-textPrimary mb-2 text-3xl font-bold">Trash</h1>
        <p className="text-bolt-elements-textSecondary max-w-md text-center">
          Recently deleted items appear here. You can restore items or permanently delete them from this view.
        </p>
      </div>
    </AppLayout>
  );
}
