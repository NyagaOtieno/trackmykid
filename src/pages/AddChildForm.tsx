import { useState } from "react";
import axios from "axios";
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
import toast from "react-hot-toast";

interface Bus {
  id: number;
  name: string;
  plateNumber: string;
}

interface ParentRecord {
  id: number;
  user?: { name?: string; phone?: string; email?: string } | null;
}

interface Props {
  parent: ParentRecord;
  buses: Bus[];
  onAdded: () => void;
  onCancel: () => void;
}

/**
 * POST /api/students has no direct parentId param — it finds-or-creates a
 * parent by matching parentPhone/parentEmail. Sending this parent's existing
 * phone/email reuses their existing Parent+User record instead of creating
 * a new one, effectively "adding a child" to them.
 */
export default function AddChildForm({ parent, buses, onAdded, onCancel }: Props) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [busId, setBusId] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const geocodeLocation = async (loc: string) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(loc)}`
      );
      const data = await res.json();
      if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      return null;
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!name.trim() || !grade.trim() || !busId) {
      toast.error("Name, grade and bus are required.");
      return;
    }
    if (!parent.user?.phone && !parent.user?.email) {
      toast.error("This parent has no phone or email on file — can't link a child to them.");
      return;
    }

    try {
      setSubmitting(true);

      const geocoded = location.trim() ? await geocodeLocation(location.trim()) : null;
      // Fallback to Nairobi CBD if geocoding fails/omitted — backend requires
      // a valid lat/lng, and the admin can fix the exact pickup point later.
      const latitude = geocoded?.lat ?? -1.286389;
      const longitude = geocoded?.lng ?? 36.817223;

      const token = localStorage.getItem("token");
      await axios.post(
        "https://tmk-api.joshpitah.co.ke/api/students",
        {
          name: name.trim(),
          grade: grade.trim(),
          busId: Number(busId),
          latitude,
          longitude,
          parentPhone: parent.user?.phone,
          parentEmail: parent.user?.email,
          parentName: parent.user?.name,
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      toast.success("Child added successfully");
      onAdded();
    } catch (err: any) {
      console.error("Add child error:", err);
      toast.error(err?.response?.data?.message || "Failed to add child");
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
        <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Grade 5" required />
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

      <div>
        <Label>Pickup Location (optional)</Label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Fedha Estate, Nairobi"
        />
        <p className="text-xs text-gray-500 mt-1">
          Leave blank to set a default location and adjust later.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Adding..." : "Add Child"}
        </Button>
      </div>
    </form>
  );
}
