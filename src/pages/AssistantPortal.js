import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { Toaster, toast } from "sonner";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});
// API Endpoints
const API_BASE = "https://schooltransport-production.up.railway.app/api";
const STUDENTS_API = `${API_BASE}/students`;
const MANIFEST_API = `${API_BASE}/manifests`;
const BUS_LOCATIONS_API = `${API_BASE}/tracking/bus-locations`;
const PANIC_API = `${API_BASE}/panic`;
export default function AssistantPortal() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("token");
    useEffect(() => {
        if (!user || !token)
            navigate("/login");
    }, [user, token, navigate]);
    const assistantId = user?.id;
    const [busLocation, setBusLocation] = useState(null);
    const [routePositions, setRoutePositions] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [autoFollow, setAutoFollow] = useState(true);
    const [mapCenter, setMapCenter] = useState(null);
    const routeRef = useRef([]);
    // Search & Pagination
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    // Logout
    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        toast.success("Logged out successfully!");
        navigate("/");
    };
    // Fetch Students
    const { data: studentsData, isLoading: studentsLoading, isError: studentsError } = useQuery({
        queryKey: ["students"],
        queryFn: async () => {
            const res = await axios.get(STUDENTS_API, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return res.data?.data || [];
        },
        onError: () => toast.error("Failed to load students"),
    });
    // Fetch bus locations
    const { data: busLocationsData } = useQuery({
        queryKey: ["bus-locations"],
        queryFn: async () => {
            const res = await axios.get(BUS_LOCATIONS_API, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return res.data?.data ?? res.data ?? [];
        },
        refetchInterval: 15000,
    });
    // Assigned students & bus
    const assignedStudents = Array.isArray(studentsData)
        ? studentsData.filter((s) => s.bus?.assistantId === assistantId)
        : [];
    const bus = assignedStudents[0]?.bus || null;
    // Kenya time helper
    function getKenyaNow() {
        return new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
    }
    // Session validation
    function isWithinSession(session) {
        const now = getKenyaNow();
        if (isNaN(now.getTime()))
            return false;
        if (session === "MORNING") {
            const start = new Date(now);
            start.setHours(5, 0, 0, 0);
            const end = new Date(now);
            end.setHours(11, 59, 59, 999);
            return now >= start && now <= end;
        }
        else {
            const start = new Date(now);
            start.setHours(12, 0, 0, 0);
            const end = new Date(now);
            end.setHours(21, 30, 0, 0);
            return now >= start && now <= end;
        }
    }
    // Send SMS (backend)
    async function sendSmsNotification(payload) {
        try {
            await axios.post(`${API_BASE}/sms/manifest`, payload, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.message("SMS notification sent (backend).");
        }
        catch (err) {
            console.warn("SMS notify failed:", err?.response?.data ?? err.message);
            if (err?.response?.status && err.response.status !== 404) {
                toast.error(`SMS send failed: ${err?.response?.data?.message || err.message}`);
            }
        }
    }
    // Bus location tracking
    useEffect(() => {
        if (!bus || !Array.isArray(busLocationsData))
            return;
        const plate = (bus.plateNumber || "").toLowerCase().replace(/\s+/g, "");
        const unit = busLocationsData.find((u) => {
            const number = (u.number || u.plate || u.plateNumber || u.name || "").toString().toLowerCase().replace(/\s+/g, "");
            return number === plate;
        });
        if (!unit) {
            setBusLocation(null);
            setLastUpdated(null);
            return;
        }
        const lat = Number(unit.lat ?? unit.latitude ?? unit.position?.lat ?? unit.coords?.lat);
        const lng = Number(unit.lng ?? unit.longitude ?? unit.position?.lng ?? unit.coords?.lng);
        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
            toast.error("GPS coordinates invalid for this bus.");
            setBusLocation(null);
            return;
        }
        (async () => {
            try {
                const res = await axios.get(`${API_BASE}/geocode/reverse`, {
                    params: { lat, lon: lng },
                    headers: { Authorization: `Bearer ${token}` },
                });
                const geoData = res.data ?? {};
                const addr = geoData.display_name ?? geoData.address ?? geoData.name ?? geoData.result ?? "Unknown location";
                setBusLocation({ lat, lng, address: addr });
            }
            catch {
                setBusLocation({ lat, lng, address: "Address unavailable" });
            }
        })();
        const ts = unit.timestamp ?? unit.time ?? unit.lastUpdated ?? unit.ts ?? unit.updatedAt ?? null;
        setLastUpdated(ts ? new Date(ts).toLocaleString("en-GB", { timeZone: "Africa/Nairobi" }) : new Date().toLocaleString("en-GB", { timeZone: "Africa/Nairobi" }));
        const idToken = (ts ?? `${lat}-${lng}`).toString();
        if (!routeRef.current.includes(idToken)) {
            routeRef.current.push(idToken);
            setRoutePositions((prev) => [...prev, [lat, lng]].slice(-100));
        }
        setMapCenter([lat, lng]);
    }, [busLocationsData, bus]);
    // Fetch manifests
    const { data: manifestsData, refetch: refetchManifests } = useQuery({
        queryKey: ["manifests"],
        queryFn: async () => {
            const res = await axios.get(MANIFEST_API, { headers: { Authorization: `Bearer ${token}` } });
            return Array.isArray(res.data?.data) ? res.data.data : (res.data?.data ?? res.data ?? []);
        },
        onError: () => toast.error("Failed to load manifests"),
    });
    const manifests = Array.isArray(manifestsData) ? manifestsData : [];
    // Check-in/out mutation
    const checkMutation = useMutation({
        mutationFn: async ({ studentId, status, session }) => {
            const plate = (bus?.plateNumber || "").toLowerCase().replace(/\s+/g, "");
            const unit = (Array.isArray(busLocationsData) ? busLocationsData : []).find((u) => {
                const number = (u.number || u.plate || u.plateNumber || u.name || "").toString().toLowerCase().replace(/\s+/g, "");
                return number === plate;
            });
            if (!unit)
                throw new Error("GPS not available for this bus right now.");
            const latitude = unit.lat ?? unit.latitude ?? 0;
            const longitude = unit.lng ?? unit.longitude ?? 0;
            if (latitude === 0 && longitude === 0)
                throw new Error("Invalid GPS coordinates.");
            const body = { studentId, busId: bus?.id, assistantId, status, session, latitude, longitude };
            const res = await axios.post(MANIFEST_API, body, { headers: { Authorization: `Bearer ${token}` } });
            return res.data;
        },
        onSuccess: async (_, vars) => {
            const label = vars.status === "CHECKED_IN" ? `${vars.session} Onboarded` : `${vars.session} Offboarded`;
            toast.success(`${label} successfully!`);
            queryClient.invalidateQueries(["manifests"]);
            refetchManifests();
            await sendSmsNotification({ studentId: vars.studentId, status: vars.status, session: vars.session, busId: bus?.id, assistantId, latitude: vars.latitude ?? undefined, longitude: vars.longitude ?? undefined });
        },
        onError: (err) => toast.error(`Failed to update manifest: ${err?.response?.data?.message || err.message}`),
    });
    if (studentsLoading)
        return _jsx("p", { className: "p-6 text-center text-muted-foreground", children: "Loading assistant info..." });
    if (studentsError)
        return _jsx("p", { className: "text-red-500 text-center mt-6", children: "Error loading students." });
    if (!bus)
        return (_jsxs("div", { className: "p-6 text-center", children: [_jsx("p", { children: "No bus assigned for this assistant." }), _jsx(Button, { onClick: handleLogout, variant: "destructive", className: "mt-4", children: "Logout" })] }));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayManifests = manifests.filter((m) => {
        const dateOk = m.date ? new Date(m.date) >= today : true;
        const assistantOk = m.assistantId === assistantId;
        const busOk = m.busId === bus?.id || (m.bus?.id === bus?.id);
        return dateOk && assistantOk && busOk;
    });
    const morningOnboarded = todayManifests.filter((m) => m.session === "MORNING" && m.status === "CHECKED_IN").length;
    const morningOffboarded = todayManifests.filter((m) => m.session === "MORNING" && m.status === "CHECKED_OUT").length;
    const eveningOnboarded = todayManifests.filter((m) => m.session === "EVENING" && m.status === "CHECKED_IN").length;
    const eveningOffboarded = todayManifests.filter((m) => m.session === "EVENING" && m.status === "CHECKED_OUT").length;
    const totalOnboarded = morningOnboarded + eveningOnboarded;
    const totalOffboarded = morningOffboarded + eveningOffboarded;
    const filteredStudents = assignedStudents.filter((s) => s.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
    const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const handleCheck = (student, status, session) => {
        if (!isWithinSession(session)) {
            toast.error(`${session === "MORNING" ? "Morning" : "Evening"} actions allowed only during session (Kenya time).`);
            return;
        }
        const morning = todayManifests.find((m) => (m.student?.id === student.id || m.studentId === student.id) && m.session === "MORNING");
        const evening = todayManifests.find((m) => (m.student?.id === student.id || m.studentId === student.id) && m.session === "EVENING");
        if (status === "CHECKED_OUT") {
            if ((session === "MORNING" && (!morning || morning.status !== "CHECKED_IN")) || (session === "EVENING" && (!evening || evening.status !== "CHECKED_IN"))) {
                toast.error(`Cannot offboard ${session.toLowerCase()}: student not onboarded yet.`);
                return;
            }
        }
        if (session === "EVENING" && status === "CHECKED_IN" && morning && morning.status !== "CHECKED_OUT") {
            toast.error("Cannot onboard for evening: Morning session not offboarded yet.");
            return;
        }
        checkMutation.mutate({ studentId: student.id, status, session });
    };
    function isActionDisabled(student, action, session) {
        if (!isWithinSession(session))
            return true;
        const morning = todayManifests.find((m) => (m.student?.id === student.id || m.studentId === student.id) && m.session === "MORNING");
        const evening = todayManifests.find((m) => (m.student?.id === student.id || m.studentId === student.id) && m.session === "EVENING");
        if (session === "MORNING")
            return action === "IN" ? morning?.status === "CHECKED_IN" : morning?.status !== "CHECKED_IN";
        if (session === "EVENING") {
            if (action === "IN")
                return evening?.status === "CHECKED_IN" || (morning && morning.status !== "CHECKED_OUT");
            if (action === "OUT")
                return evening?.status !== "CHECKED_IN";
        }
        return false;
    }
    const panicMutation = useMutation({
        mutationFn: async ({ reason }) => {
            const body = { busId: bus?.id, assistantId, reason };
            const res = await axios.post(PANIC_API, body, { headers: { Authorization: `Bearer ${token}` } });
            return res.data;
        },
        onSuccess: () => toast.success("Panic sent! Help is being notified."),
        onError: (err) => toast.error(`Failed to send panic: ${err?.response?.data?.message || err.message}`),
    });
    function AutoCenter({ center }) {
        const map = useMap();
        const first = useRef(true);
        useEffect(() => {
            if (!center)
                return;
            if (!autoFollow && !first.current)
                return;
            map.flyTo(center, 15, { duration: 0.7 });
            first.current = false;
        }, [center, map]);
        return null;
    }
    const latestUnit = useMemo(() => {
        if (!bus || !Array.isArray(busLocationsData))
            return null;
        const plate = (bus.plateNumber || "").toLowerCase().replace(/\s+/g, "");
        return busLocationsData.find((u) => {
            const num = (u.number || u.plate || u.plateNumber || u.name || "").toString().toLowerCase().replace(/\s+/g, "");
            return num === plate;
        }) ?? null;
    }, [busLocationsData, bus]);
    const latestSpeed = latestUnit ? (latestUnit.speed ?? latestUnit.speed_kmh ?? latestUnit.velocity ?? null) : null;
    return (_jsxs("div", { className: "min-h-screen bg-muted/30 p-6", children: [_jsx(Toaster, { position: "top-center", richColors: true, closeButton: true }), _jsxs("div", { className: "max-w-7xl mx-auto space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold", children: "Bus Assistant Portal" }), _jsxs("p", { className: "text-muted-foreground mt-1", children: ["Welcome, ", user?.name || "Assistant", " \u2014 manage student attendance"] })] }), _jsx("div", { className: "flex items-center gap-3", children: _jsxs(Button, { variant: "outline", onClick: handleLogout, className: "flex items-center gap-2", children: [_jsx(LogOut, { className: "w-4 h-4" }), " Logout"] }) })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Morning Session" }) }), _jsxs(CardContent, { className: "space-y-2", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Onboarded" }), _jsx("span", { className: "font-bold", children: morningOnboarded })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Offboarded" }), _jsx("span", { className: "font-bold", children: morningOffboarded })] })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Evening Session" }) }), _jsxs(CardContent, { className: "space-y-2", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Onboarded" }), _jsx("span", { className: "font-bold", children: eveningOnboarded })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Offboarded" }), _jsx("span", { className: "font-bold", children: eveningOffboarded })] })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Total Summary" }) }), _jsxs(CardContent, { className: "space-y-2", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Onboarded" }), _jsx("span", { className: "font-bold", children: totalOnboarded })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Offboarded" }), _jsx("span", { className: "font-bold", children: totalOffboarded })] })] })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "My Bus" }) }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold text-lg", children: bus.name }), _jsx("p", { className: "text-muted-foreground", children: bus.plateNumber }), _jsxs("p", { className: "text-sm", children: ["Route: ", bus.route || "N/A"] })] }), _jsxs("div", { className: "flex flex-col items-end gap-2", children: [_jsxs("div", { className: "text-right", children: [_jsx("div", { className: "text-xs text-muted-foreground", children: "Speed" }), _jsx("div", { className: "font-bold text-lg", children: latestSpeed !== null ? `${latestSpeed} km/h` : "N/A" })] }), _jsxs("div", { className: "text-right", children: [_jsx("div", { className: "text-xs text-muted-foreground", children: "Last updated" }), _jsx("div", { className: "text-sm", children: lastUpdated ?? "N/A" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { size: "sm", onClick: () => setAutoFollow((s) => !s), children: autoFollow ? "Auto-follow: ON" : "Auto-follow: OFF" }), _jsx(Button, { size: "sm", variant: "destructive", onClick: () => { const reason = prompt("Reason for panic (optional):") || "Panic pressed"; panicMutation.mutate({ reason }); }, children: "Panic" })] })] })] }), busLocation ? (_jsxs(MapContainer, { center: [busLocation.lat, busLocation.lng], zoom: 15, scrollWheelZoom: true, className: "h-56 w-full mt-2 rounded-lg", children: [_jsx(TileLayer, { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "\u00A9 OpenStreetMap contributors" }), _jsx(AutoCenter, { center: mapCenter }), _jsx(Marker, { position: [busLocation.lat, busLocation.lng], children: _jsxs(Popup, { children: [bus.name, " (", bus.plateNumber, ")", _jsx("br", {}), busLocation.address, _jsx("br", {}), "Speed: ", latestSpeed ?? "N/A", " km/h", _jsx("br", {}), "Last: ", lastUpdated ?? "N/A"] }) }), routePositions.length > 1 && _jsx(Polyline, { positions: routePositions })] })) : _jsx("p", { className: "text-sm text-muted-foreground mt-2", children: "Bus location not available" })] }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Student Manifest" }) }), _jsxs(CardContent, { className: "space-y-3", children: [_jsx("div", { className: "mb-3", children: _jsx("input", { type: "text", placeholder: "Search student...", className: "w-full p-2 border rounded", value: searchTerm, onChange: (e) => { setSearchTerm(e.target.value); setCurrentPage(1); } }) }), paginatedStudents.map((student) => {
                                        const morning = todayManifests.find((m) => (m.student?.id === student.id || m.studentId === student.id) && m.session === "MORNING");
                                        const evening = todayManifests.find((m) => (m.student?.id === student.id || m.studentId === student.id) && m.session === "EVENING");
                                        return (_jsxs("div", { className: "flex flex-col md:flex-row md:items-center justify-between p-4 bg-muted rounded-lg", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-medium", children: student.name }), _jsx("p", { className: "text-sm text-muted-foreground", children: student.grade })] }), _jsxs("div", { className: "flex flex-col md:flex-row items-center gap-3 mt-3 md:mt-0", children: [_jsxs(Badge, { className: `${morning ? morning.status === "CHECKED_IN" ? "bg-green-600 text-white" : "bg-gray-500 text-white" : "bg-gray-400 text-white"}`, children: ["Morning ", morning ? morning.status === "CHECKED_IN" ? "Onboarded" : "Offboarded" : "No record"] }), _jsx(Button, { size: "sm", className: `${morning?.status === "CHECKED_IN" ? "bg-gray-400 text-white" : "bg-green-600 text-white"}`, onClick: () => handleCheck(student, "CHECKED_IN", "MORNING"), disabled: isActionDisabled(student, "IN", "MORNING"), children: "In (M)" }), _jsx(Button, { size: "sm", variant: "destructive", onClick: () => handleCheck(student, "CHECKED_OUT", "MORNING"), disabled: isActionDisabled(student, "OUT", "MORNING"), children: "Out (M)" }), _jsxs(Badge, { className: `${evening ? evening.status === "CHECKED_IN" ? "bg-blue-600 text-white" : "bg-gray-500 text-white" : "bg-gray-400 text-white"}`, children: ["Evening ", evening ? evening.status === "CHECKED_IN" ? "Onboarded" : "Offboarded" : "No record"] }), _jsx(Button, { size: "sm", className: `${evening?.status === "CHECKED_IN" ? "bg-gray-400 text-white" : "bg-green-600 text-white"}`, onClick: () => handleCheck(student, "CHECKED_IN", "EVENING"), disabled: isActionDisabled(student, "IN", "EVENING"), children: "In (E)" }), _jsx(Button, { size: "sm", variant: "destructive", onClick: () => handleCheck(student, "CHECKED_OUT", "EVENING"), disabled: isActionDisabled(student, "OUT", "EVENING"), children: "Out (E)" })] })] }, student.id));
                                    }), _jsxs("div", { className: "flex justify-center items-center space-x-2 mt-4", children: [_jsx(Button, { size: "sm", disabled: currentPage <= 1, onClick: () => setCurrentPage((p) => Math.max(1, p - 1)), children: "Prev" }), _jsxs("span", { children: ["Page ", currentPage, " / ", totalPages] }), _jsx(Button, { size: "sm", disabled: currentPage >= totalPages, onClick: () => setCurrentPage((p) => Math.min(totalPages, p + 1)), children: "Next" })] })] })] })] })] }));
}
