import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Navbar } from '@/components/Navbar';
import { Outlet } from 'react-router-dom';

export function DashboardLayout() {
  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 p-3 sm:p-4 md:p-6 bg-muted/30 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
