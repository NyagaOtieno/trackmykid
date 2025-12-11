import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EditAssistantFormProps {
  assistant: { id: number; name: string; email?: string; phone?: string };
  onSubmit?: (data: { id: number; name: string; email?: string; phone?: string; password?: string }) => void;
  onUpdated?: (data: { id: number; name: string; email?: string; phone?: string; password?: string }) => void;
  onCancel: () => void;
}

export default function EditAssistantForm({ assistant, onSubmit, onUpdated, onCancel }: EditAssistantFormProps) {
  const [name, setName] = useState(assistant.name);
  const [email, setEmail] = useState(assistant.email || '');
  const [phone, setPhone] = useState(assistant.phone || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      id: assistant.id,
      name,
      email,
      phone,
      ...(password ? { password } : {}),
    };

    if (onSubmit) {
      await onSubmit(payload);
    } else if (onUpdated) {
      await onUpdated(payload);
    }
    setLoading(false);
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
        <label className="block text-sm font-medium">Password (optional)</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Leave blank to keep current password"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
