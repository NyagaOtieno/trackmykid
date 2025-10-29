import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash } from 'lucide-react';
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
import { getBuses, getAssistants } from '@/lib/api';

export default function Buses() {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Buses
  const { data: busesData = [], isLoading: busesLoading, isError: busesError } = useQuery({
    queryKey: ['buses'],
    queryFn: getBuses,
  });

  // Fetch Bus Assistants
  const { data: assistantsData = [], isLoading: assistantsLoading, isError: assistantsError } = useQuery({
    queryKey: ['assistants'],
    queryFn: getAssistants,
  });

  const buses = Array.isArray(busesData) ? busesData : [];
  const assistants = Array.isArray(assistantsData) ? assistantsData : [];

  // Get assistant name by ID
  const getAssistantName = (assistantId: number) => {
    const assistant = assistants.find((a: any) => a.id === assistantId);
    return assistant ? assistant.name : 'N/A';
  };

  // Handle Edit
  const handleEdit = (busId: number) => {
    console.log('Edit bus', busId);
    // TODO: redirect to edit form or open modal
  };

  // Handle Delete
  const handleDelete = (busId: number) => {
    console.log('Delete bus', busId);
    // TODO: call delete API and refetch buses
  };

  // Filter buses based on searchTerm
  const filteredBuses = buses.filter((bus: any) => {
    const driverName =
      bus.driver && typeof bus.driver === 'object' ? bus.driver.name : bus.driver || '';
    const assistantName = getAssistantName(bus.assistantId);

    return (
      bus.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assistantName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Buses</h2>
          <p className="text-muted-foreground mt-1">Manage fleet and bus assignments</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Bus
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search buses by name, plate, route, driver, assistant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Plate Number</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Bus Assistant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {busesLoading || assistantsLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : busesError || assistantsError ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-red-500">
                  Failed to load data. Please try again later.
                </TableCell>
              </TableRow>
            ) : filteredBuses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No buses found
                </TableCell>
              </TableRow>
            ) : (
              filteredBuses.map((bus: any) => (
                <TableRow key={bus.id}>
                  <TableCell className="font-medium">{bus.name}</TableCell>
                  <TableCell>{bus.plateNumber}</TableCell>
                  <TableCell>{bus.route}</TableCell>
                  <TableCell>
                    {bus.driver && typeof bus.driver === 'object'
                      ? bus.driver.name
                      : bus.driver || 'N/A'}
                  </TableCell>
                  <TableCell>{bus.capacity}</TableCell>
                  <TableCell>{getAssistantName(bus.assistantId)}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        bus.isMoving ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                      }`}
                    >
                      {bus.isMoving ? 'Moving' : 'Stopped'}
                    </span>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(bus.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(bus.id)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
