import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Search, MapPin, Edit, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { getDrivers, getBuses, updateUser, deleteUser } from '@/lib/api';
import AddDriverForm from './AddDriverForm';
import EditDriverForm from './EditDriverForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
export default function Drivers() {
    const [searchTerm, setSearchTerm] = useState('');
    const [addingDriver, setAddingDriver] = useState(false);
    const [editingDriver, setEditingDriver] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const queryClient = useQueryClient();
    const { data: drivers = [], isLoading: driversLoading } = useQuery({
        queryKey: ['drivers'],
        queryFn: getDrivers,
    });
    const { data: buses = [], isLoading: busesLoading } = useQuery({
        queryKey: ['buses'],
        queryFn: getBuses,
    });
    // Only drivers assigned to a bus
    const assignedDrivers = drivers.filter((d) => buses.some((b) => b.driverId === d.id));
    const getAssignedBus = (driverId) => {
        const bus = buses.find((b) => b.driverId === driverId);
        return bus ? `${bus.name} (${bus.plateNumber})` : 'Not Assigned';
    };
    const filteredDrivers = assignedDrivers.filter((driver) => {
        const assignedBus = getAssignedBus(driver.id);
        const term = searchTerm.toLowerCase();
        return (driver.name.toLowerCase().includes(term) ||
            (driver.email?.toLowerCase().includes(term) ?? false) ||
            (driver.phone?.toLowerCase().includes(term) ?? false) ||
            assignedBus.toLowerCase().includes(term));
    });
    const handleDelete = async () => {
        if (!deleteTarget)
            return;
        try {
            await deleteUser(deleteTarget.id);
            queryClient.invalidateQueries(['drivers']);
            setDeleteTarget(null);
        }
        catch (err) {
            console.error(err);
            alert('Failed to delete driver');
        }
    };
    const handleUpdate = async (data) => {
        if (!data) {
            setEditingDriver(null);
            return;
        }
        try {
            await updateUser(data.id, data);
            queryClient.invalidateQueries(['drivers']);
            setEditingDriver(null);
            alert('Driver updated successfully');
        }
        catch (error) {
            console.error(error);
            alert('Failed to update driver');
        }
    };
    const handleAdded = () => {
        queryClient.invalidateQueries(['drivers']);
        setAddingDriver(false);
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-3xl font-bold", children: "Drivers" }), _jsx("p", { className: "text-muted-foreground mt-1", children: "Showing only drivers currently assigned to a bus" })] }), _jsxs(Button, { onClick: () => setAddingDriver(true), children: [_jsx(Plus, { className: "h-4 w-4 mr-2" }), "Add Driver"] })] }), _jsx("div", { className: "flex items-center gap-4", children: _jsxs("div", { className: "relative flex-1 max-w-sm", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Search by Name, Email, Phone, or Bus...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "pl-10" })] }) }), _jsx("div", { className: "bg-card rounded-lg border overflow-x-auto", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "#" }), _jsx(TableHead, { children: "Name" }), _jsx(TableHead, { children: "Email" }), _jsx(TableHead, { children: "Phone" }), _jsx(TableHead, { children: "Assigned Bus (Registration)" }), _jsx(TableHead, { className: "text-right", children: "Actions" })] }) }), _jsx(TableBody, { children: driversLoading || busesLoading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, className: "text-center py-8", children: "Loading drivers..." }) })) : filteredDrivers.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, className: "text-center py-8", children: "No assigned drivers found" }) })) : (filteredDrivers.map((driver, index) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: index + 1 }), _jsx(TableCell, { className: "font-medium", children: driver.name }), _jsx(TableCell, { children: driver.email || '—' }), _jsx(TableCell, { children: driver.phone || '—' }), _jsx(TableCell, { children: getAssignedBus(driver.id) }), _jsxs(TableCell, { className: "text-right space-x-2", children: [_jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                                                    const bus = buses.find((b) => b.driverId === driver.id);
                                                    if (bus)
                                                        window.open(`/map?busId=${bus.id}`, '_blank');
                                                    else
                                                        alert('No assigned bus for this driver');
                                                }, children: [_jsx(MapPin, { className: "h-4 w-4 mr-1" }), "View Location"] }), _jsxs(Button, { variant: "secondary", size: "sm", onClick: () => setEditingDriver(driver), children: [_jsx(Edit, { className: "h-4 w-4 mr-1" }), "Edit"] }), _jsxs(Button, { variant: "destructive", size: "sm", onClick: () => setDeleteTarget(driver), children: [_jsx(Trash, { className: "h-4 w-4 mr-1" }), "Delete"] })] })] }, driver.id)))) })] }) }), addingDriver && (_jsx("div", { className: "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50", children: _jsxs("div", { className: "bg-white p-6 rounded-md w-[400px]", children: [_jsx("h2", { className: "text-lg font-bold mb-4", children: "Add Driver" }), _jsx(AddDriverForm, { onAdded: handleAdded, onCancel: () => setAddingDriver(false) })] }) })), editingDriver && (_jsx("div", { className: "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50", children: _jsxs("div", { className: "bg-white p-6 rounded-md w-[400px]", children: [_jsx("h2", { className: "text-lg font-bold mb-4", children: "Edit Driver" }), _jsx(EditDriverForm, { driver: editingDriver, onUpdated: handleUpdate, onCancel: () => setEditingDriver(null) })] }) })), _jsx(Dialog, { open: !!deleteTarget, onOpenChange: (open) => !open && setDeleteTarget(null), children: _jsxs(DialogContent, { className: "max-w-sm", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Delete driver" }), _jsx(DialogDescription, { children: deleteTarget ? `Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.` : '' })] }), _jsxs(DialogFooter, { className: "flex gap-2 justify-end", children: [_jsx(Button, { variant: "outline", onClick: () => setDeleteTarget(null), children: "Cancel" }), _jsx(Button, { variant: "destructive", onClick: handleDelete, children: "Delete" })] })] }) })] }));
}
