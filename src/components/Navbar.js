import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bell, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { logout, getCurrentUser } from '@/lib/auth';
export function Navbar() {
    const navigate = useNavigate();
    const currentUser = getCurrentUser();
    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
        navigate('/');
    };
    // Get user initials for avatar
    const getInitials = (name) => {
        if (!name)
            return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };
    return (_jsxs("header", { className: "h-14 sm:h-16 border-b border-border bg-card sticky top-0 z-10 flex items-center justify-between px-3 sm:px-4 md:px-6", children: [_jsxs("div", { className: "flex items-center gap-2 sm:gap-4 min-w-0 flex-1", children: [_jsx(SidebarTrigger, { className: "flex-shrink-0" }), _jsxs("h1", { className: "text-base sm:text-lg md:text-xl font-semibold text-foreground truncate", children: [_jsx("span", { className: "hidden sm:inline", children: "School Transport Dashboard" }), _jsx("span", { className: "sm:hidden", children: "Transport Dashboard" })] })] }), _jsxs("div", { className: "flex items-center gap-2 sm:gap-3 flex-shrink-0", children: [_jsx(Button, { variant: "ghost", size: "icon", className: "h-9 w-9 sm:h-10 sm:w-10", children: _jsx(Bell, { className: "h-4 w-4 sm:h-5 sm:w-5" }) }), currentUser && (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", className: "flex items-center gap-2 sm:gap-3 h-auto py-1.5 sm:py-2 px-2 sm:px-3 hover:bg-accent", children: [_jsxs(Avatar, { className: "h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0", children: [_jsx(AvatarImage, { src: "", alt: currentUser.name }), _jsx(AvatarFallback, { className: "bg-primary text-primary-foreground text-xs sm:text-sm", children: getInitials(currentUser.name) })] }), _jsxs("div", { className: "hidden sm:flex flex-col items-start text-left min-w-0", children: [_jsx("span", { className: "text-sm font-medium truncate max-w-[120px] md:max-w-none", children: currentUser.name }), _jsx("span", { className: "text-xs text-muted-foreground truncate max-w-[120px] md:max-w-none", children: currentUser.email })] })] }) }), _jsxs(DropdownMenuContent, { align: "end", className: "w-56", children: [_jsx(DropdownMenuLabel, { children: _jsxs("div", { className: "flex flex-col space-y-1", children: [_jsx("p", { className: "text-sm font-medium leading-none", children: currentUser.name }), _jsx("p", { className: "text-xs leading-none text-muted-foreground", children: currentUser.email })] }) }), _jsx(DropdownMenuSeparator, {}), _jsxs(DropdownMenuItem, { className: "cursor-pointer", children: [_jsx(User, { className: "mr-2 h-4 w-4" }), _jsx("span", { children: "Profile" })] }), _jsx(DropdownMenuSeparator, {}), _jsxs(DropdownMenuItem, { className: "cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950", onClick: handleLogout, children: [_jsx(LogOut, { className: "mr-2 h-4 w-4" }), _jsx("span", { children: "Logout" })] })] })] }))] })] }));
}
