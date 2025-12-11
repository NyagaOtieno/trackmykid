import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent } from '@/components/ui/card';
export function StatsCard({ title, value, icon: Icon, trend, colorClass = 'text-primary' }) {
    return (_jsx(Card, { className: "overflow-hidden transition-shadow hover:shadow-lg", children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: title }), _jsx("h3", { className: "text-3xl font-bold mt-2", children: value }), trend && (_jsx("p", { className: "text-xs text-muted-foreground mt-1", children: trend }))] }), _jsx("div", { className: `p-3 rounded-full bg-primary/10 ${colorClass}`, children: _jsx(Icon, { className: "h-6 w-6" }) })] }) }) }));
}
