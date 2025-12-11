import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
const busIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});
export default function DriverPortal() {
    const navigate = useNavigate();
    const [driver, setDriver] = useState(null);
    const [bus, setBus] = useState(null);
    const [manifest, setManifest] = useState([]);
    const [location, setLocation] = useState(null);
    // ------------------------------
    //  FETCH USERS
    // ------------------------------
    const { data: usersData, isLoading: usersLoading } = useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            const res = await axios.get("https://schooltransport-production.up.railway.app/api/users");
            return res.data;
        },
    });
    // ------------------------------
    //  FETCH BUSES
    // ------------------------------
    const { data: busesData, isLoading: busesLoading } = useQuery({
        queryKey: ["buses"],
        queryFn: async () => {
            const res = await axios.get("https://schooltransport-production.up.railway.app/api/buses");
            return res.data;
        },
    });
    // ------------------------------
    //  FETCH MANIFESTS
    // ------------------------------
    const { data: manifestsData, isLoading: manifestsLoading } = useQuery({
        queryKey: ["manifests"],
        queryFn: async () => {
            const res = await axios.get("https://schooltransport-production.up.railway.app/api/manifests");
            return res.data;
        },
    });
    // ------------------------------
    //  FETCH LIVE LOCATION (Loc8 API)
    // ------------------------------
    const { data: loc8Data, isLoading: loc8Loading } = useQuery({
        queryKey: ["loc8"],
        queryFn: async () => {
            const res = await axios.get("https://myfleet.track-loc8.com/api/v1/unit.json?key=44e824d4f70647af1bb9a314b4de7e73951c8ad6");
            return res.data;
        },
        refetchInterval: 15000, // refresh every 15s
    });
    // ------------------------------
    //  ASSIGN DRIVER FROM SESSION
    // ------------------------------
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        if (!storedUser?.id || !Array.isArray(usersData))
            return;
        const foundDriver = usersData.find((u) => u.id === storedUser.id);
        if (foundDriver)
            setDriver(foundDriver);
    }, [usersData]);
    // ------------------------------
    //  ASSIGN DRIVER’S BUS
    // ------------------------------
    useEffect(() => {
        if (!driver || !Array.isArray(busesData))
            return;
        const assignedBus = busesData.find((b) => b.driverId === driver.id);
        setBus(assignedBus || null);
    }, [driver, busesData]);
    // ------------------------------
    //  FILTER MANIFEST FOR DRIVER’S BUS
    // ------------------------------
    useEffect(() => {
        if (!bus || !Array.isArray(manifestsData))
            return;
        const filtered = manifestsData.filter((m) => m.busId === bus.id);
        setManifest(filtered);
    }, [bus, manifestsData]);
    // ------------------------------
    //  DETERMINE BUS LOCATION
    // ------------------------------
    useEffect(() => {
        if (!bus || !Array.isArray(loc8Data?.units))
            return;
        const matchedUnit = loc8Data.units.find((u) => u.name?.toLowerCase() === bus.plateNumber?.toLowerCase() ||
            u.registration?.toLowerCase() === bus.plateNumber?.toLowerCase());
        if (matchedUnit) {
            setLocation({
                lat: matchedUnit.latitude,
                lng: matchedUnit.longitude,
                status: matchedUnit.status,
            });
        }
        else {
            setLocation(null);
        }
    }, [bus, loc8Data]);
    // ------------------------------
    //  LOGOUT FUNCTION
    // ------------------------------
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("isAuthenticated");
        toast.success("Logged out successfully!");
        navigate("/");
    };
    // ------------------------------
    //  LOADING STATES
    // ------------------------------
    if (usersLoading || busesLoading || manifestsLoading || loc8Loading)
        return (_jsx("div", { className: "flex justify-center items-center h-screen text-lg", children: "Loading driver portal..." }));
    const center = location
        ? [location.lat, location.lng]
        : [-1.2921, 36.8219]; // fallback Nairobi
    return (_jsx("div", { className: "min-h-screen bg-muted/30 p-6", children: _jsxs("div", { className: "max-w-7xl mx-auto space-y-6", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold", children: "Driver Portal" }), _jsxs("p", { className: "text-muted-foreground mt-1", children: [driver?.fullName || "Driver", " \u2014", " ", bus?.plateNumber || "No Vehicle Assigned"] })] }), _jsx(Button, { variant: "destructive", onClick: handleLogout, children: "Logout" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "My Bus" }) }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "font-semibold", children: bus?.name || "Not Assigned" }), _jsx("p", { className: "text-sm text-muted-foreground", children: bus?.plateNumber || "N/A" }), _jsxs("p", { className: "text-sm", children: ["Route: ", bus?.route || "N/A"] })] }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Students Onboard" }) }), _jsxs(CardContent, { children: [_jsx("p", { className: "text-3xl font-bold", children: manifest.reduce((acc, m) => acc + (Array.isArray(m.students) ? m.students.length : 0), 0) }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Total students onboarded" })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Bus Status" }) }), _jsx(CardContent, { children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: `h-3 w-3 rounded-full ${location?.status === "Active" ? "bg-green-500" : "bg-gray-400"} animate-pulse` }), _jsx("span", { className: "text-sm font-medium", children: location?.status || "Inactive" })] }) })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Route Map" }) }), _jsx(CardContent, { className: "h-[400px]", children: _jsxs(MapContainer, { center: center, zoom: 13, style: { height: "100%", width: "100%" }, children: [_jsx(TileLayer, { attribution: '\u00A9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" }), location && (_jsx(Marker, { position: [location.lat, location.lng], icon: busIcon, children: _jsx(Popup, { children: _jsxs("div", { className: "p-2", children: [_jsx("h3", { className: "font-bold", children: bus?.plateNumber }), _jsxs("p", { className: "text-sm", children: ["Status: ", location.status || "Unknown"] })] }) }) }))] }, "driver-map") })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Student Manifest" }) }), _jsx(CardContent, { children: manifest.length === 0 ? (_jsx("p", { className: "text-center text-muted-foreground py-8", children: "No manifest found for your bus." })) : (manifest.map((m, i) => (_jsxs("div", { className: "p-4 bg-muted rounded-lg mb-3 space-y-2", children: [_jsxs("p", { className: "font-semibold", children: ["Trip: ", m.session || "N/A"] }), _jsxs("p", { className: "text-sm text-muted-foreground", children: ["Students onboard: ", Array.isArray(m.students) ? m.students.length : 0] }), Array.isArray(m.students) &&
                                        m.students.slice(0, 5).map((s, idx) => (_jsxs("div", { className: "flex justify-between items-center p-2 border-b text-sm", children: [_jsx("span", { children: s.name }), _jsx("span", { className: "text-muted-foreground", children: s.status || "Pending" })] }, idx)))] }, i)))) })] })] }) }));
}
