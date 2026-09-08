import { useEffect, useRef, useState } from "react";
import { Plus, Search, Edit, Trash, Download, Upload } from "lucide-react";
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
import Papa from "papaparse";
import AddStudentForm from "./AddStudentForm"; // ✅ Correct local import
import EditStudentForm from "./EditStudentForm";
import { getBuses, deleteStudent, createStudent } from "@/lib/api";

const API_BASE = "https://tmk-api.joshpitah.co.ke/api";

// Columns expected in the bulk-upload CSV, in order.
// Keep this in sync with what POST /api/students accepts.
const CSV_COLUMNS = [
  "name",
  "grade",
  "latitude",
  "longitude",
  "busId",
  "parentName",
  "parentPhone",
  "parentEmail",
  "parentPassword",
];

const CSV_SAMPLE_ROWS = [
  {
    name: "Jane Wanjiru",
    grade: "Grade 3",
    latitude: "-1.286389",
    longitude: "36.817223",
    busId: "5",
    parentName: "Susan Wanjiru",
    parentPhone: "0711222333",
    parentEmail: "susan.w@brook.com",
    parentPassword: "ParentPass123!",
  },
  {
    name: "Peter Kamau",
    grade: "Grade 5",
    latitude: "-1.290000",
    longitude: "36.820000",
    busId: "5",
    parentName: "James Kamau",
    parentPhone: "0722333444",
    parentEmail: "james.k@brook.com",
    parentPassword: "ParentPass123!",
  },
];

interface BulkRowResult {
  row: number;
  name: string;
  status: "success" | "error";
  message: string;
}

export default function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Bulk upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<BulkRowResult[] | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);

  // ✅ Fetch all data (students)
  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/students`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
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

  useEffect(() => {
    fetchStudents();
    getBuses()
      .then(setBuses)
      .catch((err) => console.error("Failed to load buses", err));
  }, []);

  // ✅ Search filter
  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    const filtered = students.filter(
      (s) =>
        (s.name ?? "").toLowerCase().includes(lower) ||
        s.parent?.user?.name?.toLowerCase().includes(lower)
    );
    setFilteredStudents(filtered);
  }, [searchTerm, students]);

  // ✅ Handle refresh after adding student
  const handleStudentAdded = async () => {
    await fetchStudents();
    setOpen(false);
  };

  const handleStudentUpdated = async () => {
    await fetchStudents();
    setEditingStudent(null);
  };

  const handleDeleteStudent = async (student: any) => {
    if (!confirm(`Remove ${student.name}? This cannot be undone.`)) return;
    try {
      await deleteStudent(student.id);
      toast.success("Student removed");
      fetchStudents();
    } catch (err: any) {
      console.error("Delete student error:", err);
      toast.error(err?.response?.data?.message || "Failed to remove student");
    }
  };

  // ---------------------------------------------------------
  // Bulk CSV: download sample template
  // ---------------------------------------------------------
  const handleDownloadSample = () => {
    const csv = Papa.unparse({
      fields: CSV_COLUMNS,
      data: CSV_SAMPLE_ROWS.map((row) => CSV_COLUMNS.map((col) => (row as any)[col])),
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_sample.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ---------------------------------------------------------
  // Bulk CSV: upload + create students one by one
  // ---------------------------------------------------------
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // reset the input so selecting the same file again re-triggers onChange
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parsed) => {
        const rows = parsed.data as Record<string, string>[];

        if (!rows.length) {
          toast.error("CSV file is empty");
          setUploading(false);
          return;
        }

        const results: BulkRowResult[] = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 2; // +2: header row is line 1, data starts at line 2
          const name = row.name?.trim() || `(row ${rowNum})`;

          try {
            if (!row.name || !row.grade || !row.busId) {
              throw new Error("Missing required field: name, grade, or busId");
            }

            const payload = {
              name: row.name?.trim(),
              grade: row.grade?.trim(),
              latitude: parseFloat(row.latitude),
              longitude: parseFloat(row.longitude),
              busId: parseInt(row.busId, 10),
              parentName: row.parentName?.trim(),
              parentPhone: row.parentPhone?.trim(),
              parentEmail: row.parentEmail?.trim(),
              parentPassword: row.parentPassword?.trim() || "changeme123",
            };

            if (Number.isNaN(payload.latitude) || Number.isNaN(payload.longitude)) {
              throw new Error("Invalid latitude/longitude");
            }
            if (Number.isNaN(payload.busId)) {
              throw new Error("Invalid busId");
            }

            await createStudent(payload);
            results.push({ row: rowNum, name, status: "success", message: "Created" });
          } catch (err: any) {
            const message =
              err?.response?.data?.message || err?.message || "Failed to create";
            results.push({ row: rowNum, name, status: "error", message });
          }
        }

        setUploadResults(results);
        setResultsOpen(true);
        setUploading(false);

        const successCount = results.filter((r) => r.status === "success").length;
        const failCount = results.length - successCount;
        if (failCount === 0) {
          toast.success(`Imported ${successCount} student(s) successfully`);
        } else {
          toast.error(`${successCount} succeeded, ${failCount} failed — see details`);
        }

        await fetchStudents();
      },
      error: (err) => {
        console.error("CSV parse error:", err);
        toast.error("Failed to parse CSV file");
        setUploading(false);
      },
    });
  };

  if (loading) return <p className="p-4">Loading data...</p>;

  return (
    <div className="p-4">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-semibold">Students</h2>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleDownloadSample}>
            <Download className="mr-2 h-4 w-4" /> Sample CSV
          </Button>
          <Button variant="outline" onClick={handleUploadClick} disabled={uploading}>
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Bulk Upload CSV"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelected}
          />
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Student
          </Button>
        </div>
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
              <TableHead className="text-right">Actions</TableHead>
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
                  <TableCell>{s.school?.name || s.tenant?.name || "-"}</TableCell>
                  <TableCell>
                    📍 {s.latitude?.toFixed(4)}, {s.longitude?.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingStudent(s)}
                    >
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteStudent(s)}
                    >
                      <Trash className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500">
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

      {/* Edit Student Modal */}
      <Dialog open={!!editingStudent} onOpenChange={(o) => !o && setEditingStudent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          {editingStudent && (
            <EditStudentForm
              student={editingStudent}
              buses={buses}
              onUpdated={handleStudentUpdated}
              onCancel={() => setEditingStudent(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Results Modal */}
      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Upload Results</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-1">
            {uploadResults?.map((r, i) => (
              <div
                key={i}
                className={`flex items-center justify-between text-sm p-2 rounded ${
                  r.status === "success"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                <span>
                  Row {r.row}: <strong>{r.name}</strong>
                </span>
                <span>{r.status === "success" ? "✅" : `❌ ${r.message}`}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
