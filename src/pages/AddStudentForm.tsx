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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L, { LeafletMouseEvent } from "leaflet";
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
    async click(e: LeafletMouseEvent) {
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
    <div className="h-full overflow-hidden">
      <ScrollArea className="h-full pr-4">
        <form onSubmit={handleSubmit} className="space-y-8 pb-4">
        {/* Student Information Section */}
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Student Information</h3>
            <Separator className="mb-5" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Full Name *</Label>
              <Input 
                id="name"
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                placeholder="Enter student full name" 
                required 
                className="h-12 text-sm w-full focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="grade" className="text-sm font-semibold text-gray-700">Grade *</Label>
              <Input 
                id="grade"
                value={form.grade} 
                onChange={(e) => setForm({ ...form, grade: e.target.value })} 
                placeholder="e.g., Grade 5" 
                required 
                className="h-12 text-sm w-full focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="school" className="text-sm font-semibold text-gray-700">School *</Label>
              <Select value={form.schoolId} onValueChange={(val) => setForm({ ...form, schoolId: val })} required>
                <SelectTrigger id="school" className="h-12 text-sm w-full focus:ring-2 focus:ring-primary">
                  <SelectValue placeholder="Select a school" />
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
            <div className="space-y-2.5">
              <Label htmlFor="bus" className="text-sm font-semibold text-gray-700">Bus *</Label>
              <Select value={form.busId} onValueChange={(val) => setForm({ ...form, busId: val })} required>
                <SelectTrigger id="bus" className="h-12 text-sm w-full focus:ring-2 focus:ring-primary">
                  <SelectValue placeholder="Select a bus" />
                </SelectTrigger>
                <SelectContent>
                  {buses.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name} ({b.plateNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Parent Information Section */}
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Parent Information</h3>
            <Separator className="mb-5" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <Label htmlFor="parentName" className="text-sm font-semibold text-gray-700">Parent Name *</Label>
              <Input 
                id="parentName"
                value={form.parentName} 
                onChange={(e) => setForm({ ...form, parentName: e.target.value })} 
                placeholder="Enter parent full name" 
                required 
                className="h-12 text-sm w-full focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="parentPhone" className="text-sm font-semibold text-gray-700">Parent Phone *</Label>
              <Input 
                id="parentPhone"
                type="tel" 
                value={form.parentPhone} 
                onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} 
                placeholder="07XXXXXXXX" 
                required 
                className="h-12 text-sm w-full focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="parentEmail" className="text-sm font-semibold text-gray-700">Parent Email *</Label>
              <Input 
                id="parentEmail"
                type="email" 
                value={form.parentEmail} 
                onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} 
                placeholder="example@email.com" 
                required 
                className="h-12 text-sm w-full focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="parentPassword" className="text-sm font-semibold text-gray-700">Parent Password *</Label>
              <Input 
                id="parentPassword"
                type="password" 
                value={form.parentPassword} 
                onChange={(e) => setForm({ ...form, parentPassword: e.target.value })} 
                placeholder="Set a secure password" 
                required 
                className="h-12 text-sm w-full focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pickup Location</h3>
            <Separator className="mb-5" />
          </div>
          <div className="space-y-4">
            <div className="space-y-2.5">
              <Label htmlFor="location" className="text-sm font-semibold text-gray-700">Location Address</Label>
              <Input 
                id="location"
                value={form.location} 
                onChange={(e) => setForm({ ...form, location: e.target.value })} 
                placeholder="Type address or click on map below" 
                className="h-12 text-sm w-full focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
              <p className="text-xs text-muted-foreground mt-1.5">Type a place name or click on the map to select location</p>
            </div>
            <div className="space-y-2.5">
              <Label className="text-sm font-medium text-gray-700 block">Select on Map</Label>
              <div className="relative w-full rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg bg-white">
                <div 
                  className="w-full relative h-[300px] sm:h-[400px] md:h-[450px]" 
                  style={{ 
                    position: 'relative',
                    zIndex: 0
                  }}
                >
                  <MapContainer 
                    center={[-1.286389, 36.817223]} 
                    zoom={13} 
                    style={{ 
                      height: '100%', 
                      width: '100%', 
                      zIndex: 0,
                      position: 'relative'
                    }}
                    className="z-0"
                    zoomControl={true}
                    scrollWheelZoom={true}
                  >
                    <TileLayer 
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <LocationPicker 
                      onPick={(pos) => { 
                        setCoords({ lat: pos.lat, lng: pos.lng }); 
                        if (pos.address) setForm({ ...form, location: pos.address }); 
                      }} 
                    />
                    {coords.lat && coords.lng && (
                      <Marker position={[coords.lat, coords.lng]} icon={markerIcon} />
                    )}
                  </MapContainer>
                </div>
              </div>
              {coords.lat && coords.lng && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-green-600 font-semibold">✓</span>
                  <p className="text-sm text-green-700 font-medium">
                    Location selected: <span className="font-mono text-xs">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <Button 
            type="submit" 
            disabled={loading} 
            className="min-w-[140px] h-11 text-base font-semibold shadow-md hover:shadow-lg transition-all"
            size="lg"
          >
            {loading ? (
              <>
                <span className="mr-2 animate-spin">⏳</span>
                Saving...
              </>
            ) : (
              <>
                <span className="mr-2">✓</span>
                Add Student
              </>
            )}
          </Button>
        </div>
        </form>
      </ScrollArea>
    </div>
  );
}
