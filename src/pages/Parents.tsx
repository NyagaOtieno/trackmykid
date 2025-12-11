import { useState, useEffect } from "react";
import { Plus, Edit, Trash, Search } from "lucide-react";
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
import axios from "axios";
import AddParentForm from "./AddParentForm";
import EditParentForm from "./EditParentForm";

interface User {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface Parent {
  id: number;
  user: User | null;
  schoolId: number;
}

interface Student {
  id: number;
  name: string;
  parentId: number;
  bus?: {
    name: string;
    plateNumber: string;
    route: string;
  };
}

export default function ParentsUI() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [addingParent, setAddingParent] = useState<boolean>(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [deleteTarget, setDeleteTarget] = useState<Parent | null>(null);

  const itemsPerPage = 15;
  const SCHOOL_ID = 14;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [parentsRes, studentsRes] = await Promise.all([
        axios.get<{ data: Parent[] }>("https://schooltransport-production.up.railway.app/api/parents"),
        axios.get<{ data: Student[] }>("https://schooltransport-production.up.railway.app/api/students"),
      ]);

      setParents(parentsRes.data.data || []);
      setStudents(studentsRes.data.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async () => {
    const userId = deleteTarget?.user?.id;
    if (!userId) return;

    try {
      await axios.delete(`https://schooltransport-production.up.railway.app/api/users/${userId}`);
      fetchData();
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete parent");
    }
  };

  const handleAddParent = async () => {
    setAddingParent(false);
    fetchData();
  };

  const handleUpdateParent = async () => {
    setEditingParent(null);
    fetchData();
  };

  const filteredParents = parents.filter((p) => {
    const term = searchTerm.toLowerCase();
    const user: Partial<User> = p.user ?? {};
    return (
      user.name?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.phone?.toLowerCase().includes(term)
    );
  });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedParents = filteredParents.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(filteredParents.length / itemsPerPage);

  const studentsByParent: Record<number, Student[]> = {};
  students.forEach((s) => {
    if (!studentsByParent[s.parentId]) studentsByParent[s.parentId] = [];
    studentsByParent[s.parentId].push(s);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold leading-tight">Parents</h2>
          <p className="text-muted-foreground text-sm">
            Manage parent contacts and linked students
          </p>
        </div>
        <div className="flex w-full sm:w-auto sm:justify-end">
          <Button className="w-full sm:w-auto" onClick={() => setAddingParent(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Parent
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border shadow-sm overflow-x-auto max-h-[70vh]">
        <Table className="min-w-[840px] text-sm">
          <TableHeader className="sticky top-0 bg-card/95 backdrop-blur">
            <TableRow>
              <TableHead className="py-3 text-xs uppercase tracking-wide text-muted-foreground">#</TableHead>
              <TableHead className="py-3 text-xs uppercase tracking-wide text-muted-foreground">Name</TableHead>
              <TableHead className="py-3 text-xs uppercase tracking-wide text-muted-foreground">Phone</TableHead>
              <TableHead className="py-3 text-xs uppercase tracking-wide text-muted-foreground">Email</TableHead>
              <TableHead className="py-3 text-xs uppercase tracking-wide text-muted-foreground">Linked Students</TableHead>
              <TableHead className="py-3 text-xs uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  Loading parents...
                </TableCell>
              </TableRow>
            ) : paginatedParents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  No parents found
                </TableCell>
              </TableRow>
            ) : (
              paginatedParents.map((parent, idx) => {
                const user: Partial<User> = parent.user ?? {};
                const linkedStudents = studentsByParent[parent.id] ?? [];
                return (
                  <TableRow
                    key={parent.id}
                    className="hover:bg-muted/40 transition-colors align-middle [&>td]:py-1.5"
                  >
                    <TableCell>{startIndex + idx + 1}</TableCell>
                    <TableCell className="font-medium">{user.name ?? "N/A"}</TableCell>
                    <TableCell>{user.phone ?? "N/A"}</TableCell>
                    <TableCell>{user.email ?? "N/A"}</TableCell>
                    <TableCell>
                      {linkedStudents.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          {linkedStudents.map((s) => (
                            <li key={s.id} className="leading-snug text-foreground">
                              {s.name} ({s.bus?.name ?? "No Bus"} · {s.bus?.plateNumber ?? "N/A"} ·{" "}
                              {s.bus?.route ?? "N/A"})
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">No students</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2 whitespace-nowrap">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingParent(parent)}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(parent)}
                      >
                        <Trash className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <p className="text-sm text-muted-foreground">
          Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredParents.length)} of{" "}
          {filteredParents.length} parents
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Prev
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Add Parent Modal */}
      {addingParent && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-md w-[400px]">
            <h2 className="text-lg font-bold mb-4">Add Parent</h2>
            <AddParentForm onAdded={handleAddParent} onCancel={() => setAddingParent(false)} />
          </div>
        </div>
      )}

      {/* Edit Parent Modal */}
      {editingParent && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-md w-[400px]">
            <h2 className="text-lg font-bold mb-4">Edit Parent</h2>
            <EditParentForm
              parent={editingParent.user ? { ...editingParent.user, id: editingParent.id } : editingParent}
              onUpdated={handleUpdateParent}
              onCancel={() => setEditingParent(null)}
            />
          </div>
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete parent</DialogTitle>
            <DialogDescription>
              {deleteTarget ? `Are you sure you want to delete "${deleteTarget.user?.name ?? "this parent"}"? This cannot be undone.` : ""}
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
