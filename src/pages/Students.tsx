import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import toast, { Toaster } from "react-hot-toast";
import AddStudentForm from "./AddStudentForm"; // ✅ Correct local import

const API_BASE = "https://schooltransport-production.up.railway.app/api";

export default function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch all data (students)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_BASE}/students`);
        const studentsData = res.data.data || [];
        setStudents(studentsData);
        setFilteredStudents(studentsData);
      } catch (err) {
        console.error("Error fetching students", err);
        toast.error("Failed to load students");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ✅ Search filter
  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    const filtered = students.filter(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        s.parent?.user?.name?.toLowerCase().includes(lower)
    );
    setFilteredStudents(filtered);
  }, [searchTerm, students]);

  // ✅ Handle refresh after adding student
  const handleStudentAdded = async () => {
    try {
      const res = await axios.get(`${API_BASE}/students`);
      const studentsData = res.data.data || [];
      setStudents(studentsData);
      setFilteredStudents(studentsData);
      setOpen(false);
    } catch (err) {
      console.error("Failed to refresh student list", err);
    }
  };

  if (loading) return <p className="p-4">Loading data...</p>;

  return (
    <div className="p-4">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Students</h2>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Student
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 mb-4">
        <Search className="text-gray-500" />
        <Input
          placeholder="Search by student or parent name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Students Table */}
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Bus</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.grade}</TableCell>
                  <TableCell>{s.parent?.user?.name || "N/A"}</TableCell>
                  <TableCell>{s.parent?.user?.phone || "N/A"}</TableCell>
                  <TableCell>
                    {s.bus ? `${s.bus.name} (${s.bus.plateNumber})` : "-"}
                  </TableCell>
                  <TableCell>{s.school?.name || "-"}</TableCell>
                  <TableCell>
                    📍 {s.latitude?.toFixed(4)}, {s.longitude?.toFixed(4)}
                    <div className="text-xs text-gray-500">
                      (Approx. Fedha Estate, Nairobi)
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500">
                  No students found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Student Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
          </DialogHeader>

          {/* ✅ Render AddStudentForm */}
          <AddStudentForm onSuccess={handleStudentAdded} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
