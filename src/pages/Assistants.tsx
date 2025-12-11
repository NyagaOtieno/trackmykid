import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, MapPin, Edit, Trash } from 'lucide-react';
import { useState } from 'react';
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
import { getAssistants, getBuses, updateUser, deleteUser } from '@/lib/api';
import EditAssistantForm from './EditAssistantForm';
import AddAssistantForm from './AddAssistantForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// Types
interface Assistant {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface Bus {
  id: number;
  name: string;
  plateNumber: string;
  assistantId?: number;
}

export default function Assistants() {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);
  const [addingAssistant, setAddingAssistant] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Assistant | null>(null);
  const queryClient = useQueryClient();

  // Fetch assistants
  const { data: assistants = [], isLoading } = useQuery<Assistant[]>({
    queryKey: ['assistants'],
    queryFn: getAssistants,
  });

  // Fetch buses
  const { data: buses = [] } = useQuery<Bus[]>({
    queryKey: ['buses'],
    queryFn: getBuses,
  });

  // Only assistants assigned to a bus
  const assignedAssistants = assistants.filter((a) =>
    buses.some((bus) => bus.assistantId === a.id)
  );

  const getAssignedBus = (assistantId: number) => {
    const bus = buses.find((b) => b.assistantId === assistantId);
    return bus ? `${bus.name} (${bus.plateNumber})` : 'Not Assigned';
  };

  const filteredAssistants = assignedAssistants.filter((assistant) => {
    const assignedBus = getAssignedBus(assistant.id);
    const term = searchTerm.toLowerCase();
    return (
      assistant.name.toLowerCase().includes(term) ||
      (assistant.email?.toLowerCase().includes(term) ?? false) ||
      (assistant.phone?.toLowerCase().includes(term) ?? false) ||
      assignedBus.toLowerCase().includes(term)
    );
  });

  // View bus location
  const handleViewLocation = (assistant: Assistant) => {
    const bus = buses.find((b) => b.assistantId === assistant.id);
    if (bus) window.open(`/map?busId=${bus.id}`, '_blank');
    else alert('No assigned bus for this assistant');
  };

  // Delete assistant
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id);
      queryClient.invalidateQueries(['assistants']);
      setDeleteTarget(null);
    } catch (error) {
      console.error(error);
      alert('Failed to delete assistant');
    }
  };

  // Update assistant
  const handleUpdate = async (data: Assistant & { password?: string }) => {
    try {
      await updateUser(data.id, data);
      queryClient.invalidateQueries(['assistants']);
      setEditingAssistant(null); // Close modal
      alert('Assistant updated successfully');
    } catch (error) {
      console.error(error);
      alert('Failed to update assistant');
    }
  };

  // After adding a new assistant
  const handleAdded = () => {
    queryClient.invalidateQueries(['assistants']);
    setAddingAssistant(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold leading-tight">Bus Assistants</h2>
          <p className="text-muted-foreground text-sm">
            Showing only assistants currently assigned to a bus
          </p>
        </div>
        <div className="flex w-full sm:w-auto sm:justify-end">
          <Button className="w-full sm:w-auto" onClick={() => setAddingAssistant(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Assistant
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Name, Email, Phone, or Bus..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border shadow-sm overflow-x-auto max-h-[70vh]">
        <Table className="min-w-[720px] text-sm">
          <TableHeader className="sticky top-0 bg-card/95 backdrop-blur">
            <TableRow>
              <TableHead className="py-3 text-xs uppercase tracking-wide text-muted-foreground">#</TableHead>
              <TableHead className="py-3 text-xs uppercase tracking-wide text-muted-foreground">Name</TableHead>
              <TableHead className="py-3 text-xs uppercase tracking-wide text-muted-foreground">Email</TableHead>
              <TableHead className="py-3 text-xs uppercase tracking-wide text-muted-foreground">Phone</TableHead>
              <TableHead className="py-3 text-xs uppercase tracking-wide text-muted-foreground">Assigned Bus (Registration)</TableHead>
              <TableHead className="py-3 text-xs uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  Loading assistants...
                </TableCell>
              </TableRow>
            ) : filteredAssistants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  No assigned assistants found
                </TableCell>
              </TableRow>
            ) : (
              filteredAssistants.map((assistant, index) => (
                <TableRow key={assistant.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="py-3">{index + 1}</TableCell>
                  <TableCell className="py-3 font-medium">{assistant.name}</TableCell>
                  <TableCell className="py-3">{assistant.email || '—'}</TableCell>
                  <TableCell className="py-3">{assistant.phone || '—'}</TableCell>
                  <TableCell className="py-3">{getAssignedBus(assistant.id)}</TableCell>
                  <TableCell className="py-3 text-right space-x-2 whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewLocation(assistant)}
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingAssistant(assistant)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(assistant)}
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

      {/* Add Assistant Modal */}
      {addingAssistant && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-md w-[400px]">
            <h2 className="text-lg font-bold mb-4">Add Assistant</h2>
            <AddAssistantForm onAdded={handleAdded} onCancel={() => setAddingAssistant(false)} />
          </div>
        </div>
      )}

      {/* Edit Assistant Modal */}
      {editingAssistant && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-md w-[400px]">
            <h2 className="text-lg font-bold mb-4">Edit Assistant</h2>
            <EditAssistantForm
              assistant={editingAssistant}
              onUpdated={handleUpdate}
              onCancel={() => setEditingAssistant(null)}
            />
          </div>
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete assistant</DialogTitle>
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
