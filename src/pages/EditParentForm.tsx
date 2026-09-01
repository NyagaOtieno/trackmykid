import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ParentRecord {
  id: number; // Parent record id (NOT the user id)
  user?: {
    id?: number;
    name?: string;
    email?: string;
    phone?: string;
  } | null;
}

interface Props {
  parent: ParentRecord;
  onUpdated: () => void; // parent list should re-fetch after this
  onCancel: () => void;
}

/**
 * Real backend contract: PUT /api/parents/:parentId
 * Body: { name, email, phone, password }
 * The route resolves parent -> user internally and hashes the password
 * server-side; tenantId/role can't be changed from here (enforced server-side).
 */
export default function EditParentForm({ parent, onUpdated, onCancel }: Props) {
  const user = parent.user ?? null;
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!name.trim()) {
      alert("Name is required");
      return;
    }

    const payload: any = {
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
    };
    if (password.trim()) payload.password = password.trim();

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `https://tmk-api.joshpitah.co.ke/api/parents/${parent.id}`,
        payload,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
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
