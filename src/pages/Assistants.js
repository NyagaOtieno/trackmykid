import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, MapPin, Edit, Trash } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { getAssistants, getBuses, updateUser, deleteUser } from '@/lib/api';
import EditAssistantForm from './EditAssistantForm';
import AddAssistantForm from './AddAssistantForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
export default function Assistants() {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingAssistant, setEditingAssistant] = useState(null);
    const [addingAssistant, setAddingAssistant] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const queryClient = useQueryClient();
    // Fetch assistants
    const { data: assistants = [], isLoading } = useQuery({
        queryKey: ['assistants'],
        queryFn: getAssistants,
    });
    // Fetch buses
    const { data: buses = [] } = useQuery({
        queryKey: ['buses'],
        queryFn: getBuses,
    });
    // Only assistants assigned to a bus
    const assignedAssistants = assistants.filter((a) => buses.some((bus) => bus.assistantId === a.id));
    const getAssignedBus = (assistantId) => {
        const bus = buses.find((b) => b.assistantId === assistantId);
        return bus ? `${bus.name} (${bus.plateNumber})` : 'Not Assigned';
    };
    const filteredAssistants = assignedAssistants.filter((assistant) => {
        const assignedBus = getAssignedBus(assistant.id);
        const term = searchTerm.toLowerCase();
        return (assistant.name.toLowerCase().includes(term) ||
            (assistant.email?.toLowerCase().includes(term) ?? false) ||
            (assistant.phone?.toLowerCase().includes(term) ?? false) ||
            assignedBus.toLowerCase().includes(term));
    });
    // View bus location
    const handleViewLocation = (assistant) => {
        const bus = buses.find((b) => b.assistantId === assistant.id);
        if (bus)
            window.open(`/map?busId=${bus.id}`, '_blank');
        else
            alert('No assigned bus for this assistant');
    };
    // Delete assistant
    const handleDelete = async () => {
        if (!deleteTarget)
            return;
        try {
            await deleteUser(deleteTarget.id);
            queryClient.invalidateQueries(['assistants']);
            setDeleteTarget(null);
        }
        catch (error) {
            console.error(error);
            alert('Failed to delete assistant');
        }
    };
    // Update assistant
    const handleUpdate = async (data) => {
        try {
            await updateUser(data.id, data);
            queryClient.invalidateQueries(['assistants']);
            setEditingAssistant(null); // Close modal
            alert('Assistant updated successfully');
        }
        catch (error) {
            console.error(error);
            alert('Failed to update assistant');
        }
    };
    // After adding a new assistant
    const handleAdded = () => {
        queryClient.invalidateQueries(['assistants']);
        setAddingAssistant(false);
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("h2", { className: "text-3xl font-bold leading-tight", children: "Bus Assistants" }), _jsx("p", { className: "text-muted-foreground text-sm", children: "Showing only assistants currently assigned to a bus" })] }), _jsx("div", { className: "flex w-full sm:w-auto sm:justify-end", children: _jsxs(Button, { className: "w-full sm:w-auto", onClick: () => setAddingAssistant(true), children: [_jsx(Plus, { className: "h-4 w-4 mr-2" }), "Add Assistant"] }) })] }), _jsx("div", { className: "flex items-center gap-4", children: _jsxs("div", { className: "relative flex-1 max-w-xl", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Search by Name, Email, Phone, or Bus...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "pl-10" })] }) }), _jsx("div", { className: "bg-card rounded-lg border shadow-sm overflow-x-auto max-h-[70vh]", children: _jsxs(Table, { className: "min-w-[720px] text-sm", children: [_jsx(TableHeader, { className: "sticky top-0 bg-card/95 backdrop-blur", children: _jsxs(TableRow, { children: [_jsx(TableHead, { className: "py-3 text-xs uppercase tracking-wide text-muted-foreground", children: "#" }), _jsx(TableHead, { className: "py-3 text-xs uppercase tracking-wide text-muted-foreground", children: "Name" }), _jsx(TableHead, { className: "py-3 text-xs uppercase tracking-wide text-muted-foreground", children: "Email" }), _jsx(TableHead, { className: "py-3 text-xs uppercase tracking-wide text-muted-foreground", children: "Phone" }), _jsx(TableHead, { className: "py-3 text-xs uppercase tracking-wide text-muted-foreground", children: "Assigned Bus (Registration)" }), _jsx(TableHead, { className: "py-3 text-xs uppercase tracking-wide text-muted-foreground text-right", children: "Actions" })] }) }), _jsx(TableBody, { children: isLoading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, className: "text-center py-6", children: "Loading assistants..." }) })) : filteredAssistants.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, className: "text-center py-6", children: "No assigned assistants found" }) })) : (filteredAssistants.map((assistant, index) => (_jsxs(TableRow, { className: "hover:bg-muted/40 transition-colors", children: [_jsx(TableCell, { className: "py-3", children: index + 1 }), _jsx(TableCell, { className: "py-3 font-medium", children: assistant.name }), _jsx(TableCell, { className: "py-3", children: assistant.email || '—' }), _jsx(TableCell, { className: "py-3", children: assistant.phone || '—' }), _jsx(TableCell, { className: "py-3", children: getAssignedBus(assistant.id) }), _jsxs(TableCell, { className: "py-3 text-right space-x-2 whitespace-nowrap", children: [_jsxs(Button, { variant: "outline", size: "sm", onClick: () => handleViewLocation(assistant), children: [_jsx(MapPin, { className: "h-4 w-4 mr-1" }), "View"] }), _jsxs(Button, { variant: "secondary", size: "sm", onClick: () => setEditingAssistant(assistant), children: [_jsx(Edit, { className: "h-4 w-4 mr-1" }), "Edit"] }), _jsxs(Button, { variant: "destructive", size: "sm", onClick: () => setDeleteTarget(assistant), children: [_jsx(Trash, { className: "h-4 w-4 mr-1" }), "Delete"] })] })] }, assistant.id)))) })] }) }), addingAssistant && (_jsx("div", { className: "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50", children: _jsxs("div", { className: "bg-white p-6 rounded-md w-[400px]", children: [_jsx("h2", { className: "text-lg font-bold mb-4", children: "Add Assistant" }), _jsx(AddAssistantForm, { onAdded: handleAdded, onCancel: () => setAddingAssistant(false) })] }) })), editingAssistant && (_jsx("div", { className: "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50", children: _jsxs("div", { className: "bg-white p-6 rounded-md w-[400px]", children: [_jsx("h2", { className: "text-lg font-bold mb-4", children: "Edit Assistant" }), _jsx(EditAssistantForm, { assistant: editingAssistant, onUpdated: handleUpdate, onCancel: () => setEditingAssistant(null) })] }) })), _jsx(Dialog, { open: !!deleteTarget, onOpenChange: (open) => !open && setDeleteTarget(null), children: _jsxs(DialogContent, { className: "max-w-sm", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Delete assistant" }), _jsx(DialogDescription, { children: deleteTarget ? `Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.` : '' })] }), _jsxs(DialogFooter, { className: "flex gap-2 justify-end", children: [_jsx(Button, { variant: "outline", onClick: () => setDeleteTarget(null), children: "Cancel" }), _jsx(Button, { variant: "destructive", onClick: handleDelete, children: "Delete" })] })] }) })] }));
}
