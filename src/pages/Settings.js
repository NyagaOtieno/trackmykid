import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getConfig, setConfig } from '@/lib/config';
export default function Settings() {
    const [useMockData, setUseMockData] = useState(true);
    const [apiBaseUrl, setApiBaseUrl] = useState('https://schooltransport-production.up.railway.app/api');
    useEffect(() => {
        const config = getConfig();
        setUseMockData(config.useMockData);
        setApiBaseUrl(config.apiBaseUrl);
    }, []);
    const handleSave = () => {
        setConfig(useMockData, apiBaseUrl);
        toast.success('Settings saved successfully!');
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-3xl font-bold", children: "Settings" }), _jsx("p", { className: "text-muted-foreground mt-1", children: "Configure your application preferences" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Data Source" }), _jsx(CardDescription, { children: "Switch between mock data and live API" })] }), _jsx(CardContent, { className: "space-y-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "space-y-0.5", children: [_jsx(Label, { htmlFor: "mock-data", children: "Use Mock Data" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Enable to use local mock data instead of live API" })] }), _jsx(Switch, { id: "mock-data", checked: useMockData, onCheckedChange: setUseMockData })] }) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "API Configuration" }), _jsx(CardDescription, { children: "Set your backend API endpoint" })] }), _jsx(CardContent, { className: "space-y-4", children: _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "api-url", children: "API Base URL" }), _jsx(Input, { id: "api-url", type: "url", value: apiBaseUrl, onChange: (e) => setApiBaseUrl(e.target.value), placeholder: "https://api.example.com" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "This will be used when Mock Data is disabled" })] }) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Application Info" }), _jsx(CardDescription, { children: "System information and status" })] }), _jsxs(CardContent, { className: "space-y-3", children: [_jsxs("div", { className: "flex justify-between py-2 border-b", children: [_jsx("span", { className: "text-sm font-medium", children: "Version" }), _jsx("span", { className: "text-sm text-muted-foreground", children: "1.0.0" })] }), _jsxs("div", { className: "flex justify-between py-2 border-b", children: [_jsx("span", { className: "text-sm font-medium", children: "Current Mode" }), _jsx("span", { className: `text-sm font-medium ${useMockData ? 'text-warning' : 'text-success'}`, children: useMockData ? 'Mock Data' : 'Live API' })] }), _jsxs("div", { className: "flex justify-between py-2", children: [_jsx("span", { className: "text-sm font-medium", children: "Status" }), _jsx("span", { className: "text-sm text-success", children: "\u25CF Active" })] })] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Quick Actions" }), _jsx(CardDescription, { children: "Common administrative tasks" })] }), _jsxs(CardContent, { className: "space-y-3", children: [_jsx(Button, { variant: "outline", className: "w-full justify-start", children: "Clear Cache" }), _jsx(Button, { variant: "outline", className: "w-full justify-start", children: "Export Data" }), _jsx(Button, { variant: "outline", className: "w-full justify-start", children: "View Logs" })] })] })] }), _jsx("div", { className: "flex justify-end", children: _jsx(Button, { onClick: handleSave, size: "lg", children: "Save Settings" }) })] }));
}
