import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSchools, createAssistant } from '@/lib/api';

interface School {
  id: number;
  name: string;
}

interface AddAssistantFormProps {
  onAdded: () => void; // Callback to refresh list or close modal
  onCancel: () => void;
}

export default function AddAssistantForm({ onAdded, onCancel }: AddAssistantFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch schools for dropdown
  useEffect(() => {
    async function fetchSchools() {
      try {
        const data = await getSchools();
        setSchools(data);
      } catch (err) {
        console.error('Failed to load schools', err);
      }
    }
    fetchSchools();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) {
      alert('Please select a school');
      return;
    }

    setLoading(true);
    try {
      await createAssistant({
        name,
        email,
        phone,
        password,
        role: 'ASSISTANT',
        schoolId,
      });
      alert('Assistant created successfully');
      onAdded(); // Close modal or refresh list
    } catch (err) {
      console.error(err);
      alert('Failed to create assistant');
    } finally {
      setLoading(false);
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
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div>
        <label className="block text-sm font-medium">Phone</label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </div>

      <div>
        <label className="block text-sm font-medium">Password</label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>

      <div>
        <label className="block text-sm font-medium">School</label>
        <Select onValueChange={(value) => setSchoolId(Number(value))}>
          <SelectTrigger>
            <SelectValue placeholder="Select a school" />
          </SelectTrigger>
          <SelectContent>
            {schools.map((school) => (
              <SelectItem key={school.id} value={school.id.toString()}>
                {school.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Add Assistant'}
        </Button>
      </div>
    </form>
  );
}
