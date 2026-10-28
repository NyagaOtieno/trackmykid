import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { getSchools, updateUser } from '@/lib/api';

interface EditDriverFormProps {
  driver: { id: number; name: string; email?: string; phone?: string; schoolId: number };
  onUpdated: () => void;
}

interface School {
  id: number;
  name: string;
}

export default function EditDriverForm({ driver, onUpdated }: EditDriverFormProps) {
  const [name, setName] = useState(driver.name);
  const [email, setEmail] = useState(driver.email || '');
  const [phone, setPhone] = useState(driver.phone || '');
  const [password, setPassword] = useState('');
  const [schoolId, setSchoolId] = useState(driver.schoolId);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch schools
  useEffect(() => {
    getSchools().then(setSchools).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateUser(driver.id, {
        name,
        email,
        phone,
        schoolId,
        ...(password ? { password } : {}),
      });
      onUpdated();
    } catch (err) {
      console.error(err);
      alert('Failed to update driver');
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
        <label className="block text-sm font-medium">School</label>
        <Select value={String(schoolId)} onValueChange={(val) => setSchoolId(Number(val))}>
          <SelectTrigger>
            <SelectValue placeholder="Select School" />
          </SelectTrigger>
          <SelectContent>
            {schools.map((school) => (
              <SelectItem key={school.id} value={String(school.id)}>
                {school.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <Button type="button" variant="outline" onClick={onUpdated}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
