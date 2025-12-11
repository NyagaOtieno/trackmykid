import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bus, Car, User, UserCog, MapPin, Gauge, Navigation, Clock, AlertCircle, Search } from "lucide-react";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { createBusIcon } from "@/utils/vehicleIcon";
// ---------------- Fly to selected vehicle ----------------
function FlyToLocation({ selectedVehicle }) {
    const map = useMap();
    useEffect(() => {
        if (selectedVehicle?.lat != null && selectedVehicle?.lng != null) {
            map.flyTo([selectedVehicle.lat, selectedVehicle.lng], 15, { animate: true });
        }
    }, [selectedVehicle, map]);
    return null;
}
// ---------------- Persistent Marker with Popup ----------------
function PersistentMarker({ bus, isSelected, onSelect }) {
    const markerRef = useRef(null);
    useEffect(() => {
        if (markerRef.current) {
            if (isSelected) {
                markerRef.current.openPopup();
            }
            else {
                markerRef.current.closePopup();
            }
        }
    }, [isSelected]);
    return (_jsx(Marker, { ref: markerRef, position: [bus.lat, bus.lng], icon: createBusIcon(bus, isSelected), eventHandlers: {
            click: () => {
                onSelect();
            }
        }, zIndexOffset: isSelected ? 1000 : 100, children: _jsx(Popup, { maxWidth: 200, className: "custom-popup", closeButton: false, autoPan: true, autoPanPadding: [80, 50], offset: [0, -40], children: _jsx(CompactVehicleCard, { vehicle: bus }) }) }));
}
// ---------------- Compact Popup Card (for map) ----------------
function CompactVehicleCard({ vehicle }) {
    const isFallback = vehicle.__fallback === true;
    const isStanding = vehicle.movementState?.toLowerCase() === "standing";
    const statusColor = isFallback
        ? "bg-gray-500"
        : isStanding
            ? "bg-blue-500"
            : "bg-green-500";
    const statusText = isFallback
        ? "No GPS"
        : isStanding
            ? "Standing"
            : "Moving";
    return (_jsxs("div", { className: "w-48 p-2 bg-white rounded-lg shadow-lg border-2", children: [_jsxs("div", { className: `${statusColor} text-white rounded-t px-2 py-1.5 -m-2 mb-1.5 flex items-center justify-between`, children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(Bus, { className: "h-3.5 w-3.5" }), _jsx("span", { className: "font-bold text-xs", children: vehicle.plateNumber })] }), _jsx("span", { className: "text-[10px] font-semibold", children: statusText })] }), _jsxs("div", { className: "space-y-1.5 text-[11px]", children: [vehicle.busId && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "ID:" }), _jsx("span", { className: "font-medium", children: vehicle.busId })] })), vehicle.speed !== undefined && (_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-muted-foreground", children: "Speed:" }), _jsxs("span", { className: "font-medium flex items-center gap-1", children: [_jsx(Gauge, { className: "h-3 w-3" }), vehicle.speed, " km/h"] })] })), vehicle.driver?.name && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Driver:" }), _jsx("span", { className: "font-medium truncate ml-1 max-w-[100px]", children: vehicle.driver.name })] }))] })] }));
}
// ---------------- Vehicle Details Card Component (Full - for side panel) ----------------
function VehicleDetailsCard({ vehicle }) {
    const isFallback = vehicle.__fallback === true;
    const isStanding = vehicle.movementState?.toLowerCase() === "standing";
    const statusColor = isFallback
        ? "bg-gray-500"
        : isStanding
            ? "bg-blue-500"
            : "bg-green-500";
    const statusText = isFallback
        ? "No GPS Signal"
        : isStanding
            ? "Standing"
            : "Moving";
    return (_jsxs(Card, { className: "w-full max-w-md border-2 shadow-lg", children: [_jsx(CardHeader, { className: `${statusColor} text-white rounded-t-lg`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs(CardTitle, { className: "text-xl font-bold flex items-center gap-2", children: [_jsx(Bus, { className: "h-6 w-6" }), vehicle.plateNumber] }), _jsx("div", { className: `px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm`, children: statusText })] }) }), _jsxs(CardContent, { className: "p-6 space-y-4", children: [_jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "font-semibold text-lg border-b pb-2", children: "Registration Details" }), vehicle.busId && (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 bg-primary/10 rounded-lg", children: _jsx(Bus, { className: "h-4 w-4 text-primary" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Bus ID" }), _jsx("p", { className: "font-medium", children: vehicle.busId })] })] })), vehicle.plateNumber && (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 bg-primary/10 rounded-lg", children: _jsx(Navigation, { className: "h-4 w-4 text-primary" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Plate Number" }), _jsx("p", { className: "font-medium text-lg", children: vehicle.plateNumber })] })] })), vehicle.bus?.name && (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 bg-primary/10 rounded-lg", children: _jsx(Bus, { className: "h-4 w-4 text-primary" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Bus Name" }), _jsx("p", { className: "font-medium", children: vehicle.bus.name })] })] })), vehicle.bus?.route && (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 bg-primary/10 rounded-lg", children: _jsx(MapPin, { className: "h-4 w-4 text-primary" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Route" }), _jsx("p", { className: "font-medium", children: vehicle.bus.route })] })] }))] }), _jsxs("div", { className: "space-y-3 pt-3 border-t", children: [_jsx("h3", { className: "font-semibold text-lg border-b pb-2", children: "Location Information" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Latitude" }), _jsx("p", { className: "font-medium", children: vehicle.lat?.toFixed(6) || "N/A" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Longitude" }), _jsx("p", { className: "font-medium", children: vehicle.lng?.toFixed(6) || "N/A" })] })] }), vehicle.speed !== undefined && (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 bg-primary/10 rounded-lg", children: _jsx(Gauge, { className: "h-4 w-4 text-primary" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Speed" }), _jsxs("p", { className: "font-medium", children: [vehicle.speed, " km/h"] })] })] })), vehicle.direction !== undefined && (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 bg-primary/10 rounded-lg", children: _jsx(Navigation, { className: "h-4 w-4 text-primary", style: { transform: `rotate(${vehicle.direction}deg)` } }) }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Direction" }), _jsxs("p", { className: "font-medium", children: [vehicle.direction, "\u00B0"] })] })] }))] }), _jsxs("div", { className: "space-y-3 pt-3 border-t", children: [_jsx("h3", { className: "font-semibold text-lg border-b pb-2", children: "Personnel" }), vehicle.driver?.name && (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 bg-primary/10 rounded-lg", children: _jsx(User, { className: "h-4 w-4 text-primary" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Driver" }), _jsx("p", { className: "font-medium", children: vehicle.driver.name }), vehicle.driver.phone && (_jsx("p", { className: "text-xs text-muted-foreground", children: vehicle.driver.phone }))] })] })), vehicle.assistant?.name && (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 bg-primary/10 rounded-lg", children: _jsx(UserCog, { className: "h-4 w-4 text-primary" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Assistant" }), _jsx("p", { className: "font-medium", children: vehicle.assistant.name }), vehicle.assistant.phone && (_jsx("p", { className: "text-xs text-muted-foreground", children: vehicle.assistant.phone }))] })] }))] }), isFallback && (_jsx("div", { className: "pt-3 border-t", children: _jsxs("div", { className: "flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg", children: [_jsx(AlertCircle, { className: "h-5 w-5 text-yellow-600 dark:text-yellow-400" }), _jsx("p", { className: "text-sm text-yellow-800 dark:text-yellow-200", children: "GPS signal unavailable. Showing default location." })] }) }))] })] }));
}
// ---------------- Coordinate Normalizer ----------------
function normalizeCoordinates(v) {
    let lat = v.lat !== null ? Number(v.lat) : null;
    let lng = v.lng !== null ? Number(v.lng) : null;
    let fallback = false;
    // Case: Missing GPS
    if (lat === null || lng === null) {
        return { ...v, lat: -1.2921, lng: 36.8219, __fallback: true };
    }
    // Case: Swapped (36.x, -1.x)
    if (lat > 5 && lng < 5) {
        [lat, lng] = [lng, lat];
    }
    // Teltonika case: sends huge numbers sometimes → drop them
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        fallback = true;
        lat = -1.2921;
        lng = 36.8219;
    }
    // Kenya bounds check
    const kenyaLat = lat > -5 && lat < 5;
    const kenyaLng = lng > 34 && lng < 42;
    if (!kenyaLat || !kenyaLng) {
        fallback = true;
        lat = -1.2921;
        lng = 36.8219;
    }
    return {
        ...v,
        lat,
        lng,
        __fallback: fallback,
        direction: Number(v.direction || 0),
        speed: Number(v.speed || 0),
    };
}
// ---------------- Fetch and Fix Bus Coordinates ----------------
async function getBuses() {
    try {
        const token = sessionStorage.getItem("token");
        const response = await axios.get("https://schooltransport-production.up.railway.app/api/tracking/bus-locations", { headers: { Authorization: `Bearer ${token}` } });
        const buses = response.data?.data || [];
        return buses.map((v) => normalizeCoordinates(v));
    }
    catch (e) {
        console.error("Error fetching buses:", e);
        return [];
    }
}
// ---------------- Main Component ----------------
export default function Tracking() {
    const { data: buses = [], isLoading, refetch } = useQuery({
        queryKey: ["buses"],
        queryFn: getBuses,
        refetchInterval: 5000,
    });
    const [search, setSearch] = useState("");
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const totalVehicles = buses.length;
    const liveVehicles = buses.filter((v) => !v.__fallback).length;
    const standingVehicles = buses.filter((v) => v.movementState?.toLowerCase() === "standing").length;
    const selectedLabel = selectedVehicle?.plateNumber ?? "None selected";
    const filteredLocations = useMemo(() => {
        return buses.filter((v) => v.plateNumber?.toLowerCase().includes(search.toLowerCase()));
    }, [buses, search]);
    // Default center to Nairobi (no auto-selection)
    const center = [-1.2921, 36.8219];
    if (isLoading)
        return _jsx("div", { className: "flex items-center justify-center h-[600px]", children: "Loading map..." });
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "h-11 w-11 rounded-full bg-primary/10 text-primary grid place-items-center", children: _jsx(Car, { className: "h-5 w-5" }) }), _jsxs("div", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl sm:text-3xl font-bold", children: "Live Vehicle Tracking" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Real-time visibility across your fleet with quick filters and details." })] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 text-sm text-muted-foreground", children: [_jsxs("div", { className: "flex items-center gap-2 rounded-full border px-3 py-1.5 bg-card", children: [_jsx(Clock, { className: "h-4 w-4" }), _jsx("span", { className: "font-medium", children: "Last update" }), _jsx("span", { className: "text-foreground", children: new Date().toLocaleTimeString() })] }), _jsx(Button, { variant: "outline", onClick: () => refetch(), children: "Refresh" })] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3", children: [_jsx(Card, { className: "border-muted shadow-sm", children: _jsxs(CardContent, { className: "p-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-muted-foreground", children: "Fleet size" }), _jsx("p", { className: "text-2xl font-bold", children: totalVehicles })] }), _jsx("div", { className: "h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center", children: _jsx(Car, { className: "h-5 w-5" }) })] }) }), _jsx(Card, { className: "border-muted shadow-sm", children: _jsxs(CardContent, { className: "p-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-muted-foreground", children: "Live GPS" }), _jsx("p", { className: "text-2xl font-bold", children: liveVehicles })] }), _jsx("div", { className: "h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center dark:bg-emerald-950/40 dark:text-emerald-300", children: _jsx(Navigation, { className: "h-5 w-5" }) })] }) }), _jsx(Card, { className: "border-muted shadow-sm", children: _jsxs(CardContent, { className: "p-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-muted-foreground", children: "Standing" }), _jsx("p", { className: "text-2xl font-bold", children: standingVehicles })] }), _jsx("div", { className: "h-10 w-10 rounded-full bg-blue-50 text-blue-600 grid place-items-center dark:bg-blue-950/40 dark:text-blue-300", children: _jsx(Gauge, { className: "h-5 w-5" }) })] }) }), _jsx(Card, { className: "border-muted shadow-sm", children: _jsxs(CardContent, { className: "p-4 flex items-center justify-between", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-muted-foreground", children: "Selected" }), _jsx("p", { className: "text-sm font-semibold truncate max-w-[180px]", children: selectedLabel })] }), _jsx("div", { className: "h-10 w-10 rounded-full bg-muted text-foreground grid place-items-center", children: _jsx(Bus, { className: "h-5 w-5" }) })] }) })] }), _jsx(Card, { className: "border-muted shadow-sm", children: _jsxs(CardContent, { className: "p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { className: "w-full sm:max-w-md relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Search by plate number...", value: search, onChange: (e) => setSearch(e.target.value), className: "pl-10" })] }), _jsx("div", { className: "flex items-center gap-2", children: _jsx(Button, { variant: "outline", onClick: () => refetch(), children: "Refresh data" }) })] }) }), _jsxs("div", { className: "grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6", children: [_jsxs(Card, { className: "overflow-hidden border-muted shadow-sm", children: [_jsxs(CardHeader, { className: "flex flex-col gap-1", children: [_jsx(CardTitle, { className: "text-lg", children: "Live map" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Tap a vehicle to view quick details and center the map." })] }), _jsx(CardContent, { className: "p-0", children: _jsx("div", { className: "h-[420px] sm:h-[520px] xl:h-[620px]", children: _jsxs(MapContainer, { center: center, zoom: 12, className: "h-full w-full", zoomControl: true, children: [_jsx(TileLayer, { attribution: '\u00A9 OpenStreetMap contributors', url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" }), filteredLocations.map((bus) => {
                                                const isSelected = selectedVehicle?.busId === bus.busId;
                                                return (_jsx(PersistentMarker, { bus: bus, isSelected: isSelected, onSelect: () => setSelectedVehicle(bus) }, bus.busId));
                                            }), _jsx(FlyToLocation, { selectedVehicle: selectedVehicle })] }) }) })] }), _jsx("div", { className: "space-y-4", children: selectedVehicle ? (_jsx("div", { className: "sticky top-4", children: _jsx(VehicleDetailsCard, { vehicle: selectedVehicle }) })) : (_jsx(Card, { className: "h-full min-h-[240px] flex items-center justify-center border-muted shadow-sm", children: _jsxs(CardContent, { className: "text-center text-muted-foreground space-y-3", children: [_jsx(Bus, { className: "h-10 w-10 mx-auto opacity-70" }), _jsx("p", { className: "font-medium", children: "Select a vehicle to view trip details." })] }) })) })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between flex-wrap gap-2", children: [_jsxs("h3", { className: "text-xl font-semibold", children: ["All Vehicles (", filteredLocations.length, ")"] }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Tap to focus and see driver details." })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4", children: filteredLocations.map((bus) => (_jsx(Card, { className: `cursor-pointer transition-all border-muted shadow-sm hover:-translate-y-0.5 hover:shadow-md ${selectedVehicle?.busId === bus.busId ? "border-primary ring-1 ring-primary/20" : ""}`, onClick: () => setSelectedVehicle(bus), children: _jsx(CardContent, { className: "p-4 space-y-2", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Bus, { className: "h-5 w-5 text-primary" }), _jsx("h3", { className: "font-semibold text-lg", children: bus.plateNumber })] }), bus.bus?.route && (_jsxs("div", { className: "flex items-center gap-2 text-sm text-muted-foreground", children: [_jsx(MapPin, { className: "h-4 w-4" }), _jsx("p", { className: "truncate max-w-[220px]", children: bus.bus.route })] })), bus.driver?.name && (_jsxs("div", { className: "flex items-center gap-2 text-sm text-muted-foreground", children: [_jsx(User, { className: "h-4 w-4" }), _jsx("p", { children: bus.driver.name })] }))] }), _jsxs("div", { className: "flex flex-col items-end gap-1", children: [_jsx("div", { className: `h-5 w-5 rounded-full ${bus.__fallback
                                                        ? "bg-gray-400"
                                                        : bus.movementState?.toLowerCase() === "standing"
                                                            ? "bg-blue-500"
                                                            : "bg-green-500"}`, title: bus.__fallback
                                                        ? "No GPS"
                                                        : bus.movementState?.toLowerCase() === "standing"
                                                            ? "Standing"
                                                            : "Moving" }), bus.speed !== undefined && (_jsxs("div", { className: "text-xs text-muted-foreground", children: [_jsx(Gauge, { className: "h-3 w-3 inline mr-1" }), bus.speed, " km/h"] }))] })] }) }) }, bus.busId))) })] })] }));
}
