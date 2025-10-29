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
interface Props {
  schools?: School[]; // optional: parents UI passes this to avoid double fetch
  onAdded: () => void; // parent should refresh list; do not duplicate alerts there
  onCancel: () => void;
}

export default function AddParentForm({ schools: initialSchools, onAdded, onCancel }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [schoolId, setSchoolId] = useState<number | null>(null);

  const [schools, setSchools] = useState<School[]>(initialSchools ?? []);
  const [loadingSchools, setLoadingSchools] = useState(!initialSchools);
  const [submitting, setSubmitting] = useState(false);

  // If parent component didn't hand schools in, fetch them here
  useEffect(() => {
    let cancelled = false;
    if (initialSchools && initialSchools.length) {
      setSchools(initialSchools);
      setLoadingSchools(false);
      return;
    }
    async function fetchSchools() {
      try {
        const res = await axios.get("https://schooltransport-production.up.railway.app/api/schools");
        // flexibly handle res shapes
        const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : [];
        if (!cancelled) setSchools(arr);
      } catch (err) {
        console.error("Failed to fetch schools:", err);
      } finally {
        if (!cancelled) setLoadingSchools(false);
      }
    }
    fetchSchools();
    return () => { cancelled = true; };
  }, [initialSchools]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // prevent double submit
    if (!name.trim() || !password.trim() || !schoolId) {
      alert("Please provide name, password and select a school.");
      return;
    }

    const payload = {
      name: name.trim(),
      email: email.trim() || undefined,
      password: password.trim(),
      phone: phone.trim() || undefined,
      role: "PARENT",
      schoolId,
    };

    try {
      setSubmitting(true);
      const res = await axios.post("https://schooltransport-production.up.railway.app/api/users", payload);
      // success codes: 200 or 201 (some backends)
      if (res.status === 201 || res.status === 200) {
        alert("Parent added successfully");
        // reset form locally
        setName("");
        setEmail("");
        setPhone("");
        setPassword("");
        setSchoolId(null);
        onAdded(); // parent will re-fetch; do NOT show another alert there
      } else {
        console.error("Unexpected response:", res.data);
        alert("Failed to add parent");
      }
    } catch (err: any) {
      console.error("Add parent error:", err);
      alert(err?.response?.data?.message || "Failed to add parent");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
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
        <label className="block text-sm font-medium">Password</label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
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
          {submitting ? "Adding..." : "Add Parent"}
        </Button>
      </div>
    </form>
  );
}
