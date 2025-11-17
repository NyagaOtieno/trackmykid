// ParentPortal.tsx
import { useQuery } from "@tanstack/react-query";
import { MapPin, Bus } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo, useEffect } from "react";

// Bus icons
const busIconGreen = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});
const busIconRed = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});
const busIconGray = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Auto-fit bounds
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds, map]);
  return null;
}

// Endpoints
const STUDENTS_ENDPOINT =
  "https://schooltransport-production.up.railway.app/api/students";
const BUSES_ENDPOINT =
  "https://schooltransport-production.up.railway.app/api/buses";
const USERS_ENDPOINT =
  "https://schooltransport-production.up.railway.app/api/users";
const TRACKING_ENDPOINT =
  "https://mytrack-production.up.railway.app/api/devices/list";
const API_KEY = "x2AJdCzZaM5y8tPaui5of6qhuovc5SST7y-y6rR_fD0=";

export default function ParentPortal() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const parentUserId = currentUser?.id;

  const handleLogout = () => {
    localStorage.removeItem("parent");
    localStorage.removeItem("token");
    navigate("/");
  };

  // Fetch students
  const { data: studentsData, isLoading: loadingStudents } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const res = await fetch(STUDENTS_ENDPOINT);
      if (!res.ok) throw new Error("Failed to fetch students");
      const json = await res.json();
      return Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    },
    refetchInterval: 15000,
  });
  const students = Array.isArray(studentsData) ? studentsData : [];
  const myStudents = students.filter(
    (s: any) =>
      (s.parent?.user?.id && s.parent?.user?.id === parentUserId) ||
      (s.parentId && s.parentId === parentUserId)
  );

  // Fetch buses
  const { data: busesData } = useQuery({
    queryKey: ["buses"],
    queryFn: async () => {
      const res = await fetch(BUSES_ENDPOINT);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    },
    refetchInterval: 30000,
  });
  const buses = Array.isArray(busesData) ? busesData : [];
  const busesById = useMemo(() => {
    const map = new Map<number, any>();
    buses.forEach((b: any) => b.id && map.set(b.id, b));
    return map;
  }, [buses]);

  // Fetch users
  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch(USERS_ENDPOINT);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    },
    refetchInterval: 30000,
  });
  const users = Array.isArray(usersData) ? usersData : [];
  const usersById = useMemo(() => {
    const map = new Map<number, any>();
    users.forEach((u: any) => u.id && map.set(u.id, u));
    return map;
  }, [users]);

  // Fetch devices
  const { data: devicesData } = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const res = await fetch(TRACKING_ENDPOINT, {
        headers: { "x-api-key": API_KEY },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
    refetchInterval: 15000,
  });
  const devices = Array.isArray(devicesData) ? devicesData : [];
  const devicesByPlate = useMemo(() => {
    const map = new Map<string, any>();
    devices.forEach((d: any) => {
      const plate = (d.vehicle_no ?? "").toString().replace(/\s+/g, "").toUpperCase();
      if (plate) map.set(plate, d);
    });
    return map;
  }, [devices]);

  // Map student views
  const studentViews = myStudents.map((s: any) => {
    const bus = s.busId ? busesById.get(s.busId) : s.bus;
    const plate = bus?.plateNumber?.toString().replace(/\s+/g, "").toUpperCase() || "";
    const device = devicesByPlate.get(plate);

    const lat = device?.last_lat ?? s.latitude ?? 0;
    const lon = device?.last_lng ?? s.longitude ?? 0;

    return {
      student: s,
      busName: bus?.name ?? "No Bus Assigned",
      plate: bus?.plateNumber ?? "N/A",
      driver: bus?.driver?.name ?? (bus?.driverId ? usersById.get(bus.driverId)?.name : "N/A"),
      assistant:
        bus?.assistant?.name ?? (bus?.assistantId ? usersById.get(bus.assistantId)?.name : "N/A"),
      status: device ? "CHECKED_IN" : "UNKNOWN",
      lat,
      lon,
    };
  });

  const markersWithCoords = studentViews.filter((v) => v.lat && v.lon);
  const bounds = markersWithCoords.length
    ? L.latLngBounds(markersWithCoords.map((v) => [v.lat, v.lon]))
    : null;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bus className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Parent Portal</h1>
        </div>
        <div>
          <span className="mr-4 text-sm text-muted-foreground">
            Welcome, {currentUser?.name}
          </span>
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingStudents ? (
            <p className="col-span-full text-center text-muted-foreground">Loading students...</p>
          ) : studentViews.length === 0 ? (
            <Card className="col-span-full text-center py-8 text-muted-foreground">
              No students found.
            </Card>
          ) : (
            studentViews.map((v) => (
              <Card key={v.student.id}>
                <CardHeader>
                  <CardTitle>{v.student.name}</CardTitle>
                  <CardDescription>{v.student.grade ?? "Grade N/A"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Bus className="h-4 w-4 text-primary" />
                    <div>
                      <div>{v.busName}</div>
                      <div className="text-xs text-muted-foreground">Plate: {v.plate}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Driver: {v.driver} | Assistant: {v.assistant}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="h-[500px]">
          <MapContainer
            center={[-1.2921, 36.8219]}
            zoom={12}
            style={{ width: "100%", height: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitBounds bounds={bounds} />
            {markersWithCoords.map((v) => {
              let icon = busIconGray;
              if (v.status === "CHECKED_IN") icon = busIconGreen;
              else if (v.status === "CHECKED_OUT") icon = busIconRed;
              return (
                <Marker key={v.student.id} position={[v.lat, v.lon]} icon={icon}>
                  <Popup>
                    <div>
                      <strong>{v.student.name}</strong>
                      <div>{v.busName} — {v.plate}</div>
                      <div>Driver: {v.driver}</div>
                      <div>Assistant: {v.assistant}</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </main>
    </div>
  );
}
