import { useLocation } from '@remix-run/react';
import { SidebarProvider, SidebarInset } from '~/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const isChatPage = location.pathname.startsWith('/chat');

  if (isChatPage) {
    return <div className="bg-bolt-elements-background-depth-1 flex h-full w-full flex-col">{children}</div>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
