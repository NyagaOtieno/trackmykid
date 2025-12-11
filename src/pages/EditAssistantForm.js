import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export default function EditAssistantForm({ assistant, onSubmit, onUpdated, onCancel }) {
    const [name, setName] = useState(assistant.name);
    const [email, setEmail] = useState(assistant.email || '');
    const [phone, setPhone] = useState(assistant.phone || '');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const payload = {
            id: assistant.id,
            name,
            email,
            phone,
            ...(password ? { password } : {}),
        };
        if (onSubmit) {
            await onSubmit(payload);
        }
        else if (onUpdated) {
            await onUpdated(payload);
        }
        setLoading(false);
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Name" }), _jsx(Input, { value: name, onChange: (e) => setName(e.target.value), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Email" }), _jsx(Input, { type: "email", value: email, onChange: (e) => setEmail(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Phone" }), _jsx(Input, { value: phone, onChange: (e) => setPhone(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Password (optional)" }), _jsx(Input, { type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "Leave blank to keep current password" })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { type: "button", variant: "outline", onClick: onCancel, children: "Cancel" }), _jsx(Button, { type: "submit", disabled: loading, children: loading ? 'Saving...' : 'Save' })] })] }));
}
