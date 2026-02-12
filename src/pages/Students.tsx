// src/pages/Students.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  Upload,
  Download,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Phone,
  School,
  Bus,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import api, { getStudents, getSchools, getBuses } from "@/api/axiosConfig";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

import toast, { Toaster } from "react-hot-toast";
import AddStudentForm from "./AddStudentForm";

/* =========================
   Utils
========================= */
type UploadResults = { success: number; failed: number; errors: string[] };

function unwrapList(input: any): any[] {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.data)) return input.data;
  if (Array.isArray(input?.data?.data)) return input.data.data;
  if (Array.isArray(input?.items)) return input.items;
  return [];
}

function safeLower(v: any) {
  return String(v ?? "").toLowerCase();
}

// Parse CSV line handling quoted fields + commas
function parseCSV(text: string): any[] {
  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length < 2) throw new Error("CSV must have at least a header and one data row");

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.replace(/^"|"$/g, "").trim());
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]).map((v) => v.replace(/^"|"$/g, "").trim());
    if (values.length !== headers.length) continue;

    const row: any = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`
    );
    const data = await res.json();
    if (data?.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

/* =========================
   Component
========================= */
export default function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadResults, setUploadResults] = useState<UploadResults | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshStudents = async () => {
    const res = await getStudents(); // ✅ token attached by interceptor
    const list = unwrapList(res);
    setStudents(list);
    return list;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await refreshStudents();
      } catch (err: any) {
        console.error("Error fetching students", err);
        toast.error(err?.message || "Failed to load students");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredStudents = useMemo(() => {
    const lower = searchTerm.trim().toLowerCase();
    if (!lower) return students;

    return students.filter((s: any) => {
      const studentName = safeLower(s?.name);
      const grade = safeLower(s?.grade);

      const parentName = safeLower(s?.parent?.user?.name || s?.parentName);
      const parentPhone = safeLower(s?.parent?.user?.phone || s?.parentPhone);

      const busPlate = safeLower(s?.bus?.plateNumber);
      const busName = safeLower(s?.bus?.name);

      const schoolName = safeLower(s?.school?.name);

      return (
        studentName.includes(lower) ||
        grade.includes(lower) ||
        parentName.includes(lower) ||
        parentPhone.includes(lower) ||
        busPlate.includes(lower) ||
        busName.includes(lower) ||
        schoolName.includes(lower)
      );
    });
  }, [students, searchTerm]);

  const handleStudentAdded = async () => {
    try {
      await refreshStudents();
      setOpen(false);
      toast.success("Student added!");
    } catch (err: any) {
      console.error("Failed to refresh students", err);
      toast.error("Student added, but failed to refresh list");
    }
  };

  const downloadSampleCSV = () => {
    const headers = [
      "name",
      "grade",
      "schoolId",
      "busId",
      "parentName",
      "parentPhone",
      "parentEmail",
      "parentPassword",
      "latitude",
      "longitude",
      "location",
    ];

    const sampleData = [
      [
        "John Doe",
        "Grade 5",
        "1",
        "1",
        "Jane Doe",
        "0712345678",
        "jane.doe@example.com",
        "SecurePass123!",
        "-1.286389",
        "36.817223",
        "Nairobi, Kenya",
      ],
    ];

    const csvContent = [
      headers.join(","),
      ...sampleData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "students_sample.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sample CSV downloaded!");
  };

  const handleBulkUpload = async () => {
    if (!csvFile) {
      toast.error("Please select a CSV file");
      return;
    }

    setBulkLoading(true);
    setUploadResults(null);

    try {
      const text = await csvFile.text();
      const rows = parseCSV(text);
      if (!rows.length) throw new Error("No valid data rows found in CSV");

      const [schoolsRes, busesRes] = await Promise.all([getSchools(), getBuses()]);
      const schools = unwrapList(schoolsRes);
      const buses = unwrapList(busesRes);

      const results: UploadResults = { success: 0, failed: 0, errors: [] };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        try {
          const required = ["name", "grade", "parentName", "parentPhone", "parentEmail", "parentPassword"];
          const missing = required.filter((k) => !String(row?.[k] || "").trim());
          if (missing.length) throw new Error(`Row ${rowNum}: Missing fields: ${missing.join(", ")}`);

          // coordinates
          let latitude: number;
          let longitude: number;

          if (row.latitude && row.longitude) {
            latitude = parseFloat(row.latitude);
            longitude = parseFloat(row.longitude);
            if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
              throw new Error(`Row ${rowNum}: Invalid coordinates`);
            }
          } else if (row.location) {
            const coords = await geocodeLocation(String(row.location));
            if (!coords) throw new Error(`Row ${rowNum}: Could not geocode location`);
            latitude = coords.lat;
            longitude = coords.lng;
          } else {
            throw new Error(`Row ${rowNum}: Location or coordinates required`);
          }

          const schoolId = Number(row.schoolId);
          const busId = Number(row.busId);

          if (!schoolId || !schools.find((s: any) => Number(s.id) === schoolId)) {
            throw new Error(`Row ${rowNum}: Invalid schoolId`);
          }

          if (!busId || !buses.find((b: any) => Number(b.id) === busId)) {
            throw new Error(`Row ${rowNum}: Invalid busId`);
          }

          const payload = {
            name: String(row.name).trim(),
            grade: String(row.grade).trim(),
            latitude,
            longitude,
            busId,
            schoolId,
            parentName: String(row.parentName).trim(),
            parentPhone: String(row.parentPhone).trim(),
            parentEmail: String(row.parentEmail).trim(),
            parentPassword: String(row.parentPassword).trim(),
          };

          await api.post("/students", payload); // ✅ token attached
          results.success++;
        } catch (e: any) {
          results.failed++;
          results.errors.push(e?.message || `Row ${rowNum}: Failed`);
        }
      }

      setUploadResults(results);

      if (results.success > 0) {
        toast.success(`Successfully added ${results.success} student(s)!`);
        await refreshStudents();
      }
      if (results.failed > 0) toast.error(`${results.failed} student(s) failed. Check errors below.`);
    } catch (err: any) {
      console.error("Bulk upload error:", err);
      toast.error("Failed to process CSV: " + (err?.message || "Unknown error"));
    } finally {
      setBulkLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Students</h2>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={() => setBulkOpen(true)} variant="outline" className="w-full sm:w-auto text-sm" size="sm">
              <Upload className="mr-2 h-4 w-4" /> Bulk Add
            </Button>

            <Button onClick={() => setOpen(true)} className="w-full sm:w-auto text-sm" size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Student
            </Button>

            <Button
              onClick={async () => {
                try {
                  setLoading(true);
                  await refreshStudents();
                  toast.success("Refreshed");
                } catch (e: any) {
                  toast.error(e?.message || "Refresh failed");
                } finally {
                  setLoading(false);
                }
              }}
              variant="outline"
              className="w-full sm:w-auto text-sm"
              size="sm"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by student, parent, phone, bus or school..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full sm:max-w-sm h-10"
          />
        </div>
      </div>

      {/* Mobile cards */}
      <div className="block md:hidden space-y-3">
        {filteredStudents.length ? (
          filteredStudents.map((s: any, i: number) => (
            <Card key={s.id ?? i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">#{i + 1}</Badge>
                      <h3 className="font-semibold text-base text-gray-900">{s.name}</h3>
                    </div>
                    <Badge variant="outline" className="mt-2 text-xs">{s.grade}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Parent:</span>
                    <span className="font-medium text-gray-900">{s.parent?.user?.name || s.parentName || "N/A"}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium text-gray-900">{s.parent?.user?.phone || s.parentPhone || "N/A"}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Bus className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Bus:</span>
                    <span className="font-medium text-gray-900">
                      {s.bus ? `${s.bus.name || "Bus"} (${s.bus.plateNumber || "N/A"})` : "-"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <School className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">School:</span>
                    <span className="font-medium text-gray-900">{s.school?.name || "-"}</span>
                  </div>

                  <div className="flex items-start gap-2 text-sm pt-1">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span className="font-mono text-xs text-gray-700">
                      {Number(s.latitude).toFixed(4)}, {Number(s.longitude).toFixed(4)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card><CardContent className="p-8 text-center text-gray-500">No students found</CardContent></Card>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto border rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
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
            {filteredStudents.length ? (
              filteredStudents.map((s: any, i: number) => (
                <TableRow key={s.id ?? i} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{i + 1}</TableCell>
                  <TableCell className="font-semibold">{s.name}</TableCell>
                  <TableCell><Badge variant="outline">{s.grade}</Badge></TableCell>
                  <TableCell>{s.parent?.user?.name || s.parentName || "N/A"}</TableCell>
                  <TableCell>{s.parent?.user?.phone || s.parentPhone || "N/A"}</TableCell>
                  <TableCell>
                    {s.bus ? (
                      <span className="text-sm">
                        {s.bus.name || "Bus"} <span className="text-gray-500">({s.bus.plateNumber || "N/A"})</span>
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell>{s.school?.name || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span className="font-mono">
                        {Number(s.latitude).toFixed(4)}, {Number(s.longitude).toFixed(4)}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                  No students found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Student Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-6xl lg:max-w-7xl max-w-[95vw] h-[95vh] max-h-[95vh] p-0 gap-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
            <DialogTitle className="text-2xl font-bold text-gray-900">Add New Student</DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-1">
              Fill out the student details and select a pickup location on the map below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-4 sm:px-6 lg:px-8 pb-6 pt-4">
            <AddStudentForm onSuccess={handleStudentAdded} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 sm:h-6 sm:w-6" />
              Bulk Add Students
            </DialogTitle>
            <DialogDescription className="text-sm">
              Upload a CSV file to add multiple students at once. Download the sample file to see the required format.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Download Sample */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start sm:items-center gap-3 flex-1">
                <Download className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <p className="font-medium text-sm text-blue-900">Need a template?</p>
                  <p className="text-xs text-blue-700">Download our sample CSV file with all required fields</p>
                </div>
              </div>
              <Button
                onClick={downloadSampleCSV}
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-100 w-full sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Sample
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="csv-upload" className="text-sm font-medium">
                Select CSV File
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="csv-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCsvFile(file);
                      setUploadResults(null);
                    }
                  }}
                  className="flex-1"
                />
                {csvFile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCsvFile(null);
                      setUploadResults(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Upload Results */}
            {uploadResults && (
              <Alert className={uploadResults.failed === 0 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
                <div className="flex items-start gap-3">
                  {uploadResults.failed === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">
                          {uploadResults.success} student(s) added successfully
                          {uploadResults.failed > 0 && `, ${uploadResults.failed} failed`}
                        </p>
                        {uploadResults.errors.length > 0 && (
                          <ScrollArea className="max-h-32 mt-2">
                            <ul className="text-xs space-y-1 list-disc list-inside">
                              {uploadResults.errors.slice(0, 10).map((error, idx) => (
                                <li key={idx} className="text-red-700">{error}</li>
                              ))}
                              {uploadResults.errors.length > 10 && (
                                <li className="text-muted-foreground">
                                  ... and {uploadResults.errors.length - 10} more errors
                                </li>
                              )}
                            </ul>
                          </ScrollArea>
                        )}
                      </div>
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setBulkOpen(false);
                setCsvFile(null);
                setUploadResults(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              disabled={bulkLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button onClick={handleBulkUpload} disabled={!csvFile || bulkLoading} className="w-full sm:w-auto">
              {bulkLoading ? "Processing..." : (
                <>
                  <Upload className="mr-2 h-4 w-4" /> Upload & Process
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
