import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Navbar } from '@/components/Navbar';
import { Outlet } from 'react-router-dom';
export function DashboardLayout() {
    return (_jsx(SidebarProvider, { defaultOpen: true, children: _jsxs("div", { className: "min-h-screen flex w-full", children: [_jsx(AppSidebar, {}), _jsxs("div", { className: "flex-1 flex flex-col min-w-0", children: [_jsx(Navbar, {}), _jsx("main", { className: "flex-1 p-3 sm:p-4 md:p-6 bg-muted/30 overflow-x-hidden", children: _jsx(Outlet, {}) })] })] }) }));
}
