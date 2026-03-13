import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, Search, MapPin, Edit, Trash, Users } from "lucide-react";
import { useMemo, useState } from "react";
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

import AddAssistantForm from "./AddAssistantForm";
import EditAssistantForm from "./EditAssistantForm";

// ✅ IMPORTANT: use the token-safe API functions
import { getAssistants, getBuses, updateUser, deleteUser } from "@/lib/api";

type Assistant = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string;
};

type Bus = {
  id: number;
  name: string;
  plateNumber?: string | null;
  route?: string | null;
  assistantId?: number | null;
  assistant?: { id: number; name: string; email?: string; phone?: string } | null;
};

// ✅ Backend sometimes returns {success, data:[...]} or directly array
function pickArray<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

export default function Assistants() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [addingOpen, setAddingOpen] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Assistant | null>(null);

  // ✅ Fetch assistants
  const assistantsQ = useQuery({
    queryKey: ["assistants"],
    queryFn: async () => getAssistants(),
    staleTime: 1000 * 60 * 2,
  });

  // ✅ Fetch buses
  const busesQ = useQuery({
    queryKey: ["buses"],
    queryFn: async () => getBuses(),
    staleTime: 1000 * 60 * 2,
  });

  const assistants = useMemo(
    () => pickArray<Assistant>(assistantsQ.data),
    [assistantsQ.data]
  );

  const buses = useMemo(() => pickArray<Bus>(busesQ.data), [busesQ.data]);

  // ✅ Build a lookup: assistantId -> assigned bus
  const busByAssistantId = useMemo(() => {
    const map = new Map<number, Bus>();
    for (const b of buses) {
      const id =
        typeof b.assistantId === "number"
          ? b.assistantId
          : typeof b.assistant?.id === "number"
          ? b.assistant.id
          : null;

      if (id != null) map.set(id, b);
    }
    return map;
  }, [buses]);

  // ✅ Only show assistants who are assigned to a bus (as per your requirement)
  const assignedAssistants = useMemo(() => {
    return assistants.filter((a) => busByAssistantId.has(a.id));
  }, [assistants, busByAssistantId]);

  const getAssignedBusLabel = (assistantId: number) => {
    const bus = busByAssistantId.get(assistantId);
    if (!bus) return "Not Assigned";
    const plate = bus.plateNumber ? `(${bus.plateNumber})` : "";
    const route = bus.route ? ` — ${bus.route}` : "";
    return `${bus.name} ${plate}${route}`.trim();
  };

  const filteredAssistants = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return assignedAssistants;

    return assignedAssistants.filter((a) => {
      const bus = busByAssistantId.get(a.id);
      const hay = [
        a.name,
        a.email,
        a.phone,
        bus?.name,
        bus?.plateNumber,
        bus?.route,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(term);
    });
  }, [assignedAssistants, busByAssistantId, searchTerm]);

  // ✅ View bus location (opens map page)
  const handleViewLocation = (assistantId: number) => {
    const bus = busByAssistantId.get(assistantId);
    if (!bus?.id) return toast.error("No assigned bus for this assistant");
    window.open(`/map?busId=${bus.id}`, "_blank");
  };

  // ✅ Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => deleteUser(id),
    onSuccess: () => {
      toast.success("Assistant deleted");
      queryClient.invalidateQueries({ queryKey: ["assistants"] });
      queryClient.invalidateQueries({ queryKey: ["buses"] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.message || "Failed to delete assistant"),
  });

  // ✅ Update
  const updateMutation = useMutation({
    mutationFn: async (data: Assistant & { password?: string }) => updateUser(data.id, data),
    onSuccess: () => {
      toast.success("Assistant updated");
      queryClient.invalidateQueries({ queryKey: ["assistants"] });
      queryClient.invalidateQueries({ queryKey: ["buses"] });
      setEditingAssistant(null);
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update assistant"),
  });

  const isLoading = assistantsQ.isLoading || busesQ.isLoading;
  const isError = assistantsQ.isError || busesQ.isError;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary grid place-items-center">
            <Users className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold leading-tight">Bus Assistants</h2>
            <p className="text-muted-foreground text-sm">
              Showing only assistants currently assigned to a bus
            </p>
          </div>
        </div>

        <div className="flex w-full sm:w-auto sm:justify-end">
          <Button className="w-full sm:w-auto" onClick={() => setAddingOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Assistant
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search Name, Email, Phone, Bus, Plate, Route..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border shadow-sm overflow-x-auto max-h-[70vh]">
        <Table className="min-w-[860px] text-sm">
          <TableHeader className="sticky top-0 bg-card/95 backdrop-blur">
            <TableRow>
              <TableHead className="py-3 text-xs uppercase tracking-wide text-muted-foreground">#</TableHead>
              <TableHead className="py-3 text-xs uppercase tracking-wide text-muted-foreground">Name</TableHead>
              <TableHead className="py-3 text-xs uppercase tracking-wide text-muted-foreground">Email</TableHead>
              <TableHead className="py-3 text-xs uppercase tracking-wide text-muted-foreground">Phone</TableHead>
              <TableHead className="py-3 text-xs uppercase tracking-wide text-muted-foreground">
                Assigned Bus (Plate) — Route
              </TableHead>
              <TableHead className="py-3 text-xs uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading assistants...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-red-500">
                  Failed to load data (check token/login)
                </TableCell>
              </TableRow>
            ) : filteredAssistants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No assigned assistants found
                </TableCell>
              </TableRow>
            ) : (
              filteredAssistants.map((assistant, index) => (
                <TableRow key={assistant.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="py-3">{index + 1}</TableCell>
                  <TableCell className="py-3 font-medium">{assistant.name}</TableCell>
                  <TableCell className="py-3">{assistant.email || "—"}</TableCell>
                  <TableCell className="py-3">{assistant.phone || "—"}</TableCell>
                  <TableCell className="py-3">{getAssignedBusLabel(assistant.id)}</TableCell>

                  <TableCell className="py-3 text-right space-x-2 whitespace-nowrap">
                    <Button variant="outline" size="sm" onClick={() => handleViewLocation(assistant.id)}>
                      <MapPin className="h-4 w-4 mr-1" />
                      View
                    </Button>

                    <Button variant="secondary" size="sm" onClick={() => setEditingAssistant(assistant)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>

                    <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(assistant)}>
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

      {/* Add Assistant Dialog */}
      <Dialog open={addingOpen} onOpenChange={setAddingOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Assistant</DialogTitle>
            <DialogDescription>Create a new assistant user.</DialogDescription>
          </DialogHeader>

          <AddAssistantForm
            onAdded={() => {
              queryClient.invalidateQueries({ queryKey: ["assistants"] });
              setAddingOpen(false);
            }}
            onCancel={() => setAddingOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Assistant Dialog */}
      <Dialog open={!!editingAssistant} onOpenChange={(open) => !open && setEditingAssistant(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Assistant</DialogTitle>
            <DialogDescription>Update assistant details.</DialogDescription>
          </DialogHeader>

          {editingAssistant && (
            <EditAssistantForm
              assistant={editingAssistant}
              onUpdated={(data: any) => updateMutation.mutate(data)}
              onCancel={() => setEditingAssistant(null)}
              loading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete assistant</DialogTitle>
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
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
