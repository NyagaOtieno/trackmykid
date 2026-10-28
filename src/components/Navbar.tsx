import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { logout, getCurrentUser } from '@/lib/auth';
import { NotificationsBell } from '@/components/NotificationsBell';
import { BrandLogo } from '@/components/BrandLogo';

export function Navbar() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <header className="h-16 border-b border-border bg-card sticky top-0 z-10 flex items-center justify-between px-3 sm:px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <BrandLogo variant="wordmark" className="h-6 w-auto sm:h-7" />
      </div>
      
      <div className="flex items-center gap-2">
        {currentUser && (
          <div className="hidden md:block text-sm text-muted-foreground mr-2">
            {currentUser.name} <span className="text-xs">({currentUser.role})</span>
          </div>
        )}
        <NotificationsBell />
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
