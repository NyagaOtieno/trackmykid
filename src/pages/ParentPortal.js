import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// ParentPortal.tsx
import { useQuery } from "@tanstack/react-query";
import { MapPin, Car, Navigation, Clock, User, UserCog, AlertCircle, ShieldAlert, ChevronUp, ChevronDown, } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useMap } from "react-leaflet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { getCurrentUser } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo, useEffect, useState } from "react";
import { createBusIcon } from "@/utils/vehicleIcon";
/* ---------------- Auto-fit map bounds component ---------------- */
function FitBounds({ bounds }) {
    const map = useMap();
    useEffect(() => {
        if (bounds)
            map.fitBounds(bounds, { padding: [50, 50] });
    }, [bounds, map]);
    return null;
}
/* ---------------- Fly to selected vehicle ---------------- */
function FlyToLocation({ selectedVehicle }) {
    const map = useMap();
    useEffect(() => {
        if (selectedVehicle?.lat != null && selectedVehicle?.lng != null) {
            map.flyTo([selectedVehicle.lat, selectedVehicle.lng], 15, { animate: true, duration: 1.5 });
        }
    }, [selectedVehicle, map]);
    return null;
}
/* ---------------- API ENDPOINTS ---------------- */
const STUDENTS_ENDPOINT = "https://schooltransport-production.up.railway.app/api/students";
const MANIFESTS_ENDPOINT = "https://schooltransport-production.up.railway.app/api/manifests";
const BUSES_ENDPOINT = "https://schooltransport-production.up.railway.app/api/buses";
const USERS_ENDPOINT = "https://schooltransport-production.up.railway.app/api/users";
const TRACKING_ENDPOINT = "https://schooltransport-production.up.railway.app/api/tracking/bus-locations";
const PANIC_ENDPOINT = "https://schooltransport-production.up.railway.app/api/panic";
/* ---------------- Vehicle Details Card Component (Persistent Sidebar) ---------------- */
function VehicleDetailsCard({ vehicle, students, parentId, showPanicButton = true, onPanicClick, panicTrigger, variant = "full", }) {
    const [showPanicDialog, setShowPanicDialog] = useState(false);
    const [panicReason, setPanicReason] = useState("");
    const [isSubmittingPanic, setIsSubmittingPanic] = useState(false);
    useEffect(() => {
        if (panicTrigger !== undefined && panicTrigger > 0) {
            setShowPanicDialog(true);
        }
    }, [panicTrigger]);
    const handlePanicSubmit = async () => {
        if (!panicReason || !vehicle || !parentId) {
            toast.error("Please select a reason for the panic alert");
            return;
        }
        // Get first student from vehicle's students array
        const firstStudent = vehicle.students[0];
        if (!firstStudent) {
            toast.error("No student found on this vehicle");
            return;
        }
        setIsSubmittingPanic(true);
        try {
            const token = sessionStorage.getItem("token") || localStorage.getItem("token");
            const response = await fetch(PANIC_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    studentId: firstStudent.student.id,
                    parentId: parentId,
                    reason: panicReason,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Failed to send panic alert" }));
                throw new Error(errorData.message || "Failed to send panic alert");
            }
            toast.success("Panic sent! Help is being notified.");
            setShowPanicDialog(false);
            setPanicReason("");
        }
        catch (error) {
            toast.error(error.message || "Failed to send panic alert. Please try again.");
        }
        finally {
            setIsSubmittingPanic(false);
        }
    };
    if (!vehicle) {
        return (_jsx(Card, { className: "w-full border shadow-md flex items-center justify-center min-h-[150px]", children: _jsxs(CardContent, { className: "text-center p-3 sm:p-4", children: [_jsx(Car, { className: "h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground mx-auto mb-2 opacity-50" }), _jsx("p", { className: "text-xs sm:text-sm text-muted-foreground", children: "Select a student to view vehicle details" })] }) }));
    }
    const movementState = vehicle.movementState?.toLowerCase() || "unknown";
    const isFallback = !vehicle.lat || !vehicle.lng;
    const isMoving = movementState === "moving" || movementState === "driving";
    const statusColor = isFallback
        ? "bg-gray-500"
        : isMoving
            ? "bg-green-500"
            : "bg-blue-500";
    const statusText = isFallback
        ? "No GPS Signal"
        : isMoving
            ? "Moving"
            : "Stopped";
    const vehicleStudents = students.filter(s => s.plate === vehicle.plateNumber);
    return (_jsxs(_Fragment, { children: [_jsxs(Card, { className: "w-full border shadow-md", children: [variant === "full" && (_jsx(CardHeader, { className: `${statusColor} text-white rounded-t p-2 sm:p-4 lg:p-6`, children: _jsxs("div", { className: "flex items-center justify-between flex-wrap gap-1.5", children: [_jsxs(CardTitle, { className: "text-sm sm:text-base lg:text-lg font-semibold flex items-center gap-1.5", children: [_jsx(Car, { className: "h-4 w-4 sm:h-5 sm:w-5" }), vehicle.plateNumber || "N/A"] }), _jsx(Badge, { variant: "secondary", className: "bg-white/20 text-white border-white/30 text-[10px] sm:text-xs", children: statusText })] }) })), _jsxs(CardContent, { className: `p-2 sm:p-3 lg:p-6 space-y-2 sm:space-y-3 lg:space-y-4 ${variant === "sheet" ? "pt-3" : ""}`, children: [variant === "full" && (_jsxs("div", { className: "space-y-2", children: [_jsx("h3", { className: "font-semibold text-xs sm:text-sm border-b pb-1", children: "Vehicle Information" }), vehicle.busName && vehicle.busName !== "No Bus Assigned" && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "p-1.5 bg-primary/10 rounded", children: _jsx(Car, { className: "h-3 w-3 text-primary" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-muted-foreground", children: "Vehicle Name" }), _jsx("p", { className: "font-medium text-xs sm:text-sm", children: vehicle.busName })] })] })), variant === "full" && vehicle.plateNumber && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "p-1.5 bg-primary/10 rounded", children: _jsx(Navigation, { className: "h-3 w-3 text-primary" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-muted-foreground", children: "Plate Number" }), _jsx("p", { className: "font-medium text-sm sm:text-base", children: vehicle.plateNumber })] })] }))] })), _jsxs("div", { className: "space-y-2 pt-2 border-t", children: [_jsx("h3", { className: "font-semibold text-xs sm:text-sm border-b pb-1", children: "Staff" }), vehicle.driver && vehicle.driver !== "N/A" && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "p-1.5 bg-primary/10 rounded", children: _jsx(User, { className: "h-3 w-3 text-primary" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-muted-foreground", children: "Driver" }), _jsx("p", { className: "font-medium text-xs sm:text-sm", children: vehicle.driver })] })] })), vehicle.assistant && vehicle.assistant !== "N/A" && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "p-1.5 bg-primary/10 rounded", children: _jsx(UserCog, { className: "h-3 w-3 text-primary" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-muted-foreground", children: "Assistant" }), _jsx("p", { className: "font-medium text-xs sm:text-sm", children: vehicle.assistant })] })] }))] }), vehicle.lat && vehicle.lng && (_jsxs("div", { className: "space-y-2 pt-2 border-t", children: [_jsx("h3", { className: "font-semibold text-xs sm:text-sm border-b pb-1", children: "Location" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "p-1.5 bg-primary/10 rounded", children: _jsx(MapPin, { className: "h-3 w-3 text-primary" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-[10px] text-muted-foreground", children: "Current Location" }), _jsx("p", { className: "font-medium text-xs sm:text-sm truncate", children: vehicle.readableLocation || "Location unavailable" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 text-[10px]", children: [_jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground", children: "Latitude" }), _jsx("p", { className: "font-medium text-xs", children: vehicle.lat.toFixed(6) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground", children: "Longitude" }), _jsx("p", { className: "font-medium text-xs", children: vehicle.lng.toFixed(6) })] })] }), vehicle.lastSeen && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "p-1.5 bg-primary/10 rounded", children: _jsx(Clock, { className: "h-3 w-3 text-primary" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-[10px] text-muted-foreground", children: "Last Update" }), _jsx("p", { className: "font-medium text-xs truncate", children: new Date(vehicle.lastSeen).toLocaleString() })] })] }))] })), vehicleStudents.length > 0 && (_jsxs("div", { className: "space-y-1.5 pt-2 border-t", children: [_jsx("h3", { className: "font-semibold text-xs sm:text-sm border-b pb-1", children: "Students on Vehicle" }), _jsx("div", { className: "space-y-1", children: vehicleStudents.map((sv) => (_jsx("div", { className: "flex items-center gap-1.5 p-1.5 bg-muted/50 rounded", children: _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-medium text-xs sm:text-sm truncate", children: sv.student.name }), _jsx("p", { className: "text-[10px] text-muted-foreground", children: sv.status === "CHECKED_IN" ? "On Board" : sv.status === "CHECKED_OUT" ? "Checked Out" : "Unknown" })] }) }, sv.student.id))) })] })), showPanicButton && (_jsx("div", { className: "pt-2 border-t", children: _jsxs(Button, { onClick: () => {
                                        onPanicClick?.();
                                        setShowPanicDialog(true);
                                    }, variant: "destructive", className: "w-full h-9 sm:h-10 text-xs sm:text-sm font-semibold", size: "sm", children: [_jsx(AlertCircle, { className: "h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" }), _jsx("span", { children: "Emergency" })] }) }))] })] }), _jsx(Dialog, { open: showPanicDialog, onOpenChange: setShowPanicDialog, children: _jsxs(DialogContent, { className: "max-w-md", children: [_jsxs(DialogHeader, { className: "text-left", children: [_jsxs(DialogTitle, { className: "flex items-center gap-2 text-lg sm:text-xl", children: [_jsx(AlertCircle, { className: "h-5 w-5 sm:h-6 sm:w-6 text-destructive flex-shrink-0" }), _jsx("span", { children: "Emergency Panic Alert" })] }), _jsx(DialogDescription, { className: "text-sm sm:text-base mt-2 text-left", children: "Please select a reason for this emergency alert. Help will be notified immediately." })] }), _jsx("div", { className: "space-y-4 py-4", children: _jsxs("div", { className: "space-y-2", children: [_jsx("label", { htmlFor: "panic-reason", className: "text-sm font-medium block", children: "Reason for Panic" }), _jsxs(Select, { value: panicReason, onValueChange: setPanicReason, children: [_jsx(SelectTrigger, { id: "panic-reason", className: "w-full h-11 sm:h-10 text-base sm:text-sm", children: _jsx(SelectValue, { placeholder: "Select a reason" }) }), _jsxs(SelectContent, { className: "max-h-[60vh] sm:max-h-[200px] !z-[10001]", position: "popper", children: [_jsx(SelectItem, { value: "Emergency", className: "text-base sm:text-sm py-3 sm:py-2", children: "Emergency" }), _jsx(SelectItem, { value: "Accident", className: "text-base sm:text-sm py-3 sm:py-2", children: "Accident" }), _jsx(SelectItem, { value: "Medical Issue", className: "text-base sm:text-sm py-3 sm:py-2", children: "Medical Issue" }), _jsx(SelectItem, { value: "Other", className: "text-base sm:text-sm py-3 sm:py-2", children: "Other" })] })] })] }) }), _jsxs(DialogFooter, { className: "flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-end", children: [_jsx(Button, { variant: "outline", onClick: () => {
                                        setShowPanicDialog(false);
                                        setPanicReason("");
                                    }, disabled: isSubmittingPanic, className: "w-full sm:w-auto order-2 sm:order-1", children: "Cancel" }), _jsx(Button, { variant: "destructive", onClick: handlePanicSubmit, disabled: !panicReason || isSubmittingPanic, className: "w-full sm:w-auto order-1 sm:order-2", children: isSubmittingPanic ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "inline-block animate-spin mr-2", children: "\u23F3" }), "Sending..."] })) : (_jsxs(_Fragment, { children: [_jsx(AlertCircle, { className: "h-4 w-4 mr-2" }), "Send Panic Alert"] })) })] })] }) })] }));
}
export default function ParentPortal() {
    const navigate = useNavigate();
    const currentUser = getCurrentUser();
    const parentUserId = currentUser?.id;
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    // Mobile bottom sheet expansion state (collapsed by default to keep map primary)
    const [showMobileDetails, setShowMobileDetails] = useState(false);
    const [panicTriggerKey, setPanicTriggerKey] = useState(0);
    const handleLogout = () => {
        localStorage.removeItem("parent");
        localStorage.removeItem("token");
        navigate("/");
    };
    const triggerPanic = () => {
        setPanicTriggerKey((k) => k + 1);
        setShowMobileDetails(true);
    };
    /* ---------------- FETCH DATA ---------------- */
    const { data: studentsData, isLoading: loadingStudents } = useQuery({
        queryKey: ["students"],
        queryFn: async () => {
            const res = await fetch(STUDENTS_ENDPOINT);
            if (!res.ok)
                throw new Error("Failed to fetch students");
            const json = await res.json();
            return Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        },
        refetchInterval: 15000,
    });
    const students = Array.isArray(studentsData) ? studentsData : [];
    const myStudents = students.filter((s) => (s.parent?.user?.id && s.parent?.user?.id === parentUserId) ||
        (s.parentId && s.parentId === parentUserId));
    const { data: manifestsData } = useQuery({
        queryKey: ["manifests", parentUserId],
        queryFn: async () => {
            const res = await fetch(MANIFESTS_ENDPOINT);
            if (!res.ok)
                throw new Error("Failed to fetch manifests");
            const json = await res.json();
            return Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        },
        refetchInterval: 15000,
    });
    const manifests = Array.isArray(manifestsData) ? manifestsData : [];
    const { data: busesData } = useQuery({
        queryKey: ["buses"],
        queryFn: async () => {
            const res = await fetch(BUSES_ENDPOINT);
            if (!res.ok)
                return [];
            const json = await res.json();
            return Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        },
        refetchInterval: 30000,
    });
    const buses = Array.isArray(busesData) ? busesData : [];
    const { data: usersData } = useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            const res = await fetch(USERS_ENDPOINT);
            if (!res.ok)
                return [];
            const json = await res.json();
            return Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        },
        refetchInterval: 30000,
    });
    const users = Array.isArray(usersData) ? usersData : [];
    /* ---------------- FETCH LIVE BUS LOCATIONS ---------------- */
    const { data: busLocationsRaw } = useQuery({
        queryKey: ["busLocations"],
        queryFn: async () => {
            const token = sessionStorage.getItem("token");
            const res = await fetch(TRACKING_ENDPOINT, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok)
                return [];
            const json = await res.json();
            return Array.isArray(json?.data) ? json.data : [];
        },
        refetchInterval: 15000,
    });
    const busLocations = Array.isArray(busLocationsRaw) ? busLocationsRaw : [];
    /* ---------------- HELPER MAPS ---------------- */
    const busesById = useMemo(() => {
        const map = new Map();
        for (const b of buses)
            if (b?.id != null)
                map.set(Number(b.id), b);
        return map;
    }, [buses]);
    const usersById = useMemo(() => {
        const map = new Map();
        for (const u of users)
            if (u?.id != null)
                map.set(Number(u.id), u);
        return map;
    }, [users]);
    const busLocationsByPlate = useMemo(() => {
        const map = new Map();
        for (const d of busLocations) {
            const key = (d.plateNumber ?? "").toString().trim().replace(/\s+/g, "").toUpperCase();
            if (key)
                map.set(key, d);
        }
        return map;
    }, [busLocations]);
    const latestManifestByStudent = useMemo(() => {
        const map = new Map();
        const sorted = manifests.slice().sort((a, b) => {
            const da = a.date ? new Date(a.date).getTime() : 0;
            const db = b.date ? new Date(b.date).getTime() : 0;
            return db - da;
        });
        for (const m of sorted) {
            const sid = m.studentId ?? m.student?.id;
            if (sid && !map.has(sid))
                map.set(sid, m);
        }
        return map;
    }, [manifests]);
    const studentViews = myStudents.map((s) => {
        const latest = latestManifestByStudent.get(s.id);
        const busCandidate = latest?.bus ?? s.bus ?? (typeof latest?.busId === "number" ? busesById.get(Number(latest.busId)) : undefined);
        const rawPlate = busCandidate?.plateNumber?.toString().trim() || "";
        const plateKey = rawPlate.replace(/\s+/g, "").toUpperCase();
        let lat = undefined;
        let lon = undefined;
        let readableLocation = "Location unavailable";
        let liveSource = "student";
        let lastSeen = undefined;
        let movementState = undefined;
        // Match device by plate
        let deviceMatch = busLocationsByPlate.get(plateKey);
        if (deviceMatch && deviceMatch.lat != null && deviceMatch.lng != null) {
            lat = Number(deviceMatch.lat);
            lon = Number(deviceMatch.lng);
            readableLocation = s.name; // show student name instead of plate
            liveSource = "device";
            lastSeen = deviceMatch.lastUpdate;
            movementState = deviceMatch.movementState ?? "unknown";
        }
        if ((!lat || !lon) && latest?.latitude != null && latest?.longitude != null) {
            lat = Number(latest.latitude);
            lon = Number(latest.longitude);
            readableLocation = latest?.bus?.route ?? latest?.bus?.name ?? "Manifest location";
            liveSource = "manifest";
            movementState = "unknown";
        }
        const driverName = busCandidate?.driver?.name ?? (busCandidate?.driverId ? usersById.get(Number(busCandidate.driverId))?.name : undefined) ?? "N/A";
        const assistantName = busCandidate?.assistant?.name ?? (busCandidate?.assistantId ? usersById.get(Number(busCandidate.assistantId))?.name : undefined) ?? "N/A";
        let status = "UNKNOWN";
        if (latest?.status) {
            const st = (latest.status ?? "").toString().toUpperCase();
            if (["CHECKED_IN", "ONBOARDED", "ONBOARD"].includes(st))
                status = "CHECKED_IN";
            else if (["CHECKED_OUT", "OFFBOARDED"].includes(st))
                status = "CHECKED_OUT";
        }
        else {
            if (latest?.boardingTime && !latest?.alightingTime)
                status = "CHECKED_IN";
            else if (latest?.alightingTime)
                status = "CHECKED_OUT";
        }
        return {
            student: s,
            manifest: latest,
            status,
            lat,
            lon,
            readableLocation,
            busName: busCandidate?.name ?? latest?.bus?.name ?? "No Bus Assigned",
            plate: rawPlate || "N/A",
            driver: driverName,
            assistant: assistantName,
            lastSeen,
            liveSource,
            movementState,
        };
    });
    const markersWithCoords = studentViews.filter((v) => v.lat != null &&
        v.lon != null &&
        v.lat >= -90 &&
        v.lat <= 90 &&
        v.lon >= -180 &&
        v.lon <= 180);
    const bounds = markersWithCoords.length
        ? L.latLngBounds(markersWithCoords.map((v) => [v.lat, v.lon]))
        : null;
    // Default to first student on mobile list when nothing is selected
    useEffect(() => {
        if (!selectedStudentId && studentViews.length > 0) {
            setSelectedStudentId(studentViews[0].student.id);
        }
    }, [selectedStudentId, studentViews]);
    const fmt = (iso) => {
        if (!iso)
            return "—";
        const d = new Date(iso);
        return isNaN(d.getTime()) ? iso : d.toLocaleString();
    };
    const vehiclesByPlate = useMemo(() => {
        const map = new Map();
        studentViews.forEach((sv) => {
            const plate = sv.plate || "UNKNOWN";
            if (!map.has(plate)) {
                map.set(plate, {
                    plateNumber: plate,
                    busName: sv.busName || "No Bus Assigned",
                    lat: sv.lat,
                    lng: sv.lon,
                    driver: sv.driver,
                    assistant: sv.assistant,
                    lastSeen: sv.lastSeen,
                    movementState: sv.movementState,
                    readableLocation: sv.readableLocation,
                    students: [],
                });
            }
            const vehicle = map.get(plate);
            vehicle.students.push(sv);
            // Use the most recent location if multiple students have different locations
            if (sv.lat && sv.lon && (!vehicle.lat || !vehicle.lng)) {
                vehicle.lat = sv.lat;
                vehicle.lng = sv.lon;
                vehicle.lastSeen = sv.lastSeen;
                vehicle.movementState = sv.movementState;
                vehicle.readableLocation = sv.readableLocation;
            }
        });
        return Array.from(map.values());
    }, [studentViews]);
    /* ---------------- Get selected vehicle ---------------- */
    const selectedVehicle = useMemo(() => {
        if (!selectedStudentId)
            return null;
        const selectedStudent = studentViews.find(sv => sv.student.id === selectedStudentId);
        if (!selectedStudent)
            return null;
        return vehiclesByPlate.find(v => v.plateNumber === selectedStudent.plate) || null;
    }, [selectedStudentId, studentViews, vehiclesByPlate]);
    const selectedStudentView = useMemo(() => {
        return studentViews.find((sv) => sv.student.id === selectedStudentId) ?? studentViews[0] ?? null;
    }, [selectedStudentId, studentViews]);
    const mobileMovementState = selectedVehicle?.movementState?.toLowerCase() || "unknown";
    const mobileIsMoving = mobileMovementState === "moving" || mobileMovementState === "driving";
    const primaryStudent = selectedVehicle?.students?.[0];
    /* ---------------- Vehicle markers for map ---------------- */
    const vehicleMarkers = vehiclesByPlate.filter((v) => v.lat != null &&
        v.lng != null &&
        v.lat >= -90 &&
        v.lat <= 90 &&
        v.lng >= -180 &&
        v.lng <= 180);
    const vehicleBounds = vehicleMarkers.length
        ? L.latLngBounds(vehicleMarkers.map((v) => [v.lat, v.lng]))
        : null;
    return (_jsxs("div", { className: "min-h-screen bg-muted/30 flex flex-col", children: [_jsx("header", { className: "bg-white border-b shadow-sm sticky top-0 z-30", children: _jsxs("div", { className: "max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 sm:gap-3", children: [_jsx("div", { className: "h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center", children: _jsx(Car, { className: "h-5 w-5 sm:h-6 sm:w-6 text-primary" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-lg sm:text-xl font-bold text-foreground", children: "Parent Portal" }), _jsx("p", { className: "text-[11px] sm:text-xs text-muted-foreground", children: "Live tracking & updates" })] })] }), _jsxs("div", { className: "flex items-center gap-2 sm:gap-3", children: [_jsxs("div", { className: "hidden sm:flex flex-col items-end leading-tight", children: [_jsx("span", { className: "text-sm font-semibold text-foreground", children: currentUser?.name ?? "Parent" }), _jsx("span", { className: "text-[11px] text-muted-foreground", children: "Welcome back" })] }), _jsxs(Avatar, { className: "h-9 w-9 border", children: [_jsx(AvatarImage, { src: "", alt: currentUser?.name ?? "Parent" }), _jsx(AvatarFallback, { className: "bg-primary/10 text-primary font-semibold", children: (currentUser?.name || "P").slice(0, 2).toUpperCase() })] }), _jsx("button", { onClick: handleLogout, className: "px-3 py-1.5 sm:px-4 sm:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm sm:text-base", children: "Logout" })] })] }) }), _jsxs("div", { className: "flex-1 flex flex-col lg:flex-row overflow-hidden", children: [_jsxs("main", { className: "flex-1 overflow-y-auto p-4 sm:p-6 pb-32 lg:pb-6 space-y-4 sm:space-y-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("h2", { className: "text-xl sm:text-2xl font-bold text-foreground", children: "My Children" }), _jsx("p", { className: "text-xs sm:text-sm text-muted-foreground", children: "Track your children's current vehicle status and live location. Select a child to focus the map and details." })] }), _jsxs("div", { className: "bg-card border rounded-lg shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-xs font-semibold text-foreground", children: "Select child" }), _jsx("p", { className: "text-xs text-muted-foreground", children: studentViews.length === 0
                                                    ? "No students found for your account."
                                                    : studentViews.length === 1
                                                        ? "Single child detected. Showing details."
                                                        : "Choose a child to focus the map and details." })] }), studentViews.length > 0 && (_jsxs(Select, { value: selectedStudentId?.toString() ?? "", onValueChange: (val) => {
                                            const id = Number(val);
                                            setSelectedStudentId(id);
                                            setShowMobileDetails(false);
                                        }, children: [_jsx(SelectTrigger, { className: "w-full sm:w-[280px] md:w-[320px]", children: _jsx(SelectValue, { placeholder: "Select child" }) }), _jsx(SelectContent, { className: "max-h-[240px]", children: studentViews.map((v) => {
                                                    const s = v.student;
                                                    const label = v.status === "CHECKED_IN"
                                                        ? "Boarded"
                                                        : v.status === "CHECKED_OUT"
                                                            ? "Checked Out"
                                                            : "Not Onboarded";
                                                    return (_jsxs(SelectItem, { value: s.id.toString(), children: [s.name, " \u2014 ", label] }, s.id));
                                                }) })] }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx("h2", { className: "text-lg sm:text-xl font-bold text-foreground", children: "Vehicle Locations" }), _jsx("div", { className: "h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg overflow-hidden shadow-lg border relative z-0", children: _jsxs(MapContainer, { center: [-1, 36], zoom: 4, style: { width: "100%", height: "100%", position: "relative", zIndex: 0 }, children: [_jsx(TileLayer, { attribution: '\u00A9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" }), _jsx(FitBounds, { bounds: vehicleBounds }), _jsx(FlyToLocation, { selectedVehicle: selectedVehicle || undefined }), vehicleMarkers.map((vehicle) => {
                                                    const isSelected = selectedVehicle?.plateNumber === vehicle.plateNumber;
                                                    const movementState = vehicle.movementState?.toLowerCase() || "unknown";
                                                    const isMoving = movementState === "moving" || movementState === "driving";
                                                    const markerProps = {
                                                        key: vehicle.plateNumber,
                                                        position: [Number(vehicle.lat), Number(vehicle.lng)],
                                                        icon: createBusIcon(vehicle, isSelected),
                                                        eventHandlers: {
                                                            click: () => {
                                                                // Find first student on this vehicle and select them
                                                                const firstStudent = vehicle.students[0];
                                                                if (firstStudent) {
                                                                    setSelectedStudentId(firstStudent.student.id);
                                                                    setShowMobileDetails(true);
                                                                }
                                                            },
                                                        },
                                                        zIndexOffset: isSelected ? 1000 : 100,
                                                    };
                                                    return (_jsx(Marker, { ...markerProps, children: _jsx(Popup, { maxWidth: 240, minWidth: 180, autoPan: true, autoPanPadding: [12, 12], closeButton: false, className: "shadow-md", children: _jsxs("div", { className: "w-[220px] max-w-[90vw] space-y-2 p-2", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-sm font-semibold text-foreground truncate", children: vehicle.busName }), _jsxs("div", { className: "text-[11px] text-muted-foreground truncate", children: ["Plate: ", vehicle.plateNumber] })] }), _jsxs("span", { className: `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium ${isMoving ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`, children: [_jsx("span", { className: `h-2 w-2 rounded-full ${isMoving ? "bg-green-500" : "bg-amber-500"}` }), isMoving ? "Moving" : "Stopped"] })] }), _jsx("div", { className: "text-[11px] text-muted-foreground leading-snug line-clamp-2", children: vehicle.readableLocation }), vehicle.students.length > 0 && (_jsxs("div", { className: "flex items-center gap-2 text-[11px] text-muted-foreground", children: [_jsx("span", { children: "Students" }), _jsx("span", { className: "font-semibold text-foreground", children: vehicle.students.length })] }))] }) }) }));
                                                })] }) })] })] }), _jsx("aside", { className: "hidden lg:block w-[400px] bg-card border-l shadow-lg p-6 overflow-y-auto", children: _jsxs("div", { className: "sticky top-6 space-y-4", children: [_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-bold text-foreground", children: "Details" }), _jsx("div", { className: "text-xs text-muted-foreground", children: selectedStudentView ? "Selected child" : "No child selected" })] }), selectedStudentView ? (_jsxs(Card, { className: "border shadow-sm", children: [_jsx(CardHeader, { className: "pb-2", children: _jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsx(CardTitle, { className: "text-base truncate", children: selectedStudentView.student.name }), _jsx(CardDescription, { className: "text-xs", children: selectedStudentView.student.grade ?? selectedStudentView.student.className ?? "Grade N/A" })] }), _jsx(Badge, { className: `text-white ${selectedStudentView.status === "CHECKED_IN"
                                                                    ? "bg-green-500"
                                                                    : selectedStudentView.status === "CHECKED_OUT"
                                                                        ? "bg-blue-500"
                                                                        : "bg-gray-500"}`, children: selectedStudentView.status === "CHECKED_IN"
                                                                    ? "Boarded"
                                                                    : selectedStudentView.status === "CHECKED_OUT"
                                                                        ? "Checked Out"
                                                                        : "Not Onboarded" })] }) }), _jsxs(CardContent, { className: "space-y-2 text-sm", children: [_jsxs("div", { className: "grid grid-cols-2 gap-2 text-xs text-muted-foreground", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold text-foreground text-sm", children: "Route / Bus" }), _jsx("p", { className: "truncate", children: selectedStudentView.busName })] }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold text-foreground text-sm", children: "Plate" }), _jsx("p", { className: "truncate", children: selectedStudentView.plate })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 text-xs", children: [_jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground", children: "Boarding" }), _jsx("p", { className: "font-medium", children: selectedStudentView.manifest?.boardingTime
                                                                                ? fmt(selectedStudentView.manifest?.boardingTime)
                                                                                : "—" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground", children: "Alighting" }), _jsx("p", { className: "font-medium", children: selectedStudentView.manifest?.alightingTime
                                                                                ? fmt(selectedStudentView.manifest?.alightingTime)
                                                                                : "—" })] })] })] })] })) : (_jsx(Card, { className: "border-dashed border text-center text-muted-foreground py-10", children: _jsx(CardContent, { children: "Select a child to view details" }) }))] }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold mb-2 text-foreground", children: "Vehicle Details" }), _jsx(VehicleDetailsCard, { vehicle: selectedVehicle, students: studentViews, parentId: parentUserId, variant: "full" })] })] }) }), selectedVehicle && (_jsxs("aside", { className: `fixed bottom-0 left-0 right-0 bg-muted/70 backdrop-blur-sm border-t shadow-2xl z-50 lg:hidden transition-all duration-300 ${showMobileDetails ? "max-h-[55vh]" : "h-[110px]"}`, children: [_jsxs("div", { className: "sticky top-0 bg-card px-3 py-2.5 flex items-center gap-3 border-b z-10", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h2", { className: "text-sm font-semibold text-foreground truncate", children: selectedVehicle.busName }), _jsxs("span", { className: `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${mobileIsMoving ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`, children: [_jsx("span", { className: `h-2 w-2 rounded-full ${mobileIsMoving ? "bg-green-500" : "bg-amber-500"}` }), mobileIsMoving ? "Moving" : "Stopped"] })] }), _jsxs("div", { className: "text-[11px] text-muted-foreground truncate", children: ["Plate: ", selectedVehicle.plateNumber ?? "N/A"] })] }), _jsxs(Button, { variant: "destructive", size: "sm", className: "shrink-0 px-3 h-9 text-xs font-semibold", onClick: triggerPanic, "aria-label": "Emergency", children: [_jsx(ShieldAlert, { className: "h-3.5 w-3.5 mr-2" }), "Emergency"] }), _jsx("button", { onClick: () => setShowMobileDetails((prev) => !prev), className: "p-2 rounded-full hover:bg-muted transition-colors shrink-0", "aria-label": showMobileDetails ? "Collapse details" : "Expand details", children: showMobileDetails ? _jsx(ChevronDown, { className: "h-4 w-4" }) : _jsx(ChevronUp, { className: "h-4 w-4" }) })] }), _jsx("div", { className: `transition-all duration-300 ${showMobileDetails ? "opacity-100 max-h-[46vh] pb-2" : "opacity-0 max-h-0 pointer-events-none"} overflow-y-auto`, children: _jsxs("div", { className: "p-3 space-y-3", children: [selectedStudentView && (_jsxs(Card, { className: "border shadow-sm", children: [_jsx(CardHeader, { className: "pb-2", children: _jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsx(CardTitle, { className: "text-sm font-semibold truncate", children: selectedStudentView.student.name }), _jsx(CardDescription, { className: "text-xs", children: selectedStudentView.student.grade ?? selectedStudentView.student.className ?? "Grade N/A" })] }), _jsx(Badge, { className: `text-white ${selectedStudentView.status === "CHECKED_IN"
                                                                    ? "bg-green-500"
                                                                    : selectedStudentView.status === "CHECKED_OUT"
                                                                        ? "bg-blue-500"
                                                                        : "bg-gray-500"}`, children: selectedStudentView.status === "CHECKED_IN"
                                                                    ? "Boarded"
                                                                    : selectedStudentView.status === "CHECKED_OUT"
                                                                        ? "Checked Out"
                                                                        : "Not Onboarded" })] }) }), _jsxs(CardContent, { className: "space-y-2 text-xs", children: [_jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground", children: "Route / Bus" }), _jsx("p", { className: "font-medium text-foreground truncate", children: selectedStudentView.busName })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground", children: "Plate" }), _jsx("p", { className: "font-medium text-foreground truncate", children: selectedStudentView.plate })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground", children: "Boarding" }), _jsx("p", { className: "font-medium", children: selectedStudentView.manifest?.boardingTime
                                                                                ? fmt(selectedStudentView.manifest?.boardingTime)
                                                                                : "—" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground", children: "Alighting" }), _jsx("p", { className: "font-medium", children: selectedStudentView.manifest?.alightingTime
                                                                                ? fmt(selectedStudentView.manifest?.alightingTime)
                                                                                : "—" })] })] })] })] })), _jsx(VehicleDetailsCard, { vehicle: selectedVehicle, students: studentViews, parentId: parentUserId, showPanicButton: false, panicTrigger: panicTriggerKey, variant: "sheet" })] }) })] }))] })] }));
}
