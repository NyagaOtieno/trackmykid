import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  onAdded: () => void; // parent should refresh list; do not duplicate alerts there
  onCancel: () => void;
}

export default function AddParentForm({ onAdded, onCancel }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // prevent double submit
    if (!name.trim() || !password.trim()) {
      alert("Please provide name and password.");
      return;
    }

    const payload = {
      name: name.trim(),
      email: email.trim() || undefined,
      password: password.trim(),
      phone: phone.trim() || undefined,
      role: "PARENT",
    };

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      const res = await axios.post("https://tmk-api.joshpitah.co.ke/api/users", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      // success codes: 200 or 201 (some backends)
      if (res.status === 201 || res.status === 200) {
        alert("Parent added successfully");
        // reset form locally
        setName("");
        setEmail("");
        setPhone("");
        setPassword("");
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
