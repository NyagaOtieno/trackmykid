import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSchools, createAssistant } from '@/lib/api';
export default function AddAssistantForm({ onAdded, onCancel }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [schoolId, setSchoolId] = useState(null);
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(false);
    // Fetch schools for dropdown
    useEffect(() => {
        async function fetchSchools() {
            try {
                const data = await getSchools();
                setSchools(data);
            }
            catch (err) {
                console.error('Failed to load schools', err);
            }
        }
        fetchSchools();
    }, []);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!schoolId) {
            alert('Please select a school');
            return;
        }
        setLoading(true);
        try {
            await createAssistant({
                name,
                email,
                phone,
                password,
                role: 'ASSISTANT',
                schoolId,
            });
            alert('Assistant created successfully');
            onAdded(); // Close modal or refresh list
        }
        catch (err) {
            console.error(err);
            alert('Failed to create assistant');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Name" }), _jsx(Input, { value: name, onChange: (e) => setName(e.target.value), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Email" }), _jsx(Input, { type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Phone" }), _jsx(Input, { value: phone, onChange: (e) => setPhone(e.target.value), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Password" }), _jsx(Input, { type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "School" }), _jsxs(Select, { onValueChange: (value) => setSchoolId(Number(value)), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select a school" }) }), _jsx(SelectContent, { children: schools.map((school) => (_jsx(SelectItem, { value: school.id.toString(), children: school.name }, school.id))) })] })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { type: "button", variant: "outline", onClick: onCancel, children: "Cancel" }), _jsx(Button, { type: "submit", disabled: loading, children: loading ? 'Saving...' : 'Add Assistant' })] })] }));
}
