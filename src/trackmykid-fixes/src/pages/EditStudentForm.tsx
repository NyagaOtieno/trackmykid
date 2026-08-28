import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { updateStudent } from "@/lib/api";
import toast from "react-hot-toast";

interface Bus {
  id: number;
  name: string;
  plateNumber: string;
}

interface StudentRecord {
  id: number;
  name: string;
  grade?: string;
  busId?: number;
  bus?: { id: number } | null;
}

interface Props {
  student: StudentRecord;
  buses: Bus[];
  onUpdated: () => void;
  onCancel: () => void;
}

/**
 * PUT /api/students/:id accepts a partial body — sending just { busId }
 * reassigns the student to a different bus without touching anything else.
 */
export default function EditStudentForm({ student, buses, onUpdated, onCancel }: Props) {
  const [name, setName] = useState(student.name ?? "");
  const [grade, setGrade] = useState(student.grade ?? "");
  const [busId, setBusId] = useState<string>(
    String(student.busId ?? student.bus?.id ?? "")
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!busId) {
      toast.error("Please select a bus");
      return;
    }

    try {
      setSubmitting(true);
      await updateStudent(student.id, {
        name: name.trim(),
        grade: grade.trim(),
        busId: Number(busId),
      });
      toast.success("Student updated successfully");
      onUpdated();
    } catch (err: any) {
      console.error("Update student error:", err);
      toast.error(err?.response?.data?.message || "Failed to update student");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Student Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <Label>Grade</Label>
        <Input value={grade} onChange={(e) => setGrade(e.target.value)} required />
      </div>

      <div>
        <Label>Bus</Label>
        <Select value={busId} onValueChange={setBusId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a bus" />
          </SelectTrigger>
          <SelectContent>
            {buses.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name} ({b.plateNumber})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
