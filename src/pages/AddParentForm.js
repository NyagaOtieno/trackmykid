import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, } from "@/components/ui/select";
export default function AddParentForm({ schools: initialSchools, onAdded, onCancel }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [schoolId, setSchoolId] = useState(null);
    const [schools, setSchools] = useState(initialSchools ?? []);
    const [loadingSchools, setLoadingSchools] = useState(!initialSchools);
    const [submitting, setSubmitting] = useState(false);
    // If parent component didn't hand schools in, fetch them here
    useEffect(() => {
        let cancelled = false;
        if (initialSchools && initialSchools.length) {
            setSchools(initialSchools);
            setLoadingSchools(false);
            return;
        }
        async function fetchSchools() {
            try {
                const res = await axios.get("https://schooltransport-production.up.railway.app/api/schools");
                // flexibly handle res shapes
                const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : [];
                if (!cancelled)
                    setSchools(arr);
            }
            catch (err) {
                console.error("Failed to fetch schools:", err);
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
            return; // prevent double submit
        if (!name.trim() || !password.trim() || !schoolId) {
            alert("Please provide name, password and select a school.");
            return;
        }
        const payload = {
            name: name.trim(),
            email: email.trim() || undefined,
            password: password.trim(),
            phone: phone.trim() || undefined,
            role: "PARENT",
            schoolId,
        };
        try {
            setSubmitting(true);
            const res = await axios.post("https://schooltransport-production.up.railway.app/api/users", payload);
            // success codes: 200 or 201 (some backends)
            if (res.status === 201 || res.status === 200) {
                alert("Parent added successfully");
                // reset form locally
                setName("");
                setEmail("");
                setPhone("");
                setPassword("");
                setSchoolId(null);
                onAdded(); // parent will re-fetch; do NOT show another alert there
            }
            else {
                console.error("Unexpected response:", res.data);
                alert("Failed to add parent");
            }
        }
        catch (err) {
            console.error("Add parent error:", err);
            alert(err?.response?.data?.message || "Failed to add parent");
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Name" }), _jsx(Input, { value: name, onChange: (e) => setName(e.target.value), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Email" }), _jsx(Input, { type: "email", value: email, onChange: (e) => setEmail(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Phone" }), _jsx(Input, { value: phone, onChange: (e) => setPhone(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Password" }), _jsx(Input, { type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "School" }), _jsxs(Select, { value: schoolId ? String(schoolId) : "", onValueChange: (v) => setSchoolId(Number(v)), disabled: loadingSchools || schools.length === 0, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: loadingSchools ? "Loading schools..." : "Select a school" }) }), _jsx(SelectContent, { children: schools.map((s) => (_jsx(SelectItem, { value: String(s.id), children: s.name }, s.id))) })] })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { type: "button", variant: "outline", onClick: onCancel, disabled: submitting, children: "Cancel" }), _jsx(Button, { type: "submit", disabled: submitting, children: submitting ? "Adding..." : "Add Parent" })] })] }));
}
