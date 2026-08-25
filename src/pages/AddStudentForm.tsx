import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet marker icon
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [30, 45],
  iconAnchor: [15, 45],
});

// Map click with reverse geocoding
function LocationPicker({ onPick }: { onPick: (coords: { lat: number; lng: number; address?: string }) => void }) {
  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
        );
        const data = await res.json();
        const address = data?.display_name?.split(",").slice(0, 3).join(", ") || "Unknown location";
        onPick({ lat, lng, address });
      } catch {
        onPick({ lat, lng });
      }
    },
  });
  return null;
}

export default function AddStudentForm({ onSuccess }: { onSuccess?: () => void }) {
  const [schools, setSchools] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  const [form, setForm] = useState({
    name: "",
    grade: "",
    busId: "",
    schoolId: "",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    parentPassword: "",
    location: "",
  });

  // Load schools and buses
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [schoolsRes, busesRes] = await Promise.all([
          axios.get("https://schooltransport-production.up.railway.app/api/schools"),
          axios.get("https://schooltransport-production.up.railway.app/api/buses"),
        ]);
        setSchools(schoolsRes.data);
        setBuses(busesRes.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load schools or buses.");
      }
    };
    fetchData();
  }, []);

  // Convert typed location to coords
  const geocodeLocation = async (location: string) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`);
      const data = await res.json();
      if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      throw new Error("Location not found");
    } catch {
      toast.error("Could not locate the area. Try typing more precisely.");
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Ensure coords
      let latitude = coords.lat;
      let longitude = coords.lng;
      if (!latitude || !longitude) {
        const geocoded = await geocodeLocation(form.location);
        if (!geocoded) throw new Error("Pickup location required.");
        latitude = geocoded.lat;
        longitude = geocoded.lng;
      }

      // Ensure IDs are numbers
      const busId = Number(form.busId);
      const schoolId = Number(form.schoolId);
      if (!busId || !schoolId) throw new Error("Select a Bus and a School.");

      // Ensure parent fields
      if (!form.parentName || !form.parentPhone || !form.parentEmail || !form.parentPassword)
        throw new Error("Parent details and password required.");

      const payload = {
        name: form.name,
        grade: form.grade,
        latitude,
        longitude,
        busId,
        schoolId,
        parentName: form.parentName,
        parentPhone: form.parentPhone,
        parentEmail: form.parentEmail,
        parentPassword: form.parentPassword,
      };

      await axios.post("https://schooltransport-production.up.railway.app/api/students", payload, {
        headers: { "Content-Type": "application/json" },
      });

      toast.success("✅ Student added successfully!");
      onSuccess?.();
      setForm({ name: "", grade: "", busId: "", schoolId: "", parentName: "", parentPhone: "", parentEmail: "", parentPassword: "", location: "" });
      setCoords({ lat: null, lng: null });
    } catch (err: any) {
      console.error(err);
      toast.error("❌ Failed to add student: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center p-6 md:p-10 bg-gray-50 min-h-screen overflow-y-auto">
      <Card className="w-full max-w-7xl shadow-lg border border-gray-200 bg-white rounded-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-gray-800">Add New Student</CardTitle>
          <p className="text-gray-500 text-sm mt-1">Fill out the student details and select a pickup location.</p>
        </CardHeader>

        <CardContent className="max-h-[calc(100vh-200px)] overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* LEFT */}
            <div className="space-y-5">
              <div>
                <Label>Full Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Student Name" required />
              </div>
              <div>
                <Label>Grade</Label>
                <Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="Grade 5" required />
              </div>
              <div>
                <Label>School</Label>
                <Select value={form.schoolId} onValueChange={(val) => setForm({ ...form, schoolId: val })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select School" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bus</Label>
                <Select value={form.busId} onValueChange={(val) => setForm({ ...form, busId: val })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Bus" />
                  </SelectTrigger>
                  <SelectContent>
                    {buses.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name} ({b.plateNumber})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* RIGHT */}
            <div className="space-y-5">
              <div>
                <Label>Parent Name</Label>
                <Input value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} placeholder="Jane Doe" required />
              </div>
              <div>
                <Label>Parent Phone</Label>
                <Input type="tel" value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} placeholder="07XXXXXXXX" required />
              </div>
              <div>
                <Label>Parent Email</Label>
                <Input type="email" value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} placeholder="example@email.com" required />
              </div>
              <div>
                <Label>Parent Password</Label>
                <Input type="password" value={form.parentPassword} onChange={(e) => setForm({ ...form, parentPassword: e.target.value })} placeholder="Set a password for parent" required />
              </div>
              <div>
                <Label>Pickup Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Type or click on map" />
                <p className="text-xs text-gray-500 mt-1">Type a place name or select on the map below.</p>
              </div>
            </div>

            {/* MAP */}
            <div className="col-span-1 md:col-span-2">
              <Label className="block mb-2 text-gray-700 font-medium">Select on Map</Label>
              <MapContainer center={[-1.286389, 36.817223]} zoom={13} className="h-[500px] w-full rounded-xl border border-gray-300 shadow-md">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker onPick={(pos) => { setCoords({ lat: pos.lat, lng: pos.lng }); if (pos.address) setForm({ ...form, location: pos.address }); }} />
                {coords.lat && <Marker position={[coords.lat, coords.lng]} icon={markerIcon} />}
              </MapContainer>
              {coords.lat && <p className="text-sm text-green-600 mt-3">✅ Selected: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>}
            </div>

            {/* SUBMIT */}
            <div className="col-span-1 md:col-span-2 flex justify-center pt-6">
              <Button type="submit" disabled={loading} className="w-full md:w-1/3 py-3 text-lg font-medium">{loading ? "Saving..." : "Add Student"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
