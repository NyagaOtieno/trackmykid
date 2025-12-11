import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import axios from "axios";
// Form Validation Schema
const busSchema = z.object({
    name: z.string().min(1, "Bus name is required"),
    plateNumber: z.string().min(1, "Plate number is required"),
    capacity: z.preprocess((val) => Number(val), z.number().min(1, "Capacity is required")),
    route: z.string().optional(),
    driverId: z.string().min(1, "Driver is required"),
    assistantId: z.string().min(1, "Assistant is required"),
    schoolId: z.string().min(1, "School is required"),
});
// API Helpers
const getDrivers = async () => {
    const token = localStorage.getItem("token");
    const res = await axios.get("https://schooltransport-production.up.railway.app/api/users/drivers", { headers: { Authorization: `Bearer ${token}` } });
    return res.data;
};
const getAssistants = async () => {
    const token = localStorage.getItem("token");
    const res = await axios.get("https://schooltransport-production.up.railway.app/api/users/assistants", { headers: { Authorization: `Bearer ${token}` } });
    return res.data;
};
const getSchools = async () => {
    const token = localStorage.getItem("token");
    const res = await axios.get("https://schooltransport-production.up.railway.app/api/schools", { headers: { Authorization: `Bearer ${token}` } });
    return res.data;
};
const addBus = async (bus) => {
    const token = localStorage.getItem("token");
    const body = {
        ...bus,
        driverId: Number(bus.driverId),
        assistantId: Number(bus.assistantId),
        schoolId: Number(bus.schoolId),
        capacity: Number(bus.capacity),
    };
    const res = await axios.post("https://schooltransport-production.up.railway.app/api/buses", body, { headers: { Authorization: `Bearer ${token}` } });
    return res.data;
};
export default function AddBusForm({ onSuccess, embedded = false }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user || !token)
        navigate("/login");
    const [form, setForm] = useState({
        name: "",
        plateNumber: "",
        capacity: "",
        route: "",
        driverId: "",
        assistantId: "",
        schoolId: user?.schoolId || "",
    });
    const [errors, setErrors] = useState({});
    // Fetch drivers, assistants, schools
    const { data: driversData, isLoading: driversLoading } = useQuery({
        queryKey: ["drivers"],
        queryFn: getDrivers,
    });
    const { data: assistantsData, isLoading: assistantsLoading } = useQuery({
        queryKey: ["assistants"],
        queryFn: getAssistants,
    });
    const { data: schoolsData, isLoading: schoolsLoading } = useQuery({
        queryKey: ["schools"],
        queryFn: getSchools,
    });
    // Filter only unassigned users with correct roles and same school
    const drivers = driversData?.filter((d) => !d.assignedBusId &&
        d.role.toUpperCase() === "DRIVER" &&
        d.schoolId === Number(form.schoolId)) || [];
    const assistants = assistantsData?.filter((a) => !a.assignedBusId &&
        a.role.toUpperCase() === "ASSISTANT" &&
        a.schoolId === Number(form.schoolId)) || [];
    // Auto-select first available driver/assistant if value not set
    useEffect(() => {
        if (!form.driverId && drivers.length > 0) {
            setForm((prev) => ({ ...prev, driverId: drivers[0].id.toString() }));
        }
        if (!form.assistantId && assistants.length > 0) {
            setForm((prev) => ({ ...prev, assistantId: assistants[0].id.toString() }));
        }
    }, [drivers, assistants]);
    // Mutation to add bus
    const mutation = useMutation({
        mutationFn: addBus,
        onSuccess: () => {
            toast.success("Bus added successfully!");
            queryClient.invalidateQueries(["buses"]);
            if (onSuccess) {
                onSuccess();
            }
            else {
                navigate("/buses");
            }
        },
        onError: (err) => {
            toast.error(err?.message || "Failed to add bus");
        },
    });
    const handleSubmit = () => {
        const parsed = busSchema.safeParse(form);
        if (!parsed.success) {
            const fieldErrors = {};
            parsed.error.errors.forEach((e) => {
                if (e.path.length > 0)
                    fieldErrors[e.path[0]] = e.message;
            });
            setErrors(fieldErrors);
            return;
        }
        // Convert IDs to numbers before sending
        const payload = {
            ...parsed.data,
            driverId: Number(parsed.data.driverId),
            assistantId: Number(parsed.data.assistantId),
            schoolId: Number(parsed.data.schoolId),
            capacity: Number(parsed.data.capacity),
        };
        mutation.mutate(payload);
    };
    const resetForm = () => {
        setForm({
            name: "",
            plateNumber: "",
            capacity: "",
            route: "",
            driverId: drivers[0]?.id.toString() || "",
            assistantId: assistants[0]?.id.toString() || "",
            schoolId: user?.schoolId || "",
        });
        setErrors({});
    };
    if (driversLoading || assistantsLoading || schoolsLoading) {
        return (_jsx("div", { className: "flex justify-center py-10", children: _jsx(Loader2, { className: "animate-spin" }) }));
    }
    const containerClasses = embedded ? "p-1 sm:p-2" : "min-h-screen bg-muted/30 p-6";
    const cardClasses = embedded ? "shadow-none border-none" : "max-w-xl mx-auto";
    return (_jsx("div", { className: containerClasses, children: _jsxs(Card, { className: `${cardClasses} w-full`, children: [_jsx(CardHeader, { className: "pb-2", children: _jsx(CardTitle, { children: "Add New Bus" }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Bus Name" }), _jsx(Input, { value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), placeholder: "e.g., Westlands Shuttle" }), errors.name && _jsx("p", { className: "text-red-600 text-sm", children: errors.name })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Plate Number" }), _jsx(Input, { value: form.plateNumber, onChange: (e) => setForm({ ...form, plateNumber: e.target.value }), placeholder: "e.g., KBB456Y" }), errors.plateNumber && (_jsx("p", { className: "text-red-600 text-sm", children: errors.plateNumber }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Capacity" }), _jsx(Input, { type: "number", value: form.capacity, onChange: (e) => setForm({ ...form, capacity: e.target.value }), placeholder: "e.g., 35" }), errors.capacity && (_jsx("p", { className: "text-red-600 text-sm", children: errors.capacity }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Route" }), _jsx(Input, { value: form.route, onChange: (e) => setForm({ ...form, route: e.target.value }), placeholder: "e.g., Route B" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Driver" }), _jsxs(Select, { value: form.driverId, onValueChange: (val) => setForm({ ...form, driverId: val }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { children: drivers.find((d) => d.id.toString() === form.driverId)?.name ||
                                                            "Select Driver" }) }), _jsx(SelectContent, { children: drivers.length > 0 ? (drivers.map((d) => (_jsx(SelectItem, { value: d.id.toString(), children: d.name }, d.id)))) : (_jsx(SelectItem, { disabled: true, value: "none", children: "No available drivers" })) })] }), errors.driverId && _jsx("p", { className: "text-red-600 text-sm", children: errors.driverId })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Assistant" }), _jsxs(Select, { value: form.assistantId, onValueChange: (val) => setForm({ ...form, assistantId: val }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { children: assistants.find((a) => a.id.toString() === form.assistantId)?.name ||
                                                            "Select Assistant" }) }), _jsx(SelectContent, { children: assistants.length > 0 ? (assistants.map((a) => (_jsx(SelectItem, { value: a.id.toString(), children: a.name }, a.id)))) : (_jsx(SelectItem, { disabled: true, value: "none", children: "No available assistants" })) })] }), errors.assistantId && (_jsx("p", { className: "text-red-600 text-sm", children: errors.assistantId }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "School" }), _jsxs(Select, { onValueChange: (val) => setForm({ ...form, schoolId: val }), value: form.schoolId, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { children: schoolsData?.find((s) => s.id.toString() === form.schoolId)?.name ||
                                                            "Select School" }) }), _jsx(SelectContent, { children: schoolsData?.map((s) => (_jsx(SelectItem, { value: s.id.toString(), children: s.name }, s.id))) })] }), errors.schoolId && _jsx("p", { className: "text-red-600 text-sm", children: errors.schoolId })] })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-end pt-2", children: [_jsx(Button, { onClick: handleSubmit, disabled: mutation.isLoading, className: "sm:min-w-[120px]", children: mutation.isLoading ? "Saving..." : "Save Bus" }), _jsx(Button, { variant: "secondary", onClick: resetForm, className: "sm:min-w-[120px]", children: "Reset" })] })] })] }) }));
}
