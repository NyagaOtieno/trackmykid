import { useState, useEffect } from "react";
import { Plus, Edit, Trash, Search, UserPlus } from "lucide-react";
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
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import AddParentForm from "./AddParentForm";
import EditParentForm from "./EditParentForm";
import AddChildForm from "./AddChildForm";
import { getBuses, deleteStudent } from "@/lib/api";

interface User {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface Parent {
  id: number;
  user: User | null;
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
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [addingParent, setAddingParent] = useState<boolean>(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [addingChildFor, setAddingChildFor] = useState<Parent | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);

  const itemsPerPage = 15;

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const [parentsRes, studentsRes] = await Promise.all([
        axios.get<{ data: Parent[] }>("https://tmk-api.joshpitah.co.ke/api/parents", { headers: authHeaders }),
        axios.get<{ data: Student[] }>("https://tmk-api.joshpitah.co.ke/api/students", { headers: authHeaders }),
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
    getBuses()
      .then(setBuses)
      .catch((err) => console.error("Failed to load buses", err));
  }, []);

  // Real backend contract: DELETE /api/parents/:parentId
  // (refuses with 400 if the parent still has linked students)
  const handleDelete = async (parent: Parent) => {
    if (!confirm(`Delete ${parent.user?.name || "this parent"}?`)) return;

    try {
      const token = localStorage.getItem("token");
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(`https://tmk-api.joshpitah.co.ke/api/parents/${parent.id}`, { headers: authHeaders });
      toast.success("Parent deleted successfully");
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete parent");
    }
  };

  const handleDeleteChild = async (student: Student) => {
    if (!confirm(`Remove ${student.name}? This cannot be undone.`)) return;
    try {
      await deleteStudent(student.id);
      toast.success("Child removed");
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to remove child");
    }
  };

  const filteredParents = parents.filter((p) => {
    const term = searchTerm.toLowerCase();
    const user = p.user ?? {};
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
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Parents</h2>
          <p className="text-muted-foreground mt-1">
            Manage parent contacts and linked students
          </p>
        </div>
        <Button onClick={() => setAddingParent(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Parent
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
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
      <div className="bg-card rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Linked Students</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading parents...
                </TableCell>
              </TableRow>
            ) : paginatedParents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No parents found
                </TableCell>
              </TableRow>
            ) : (
              paginatedParents.map((parent, idx) => {
                const user = parent.user ?? {};
                const linkedStudents = studentsByParent[parent.id] ?? [];
                return (
                  <TableRow key={parent.id}>
                    <TableCell>{startIndex + idx + 1}</TableCell>
                    <TableCell className="font-medium">{user.name ?? "N/A"}</TableCell>
                    <TableCell>{user.phone ?? "N/A"}</TableCell>
                    <TableCell>{user.email ?? "N/A"}</TableCell>
                    <TableCell>
                      {linkedStudents.length > 0 ? (
                        <ul className="space-y-1">
                          {linkedStudents.map((s) => (
                            <li key={s.id} className="flex items-center gap-2">
                              <span>
                                {s.name} ({s.bus?.name ?? "No Bus"} - {s.bus?.plateNumber ?? "N/A"} -{" "}
                                {s.bus?.route ?? "N/A"})
                              </span>
                              <button
                                type="button"
                                title="Remove child"
                                onClick={() => handleDeleteChild(s)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash className="h-3 w-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">No students</span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 h-7 px-2 text-xs"
                        onClick={() => setAddingChildFor(parent)}
                      >
                        <UserPlus className="h-3 w-3 mr-1" /> Add Child
                      </Button>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
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
                        onClick={() => handleDelete(parent)}
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
            <AddParentForm
              onAdded={() => {
                setAddingParent(false);
                fetchData();
              }}
              onCancel={() => setAddingParent(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Parent Modal */}
      {editingParent && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-md w-[400px]">
            <h2 className="text-lg font-bold mb-4">Edit Parent</h2>
            <EditParentForm
              parent={editingParent}
              onUpdated={() => {
                setEditingParent(null);
                fetchData();
              }}
              onCancel={() => setEditingParent(null)}
            />
          </div>
        </div>
      )}

      {/* Add Child Modal */}
      {addingChildFor && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-md w-[420px]">
            <h2 className="text-lg font-bold mb-4">
              Add Child for {addingChildFor.user?.name ?? "Parent"}
            </h2>
            <AddChildForm
              parent={addingChildFor}
              buses={buses}
              onAdded={() => {
                setAddingChildFor(null);
                fetchData();
              }}
              onCancel={() => setAddingChildFor(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
