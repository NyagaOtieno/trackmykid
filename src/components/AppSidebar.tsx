import { Home, Map, Users, Bus, ClipboardList, UserCog, UsersRound, Settings, Truck } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { BrandLogo } from '@/components/BrandLogo';
import { BRAND } from '@/lib/brand';

const menuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  { title: 'Live Tracking', url: '/tracking', icon: Map },
  { title: 'Students', url: '/students', icon: Users },
  { title: 'Buses', url: '/buses', icon: Bus },
  { title: 'Manifests', url: '/manifests', icon: ClipboardList },
  { title: 'Assistants', url: '/assistants', icon: UserCog },
  { title: 'Drivers', url: '/drivers', icon: Truck },
  { title: 'Parents', url: '/parents', icon: UsersRound },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar className={open ? 'w-60' : 'w-14'}>
      <SidebarContent>
        {/* Brand header. The logo sits on a white tile because the sidebar is
            dark navy and the artwork has dark lettering/transparent areas. */}
        <div className="p-3 border-b border-sidebar-border">
          {open ? (
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white p-1.5 shadow-sm">
                <BrandLogo variant="icon" className="h-full w-full" />
              </div>
              <div className="min-w-0 leading-tight">
                <span className="block truncate text-base font-bold text-sidebar-foreground">{BRAND.name}</span>
                <span className="block truncate text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                  {BRAND.tagline.replace(/\.$/, '')}
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
              <BrandLogo variant="icon" className="h-full w-full" />
            </div>
          )}
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                          : 'hover:bg-sidebar-accent/50'
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {open && (
          <div className="mt-auto p-4 text-[11px] text-sidebar-foreground/50">
            Powered by <span className="font-semibold text-sidebar-foreground/80">{BRAND.poweredBy}</span>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
