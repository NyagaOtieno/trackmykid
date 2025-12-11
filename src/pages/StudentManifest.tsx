import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Student {
  id: number;
  name: string;
  grade: string;
  busId: number;
  parentId: number;
}

interface Manifest {
  id: number;
  studentId: number;
  status: "CHECKED_IN" | "CHECKED_OUT" | "NOT_CHECKED";
  date?: string;
  student: Student;
}

const fetchStudents = async () => {
  const res = await axios.get("https://schooltransport-production.up.railway.app/api/students");
  return res.data.data as Student[];
};

const fetchManifests = async () => {
  const res = await axios.get("https://schooltransport-production.up.railway.app/api/manifests");
  return res.data as Manifest[];
};

export default function StudentManifest() {
  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["students"],
    queryFn: fetchStudents,
    refetchInterval: 10000, // refresh every 10 seconds
  });

  const { data: manifests = [], isLoading: manifestsLoading } = useQuery<Manifest[]>({
    queryKey: ["manifests"],
    queryFn: fetchManifests,
    refetchInterval: 10000,
  });

  if (studentsLoading || manifestsLoading) return <div>Loading...</div>;

  // Compute checked-in and checked-out counts
  const checkedInIds = manifests.filter(m => m.status === "CHECKED_IN").map(m => m.studentId);
  const checkedOutIds = manifests.filter(m => m.status === "CHECKED_OUT").map(m => m.studentId);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Badge>Total Students: {students.length}</Badge>
        <Badge className="bg-green-600 text-white hover:bg-green-700">Checked In: {checkedInIds.length}</Badge>
        <Badge variant="destructive">Checked Out: {checkedOutIds.length}</Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map(student => {
            const latestManifest = manifests
              .filter(m => m.studentId === student.id)
              .sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime())[0];

            const status = latestManifest?.status || "NOT_CHECKED";

            return (
              <TableRow key={student.id}>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.grade}</TableCell>
                <TableCell>
                  {status === "CHECKED_IN" && <Badge className="bg-green-600 text-white hover:bg-green-700">Checked In</Badge>}
                  {status === "CHECKED_OUT" && <Badge variant="destructive">Checked Out</Badge>}
                  {status === "NOT_CHECKED" && <Badge>Not Checked</Badge>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {students.length === 0 && <div>No students found</div>}
    </div>
  );
}
