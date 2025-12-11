import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash, Download, BusFront } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBuses, deleteBus } from "@/lib/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import AddBusForm from "@/pages/AddBusForm";
export default function Buses() {
    const queryClient = useQueryClient();
    // State
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [selectedBus, setSelectedBus] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    // Fetch Buses
    const { data: buses = [], isLoading, isError, } = useQuery({
        queryKey: ["buses"],
        queryFn: getBuses,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id) => deleteBus(id),
        onSuccess: () => {
            toast.success("Bus deleted successfully");
            queryClient.invalidateQueries(["buses"]);
        },
    });
    // Handle Sorting
    const sortedBuses = useMemo(() => {
        if (!buses)
            return [];
        return [...buses].sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (valA < valB)
                return sortConfig.direction === "asc" ? -1 : 1;
            if (valA > valB)
                return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [buses, sortConfig]);
    // Handle Filtering
    const filteredBuses = sortedBuses.filter((bus) => {
        const search = searchTerm.toLowerCase();
        return (bus.name.toLowerCase().includes(search) ||
            bus.plateNumber.toLowerCase().includes(search) ||
            bus.route.toLowerCase().includes(search));
    });
    // Pagination
    const paginatedBuses = filteredBuses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredBuses.length / itemsPerPage);
    // Export Handlers
    const handleExportCSV = () => {
        const csv = Papa.unparse(buses);
        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "buses.csv";
        a.click();
        window.URL.revokeObjectURL(url);
    };
    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(buses);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Buses");
        XLSX.writeFile(workbook, "buses.xlsx");
    };
    // UI Handlers
    const handleSort = (key) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.direction === "asc" ? "desc" : "asc",
        }));
    };
    const handleDeleteConfirm = () => {
        if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id, {
                onSettled: () => setDeleteTarget(null),
            });
        }
    };
    const handleDialogOpen = (bus = null) => {
        setSelectedBus(bus);
        setIsDialogOpen(true);
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "h-12 w-12 rounded-full bg-primary/10 text-primary grid place-items-center", children: _jsx(BusFront, { className: "h-5 w-5" }) }), _jsxs("div", { className: "space-y-1", children: [_jsx("h2", { className: "text-3xl font-bold leading-tight", children: "Buses" }), _jsx("p", { className: "text-muted-foreground text-sm", children: "Manage fleet and bus assignments." })] })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs(Button, { variant: "outline", onClick: handleExportCSV, className: "flex-1 sm:flex-none", children: [_jsx(Download, { className: "h-4 w-4 mr-2" }), " CSV"] }), _jsxs(Button, { variant: "outline", onClick: handleExportExcel, className: "flex-1 sm:flex-none", children: [_jsx(Download, { className: "h-4 w-4 mr-2" }), " Excel"] }), _jsxs(Button, { onClick: () => handleDialogOpen(), className: "flex-1 sm:flex-none", children: [_jsx(Plus, { className: "h-4 w-4 mr-2" }), " Add Bus"] })] })] }), _jsxs("div", { className: "relative w-full max-w-xl", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Search buses...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "pl-10" })] }), _jsx("div", { className: "grid grid-cols-1 gap-4 md:hidden", children: isLoading ? (_jsx(Card, { children: _jsx(CardContent, { className: "py-8 text-center text-muted-foreground", children: "Loading..." }) })) : isError ? (_jsx(Card, { children: _jsx(CardContent, { className: "py-8 text-center text-red-500", children: "Failed to load buses" }) })) : paginatedBuses.length === 0 ? (_jsx(Card, { children: _jsx(CardContent, { className: "py-8 text-center text-muted-foreground", children: "No buses found" }) })) : (paginatedBuses.map((bus) => (_jsxs(Card, { className: "border shadow-sm", children: [_jsx(CardHeader, { className: "pb-2", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "space-y-1", children: [_jsx(CardTitle, { className: "text-lg", children: bus.name }), _jsx("p", { className: "text-sm text-muted-foreground", children: bus.plateNumber })] }), _jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${bus.isMoving ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"}`, children: bus.isMoving ? "Moving" : "Stopped" })] }) }), _jsxs(CardContent, { className: "space-y-3", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground", children: "Route" }), _jsx("p", { className: "font-medium", children: bus.route || "-" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground", children: "Capacity" }), _jsx("p", { className: "font-medium", children: bus.capacity })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { size: "sm", variant: "outline", className: "flex-1", onClick: () => handleDialogOpen(bus), children: [_jsx(Edit, { className: "h-4 w-4 mr-1.5" }), " Edit"] }), _jsxs(Button, { size: "sm", variant: "destructive", className: "flex-1", onClick: () => setDeleteTarget({ id: bus.id, name: bus.name }), children: [_jsx(Trash, { className: "h-4 w-4 mr-1.5" }), " Delete"] })] })] })] }, bus.id)))) }), _jsx("div", { className: "hidden md:block bg-card rounded-lg border", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [["Name", "Plate Number", "Route", "Capacity", "Status"].map((col) => (_jsxs(TableHead, { onClick: () => handleSort(col.toLowerCase()), children: [col, " ", sortConfig.key === col.toLowerCase() &&
                                                (sortConfig.direction === "asc" ? "▲" : "▼")] }, col))), _jsx(TableHead, { children: "Actions" })] }) }), _jsx(TableBody, { children: isLoading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 8, className: "text-center py-8", children: "Loading..." }) })) : isError ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 8, className: "text-center py-8 text-red-500", children: "Failed to load buses" }) })) : paginatedBuses.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 8, className: "text-center py-8", children: "No buses found" }) })) : (paginatedBuses.map((bus) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-medium", children: bus.name }), _jsx(TableCell, { children: bus.plateNumber }), _jsx(TableCell, { children: bus.route }), _jsx(TableCell, { children: bus.capacity }), _jsx(TableCell, { children: _jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${bus.isMoving ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`, children: bus.isMoving ? "Moving" : "Stopped" }) }), _jsxs(TableCell, { className: "flex gap-2", children: [_jsx(Button, { size: "sm", variant: "outline", onClick: () => handleDialogOpen(bus), children: _jsx(Edit, { className: "h-4 w-4" }) }), _jsx(Button, { size: "sm", variant: "destructive", onClick: () => setDeleteTarget({ id: bus.id, name: bus.name }), children: _jsx(Trash, { className: "h-4 w-4" }) })] })] }, bus.id)))) })] }) }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mt-4", children: [_jsxs("span", { className: "text-sm text-muted-foreground", children: ["Page ", currentPage, " of ", totalPages || 1] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { size: "sm", disabled: currentPage === 1, onClick: () => setCurrentPage(1), children: "First" }), _jsx(Button, { size: "sm", disabled: currentPage === 1, onClick: () => setCurrentPage((p) => p - 1), children: "Prev" }), _jsx(Button, { size: "sm", disabled: currentPage === totalPages, onClick: () => setCurrentPage((p) => p + 1), children: "Next" }), _jsx(Button, { size: "sm", disabled: currentPage === totalPages, onClick: () => setCurrentPage(totalPages), children: "Last" })] })] }), _jsxs(Dialog, { open: isDialogOpen, onOpenChange: setIsDialogOpen, children: [_jsx(DialogTrigger, { asChild: true }), _jsx(DialogContent, { className: "w-[92vw] sm:w-[640px] md:w-[760px] max-w-[760px] p-0 border-none bg-transparent shadow-none", children: _jsx("div", { className: "bg-background border rounded-xl sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6", children: _jsx(AddBusForm, { bus: selectedBus, embedded: true, onSuccess: () => {
                                    queryClient.invalidateQueries(["buses"]);
                                    setIsDialogOpen(false);
                                } }) }) })] }), _jsx(Dialog, { open: !!deleteTarget, onOpenChange: (open) => !open && setDeleteTarget(null), children: _jsxs(DialogContent, { className: "max-w-sm", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Delete bus" }), _jsx(DialogDescription, { children: deleteTarget ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.` : "" })] }), _jsxs(DialogFooter, { className: "flex gap-2 justify-end", children: [_jsx(Button, { variant: "outline", onClick: () => setDeleteTarget(null), children: "Cancel" }), _jsx(Button, { variant: "destructive", onClick: handleDeleteConfirm, disabled: deleteMutation.isLoading, children: deleteMutation.isLoading ? "Deleting..." : "Delete" })] })] }) })] }));
}
