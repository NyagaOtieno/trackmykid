import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash, Download, BusFront, User, UserCog } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import AddBusForm from "@/pages/AddBusForm";

// ✅ Use your token-safe API functions (interceptor attaches Bearer token)
import { getBuses, deleteBus } from "@/api/axiosConfig";

type SortConfig = { key: string; direction: "asc" | "desc" };

function pickArray(payload: any) {
  // supports:
  // - direct array: [...]
  // - wrapped: { success, data: [...] }
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export default function Buses() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "name", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedBus, setSelectedBus] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  // Reset page when search changes
  useEffect(() => setCurrentPage(1), [searchTerm]);

  // ✅ Fetch buses (normalize shape)
  const { data: busesRaw, isLoading, isError } = useQuery({
    queryKey: ["buses"],
    queryFn: getBuses, // returns res.data (your api helper)
    staleTime: 1000 * 60 * 5,
  });

  const buses = useMemo(() => pickArray(busesRaw), [busesRaw]);

  // ✅ Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBus(id),
    onSuccess: () => {
      toast.success("Bus deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["buses"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete bus");
    },
  });

  // Sorting
  const sortedBuses = useMemo(() => {
    const list = [...buses];
    const { key, direction } = sortConfig;

    return list.sort((a, b) => {
      const valA = (a?.[key] ?? "").toString().toLowerCase();
      const valB = (b?.[key] ?? "").toString().toLowerCase();

      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [buses, sortConfig]);

  // Filtering
  const filteredBuses = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return sortedBuses.filter((bus: any) => {
      return (
        bus?.name?.toLowerCase().includes(s) ||
        bus?.plateNumber?.toLowerCase().includes(s) ||
        bus?.route?.toLowerCase().includes(s) ||
        bus?.driver?.name?.toLowerCase().includes(s) ||
        bus?.assistant?.name?.toLowerCase().includes(s)
      );
    });
  }, [sortedBuses, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredBuses.length / itemsPerPage));
  const paginatedBuses = filteredBuses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Export CSV (clean)
  const handleExportCSV = () => {
    const exportRows = buses.map((b: any) => ({
      id: b.id,
      name: b.name,
      plateNumber: b.plateNumber,
      capacity: b.capacity,
      route: b.route,
      tenantId: b.tenantId,
      driver: b.driver?.name || "",
      assistant: b.assistant?.name || "",
      updatedAt: b.updatedAt,
    }));

    const csv = Papa.unparse(exportRows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "buses.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export Excel (clean)
  const handleExportExcel = () => {
    const exportRows = buses.map((b: any) => ({
      id: b.id,
      name: b.name,
      plateNumber: b.plateNumber,
      capacity: b.capacity,
      route: b.route,
      tenantId: b.tenantId,
      driver: b.driver?.name || "",
      assistant: b.assistant?.name || "",
      updatedAt: b.updatedAt,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Buses");
    XLSX.writeFile(workbook, "buses.xlsx");
  };

  // Sorting handler
  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key ? (prev.direction === "asc" ? "desc" : "asc") : "asc",
    }));
  };

  const openDialog = (bus: any | null = null) => {
    setSelectedBus(bus);
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSettled: () => setDeleteTarget(null),
    });
  };

  const statusBadge = (bus: any) => {
    const hasDriver = !!bus?.driver?.name;
    const hasAssistant = !!bus?.assistant?.name;

    if (hasDriver && hasAssistant) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600">Assigned</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-700">Unassigned</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary grid place-items-center">
            <BusFront className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold leading-tight">Buses</h2>
            <p className="text-muted-foreground text-sm">Manage fleet and bus assignments.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" onClick={handleExportExcel} className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button onClick={() => openDialog(null)} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" /> Add Bus
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, plate, route, driver, assistant..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Mobile Cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {isLoading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : isError ? (
          <Card><CardContent className="py-8 text-center text-red-500">Failed to load buses</CardContent></Card>
        ) : paginatedBuses.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No buses found</CardContent></Card>
        ) : (
          paginatedBuses.map((bus: any) => (
            <Card key={bus.id} className="border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{bus.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{bus.plateNumber}</p>
                    <p className="text-xs text-muted-foreground">{bus.route || "-"}</p>
                  </div>
                  {statusBadge(bus)}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Capacity</p>
                    <p className="font-medium">{bus.capacity ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tenant</p>
                    <p className="font-medium">{bus.tenant?.name || bus.tenantId || "-"}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Driver:</span>
                    <span className="font-medium">{bus.driver?.name || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserCog className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Assistant:</span>
                    <span className="font-medium">{bus.assistant?.name || "-"}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openDialog(bus)}>
                    <Edit className="h-4 w-4 mr-1.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setDeleteTarget({ id: bus.id, name: bus.name })}
                  >
                    <Trash className="h-4 w-4 mr-1.5" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => handleSort("name")} className="cursor-pointer">
                Name {sortConfig.key === "name" && (sortConfig.direction === "asc" ? "▲" : "▼")}
              </TableHead>
              <TableHead onClick={() => handleSort("plateNumber")} className="cursor-pointer">
                Plate {sortConfig.key === "plateNumber" && (sortConfig.direction === "asc" ? "▲" : "▼")}
              </TableHead>
              <TableHead onClick={() => handleSort("route")} className="cursor-pointer">
                Route {sortConfig.key === "route" && (sortConfig.direction === "asc" ? "▲" : "▼")}
              </TableHead>
              <TableHead onClick={() => handleSort("capacity")} className="cursor-pointer">
                Capacity {sortConfig.key === "capacity" && (sortConfig.direction === "asc" ? "▲" : "▼")}
              </TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Assistant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-red-500">Failed to load buses</TableCell>
              </TableRow>
            ) : paginatedBuses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">No buses found</TableCell>
              </TableRow>
            ) : (
              paginatedBuses.map((bus: any) => (
                <TableRow key={bus.id}>
                  <TableCell className="font-medium">{bus.name ?? "-"}</TableCell>
                  <TableCell>{bus.plateNumber ?? "-"}</TableCell>
                  <TableCell>{bus.route ?? "-"}</TableCell>
                  <TableCell>{bus.capacity ?? "-"}</TableCell>
                  <TableCell>{bus.driver?.name ?? "-"}</TableCell>
                  <TableCell>{bus.assistant?.name ?? "-"}</TableCell>
                  <TableCell>{statusBadge(bus)}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openDialog(bus)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteTarget({ id: bus.id, name: bus.name })}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mt-4">
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>First</Button>
          <Button size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>Prev</Button>
          <Button size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next</Button>
          <Button size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>Last</Button>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[92vw] sm:w-[640px] md:w-[760px] max-w-[760px] p-0 border-none bg-transparent shadow-none">
          <div className="bg-background border rounded-xl sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
            <AddBusForm
              bus={selectedBus}
              embedded
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["buses"] });
                setIsDialogOpen(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete bus</DialogTitle>
            <DialogDescription>
              {deleteTarget ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
