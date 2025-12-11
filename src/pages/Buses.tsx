import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash, Download, BusFront } from "lucide-react";
import { useState, useMemo } from "react";
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
  const [selectedBus, setSelectedBus] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  // Fetch Buses
  const {
    data: buses = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["buses"],
    queryFn: getBuses,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBus(id),
    onSuccess: () => {
      toast.success("Bus deleted successfully");
      queryClient.invalidateQueries(["buses"]);
    },
  });

  // Handle Sorting
  const sortedBuses = useMemo(() => {
    if (!buses) return [];
    return [...buses].sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [buses, sortConfig]);

  // Handle Filtering
  const filteredBuses = sortedBuses.filter((bus) => {
    const search = searchTerm.toLowerCase();
    return (
      bus.name.toLowerCase().includes(search) ||
      bus.plateNumber.toLowerCase().includes(search) ||
      bus.route.toLowerCase().includes(search)
    );
  });

  // Pagination
  const paginatedBuses = filteredBuses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
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
  const handleSort = (key: string) => {
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
          <Button onClick={() => handleDialogOpen()} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" /> Add Bus
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search buses..."
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
          paginatedBuses.map((bus) => (
            <Card key={bus.id} className="border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{bus.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{bus.plateNumber}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      bus.isMoving ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"
                    }`}
                  >
                    {bus.isMoving ? "Moving" : "Stopped"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Route</p>
                    <p className="font-medium">{bus.route || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Capacity</p>
                    <p className="font-medium">{bus.capacity}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDialogOpen(bus)}>
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
              {["Name", "Plate Number", "Route", "Capacity", "Status"].map((col) => (
                <TableHead key={col} onClick={() => handleSort(col.toLowerCase())}>
                  {col}{" "}
                  {sortConfig.key === col.toLowerCase() &&
                    (sortConfig.direction === "asc" ? "▲" : "▼")}
                </TableHead>
              ))}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-red-500">
                  Failed to load buses
                </TableCell>
              </TableRow>
            ) : paginatedBuses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No buses found
                </TableCell>
              </TableRow>
            ) : (
              paginatedBuses.map((bus) => (
                <TableRow key={bus.id}>
                  <TableCell className="font-medium">{bus.name}</TableCell>
                  <TableCell>{bus.plateNumber}</TableCell>
                  <TableCell>{bus.route}</TableCell>
                  <TableCell>{bus.capacity}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        bus.isMoving ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                      }`}
                    >
                      {bus.isMoving ? "Moving" : "Stopped"}
                    </span>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDialogOpen(bus)}>
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
          Page {currentPage} of {totalPages || 1}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
            First
          </Button>
          <Button size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
            Prev
          </Button>
          <Button size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
            Next
          </Button>
          <Button size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>
            Last
          </Button>
        </div>
      </div>

      {/* Dialog for Add/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild></DialogTrigger>
        <DialogContent className="w-[92vw] sm:w-[640px] md:w-[760px] max-w-[760px] p-0 border-none bg-transparent shadow-none">
          <div className="bg-background border rounded-xl sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
            <AddBusForm
              bus={selectedBus}
              embedded
              onSuccess={() => {
                queryClient.invalidateQueries(["buses"]);
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
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteMutation.isLoading}>
              {deleteMutation.isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
