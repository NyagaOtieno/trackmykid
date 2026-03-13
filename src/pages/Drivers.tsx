// Drivers.tsx
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MapPin, Edit, Trash, CarFront } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import AddDriverForm from "./AddDriverForm";
import EditDriverForm from "./EditDriverForm";

// ✅ IMPORTANT: use your axiosConfig-based API (token already attached)
// If your functions are currently in "@/lib/api", move/alias them to "@/api/axiosConfig"
import { getDrivers, getBuses, updateUser, deleteUser } from "@/api/axiosConfig";

type Driver = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  tenantId?: number | null;
};

type Bus = {
  id: number;
  name: string;
  plateNumber: string;
  driverId?: number | null;
  driver?: { id: number; name: string } | null; // backend returns relations sometimes
  tenantId?: number | null;
};

function normalizeList(res: any) {
  // backend may return {success, data:[...]} OR [...]
  if (Array.isArray(res)) return res;
  return res?.data ?? [];
}

export default function Drivers() {
  const qc = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [addingDriver, setAddingDriver] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);

  const { data: driversRaw, isLoading: driversLoading, isError: driversError } = useQuery({
    queryKey: ["drivers"],
    queryFn: getDrivers,
    staleTime: 1000 * 60 * 3,
  });

  const { data: busesRaw, isLoading: busesLoading, isError: busesError } = useQuery({
    queryKey: ["buses"],
    queryFn: getBuses,
    staleTime: 1000 * 60 * 3,
  });

  const drivers: Driver[] = useMemo(() => normalizeList(driversRaw), [driversRaw]);
  const buses: Bus[] = useMemo(() => normalizeList(busesRaw), [busesRaw]);

  // ✅ Map driverId -> bus (works for both driverId or relation driver.id)
  const busByDriverId = useMemo(() => {
    const map = new Map<number, Bus>();
    for (const b of buses) {
      const did = Number(b.driverId ?? b.driver?.id);
      if (did) map.set(did, b);
    }
    return map;
  }, [buses]);

  // ✅ Only drivers assigned to a bus
  const assignedDrivers = useMemo(() => {
    return drivers.filter((d) => busByDriverId.has(d.id));
  }, [drivers, busByDriverId]);

  const getAssignedBusLabel = (driverId: number) => {
    const bus = busByDriverId.get(driverId);
    return bus ? `${bus.name} (${bus.plateNumber})` : "Not Assigned";
  };

  const filteredDrivers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return assignedDrivers;

    return assignedDrivers.filter((d) => {
      const busLabel = getAssignedBusLabel(d.id).toLowerCase();
      return (
        (d.name || "").toLowerCase().includes(term) ||
        (d.email || "").toLowerCase().includes(term) ||
        (d.phone || "").toLowerCase().includes(term) ||
        busLabel.includes(term)
      );
    });
  }, [assignedDrivers, searchTerm]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id);
      toast.success("Driver deleted");
      qc.invalidateQueries({ queryKey: ["drivers"] });
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete driver");
    }
  };

  const handleUpdate = async (data?: (Driver & { password?: string }) | null) => {
    if (!data) {
      setEditingDriver(null);
      return;
    }
    try {
      await updateUser(data.id, data);
      toast.success("Driver updated");
      qc.invalidateQueries({ queryKey: ["drivers"] });
      qc.invalidateQueries({ queryKey: ["buses"] }); // in case assignment changed
      setEditingDriver(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update driver");
    }
  };

  const handleAdded = () => {
    qc.invalidateQueries({ queryKey: ["drivers"] });
    qc.invalidateQueries({ queryKey: ["buses"] });
    setAddingDriver(false);
  };

  const loading = driversLoading || busesLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-primary/10 text-primary grid place-items-center">
            <CarFront className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-3xl font-bold leading-tight">Drivers</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Showing only drivers currently assigned to a bus
            </p>
          </div>
        </div>

        <Button onClick={() => setAddingDriver(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Driver
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by Name, Email, Phone, or Bus..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Assigned Bus (Registration)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading drivers...
                </TableCell>
              </TableRow>
            ) : driversError || busesError ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-red-600">
                  Failed to load drivers/buses. Check token + API.
                </TableCell>
              </TableRow>
            ) : filteredDrivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No assigned drivers found
                </TableCell>
              </TableRow>
            ) : (
              filteredDrivers.map((driver, index) => {
                const bus = busByDriverId.get(driver.id);
                return (
                  <TableRow key={driver.id} className="hover:bg-muted/30">
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>{driver.email || "—"}</TableCell>
                    <TableCell>{driver.phone || "—"}</TableCell>
                    <TableCell>{getAssignedBusLabel(driver.id)}</TableCell>

                    <TableCell className="text-right space-x-2 whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (bus?.id) window.open(`/map?busId=${bus.id}`, "_blank");
                          else toast.info("No assigned bus for this driver");
                        }}
                      >
                        <MapPin className="h-4 w-4 mr-1" />
                        View
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Driver Modal */}
      <Dialog open={addingDriver} onOpenChange={setAddingDriver}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Driver</DialogTitle>
            <DialogDescription>Create a new driver user.</DialogDescription>
          </DialogHeader>

          <AddDriverForm
            onAdded={handleAdded}
            onCancel={() => setAddingDriver(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Driver Modal */}
      <Dialog open={!!editingDriver} onOpenChange={(open) => !open && setEditingDriver(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
            <DialogDescription>Update driver details.</DialogDescription>
          </DialogHeader>

          {editingDriver && (
            <EditDriverForm
              driver={editingDriver}
              onUpdated={handleUpdate}
              onCancel={() => setEditingDriver(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete driver</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`
                : ""}
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
