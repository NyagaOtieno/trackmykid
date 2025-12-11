import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Home, Map, Users, Bus, ClipboardList, UserCog, UsersRound, Settings, Truck } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, } from '@/components/ui/sidebar';
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
    const location = useLocation();
    // Helper function to check if a route is active
    const isActiveRoute = (url) => {
        if (url === '/dashboard') {
            return location.pathname === '/dashboard';
        }
        // For other routes, check if the pathname starts with the URL
        // This handles sub-routes like /buses/add highlighting /buses
        return location.pathname.startsWith(url);
    };
    return (_jsx(Sidebar, { className: open ? 'w-60' : 'w-14', children: _jsxs(SidebarContent, { children: [_jsx("div", { className: "p-4 border-b border-sidebar-border", children: open ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Bus, { className: "h-6 w-6 text-sidebar-primary" }), _jsx("span", { className: "text-lg font-bold text-sidebar-foreground", children: "SchoolTrack" })] })) : (_jsx(Bus, { className: "h-6 w-6 text-sidebar-primary mx-auto" })) }), _jsxs(SidebarGroup, { children: [_jsx(SidebarGroupLabel, { children: "Navigation" }), _jsx(SidebarGroupContent, { children: _jsx(SidebarMenu, { children: menuItems.map((item) => {
                                    const isActive = isActiveRoute(item.url);
                                    return (_jsx(SidebarMenuItem, { children: _jsx(SidebarMenuButton, { asChild: true, isActive: isActive, className: isActive ? "bg-sidebar-primary/20 text-sidebar-primary-foreground border-l-2 border-sidebar-primary" : "", children: _jsxs(NavLink, { to: item.url, className: "flex items-center gap-2", children: [_jsx(item.icon, { className: "h-4 w-4" }), open && _jsx("span", { children: item.title })] }) }) }, item.title));
                                }) }) })] })] }) }));
}
