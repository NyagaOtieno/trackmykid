import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface School { id: number; name: string; }
interface ParentRecord {
  id: number;
  user?: {
    id?: number;
    name?: string;
    email?: string;
    phone?: string;
    schoolId?: number;
  } | null;
}

interface Props {
  parent: ParentRecord;
  schools?: School[]; // optional; if not provided this component will fetch
  onUpdated: () => void; // parent should re-fetch list
  onCancel: () => void;
}

/**
 * EditParentForm expects the parent object from /api/parents (parent.id and parent.user.id usually present).
 * It issues PUT to /api/users/:userId (user id if present, otherwise parent.id)
 */
export default function EditParentForm({ parent, schools: initialSchools, onUpdated, onCancel }: Props) {
  const user = parent.user ?? null;
  const userIdToUpdate = user?.id ?? parent.id; // prefer user.id but fallback to parent.id
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [password, setPassword] = useState("");
  const [schoolId, setSchoolId] = useState<number | null>(user?.schoolId ?? null);

  const [schools, setSchools] = useState<School[]>(initialSchools ?? []);
  const [loadingSchools, setLoadingSchools] = useState(!initialSchools);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialSchools && initialSchools.length) {
      setSchools(initialSchools);
      setLoadingSchools(false);
      return;
    }
    let cancelled = false;
    async function fetchSchools() {
      try {
        const res = await axios.get("https://schooltransport-production.up.railway.app/api/schools");
        const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : [];
        if (!cancelled) setSchools(arr);
      } catch (err) {
        console.error("Failed to fetch schools", err);
      } finally {
        if (!cancelled) setLoadingSchools(false);
      }
    }
    fetchSchools();
    return () => { cancelled = true; };
  }, [initialSchools]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!name.trim()) {
      alert("Name is required");
      return;
    }
    if (!schoolId) {
      alert("Please select a school");
      return;
    }

    const payload: any = {
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      role: "PARENT",
      schoolId,
    };
    if (password.trim()) payload.password = password.trim();

    try {
      setSubmitting(true);
      const res = await axios.put(
        `https://schooltransport-production.up.railway.app/api/users/${userIdToUpdate}`,
        payload
      );
      if (res.status === 200 || res.status === 201) {
        alert("Parent updated successfully");
        setPassword("");
        onUpdated();
      } else {
        console.error("Unexpected update response", res.data);
        alert("Failed to update parent");
      }
    } catch (err: any) {
      console.error("Update parent error:", err);
      alert(err?.response?.data?.message || "Failed to update parent");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium">Email</label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium">Phone</label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium">Password (leave blank to keep current)</label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium">School</label>
        <Select
          value={schoolId ? String(schoolId) : ""}
          onValueChange={(v) => setSchoolId(Number(v))}
          disabled={loadingSchools || schools.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={loadingSchools ? "Loading schools..." : "Select a school"} />
          </SelectTrigger>
          <SelectContent>
            {schools.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Updating..." : "Update Parent"}
        </Button>
      </div>
    </form>
  );
}
