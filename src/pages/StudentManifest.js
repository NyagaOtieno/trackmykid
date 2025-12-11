import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
const fetchStudents = async () => {
    const res = await axios.get("https://schooltransport-production.up.railway.app/api/students");
    return res.data.data;
};
const fetchManifests = async () => {
    const res = await axios.get("https://schooltransport-production.up.railway.app/api/manifests");
    return res.data;
};
export default function StudentManifest() {
    const { data: students = [], isLoading: studentsLoading } = useQuery({
        queryKey: ["students"],
        queryFn: fetchStudents,
        refetchInterval: 10000, // refresh every 10 seconds
    });
    const { data: manifests = [], isLoading: manifestsLoading } = useQuery({
        queryKey: ["manifests"],
        queryFn: fetchManifests,
        refetchInterval: 10000,
    });
    if (studentsLoading || manifestsLoading)
        return _jsx("div", { children: "Loading..." });
    // Compute checked-in and checked-out counts
    const checkedInIds = manifests.filter(m => m.status === "CHECKED_IN").map(m => m.studentId);
    const checkedOutIds = manifests.filter(m => m.status === "CHECKED_OUT").map(m => m.studentId);
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex gap-4", children: [_jsxs(Badge, { children: ["Total Students: ", students.length] }), _jsxs(Badge, { className: "bg-green-600 text-white hover:bg-green-700", children: ["Checked In: ", checkedInIds.length] }), _jsxs(Badge, { variant: "destructive", children: ["Checked Out: ", checkedOutIds.length] })] }), _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Name" }), _jsx(TableHead, { children: "Grade" }), _jsx(TableHead, { children: "Status" })] }) }), _jsx(TableBody, { children: students.map(student => {
                            const latestManifest = manifests
                                .filter(m => m.studentId === student.id)
                                .sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime())[0];
                            const status = latestManifest?.status || "NOT_CHECKED";
                            return (_jsxs(TableRow, { children: [_jsx(TableCell, { children: student.name }), _jsx(TableCell, { children: student.grade }), _jsxs(TableCell, { children: [status === "CHECKED_IN" && _jsx(Badge, { className: "bg-green-600 text-white hover:bg-green-700", children: "Checked In" }), status === "CHECKED_OUT" && _jsx(Badge, { variant: "destructive", children: "Checked Out" }), status === "NOT_CHECKED" && _jsx(Badge, { children: "Not Checked" })] })] }, student.id));
                        }) })] }), students.length === 0 && _jsx("div", { children: "No students found" })] }));
}
