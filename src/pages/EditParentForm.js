import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, } from "@/components/ui/select";
/**
 * EditParentForm expects the parent object from /api/parents (parent.id and parent.user.id usually present).
 * It issues PUT to /api/users/:userId (user id if present, otherwise parent.id)
 */
export default function EditParentForm({ parent, schools: initialSchools, onUpdated, onCancel }) {
    const user = parent.user ?? null;
    const userIdToUpdate = user?.id ?? parent.id; // prefer user.id but fallback to parent.id
    const [name, setName] = useState(user?.name ?? "");
    const [email, setEmail] = useState(user?.email ?? "");
    const [phone, setPhone] = useState(user?.phone ?? "");
    const [password, setPassword] = useState("");
    const [schoolId, setSchoolId] = useState(user?.schoolId ?? null);
    const [schools, setSchools] = useState(initialSchools ?? []);
    const [loadingSchools, setLoadingSchools] = useState(!initialSchools);
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        if (initialSchools && initialSchools.length) {
            setSchools(initialSchools);
            setLoadingSchools(false);
            return;
        }
        let cancelled = false;
        async function fetchSchools() {
            try {
                const res = await axios.get("https://schooltransport-production.up.railway.app/api/schools");
                const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : [];
                if (!cancelled)
                    setSchools(arr);
            }
            catch (err) {
                console.error("Failed to fetch schools", err);
            }
            finally {
                if (!cancelled)
                    setLoadingSchools(false);
            }
        }
        fetchSchools();
        return () => { cancelled = true; };
    }, [initialSchools]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting)
            return;
        if (!name.trim()) {
            alert("Name is required");
            return;
        }
        if (!schoolId) {
            alert("Please select a school");
            return;
        }
        const payload = {
            name: name.trim(),
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            role: "PARENT",
            schoolId,
        };
        if (password.trim())
            payload.password = password.trim();
        try {
            setSubmitting(true);
            const res = await axios.put(`https://schooltransport-production.up.railway.app/api/users/${userIdToUpdate}`, payload);
            if (res.status === 200 || res.status === 201) {
                alert("Parent updated successfully");
                setPassword("");
                onUpdated();
            }
            else {
                console.error("Unexpected update response", res.data);
                alert("Failed to update parent");
            }
        }
        catch (err) {
            console.error("Update parent error:", err);
            alert(err?.response?.data?.message || "Failed to update parent");
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Name" }), _jsx(Input, { value: name, onChange: (e) => setName(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Email" }), _jsx(Input, { type: "email", value: email, onChange: (e) => setEmail(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Phone" }), _jsx(Input, { value: phone, onChange: (e) => setPhone(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Password (leave blank to keep current)" }), _jsx(Input, { type: "password", value: password, onChange: (e) => setPassword(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "School" }), _jsxs(Select, { value: schoolId ? String(schoolId) : "", onValueChange: (v) => setSchoolId(Number(v)), disabled: loadingSchools || schools.length === 0, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: loadingSchools ? "Loading schools..." : "Select a school" }) }), _jsx(SelectContent, { children: schools.map((s) => (_jsx(SelectItem, { value: String(s.id), children: s.name }, s.id))) })] })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { type: "button", variant: "outline", onClick: onCancel, disabled: submitting, children: "Cancel" }), _jsx(Button, { type: "submit", disabled: submitting, children: submitting ? "Updating..." : "Update Parent" })] })] }));
}
