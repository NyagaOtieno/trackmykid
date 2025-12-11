import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, } from '@/components/ui/select';
import { getSchools, updateUser } from '@/lib/api';
export default function EditDriverForm({ driver, onUpdated, onCancel }) {
    const [name, setName] = useState(driver.name);
    const [email, setEmail] = useState(driver.email || '');
    const [phone, setPhone] = useState(driver.phone || '');
    const [password, setPassword] = useState('');
    const [schoolId, setSchoolId] = useState(driver.schoolId ?? 0);
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(false);
    // Fetch schools
    useEffect(() => {
        getSchools().then(setSchools).catch(console.error);
    }, []);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                id: driver.id,
                name,
                email,
                phone,
                schoolId,
                ...(password ? { password } : {}),
            };
            await updateUser(driver.id, payload);
            onUpdated(payload);
        }
        catch (err) {
            console.error(err);
            alert('Failed to update driver');
        }
        setLoading(false);
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Name" }), _jsx(Input, { value: name, onChange: (e) => setName(e.target.value), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Email" }), _jsx(Input, { type: "email", value: email, onChange: (e) => setEmail(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Phone" }), _jsx(Input, { value: phone, onChange: (e) => setPhone(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "School" }), _jsxs(Select, { value: String(schoolId), onValueChange: (val) => setSchoolId(Number(val)), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select School" }) }), _jsx(SelectContent, { children: schools.map((school) => (_jsx(SelectItem, { value: String(school.id), children: school.name }, school.id))) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Password (optional)" }), _jsx(Input, { type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "Leave blank to keep current password" })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => (onCancel ? onCancel() : onUpdated()), children: "Cancel" }), _jsx(Button, { type: "submit", disabled: loading, children: loading ? 'Saving...' : 'Save' })] })] }));
}
