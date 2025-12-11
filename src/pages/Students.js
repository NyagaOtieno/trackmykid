import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef } from "react";
import { Plus, Search, Upload, Download, FileSpreadsheet, X, CheckCircle2, AlertCircle, MapPin, Phone, School, Bus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import toast, { Toaster } from "react-hot-toast";
import AddStudentForm from "./AddStudentForm"; // ✅ Correct local import
const API_BASE = "https://schooltransport-production.up.railway.app/api";
export default function Students() {
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [open, setOpen] = useState(false);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [csvFile, setCsvFile] = useState(null);
    const [uploadResults, setUploadResults] = useState(null);
    const fileInputRef = useRef(null);
    // ✅ Fetch all data (students)
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get(`${API_BASE}/students`);
                const studentsData = res.data.data || [];
                setStudents(studentsData);
                setFilteredStudents(studentsData);
            }
            catch (err) {
                console.error("Error fetching students", err);
                toast.error("Failed to load students");
            }
            finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    // ✅ Search filter
    useEffect(() => {
        const lower = searchTerm.toLowerCase();
        const filtered = students.filter((s) => s.name.toLowerCase().includes(lower) ||
            s.parent?.user?.name?.toLowerCase().includes(lower));
        setFilteredStudents(filtered);
    }, [searchTerm, students]);
    // ✅ Handle refresh after adding student
    const handleStudentAdded = async () => {
        try {
            const res = await axios.get(`${API_BASE}/students`);
            const studentsData = res.data.data || [];
            setStudents(studentsData);
            setFilteredStudents(studentsData);
            setOpen(false);
        }
        catch (err) {
            console.error("Failed to refresh student list", err);
        }
    };
    // ✅ Download sample CSV
    const downloadSampleCSV = () => {
        const headers = [
            "name",
            "grade",
            "schoolId",
            "busId",
            "parentName",
            "parentPhone",
            "parentEmail",
            "parentPassword",
            "latitude",
            "longitude",
            "location"
        ];
        const sampleData = [
            [
                "John Doe",
                "Grade 5",
                "1",
                "1",
                "Jane Doe",
                "0712345678",
                "jane.doe@example.com",
                "SecurePass123!",
                "-1.286389",
                "36.817223",
                "Nairobi, Kenya"
            ],
            [
                "Mary Smith",
                "Grade 3",
                "1",
                "2",
                "John Smith",
                "0723456789",
                "john.smith@example.com",
                "SecurePass456!",
                "-1.2921",
                "36.8219",
                "Westlands, Nairobi"
            ]
        ];
        const csvContent = [
            headers.join(","),
            ...sampleData.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "students_sample.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Sample CSV downloaded!");
    };
    // ✅ Parse CSV file (handles quoted fields with commas)
    const parseCSV = (text) => {
        const lines = text.split("\n").filter(line => line.trim());
        if (lines.length < 2)
            throw new Error("CSV must have at least a header and one data row");
        // Parse CSV line handling quoted fields
        const parseLine = (line) => {
            const result = [];
            let current = "";
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const nextChar = line[i + 1];
                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        current += '"';
                        i++; // Skip next quote
                    }
                    else {
                        inQuotes = !inQuotes;
                    }
                }
                else if (char === "," && !inQuotes) {
                    result.push(current.trim());
                    current = "";
                }
                else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        };
        const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, ""));
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseLine(lines[i]).map(v => v.replace(/^"|"$/g, ""));
            if (values.length !== headers.length) {
                console.warn(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
                continue;
            }
            const row = {};
            headers.forEach((header, idx) => {
                row[header] = values[idx] || "";
            });
            rows.push(row);
        }
        return rows;
    };
    // ✅ Geocode location string
    const geocodeLocation = async (location) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`);
            const data = await res.json();
            if (data.length > 0) {
                return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            }
            return null;
        }
        catch {
            return null;
        }
    };
    // ✅ Handle bulk upload
    const handleBulkUpload = async () => {
        if (!csvFile) {
            toast.error("Please select a CSV file");
            return;
        }
        setBulkLoading(true);
        setUploadResults(null);
        try {
            const text = await csvFile.text();
            const rows = parseCSV(text);
            if (rows.length === 0) {
                throw new Error("No valid data rows found in CSV");
            }
            // Fetch schools and buses for validation
            const [schoolsRes, busesRes] = await Promise.all([
                axios.get(`${API_BASE}/schools`),
                axios.get(`${API_BASE}/buses`),
            ]);
            const schools = schoolsRes.data;
            const buses = busesRes.data;
            const results = { success: 0, failed: 0, errors: [] };
            // Process each row
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                try {
                    // Validate required fields
                    if (!row.name || !row.grade || !row.parentName || !row.parentPhone || !row.parentEmail || !row.parentPassword) {
                        throw new Error(`Row ${i + 2}: Missing required fields`);
                    }
                    // Get coordinates
                    let latitude;
                    let longitude;
                    if (row.latitude && row.longitude) {
                        latitude = parseFloat(row.latitude);
                        longitude = parseFloat(row.longitude);
                        if (isNaN(latitude) || isNaN(longitude)) {
                            throw new Error(`Row ${i + 2}: Invalid coordinates`);
                        }
                    }
                    else if (row.location) {
                        const coords = await geocodeLocation(row.location);
                        if (!coords) {
                            throw new Error(`Row ${i + 2}: Could not geocode location`);
                        }
                        latitude = coords.lat;
                        longitude = coords.lng;
                    }
                    else {
                        throw new Error(`Row ${i + 2}: Location or coordinates required`);
                    }
                    // Validate school and bus IDs
                    const schoolId = parseInt(row.schoolId);
                    const busId = parseInt(row.busId);
                    if (!schoolId || !schools.find((s) => s.id === schoolId)) {
                        throw new Error(`Row ${i + 2}: Invalid school ID`);
                    }
                    if (!busId || !buses.find((b) => b.id === busId)) {
                        throw new Error(`Row ${i + 2}: Invalid bus ID`);
                    }
                    // Create student
                    const payload = {
                        name: row.name,
                        grade: row.grade,
                        latitude,
                        longitude,
                        busId,
                        schoolId,
                        parentName: row.parentName,
                        parentPhone: row.parentPhone,
                        parentEmail: row.parentEmail,
                        parentPassword: row.parentPassword,
                    };
                    await axios.post(`${API_BASE}/students`, payload, {
                        headers: { "Content-Type": "application/json" },
                    });
                    results.success++;
                }
                catch (err) {
                    results.failed++;
                    results.errors.push(err.message || `Row ${i + 2}: Failed to process`);
                }
            }
            setUploadResults(results);
            if (results.success > 0) {
                toast.success(`Successfully added ${results.success} student(s)!`);
                // Refresh student list
                const res = await axios.get(`${API_BASE}/students`);
                const studentsData = res.data.data || [];
                setStudents(studentsData);
                setFilteredStudents(studentsData);
            }
            if (results.failed > 0) {
                toast.error(`${results.failed} student(s) failed to upload. Check errors below.`);
            }
        }
        catch (err) {
            console.error("Bulk upload error:", err);
            toast.error("Failed to process CSV: " + (err.message || "Unknown error"));
        }
        finally {
            setBulkLoading(false);
        }
    };
    if (loading)
        return (_jsx("div", { className: "p-4 flex items-center justify-center min-h-[400px]", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Loading students..." })] }) }));
    return (_jsxs("div", { className: "p-3 sm:p-4 lg:p-6", children: [_jsx(Toaster, { position: "top-right" }), _jsxs("div", { className: "flex flex-col gap-4 mb-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4", children: [_jsx("h2", { className: "text-2xl sm:text-3xl font-bold text-gray-900", children: "Students" }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-2 w-full sm:w-auto", children: [_jsxs(Button, { onClick: () => setBulkOpen(true), variant: "outline", className: "w-full sm:w-auto text-sm", size: "sm", children: [_jsx(Upload, { className: "mr-2 h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Bulk Add Students" }), _jsx("span", { className: "sm:hidden", children: "Bulk Add" })] }), _jsxs(Button, { onClick: () => setOpen(true), className: "w-full sm:w-auto text-sm", size: "sm", children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), " Add Student"] })] })] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" }), _jsx(Input, { placeholder: "Search by student or parent name...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "pl-10 w-full sm:max-w-sm h-10" })] })] }), _jsx("div", { className: "block md:hidden space-y-3", children: filteredStudents.length > 0 ? (filteredStudents.map((s, i) => (_jsx(Card, { className: "hover:shadow-md transition-shadow", children: _jsx(CardContent, { className: "p-4", children: _jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "flex items-start justify-between", children: _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsxs(Badge, { variant: "secondary", className: "text-xs", children: ["#", i + 1] }), _jsx("h3", { className: "font-semibold text-base text-gray-900", children: s.name })] }), _jsx(Badge, { variant: "outline", className: "mt-1 text-xs", children: s.grade })] }) }), _jsxs("div", { className: "grid grid-cols-1 gap-2 pt-2 border-t", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx(User, { className: "h-4 w-4 text-gray-400" }), _jsx("span", { className: "text-gray-600", children: "Parent:" }), _jsx("span", { className: "font-medium text-gray-900", children: s.parent?.user?.name || "N/A" })] }), _jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx(Phone, { className: "h-4 w-4 text-gray-400" }), _jsx("span", { className: "text-gray-600", children: "Phone:" }), _jsx("span", { className: "font-medium text-gray-900", children: s.parent?.user?.phone || "N/A" })] }), _jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx(Bus, { className: "h-4 w-4 text-gray-400" }), _jsx("span", { className: "text-gray-600", children: "Bus:" }), _jsx("span", { className: "font-medium text-gray-900", children: s.bus ? `${s.bus.name} (${s.bus.plateNumber})` : "-" })] }), _jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx(School, { className: "h-4 w-4 text-gray-400" }), _jsx("span", { className: "text-gray-600", children: "School:" }), _jsx("span", { className: "font-medium text-gray-900", children: s.school?.name || "-" })] }), _jsxs("div", { className: "flex items-start gap-2 text-sm pt-1", children: [_jsx(MapPin, { className: "h-4 w-4 text-gray-400 mt-0.5" }), _jsxs("div", { className: "flex-1", children: [_jsx("span", { className: "text-gray-600", children: "Location: " }), _jsxs("span", { className: "font-mono text-xs text-gray-700", children: [s.latitude?.toFixed(4), ", ", s.longitude?.toFixed(4)] })] })] })] })] }) }) }, s.id)))) : (_jsx(Card, { children: _jsx(CardContent, { className: "p-8 text-center", children: _jsx("p", { className: "text-gray-500", children: "No students found" }) }) })) }), _jsx("div", { className: "hidden md:block overflow-x-auto border rounded-lg shadow-sm", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { className: "w-12", children: "#" }), _jsx(TableHead, { children: "Student Name" }), _jsx(TableHead, { children: "Grade" }), _jsx(TableHead, { children: "Parent" }), _jsx(TableHead, { children: "Phone" }), _jsx(TableHead, { children: "Bus" }), _jsx(TableHead, { children: "School" }), _jsx(TableHead, { children: "Location" })] }) }), _jsx(TableBody, { children: filteredStudents.length > 0 ? (filteredStudents.map((s, i) => (_jsxs(TableRow, { className: "hover:bg-gray-50", children: [_jsx(TableCell, { className: "font-medium", children: i + 1 }), _jsx(TableCell, { className: "font-semibold", children: s.name }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", children: s.grade }) }), _jsx(TableCell, { children: s.parent?.user?.name || "N/A" }), _jsx(TableCell, { children: s.parent?.user?.phone || "N/A" }), _jsx(TableCell, { children: s.bus ? (_jsxs("span", { className: "text-sm", children: [s.bus.name, " ", _jsxs("span", { className: "text-gray-500", children: ["(", s.bus.plateNumber, ")"] })] })) : ("-") }), _jsx(TableCell, { children: s.school?.name || "-" }), _jsx(TableCell, { children: _jsxs("div", { className: "flex items-center gap-1 text-xs", children: [_jsx(MapPin, { className: "h-3 w-3 text-gray-400" }), _jsxs("span", { className: "font-mono", children: [s.latitude?.toFixed(4), ", ", s.longitude?.toFixed(4)] })] }) })] }, s.id)))) : (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 8, className: "text-center text-gray-500 py-8", children: "No students found" }) })) })] }) }), _jsx(Dialog, { open: open, onOpenChange: setOpen, children: _jsxs(DialogContent, { className: "sm:max-w-6xl lg:max-w-7xl max-w-[95vw] h-[95vh] sm:h-[95vh] max-h-[95vh] p-0 gap-0 flex flex-col overflow-hidden", children: [_jsxs(DialogHeader, { className: "px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8 pb-3 sm:pb-4 border-b bg-gradient-to-r from-gray-50 to-white flex-shrink-0", children: [_jsx(DialogTitle, { className: "text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900", children: "Add New Student" }), _jsx(DialogDescription, { className: "text-xs sm:text-sm lg:text-base text-gray-600 mt-1 sm:mt-2", children: "Fill out the student details and select a pickup location on the map below." })] }), _jsx("div", { className: "flex-1 overflow-hidden px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8 pt-3 sm:pt-4", children: _jsx(AddStudentForm, { onSuccess: handleStudentAdded }) })] }) }), _jsx(Dialog, { open: bulkOpen, onOpenChange: setBulkOpen, children: _jsxs(DialogContent, { className: "sm:max-w-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "text-xl sm:text-2xl font-semibold flex items-center gap-2", children: [_jsx(FileSpreadsheet, { className: "h-5 w-5 sm:h-6 sm:w-6" }), "Bulk Add Students"] }), _jsx(DialogDescription, { className: "text-sm", children: "Upload a CSV file to add multiple students at once. Download the sample file to see the required format." })] }), _jsxs("div", { className: "space-y-4 py-4", children: [_jsxs("div", { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200", children: [_jsxs("div", { className: "flex items-start sm:items-center gap-3 flex-1", children: [_jsx(Download, { className: "h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5 sm:mt-0" }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-sm text-blue-900", children: "Need a template?" }), _jsx("p", { className: "text-xs text-blue-700", children: "Download our sample CSV file with all required fields" })] })] }), _jsxs(Button, { onClick: downloadSampleCSV, variant: "outline", size: "sm", className: "border-blue-300 text-blue-700 hover:bg-blue-100 w-full sm:w-auto", children: [_jsx(Download, { className: "mr-2 h-4 w-4" }), "Download Sample"] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "csv-upload", className: "text-sm font-medium", children: "Select CSV File" }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Input, { id: "csv-upload", ref: fileInputRef, type: "file", accept: ".csv", onChange: (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            setCsvFile(file);
                                                            setUploadResults(null);
                                                        }
                                                    }, className: "flex-1" }), csvFile && (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => {
                                                        setCsvFile(null);
                                                        setUploadResults(null);
                                                        if (fileInputRef.current)
                                                            fileInputRef.current.value = "";
                                                    }, children: _jsx(X, { className: "h-4 w-4" }) }))] }), csvFile && (_jsxs("p", { className: "text-sm text-muted-foreground flex items-center gap-2", children: [_jsx(FileSpreadsheet, { className: "h-4 w-4" }), csvFile.name, " (", (csvFile.size / 1024).toFixed(2), " KB)"] }))] }), uploadResults && (_jsx(Alert, { className: uploadResults.failed === 0 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50", children: _jsxs("div", { className: "flex items-start gap-3", children: [uploadResults.failed === 0 ? (_jsx(CheckCircle2, { className: "h-5 w-5 text-green-600 mt-0.5" })) : (_jsx(AlertCircle, { className: "h-5 w-5 text-yellow-600 mt-0.5" })), _jsx("div", { className: "flex-1", children: _jsx(AlertDescription, { children: _jsxs("div", { className: "space-y-2", children: [_jsxs("p", { className: "font-medium", children: [uploadResults.success, " student(s) added successfully", uploadResults.failed > 0 && `, ${uploadResults.failed} failed`] }), uploadResults.errors.length > 0 && (_jsx(ScrollArea, { className: "max-h-32 mt-2", children: _jsxs("ul", { className: "text-xs space-y-1 list-disc list-inside", children: [uploadResults.errors.slice(0, 10).map((error, idx) => (_jsx("li", { className: "text-red-700", children: error }, idx))), uploadResults.errors.length > 10 && (_jsxs("li", { className: "text-muted-foreground", children: ["... and ", uploadResults.errors.length - 10, " more errors"] }))] }) }))] }) }) })] }) })), _jsxs("div", { className: "p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200", children: [_jsx("p", { className: "text-xs font-medium text-gray-700 mb-2", children: "Required CSV Fields:" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 text-xs text-gray-600", children: [_jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-gray-400", children: "\u2022" }), " name"] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-gray-400", children: "\u2022" }), " grade"] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-gray-400", children: "\u2022" }), " schoolId"] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-gray-400", children: "\u2022" }), " busId"] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-gray-400", children: "\u2022" }), " parentName"] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-gray-400", children: "\u2022" }), " parentPhone"] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-gray-400", children: "\u2022" }), " parentEmail"] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-gray-400", children: "\u2022" }), " parentPassword"] }), _jsxs("span", { className: "flex items-center gap-1 sm:col-span-2 lg:col-span-1", children: [_jsx("span", { className: "text-gray-400", children: "\u2022" }), " latitude/longitude OR location"] })] })] })] }), _jsxs(DialogFooter, { className: "flex-col sm:flex-row gap-2", children: [_jsx(Button, { variant: "outline", onClick: () => {
                                        setBulkOpen(false);
                                        setCsvFile(null);
                                        setUploadResults(null);
                                        if (fileInputRef.current)
                                            fileInputRef.current.value = "";
                                    }, disabled: bulkLoading, className: "w-full sm:w-auto", children: "Cancel" }), _jsx(Button, { onClick: handleBulkUpload, disabled: !csvFile || bulkLoading, className: "w-full sm:w-auto", children: bulkLoading ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "mr-2", children: "\u23F3" }), "Processing..."] })) : (_jsxs(_Fragment, { children: [_jsx(Upload, { className: "mr-2 h-4 w-4" }), "Upload & Process"] })) })] })] }) })] }));
}
