import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Plus, Edit, Trash, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import axios from "axios";
import AddParentForm from "./AddParentForm";
import EditParentForm from "./EditParentForm";
export default function ParentsUI() {
    const [parents, setParents] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addingParent, setAddingParent] = useState(false);
    const [editingParent, setEditingParent] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const itemsPerPage = 15;
    const SCHOOL_ID = 14;
    const fetchData = async () => {
        setLoading(true);
        try {
            const [parentsRes, studentsRes] = await Promise.all([
                axios.get("https://schooltransport-production.up.railway.app/api/parents"),
                axios.get("https://schooltransport-production.up.railway.app/api/students"),
            ]);
            setParents(parentsRes.data.data || []);
            setStudents(studentsRes.data.data || []);
        }
        catch (err) {
            console.error("Error fetching data:", err);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchData();
    }, []);
    const handleDelete = async () => {
        const userId = deleteTarget?.user?.id;
        if (!userId)
            return;
        try {
            await axios.delete(`https://schooltransport-production.up.railway.app/api/users/${userId}`);
            fetchData();
            setDeleteTarget(null);
        }
        catch (err) {
            console.error(err);
            alert("Failed to delete parent");
        }
    };
    const handleAddParent = async () => {
        setAddingParent(false);
        fetchData();
    };
    const handleUpdateParent = async () => {
        setEditingParent(null);
        fetchData();
    };
    const filteredParents = parents.filter((p) => {
        const term = searchTerm.toLowerCase();
        const user = p.user ?? {};
        return (user.name?.toLowerCase().includes(term) ||
            user.email?.toLowerCase().includes(term) ||
            user.phone?.toLowerCase().includes(term));
    });
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedParents = filteredParents.slice(startIndex, startIndex + itemsPerPage);
    const totalPages = Math.ceil(filteredParents.length / itemsPerPage);
    const studentsByParent = {};
    students.forEach((s) => {
        if (!studentsByParent[s.parentId])
            studentsByParent[s.parentId] = [];
        studentsByParent[s.parentId].push(s);
    });
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("h2", { className: "text-3xl font-bold leading-tight", children: "Parents" }), _jsx("p", { className: "text-muted-foreground text-sm", children: "Manage parent contacts and linked students" })] }), _jsx("div", { className: "flex w-full sm:w-auto sm:justify-end", children: _jsxs(Button, { className: "w-full sm:w-auto", onClick: () => setAddingParent(true), children: [_jsx(Plus, { className: "h-4 w-4 mr-2" }), " Add Parent"] }) })] }), _jsx("div", { className: "flex items-center gap-4", children: _jsxs("div", { className: "relative flex-1 max-w-xl", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Search parents...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "pl-10" })] }) }), _jsx("div", { className: "bg-card rounded-lg border shadow-sm overflow-x-auto max-h-[70vh]", children: _jsxs(Table, { className: "min-w-[840px] text-sm", children: [_jsx(TableHeader, { className: "sticky top-0 bg-card/95 backdrop-blur", children: _jsxs(TableRow, { children: [_jsx(TableHead, { className: "py-3 text-xs uppercase tracking-wide text-muted-foreground", children: "#" }), _jsx(TableHead, { className: "py-3 text-xs uppercase tracking-wide text-muted-foreground", children: "Name" }), _jsx(TableHead, { className: "py-3 text-xs uppercase tracking-wide text-muted-foreground", children: "Phone" }), _jsx(TableHead, { className: "py-3 text-xs uppercase tracking-wide text-muted-foreground", children: "Email" }), _jsx(TableHead, { className: "py-3 text-xs uppercase tracking-wide text-muted-foreground", children: "Linked Students" }), _jsx(TableHead, { className: "py-3 text-xs uppercase tracking-wide text-muted-foreground text-right", children: "Actions" })] }) }), _jsx(TableBody, { children: loading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, className: "text-center py-6", children: "Loading parents..." }) })) : paginatedParents.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, className: "text-center py-6", children: "No parents found" }) })) : (paginatedParents.map((parent, idx) => {
                                const user = parent.user ?? {};
                                const linkedStudents = studentsByParent[parent.id] ?? [];
                                return (_jsxs(TableRow, { className: "hover:bg-muted/40 transition-colors align-middle [&>td]:py-1.5", children: [_jsx(TableCell, { children: startIndex + idx + 1 }), _jsx(TableCell, { className: "font-medium", children: user.name ?? "N/A" }), _jsx(TableCell, { children: user.phone ?? "N/A" }), _jsx(TableCell, { children: user.email ?? "N/A" }), _jsx(TableCell, { children: linkedStudents.length > 0 ? (_jsx("ul", { className: "list-disc list-inside space-y-1 text-sm text-muted-foreground", children: linkedStudents.map((s) => (_jsxs("li", { className: "leading-snug text-foreground", children: [s.name, " (", s.bus?.name ?? "No Bus", " \u00B7 ", s.bus?.plateNumber ?? "N/A", " \u00B7", " ", s.bus?.route ?? "N/A", ")"] }, s.id))) })) : (_jsx("span", { className: "text-muted-foreground", children: "No students" })) }), _jsxs(TableCell, { className: "text-right space-x-2 whitespace-nowrap", children: [_jsxs(Button, { variant: "secondary", size: "sm", onClick: () => setEditingParent(parent), children: [_jsx(Edit, { className: "h-4 w-4 mr-1" }), " Edit"] }), _jsxs(Button, { variant: "destructive", size: "sm", onClick: () => setDeleteTarget(parent), children: [_jsx(Trash, { className: "h-4 w-4 mr-1" }), " Delete"] })] })] }, parent.id));
                            })) })] }) }), _jsxs("div", { className: "flex justify-between items-center mt-4", children: [_jsxs("p", { className: "text-sm text-muted-foreground", children: ["Showing ", startIndex + 1, "\u2013", Math.min(startIndex + itemsPerPage, filteredParents.length), " of", " ", filteredParents.length, " parents"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "outline", size: "sm", disabled: currentPage === 1, onClick: () => setCurrentPage((p) => p - 1), children: "Prev" }), _jsxs("span", { className: "text-sm", children: ["Page ", currentPage, " of ", totalPages] }), _jsx(Button, { variant: "outline", size: "sm", disabled: currentPage === totalPages, onClick: () => setCurrentPage((p) => p + 1), children: "Next" })] })] }), addingParent && (_jsx("div", { className: "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50", children: _jsxs("div", { className: "bg-white p-6 rounded-md w-[400px]", children: [_jsx("h2", { className: "text-lg font-bold mb-4", children: "Add Parent" }), _jsx(AddParentForm, { onAdded: handleAddParent, onCancel: () => setAddingParent(false) })] }) })), editingParent && (_jsx("div", { className: "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50", children: _jsxs("div", { className: "bg-white p-6 rounded-md w-[400px]", children: [_jsx("h2", { className: "text-lg font-bold mb-4", children: "Edit Parent" }), _jsx(EditParentForm, { parent: editingParent.user ? { ...editingParent.user, id: editingParent.id } : editingParent, onUpdated: handleUpdateParent, onCancel: () => setEditingParent(null) })] }) })), _jsx(Dialog, { open: !!deleteTarget, onOpenChange: (open) => !open && setDeleteTarget(null), children: _jsxs(DialogContent, { className: "max-w-sm", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Delete parent" }), _jsx(DialogDescription, { children: deleteTarget ? `Are you sure you want to delete "${deleteTarget.user?.name ?? "this parent"}"? This cannot be undone.` : "" })] }), _jsxs(DialogFooter, { className: "flex gap-2 justify-end", children: [_jsx(Button, { variant: "outline", onClick: () => setDeleteTarget(null), children: "Cancel" }), _jsx(Button, { variant: "destructive", onClick: handleDelete, children: "Delete" })] })] }) })] }));
}
