import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getManifests } from '@/lib/api';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Helper to reverse geocode lat/lon into readable location
const getLocationName = async (lat, lon) => {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        const data = await res.json();
        return data.display_name || 'Unknown location';
    }
    catch (error) {
        console.error('Geocoding error:', error);
        return 'Location unavailable';
    }
};
export default function Manifests() {
    const { data, isLoading } = useQuery({
        queryKey: ['manifests'],
        queryFn: getManifests,
    });
    // ✅ Ensure manifests is always an array
    const manifests = Array.isArray(data?.data) ? data.data : [];
    const [search, setSearch] = useState('');
    const [locations, setLocations] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;
    // Fetch readable location names for coordinates (with caching)
    useEffect(() => {
        const fetchLocations = async () => {
            const newLocations = { ...locations };
            for (const m of manifests) {
                if (m.latitude && m.longitude && !newLocations[m.id]) {
                    const locName = await getLocationName(m.latitude, m.longitude);
                    newLocations[m.id] = locName;
                }
            }
            setLocations(newLocations);
        };
        if (manifests.length > 0)
            fetchLocations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [manifests]);
    // Filter manifests based on search
    const filteredManifests = useMemo(() => {
        if (!search.trim())
            return manifests;
        const term = search.toLowerCase();
        return manifests.filter((m) => {
            const studentName = m.student?.name?.toLowerCase() || '';
            const assistantName = m.assistant?.name?.toLowerCase() || '';
            const busPlate = m.bus?.plateNumber?.toLowerCase() || '';
            return (studentName.includes(term) ||
                assistantName.includes(term) ||
                busPlate.includes(term));
        });
    }, [search, manifests]);
    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentManifests = filteredManifests.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredManifests.length / itemsPerPage);
    useEffect(() => {
        setCurrentPage(1);
    }, [search]);
    // Download manifests by bus as Excel
    const downloadByBus = () => {
        if (!filteredManifests.length) {
            alert('No manifests available to download.');
            return;
        }
        const grouped = filteredManifests.reduce((acc, m) => {
            const plate = m.bus?.plateNumber || m.busId || 'Unknown Bus';
            if (!acc[plate])
                acc[plate] = [];
            acc[plate].push(m);
            return acc;
        }, {});
        const wb = XLSX.utils.book_new();
        Object.keys(grouped).forEach((bus) => {
            const sheetData = grouped[bus].map((m) => ({
                ID: m.id,
                Student: m.student?.name || 'N/A',
                Assistant: m.assistant?.name || 'N/A',
                Bus: m.bus?.plateNumber || m.busId || 'N/A',
                Session: m.session || 'N/A', // ✅ Added session
                Status: m.status,
                Timestamp: m.date
                    ? new Date(m.date).toLocaleString()
                    : new Date(m.createdAt).toLocaleString(),
                Latitude: m.latitude,
                Longitude: m.longitude,
                Location: locations[m.id] || 'N/A',
            }));
            const ws = XLSX.utils.json_to_sheet(sheetData);
            XLSX.utils.book_append_sheet(wb, ws, bus.slice(0, 31));
        });
        XLSX.writeFile(wb, `Trip_Manifests_By_Bus.xlsx`);
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-3xl font-bold", children: "Trip Manifests" }), _jsx("p", { className: "text-muted-foreground mt-1", children: "View all student check-in and check-out records" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { placeholder: "Search by student, bus, or assistant...", value: search, onChange: (e) => setSearch(e.target.value), className: "w-64" }), _jsx(Button, { onClick: downloadByBus, children: "Download Excel" })] })] }), _jsx("div", { className: "bg-card rounded-lg border overflow-x-auto", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "ID" }), _jsx(TableHead, { children: "Student Name" }), _jsx(TableHead, { children: "Bus Plate" }), _jsx(TableHead, { children: "Assistant Name" }), _jsx(TableHead, { children: "Session" }), " ", _jsx(TableHead, { children: "Status" }), _jsx(TableHead, { children: "Timestamp" }), _jsx(TableHead, { children: "Location" })] }) }), _jsx(TableBody, { children: isLoading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 8, className: "text-center py-8", children: "Loading manifests..." }) })) : currentManifests.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 8, className: "text-center py-8", children: "No manifests found" }) })) : (currentManifests.map((m) => {
                                const timestamp = m.date || m.createdAt;
                                const formattedDate = timestamp
                                    ? new Date(timestamp).toLocaleString()
                                    : 'N/A';
                                return (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-medium", children: m.id }), _jsx(TableCell, { children: m.student?.name || 'N/A' }), _jsx(TableCell, { children: m.bus?.plateNumber || m.busId || 'N/A' }), _jsx(TableCell, { children: m.assistant?.name || 'N/A' }), _jsx(TableCell, { children: m.session || 'N/A' }), " ", _jsx(TableCell, { children: _jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${m.status === 'CHECKED_IN'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-yellow-100 text-yellow-700'}`, children: m.status }) }), _jsx(TableCell, { children: formattedDate }), _jsx(TableCell, { className: "text-xs", children: m.latitude && m.longitude ? (_jsxs("div", { children: [_jsxs("p", { children: [m.latitude.toFixed(4), ", ", m.longitude.toFixed(4)] }), _jsx("p", { className: "text-gray-500 text-xs", children: locations[m.id] || 'Loading location...' }), _jsx("a", { href: `https://www.google.com/maps?q=${m.latitude},${m.longitude}`, target: "_blank", rel: "noopener noreferrer", className: "text-blue-500 underline text-xs", children: "View on Map" })] })) : ('N/A') })] }, m.id));
                            })) })] }) }), _jsxs("div", { className: "flex justify-between items-center mt-4", children: [_jsxs("span", { className: "text-sm text-gray-600", children: ["Showing ", indexOfFirstItem + 1, "\u2013", Math.min(indexOfLastItem, filteredManifests.length), " of ", filteredManifests.length, " entries"] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: () => setCurrentPage((p) => Math.max(p - 1, 1)), disabled: currentPage === 1, children: "Previous" }), _jsxs("span", { className: "text-sm font-medium", children: ["Page ", currentPage, " of ", totalPages] }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => setCurrentPage((p) => Math.min(p + 1, totalPages)), disabled: currentPage === totalPages, children: "Next" })] })] })] }));
}
