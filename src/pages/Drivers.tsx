import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Search, MapPin, Edit, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getDrivers, getBuses, updateUser, deleteUser } from '@/lib/api';
import AddDriverForm from './AddDriverForm';
import EditDriverForm from './EditDriverForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface Driver {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  schoolId?: number;
}

interface Bus {
  id: number;
  name: string;
  plateNumber: string;
  driverId?: number;
}

export default function Drivers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [addingDriver, setAddingDriver] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const queryClient = useQueryClient();

  const { data: drivers = [], isLoading: driversLoading } = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: getDrivers,
  });

  const { data: buses = [], isLoading: busesLoading } = useQuery<Bus[]>({
    queryKey: ['buses'],
    queryFn: getBuses,
  });

  // Only drivers assigned to a bus
  const assignedDrivers = drivers.filter((d) =>
    buses.some((b) => b.driverId === d.id)
  );

  const getAssignedBus = (driverId: number) => {
    const bus = buses.find((b) => b.driverId === driverId);
    return bus ? `${bus.name} (${bus.plateNumber})` : 'Not Assigned';
  };

  const filteredDrivers = assignedDrivers.filter((driver) => {
    const assignedBus = getAssignedBus(driver.id);
    const term = searchTerm.toLowerCase();
    return (
      driver.name.toLowerCase().includes(term) ||
      (driver.email?.toLowerCase().includes(term) ?? false) ||
      (driver.phone?.toLowerCase().includes(term) ?? false) ||
      assignedBus.toLowerCase().includes(term)
    );
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id);
      queryClient.invalidateQueries(['drivers']);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete driver');
    }
  };

  const handleUpdate = async (data?: Driver & { password?: string; schoolId?: number }) => {
    if (!data) {
      setEditingDriver(null);
      return;
    }
    try {
      await updateUser(data.id, data);
      queryClient.invalidateQueries(['drivers']);
      setEditingDriver(null);
      alert('Driver updated successfully');
    } catch (error) {
      console.error(error);
      alert('Failed to update driver');
    }
  };

  const handleAdded = () => {
    queryClient.invalidateQueries(['drivers']);
    setAddingDriver(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Drivers</h2>
          <p className="text-muted-foreground mt-1">
            Showing only drivers currently assigned to a bus
          </p>
        </div>
        <Button onClick={() => setAddingDriver(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Driver
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Name, Email, Phone, or Bus..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Assigned Bus (Registration)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {driversLoading || busesLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading drivers...
                </TableCell>
              </TableRow>
            ) : filteredDrivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No assigned drivers found
                </TableCell>
              </TableRow>
            ) : (
              filteredDrivers.map((driver, index) => (
                <TableRow key={driver.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{driver.name}</TableCell>
                  <TableCell>{driver.email || '—'}</TableCell>
                  <TableCell>{driver.phone || '—'}</TableCell>
                  <TableCell>{getAssignedBus(driver.id)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const bus = buses.find((b) => b.driverId === driver.id);
                        if (bus) window.open(`/map?busId=${bus.id}`, '_blank');
                        else alert('No assigned bus for this driver');
                      }}
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      View Location
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingDriver(driver)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(driver)}
                    >
                      <Trash className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {addingDriver && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-md w-[400px]">
            <h2 className="text-lg font-bold mb-4">Add Driver</h2>
            <AddDriverForm onAdded={handleAdded} onCancel={() => setAddingDriver(false)} />
          </div>
        </div>
      )}

      {editingDriver && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-md w-[400px]">
            <h2 className="text-lg font-bold mb-4">Edit Driver</h2>
            <EditDriverForm
              driver={editingDriver}
              onUpdated={handleUpdate}
              onCancel={() => setEditingDriver(null)}
            />
          </div>
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete driver</DialogTitle>
            <DialogDescription>
              {deleteTarget ? `Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
