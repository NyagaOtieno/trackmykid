import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast"; 
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, ShieldCheck, AlertCircle, Info, Bus } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L, { LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";

// Marker Icon
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [30, 45],
  iconAnchor: [15, 45],
});

// Axios instance
const api = axios.create({
  baseURL: "https://schooltransport-production.up.railway.app/api",
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Location Picker
function LocationPicker({ onPick }: { onPick: (coords: { lat: number; lng: number; address?: string }) => void }) {
  useMapEvents({
    async click(e: LeafletMouseEvent) {
      const { lat, lng } = e.latlng;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        const address = data?.display_name?.split(",").slice(0, 3).join(", ") || "Selected Location";
        onPick({ lat, lng, address });
      } catch {
        onPick({ lat, lng });
      }
    },
  });
  return null;
}

export default function AddStudentForm({ onSuccess, editData }: { onSuccess?: () => void; editData?: any }) {
  const [schools, setSchools] = useState<any[]>([]);
  const [allBuses, setAllBuses] = useState<any[]>([]);
  const [filteredBuses, setFilteredBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ 
    lat: editData?.latitude || null, 
    lng: editData?.longitude || null 
  });

  const [form, setForm] = useState({
    name: editData?.name || "",
    grade: editData?.grade || "",
    busId: editData?.busId || "",
    schoolId: editData?.schoolId || "",
    parentName: editData?.parentName || "",
    parentPhone: editData?.parentPhone || "",
    parentEmail: editData?.parentEmail || "",
    parentPassword: "",
    confirmPassword: "",
    location: editData?.location || "",
  });

  const validatePassword = (pwd: string) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(pwd);
  };

  // Fetch schools and buses
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [schoolsRes, busesRes] = await Promise.all([
          api.get("/schools"),
          api.get("/buses"),
        ]);
        setSchools(schoolsRes.data);
        setAllBuses(busesRes.data);
      } catch (err) {
        toast.error("Failed to load data.");
      }
    };
    fetchData();
  }, []);

  // Filter buses by school
  useEffect(() => {
    if (form.schoolId) {
      const filtered = allBuses.filter(bus => String(bus.schoolId) === String(form.schoolId));
      setFilteredBuses(filtered);
    }
  }, [form.schoolId, allBuses]);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword(form.parentPassword)) {
      toast.error("Parent password must be 8+ characters, include uppercase, number, and special symbol.", { position: "top-center" });
      return;
    }

    if (form.parentPassword !== form.confirmPassword) {
      toast.error("Passwords do not match.", { position: "top-center" });
      return;
    }

    if (!coords.lat || !coords.lng) {
      toast.error("Please pick a location on the map.", { position: "top-center" });
      return;
    }

    if (!form.busId || !form.schoolId) {
      toast.error("Please select school and bus.", { position: "top-center" });
      return;
    }

    setLoading(true);
    const mainToast = toast.loading("Saving student...", { position: "top-center" });

    try {
      // Send request to create student with parent info
      const res = await api.post("/students", {
        name: form.name,
        grade: form.grade,
        latitude: Number(coords.lat),
        longitude: Number(coords.lng),
        busId: Number(form.busId),
        schoolId: Number(form.schoolId),
        parentName: form.parentName,
        parentPhone: form.parentPhone,
        parentEmail: form.parentEmail
      });

      toast.success("✅ Student created successfully!", { id: mainToast });
      onSuccess?.();

      // Reset form
      setForm({
        name: "",
        grade: "",
        busId: "",
        schoolId: "",
        parentName: "",
        parentPhone: "",
        parentEmail: "",
        parentPassword: "",
        confirmPassword: "",
        location: "",
      });
      setCoords({ lat: null, lng: null });

    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to create student.", { id: mainToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-white">
      <ScrollArea className="h-full px-6">
        <form onSubmit={handleSubmit} className="space-y-8 py-6 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: Student Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="h-7 w-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">1</span>
                Student Info
              </h3>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Input required value={form.grade} onChange={e => setForm({...form, grade: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>School</Label>
                  <select className="flex h-10 w-full rounded-md border border-input px-3 bg-white text-sm"
                    value={form.schoolId} onChange={e => setForm({...form, schoolId: e.target.value})} required>
                    <option value="">Select School</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Bus size={14}/> Assigned Bus & Plate</Label>
                  <select className="flex h-10 w-full rounded-md border border-input px-3 bg-white text-sm disabled:opacity-50"
                    value={form.busId} onChange={e => setForm({...form, busId: e.target.value})} required disabled={!form.schoolId}>
                    <option value="">{form.schoolId ? "Select Bus" : "← Select School"}</option>
                    {filteredBuses.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} — [{b.plateNumber || 'N/A'}]
                      </option>
                    ))}
                  </select>
              </div>
            </div>

            {/* Right: Parent Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="h-7 w-7 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">2</span>
                Parent Info
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Name</Label>
                    <Input required value={form.parentName} onChange={e => setForm({...form, parentName: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input required type="tel" value={form.parentPhone} onChange={e => setForm({...form, parentPhone: e.target.value})} placeholder="0712..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input required type="email" value={form.parentEmail} onChange={e => setForm({...form, parentEmail: e.target.value})} />
              </div>
              
              <div className="space-y-2 relative">
                <Label>Password</Label>
                <div className="relative">
                  <Input required type={showPassword ? "text" : "password"} value={form.parentPassword} onChange={e => setForm({...form, parentPassword: e.target.value})} className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-gray-400">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className={`flex items-start gap-1.5 mt-1 text-[11px] leading-tight ${form.parentPassword && !validatePassword(form.parentPassword) ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                    <Info size={13} className="mt-0.5 shrink-0" />
                    <p>8+ characters, including Uppercase, Number, and Special Symbol.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Confirm</Label>
                <div className="relative">
                  <Input required type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} 
                    className={form.confirmPassword && form.parentPassword !== form.confirmPassword ? "border-red-500 pr-10" : "pr-10"} />
                  {form.confirmPassword && (
                    <div className="absolute right-3 top-2.5">
                      {form.parentPassword === form.confirmPassword ? <ShieldCheck size={18} className="text-green-500" /> : <AlertCircle size={18} className="text-red-500" />}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
               <span className="h-7 w-7 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm">3</span>
               Pickup Point
            </h3>
            <Input readOnly value={form.location} className="bg-slate-50 italic text-sm" placeholder="Pick on map..." />
            <div className="h-[300px] w-full rounded-xl border-2 overflow-hidden shadow-inner">
              <MapContainer center={[-1.286389, 36.817223]} zoom={12} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker onPick={p => {
                  setCoords({ lat: p.lat, lng: p.lng });
                  if (p.address) setForm({...form, location: p.address});
                }} />
                {coords.lat && <Marker position={[coords.lat, coords.lng]} icon={markerIcon} />}
              </MapContainer>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-14 text-lg font-bold transition-transform active:scale-95">
            {loading ? "Registering..." : "Complete Student Registration"}
          </Button>
        </form>
      </ScrollArea>
    </div>
  );
}
