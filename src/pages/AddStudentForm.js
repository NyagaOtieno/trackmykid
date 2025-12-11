import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, } from "@/components/ui/select";
import toast from "react-hot-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// Leaflet marker icon
const markerIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconSize: [30, 45],
    iconAnchor: [15, 45],
});
// Map click with reverse geocoding
function LocationPicker({ onPick }) {
    useMapEvents({
        async click(e) {
            const { lat, lng } = e.latlng;
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
                const data = await res.json();
                const address = data?.display_name?.split(",").slice(0, 3).join(", ") || "Unknown location";
                onPick({ lat, lng, address });
            }
            catch {
                onPick({ lat, lng });
            }
        },
    });
    return null;
}
export default function AddStudentForm({ onSuccess }) {
    const [schools, setSchools] = useState([]);
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [coords, setCoords] = useState({ lat: null, lng: null });
    const [form, setForm] = useState({
        name: "",
        grade: "",
        busId: "",
        schoolId: "",
        parentName: "",
        parentPhone: "",
        parentEmail: "",
        parentPassword: "",
        location: "",
    });
    // Load schools and buses
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [schoolsRes, busesRes] = await Promise.all([
                    axios.get("https://schooltransport-production.up.railway.app/api/schools"),
                    axios.get("https://schooltransport-production.up.railway.app/api/buses"),
                ]);
                setSchools(schoolsRes.data);
                setBuses(busesRes.data);
            }
            catch (err) {
                console.error(err);
                toast.error("Failed to load schools or buses.");
            }
        };
        fetchData();
    }, []);
    // Convert typed location to coords
    const geocodeLocation = async (location) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`);
            const data = await res.json();
            if (data.length > 0)
                return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            throw new Error("Location not found");
        }
        catch {
            toast.error("Could not locate the area. Try typing more precisely.");
            return null;
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Ensure coords
            let latitude = coords.lat;
            let longitude = coords.lng;
            if (!latitude || !longitude) {
                const geocoded = await geocodeLocation(form.location);
                if (!geocoded)
                    throw new Error("Pickup location required.");
                latitude = geocoded.lat;
                longitude = geocoded.lng;
            }
            // Ensure IDs are numbers
            const busId = Number(form.busId);
            const schoolId = Number(form.schoolId);
            if (!busId || !schoolId)
                throw new Error("Select a Bus and a School.");
            // Ensure parent fields
            if (!form.parentName || !form.parentPhone || !form.parentEmail || !form.parentPassword)
                throw new Error("Parent details and password required.");
            const payload = {
                name: form.name,
                grade: form.grade,
                latitude,
                longitude,
                busId,
                schoolId,
                parentName: form.parentName,
                parentPhone: form.parentPhone,
                parentEmail: form.parentEmail,
                parentPassword: form.parentPassword,
            };
            await axios.post("https://schooltransport-production.up.railway.app/api/students", payload, {
                headers: { "Content-Type": "application/json" },
            });
            toast.success("✅ Student added successfully!");
            onSuccess?.();
            setForm({ name: "", grade: "", busId: "", schoolId: "", parentName: "", parentPhone: "", parentEmail: "", parentPassword: "", location: "" });
            setCoords({ lat: null, lng: null });
        }
        catch (err) {
            console.error(err);
            toast.error("❌ Failed to add student: " + (err.message || ""));
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "h-full overflow-hidden", children: _jsx(ScrollArea, { className: "h-full pr-4", children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-8 pb-4", children: [_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: "Student Information" }), _jsx(Separator, { className: "mb-5" })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-6", children: [_jsxs("div", { className: "space-y-2.5", children: [_jsx(Label, { htmlFor: "name", className: "text-sm font-semibold text-gray-700", children: "Full Name *" }), _jsx(Input, { id: "name", value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), placeholder: "Enter student full name", required: true, className: "h-12 text-sm w-full focus:ring-2 focus:ring-primary focus:border-primary transition-all" })] }), _jsxs("div", { className: "space-y-2.5", children: [_jsx(Label, { htmlFor: "grade", className: "text-sm font-semibold text-gray-700", children: "Grade *" }), _jsx(Input, { id: "grade", value: form.grade, onChange: (e) => setForm({ ...form, grade: e.target.value }), placeholder: "e.g., Grade 5", required: true, className: "h-12 text-sm w-full focus:ring-2 focus:ring-primary focus:border-primary transition-all" })] }), _jsxs("div", { className: "space-y-2.5", children: [_jsx(Label, { htmlFor: "school", className: "text-sm font-semibold text-gray-700", children: "School *" }), _jsxs(Select, { value: form.schoolId, onValueChange: (val) => setForm({ ...form, schoolId: val }), required: true, children: [_jsx(SelectTrigger, { id: "school", className: "h-12 text-sm w-full focus:ring-2 focus:ring-primary", children: _jsx(SelectValue, { placeholder: "Select a school" }) }), _jsx(SelectContent, { children: schools.map((s) => (_jsx(SelectItem, { value: String(s.id), children: s.name }, s.id))) })] })] }), _jsxs("div", { className: "space-y-2.5", children: [_jsx(Label, { htmlFor: "bus", className: "text-sm font-semibold text-gray-700", children: "Bus *" }), _jsxs(Select, { value: form.busId, onValueChange: (val) => setForm({ ...form, busId: val }), required: true, children: [_jsx(SelectTrigger, { id: "bus", className: "h-12 text-sm w-full focus:ring-2 focus:ring-primary", children: _jsx(SelectValue, { placeholder: "Select a bus" }) }), _jsx(SelectContent, { children: buses.map((b) => (_jsxs(SelectItem, { value: String(b.id), children: [b.name, " (", b.plateNumber, ")"] }, b.id))) })] })] })] })] }), _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: "Parent Information" }), _jsx(Separator, { className: "mb-5" })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-6", children: [_jsxs("div", { className: "space-y-2.5", children: [_jsx(Label, { htmlFor: "parentName", className: "text-sm font-semibold text-gray-700", children: "Parent Name *" }), _jsx(Input, { id: "parentName", value: form.parentName, onChange: (e) => setForm({ ...form, parentName: e.target.value }), placeholder: "Enter parent full name", required: true, className: "h-12 text-sm w-full focus:ring-2 focus:ring-primary focus:border-primary transition-all" })] }), _jsxs("div", { className: "space-y-2.5", children: [_jsx(Label, { htmlFor: "parentPhone", className: "text-sm font-semibold text-gray-700", children: "Parent Phone *" }), _jsx(Input, { id: "parentPhone", type: "tel", value: form.parentPhone, onChange: (e) => setForm({ ...form, parentPhone: e.target.value }), placeholder: "07XXXXXXXX", required: true, className: "h-12 text-sm w-full focus:ring-2 focus:ring-primary focus:border-primary transition-all" })] }), _jsxs("div", { className: "space-y-2.5", children: [_jsx(Label, { htmlFor: "parentEmail", className: "text-sm font-semibold text-gray-700", children: "Parent Email *" }), _jsx(Input, { id: "parentEmail", type: "email", value: form.parentEmail, onChange: (e) => setForm({ ...form, parentEmail: e.target.value }), placeholder: "example@email.com", required: true, className: "h-12 text-sm w-full focus:ring-2 focus:ring-primary focus:border-primary transition-all" })] }), _jsxs("div", { className: "space-y-2.5", children: [_jsx(Label, { htmlFor: "parentPassword", className: "text-sm font-semibold text-gray-700", children: "Parent Password *" }), _jsx(Input, { id: "parentPassword", type: "password", value: form.parentPassword, onChange: (e) => setForm({ ...form, parentPassword: e.target.value }), placeholder: "Set a secure password", required: true, className: "h-12 text-sm w-full focus:ring-2 focus:ring-primary focus:border-primary transition-all" })] })] })] }), _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: "Pickup Location" }), _jsx(Separator, { className: "mb-5" })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2.5", children: [_jsx(Label, { htmlFor: "location", className: "text-sm font-semibold text-gray-700", children: "Location Address" }), _jsx(Input, { id: "location", value: form.location, onChange: (e) => setForm({ ...form, location: e.target.value }), placeholder: "Type address or click on map below", className: "h-12 text-sm w-full focus:ring-2 focus:ring-primary focus:border-primary transition-all" }), _jsx("p", { className: "text-xs text-muted-foreground mt-1.5", children: "Type a place name or click on the map to select location" })] }), _jsxs("div", { className: "space-y-2.5", children: [_jsx(Label, { className: "text-sm font-medium text-gray-700 block", children: "Select on Map" }), _jsx("div", { className: "relative w-full rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg bg-white", children: _jsx("div", { className: "w-full relative h-[300px] sm:h-[400px] md:h-[450px]", style: {
                                                        position: 'relative',
                                                        zIndex: 0
                                                    }, children: _jsxs(MapContainer, { center: [-1.286389, 36.817223], zoom: 13, style: {
                                                            height: '100%',
                                                            width: '100%',
                                                            zIndex: 0,
                                                            position: 'relative'
                                                        }, className: "z-0", zoomControl: true, scrollWheelZoom: true, children: [_jsx(TileLayer, { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: '\u00A9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }), _jsx(LocationPicker, { onPick: (pos) => {
                                                                    setCoords({ lat: pos.lat, lng: pos.lng });
                                                                    if (pos.address)
                                                                        setForm({ ...form, location: pos.address });
                                                                } }), coords.lat && coords.lng && (_jsx(Marker, { position: [coords.lat, coords.lng], icon: markerIcon }))] }) }) }), coords.lat && coords.lng && (_jsxs("div", { className: "flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg", children: [_jsx("span", { className: "text-green-600 font-semibold", children: "\u2713" }), _jsxs("p", { className: "text-sm text-green-700 font-medium", children: ["Location selected: ", _jsxs("span", { className: "font-mono text-xs", children: [coords.lat.toFixed(5), ", ", coords.lng.toFixed(5)] })] })] }))] })] })] }), _jsx("div", { className: "flex justify-end gap-3 pt-6 border-t border-gray-200", children: _jsx(Button, { type: "submit", disabled: loading, className: "min-w-[140px] h-11 text-base font-semibold shadow-md hover:shadow-lg transition-all", size: "lg", children: loading ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "mr-2 animate-spin", children: "\u23F3" }), "Saving..."] })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "mr-2", children: "\u2713" }), "Add Student"] })) }) })] }) }) }));
}
