import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash, Download } from "lucide-react";
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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { getBuses, deleteBus } from "@/lib/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import AddBusForm from "@/pages/AddBusForm";

interface Bus {
  id: number;
  name: string;
  plateNumber: string;
  route: string;
  capacity: number;
  isMoving: boolean;
}

export default function Buses() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch Buses
  const { data: buses = [], isLoading, isError } = useQuery({
    queryKey: ["buses"],
    queryFn: getBuses,
    staleTime: 1000 * 60 * 5,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBus(id),
    onSuccess: () => {
      toast.success("Bus deleted successfully");
      queryClient.invalidateQueries(["buses"]);
    },
  });

  // Sorting
  const sortedBuses = useMemo(() => {
    return [...buses].sort((a, b) => {
      const valA = (a as any)[sortConfig.key] ?? "";
      const valB = (b as any)[sortConfig.key] ?? "";
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [buses, sortConfig]);

  // Filtering
  const filteredBuses = useMemo(() => {
    if (!searchTerm) return sortedBuses;
    const search = searchTerm.toLowerCase();
    return sortedBuses.filter(
      (bus) =>
        bus.name.toLowerCase().includes(search) ||
        bus.plateNumber.toLowerCase().includes(search) ||
        bus.route.toLowerCase().includes(search)
    );
  }, [searchTerm, sortedBuses]);

  // Pagination
  const totalPages = Math.ceil(filteredBuses.length / itemsPerPage);
  const paginatedBuses = filteredBuses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export Helpers
  const exportCSV = () => {
    const csv = Papa.unparse(buses);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "buses.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(buses);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Buses");
    XLSX.writeFile(workbook, "buses.xlsx");
  };

  // Handlers
  const handleSort = (key: keyof Bus) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this bus?")) {
      deleteMutation.mutate(id);
    }
  };

  const openDialog = (bus: Bus | null = null) => {
    setSelectedBus(bus);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Buses</h2>
          <p className="text-muted-foreground mt-1">Manage fleet and bus assignments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" /> Add Bus
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search buses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {["name", "plateNumber", "route", "capacity", "isMoving"].map((col) => (
                <TableHead key={col} onClick={() => handleSort(col as keyof Bus)}>
                  {col.charAt(0).toUpperCase() + col.slice(1)}{" "}
                  {sortConfig.key === col && (sortConfig.direction === "asc" ? "▲" : "▼")}
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
                  <TableCell className="font-medium">{bus.name ?? "-"}</TableCell>
                  <TableCell>{bus.plateNumber ?? "-"}</TableCell>
                  <TableCell>{bus.route ?? "-"}</TableCell>
                  <TableCell>{bus.capacity ?? "-"}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        bus.isMoving
                          ? "bg-red-500/10 text-red-500"
                          : "bg-green-500/10 text-green-500"
                      }`}
                    >
                      {bus.isMoving ? "Moving" : "Stopped"}
                    </span>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openDialog(bus)}>
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

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <span>
          Page {currentPage} of {totalPages || 1}
        </span>
        <div className="flex gap-2">
          <Button disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
            First
          </Button>
          <Button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
            Prev
          </Button>
          <Button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </Button>
          <Button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(totalPages)}
          >
            Last
          </Button>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild />
        <DialogContent className="max-w-lg">
          <AddBusForm
            bus={selectedBus}
            onSuccess={() => {
              queryClient.invalidateQueries(["buses"]);
              setIsDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
