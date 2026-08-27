import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ParentRecord {
  id: number;
  user?: {
    id?: number;
    name?: string;
    email?: string;
    phone?: string;
  } | null;
}

interface Props {
  parent: ParentRecord;
  onUpdated: () => void; // parent should re-fetch list
  onCancel: () => void;
}

/**
 * EditParentForm expects the parent object from /api/parents (parent.id and parent.user.id usually present).
 * It issues PUT to /api/users/:userId (user id if present, otherwise parent.id)
 */
export default function EditParentForm({ parent, onUpdated, onCancel }: Props) {
  const user = parent.user ?? null;
  const userIdToUpdate = user?.id ?? parent.id; // prefer user.id but fallback to parent.id
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
      role: "PARENT",
    };
    if (password.trim()) payload.password = password.trim();

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `https://tmk-api.joshpitah.co.ke/api/users/${userIdToUpdate}`,
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
