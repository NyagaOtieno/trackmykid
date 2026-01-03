import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Bus, School, MapPin, Users } from "lucide-react";
import axios from "axios";

export default function AddBusForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ 
    name: "", 
    plateNumber: "", 
    route: "", 
    capacity: 35, // Matches your Postman body
    driverId: "", 
    assistantId: "", 
    schoolId: "" 
  });

  // Fetching Schools, Users, and existing Buses
  const { data: schools, isLoading: sLoading } = useQuery({ 
    queryKey: ["schools"], 
    queryFn: () => axios.get("https://schooltransport-production.up.railway.app/api/schools", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    }).then(res => res.data)
  });

  const { data: allUsers, isLoading: uLoading } = useQuery({ 
    queryKey: ["users"], 
    queryFn: () => axios.get("https://schooltransport-production.up.railway.app/api/users", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    }).then(res => res.data)
  });

  const { data: buses, isLoading: bLoading } = useQuery({ 
    queryKey: ["buses"], 
    queryFn: () => axios.get("https://schooltransport-production.up.railway.app/api/buses", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    }).then(res => res.data)
  });

  // Filter Logic
  const busyDriverIds = buses?.map((b: any) => String(b.driverId)) || [];
  const busyAssistantIds = buses?.map((b: any) => String(b.assistantId)) || [];

  const availableDrivers = allUsers?.filter((u: any) => 
    u.role?.toUpperCase() === "DRIVER" && !busyDriverIds.includes(String(u.id))
  ) || [];

  const availableAssistants = allUsers?.filter((u: any) => 
    u.role?.toUpperCase() === "ASSISTANT" && !busyAssistantIds.includes(String(u.id))
  ) || [];

  const handleSave = async () => {
    try {
      // Mapping the state to your EXACT Postman JSON structure
      const payload = {
        name: form.name,
        plateNumber: form.plateNumber,
        capacity: Number(form.capacity),
        route: form.route,
        driverId: Number(form.driverId),
        assistantId: Number(form.assistantId),
        schoolId: Number(form.schoolId)
      };

      await axios.post("https://schooltransport-production.up.railway.app/api/buses", payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      toast.success("Bus created successfully!");
      queryClient.invalidateQueries({ queryKey: ["buses"] });
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Check if all IDs are selected correctly");
    }
  };

  if (uLoading || bLoading || sLoading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

  const selectStyle = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none";

  return (
    <div className="space-y-4 p-1">
      <DialogTitle className="text-xl font-bold flex items-center gap-2"><Bus /> New Bus</DialogTitle>
      <DialogDescription>Fill details exactly as required by the system.</DialogDescription>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input placeholder="Evening Express" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Plate Number</Label>
          <Input placeholder="KBB456Y" value={form.plateNumber} onChange={e => setForm({...form, plateNumber: e.target.value})} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Route</Label>
          <Input placeholder="Route B" value={form.route} onChange={e => setForm({...form, route: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Capacity</Label>
          <Input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: Number(e.target.value)})} />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1"><School size={14}/> School</Label>
        <select className={selectStyle} value={form.schoolId} onChange={e => setForm({...form, schoolId: e.target.value})}>
          <option value="">-- Choose School --</option>
          {schools?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Driver</Label>
          <select className={selectStyle} value={form.driverId} onChange={e => setForm({...form, driverId: e.target.value})}>
            <option value="">-- Select --</option>
            {availableDrivers.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Assistant</Label>
          <select className={selectStyle} value={form.assistantId} onChange={e => setForm({...form, assistantId: e.target.value})}>
            <option value="">-- Select --</option>
            {availableAssistants.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      <Button 
        className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold" 
        onClick={handleSave}
        disabled={!form.driverId || !form.schoolId || !form.name}
      >
        Submit to API
      </Button>

      <div className="mt-2 text-[10px] text-gray-500 italic">
        * System check: {availableDrivers.length} available drivers | {schools?.length} schools found.
      </div>
    </div>
  );
}