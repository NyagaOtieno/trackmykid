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
        <div className="p-4 border-b border-sidebar-border">
          {open ? (
            <div className="flex items-center gap-2">
              <Bus className="h-6 w-6 text-sidebar-primary" />
              <span className="text-lg font-bold text-sidebar-foreground">SchoolTrack</span>
            </div>
          ) : (
            <Bus className="h-6 w-6 text-sidebar-primary mx-auto" />
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
      </SidebarContent>
    </Sidebar>
  );
}
