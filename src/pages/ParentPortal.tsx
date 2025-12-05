// ParentPortal.tsx
import { useQuery } from "@tanstack/react-query";
import { MapPin, Bus, GraduationCap } from "lucide-react";
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

/* ---------------- BUS ICONS FOR MAP ---------------- */
const busIconGreen = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3202/3202926.png", // moving
  iconSize: [42, 42],
  iconAnchor: [21, 42],
});

const busIconRed = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3202/3202927.png", // stopped
  iconSize: [42, 42],
  iconAnchor: [21, 42],
});

const busIconGray = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3202/3202928.png", // unknown
  iconSize: [42, 42],
  iconAnchor: [21, 42],
});

/* ---------------- AUTO-FIT MAP BOUNDS ---------------- */
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds, map]);
  return null;
}

/* ---------------- API ENDPOINTS ---------------- */
const API = import.meta.env.VITE_API_URL;
const TRACKING = import.meta.env.VITE_PUBLIC_MYTRACK;

const STUDENTS_ENDPOINT = `${API}/students`;
const MANIFESTS_ENDPOINT = `${API}/manifests`;
const BUSES_ENDPOINT = `${API}/buses`;
const USERS_ENDPOINT = `${API}/users`;
const TRACKING_ENDPOINT = `https://mytrack-production.up.railway.app/api/devices/list`;

/* ---------------- TYPES ---------------- */
type Student = any;

type Manifest = {
  id: number;
  studentId: number;
  busId?: number | null;
  assistantId?: number | null;
  date?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  boardingTime?: string | null;
  alightingTime?: string | null;
  status?: string | null;
  student?: any;
  bus?: any;
};

type BusItem = {
  id: number;
  name?: string;
  plateNumber?: string;
  driverId?: number | null;
  assistantId?: number | null;
  route?: string | null;
  driver?: any | null;
  assistant?: any | null;
};

type UserItem = {
  id: number;
  name?: string;
  role?: string;
  phone?: string | null;
};

type DeviceItem = {
  ID: number;
  IMEI?: string;
  SIM?: string;
  VehicleNo?: string;
  ChassisNo?: string;
  LastLat?: number;
  LastLng?: number;
  lastUpdate?: string;
  movementState?: string;
};
/* ---------------- MAIN COMPONENT ---------------- */
export default function ParentPortal() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const parentUserId = currentUser?.id;

  const handleLogout = () => {
    localStorage.removeItem("parent");
    localStorage.removeItem("token");
    navigate("/");
  };

  /* ---------------- FETCH DATA ---------------- */
  const { data: studentsData, isLoading: loadingStudents } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const res = await fetch(STUDENTS_ENDPOINT);
      const json = await res.json();
      return Array.isArray(json) ? json : json?.data ?? [];
    },
    refetchInterval: 15000,
  });

  const students: Student[] = studentsData ?? [];

  const myStudents = students.filter(
    (s: any) =>
      (s.parent?.user?.id && s.parent?.user?.id === parentUserId) ||
      (s.parentId && s.parentId === parentUserId)
  );

  const { data: manifestsData } = useQuery({
    queryKey: ["manifests"],
    queryFn: async () => {
      const res = await fetch(MANIFESTS_ENDPOINT);
      const json = await res.json();
      return Array.isArray(json) ? json : json?.data ?? [];
    },
    refetchInterval: 15000,
    keepPreviousData: true,
  });

  const manifests: Manifest[] = manifestsData ?? [];

  const { data: busesData } = useQuery({
    queryKey: ["buses"],
    queryFn: async () => {
      const res = await fetch(BUSES_ENDPOINT);
      const json = await res.json();
      return Array.isArray(json) ? json : json?.data ?? [];
    },
    refetchInterval: 30000,
  });

  const buses: BusItem[] = busesData ?? [];

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch(USERS_ENDPOINT);
      const json = await res.json();
      return Array.isArray(json) ? json : json?.data ?? [];
    },
    refetchInterval: 30000,
  });

  const users: UserItem[] = usersData ?? [];

  const { data: busLocationsRaw } = useQuery({
    queryKey: ["busLocations"],
    queryFn: async () => {
      try {
        const res = await fetch(TRACKING_ENDPOINT, {
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": TRACKING,
          },
        });
        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json) ? json : json?.data ?? [];
      } catch {
        return [];
      }
    },
    refetchInterval: 15000,
  });

  const busLocations: DeviceItem[] = busLocationsRaw ?? [];

  /* ---------------- MAP HELPERS ---------------- */
  const busesById = useMemo(() => {
    const map = new Map<number, BusItem>();
    buses.forEach((b) => b.id && map.set(b.id, b));
    return map;
  }, [buses]);

  const usersById = useMemo(() => {
    const map = new Map<number, UserItem>();
    users.forEach((u) => u.id && map.set(u.id, u));
    return map;
  }, [users]);

  const busLocationsByPlate = useMemo(() => {
    const map = new Map<string, DeviceItem>();
    busLocations.forEach((d) => {
      const key = d.VehicleNo?.trim().replace(/\s+/g, "").toUpperCase();
      if (key) map.set(key, d);
    });
    return map;
  }, [busLocations]);

  const latestManifestByStudent = useMemo(() => {
    const map = new Map<number, Manifest>();
    const sorted = manifests.sort(
      (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
    );
    sorted.forEach((m) => {
      const sid = m.studentId ?? m.student?.id;
      if (sid && !map.has(sid)) map.set(sid, m);
    });
    return map;
  }, [manifests]);

  /* ---------------- BUILD STUDENT VIEWS ---------------- */
  type StudentView = {
    student: Student;
    manifest?: Manifest;
    status: string;
    lat?: number;
    lon?: number;
    readableLocation: string;
    busName?: string;
    plate?: string;
    driver?: string;
    assistant?: string;
    lastSeen?: string;
    movementState?: string;
    showOnMap?: boolean;
  };

  const studentViews: StudentView[] = myStudents.map((s) => {
    const latest = latestManifestByStudent.get(s.id);
    if (!latest)
      return { student: s, status: "UNKNOWN", readableLocation: "No manifest" };

    const bus =
      latest.bus ?? s.bus ?? (latest.busId ? busesById.get(latest.busId) : undefined);

    const plate = bus?.plateNumber?.trim() ?? "";
    const plateKey = plate.replace(/\s+/g, "").toUpperCase();
    const device = busLocationsByPlate.get(plateKey);

    let lat, lon, movementState, lastSeen;
    if (device?.LastLat && device?.LastLng) {
      lat = Number(device.LastLat);
      lon = Number(device.LastLng);
      movementState = device.movementState ?? "unknown";
      lastSeen = device.lastUpdate ?? "";
    }

    const driver =
      bus?.driver?.name ?? (bus?.driverId ? usersById.get(bus.driverId)?.name : "N/A");
    const assistant =
      bus?.assistant?.name ?? (bus?.assistantId ? usersById.get(bus.assistantId)?.name : "N/A");

    let status = "UNKNOWN";
    const st = latest.status?.toUpperCase();
    if (["CHECKED_IN", "ONBOARDED"].includes(st)) status = "CHECKED_IN";
    else if (["CHECKED_OUT"].includes(st)) status = "CHECKED_OUT";

    return {
      student: s,
      manifest: latest,
      status,
      lat,
      lon,
      readableLocation: s.name,
      busName: bus?.name ?? "No Bus Assigned",
      plate,
      driver,
      assistant,
      lastSeen,
      movementState,
      showOnMap: lat && lon && status === "CHECKED_IN",
    };
  });

  const markers = studentViews.filter((v) => v.showOnMap);

  const bounds =
    markers.length > 0
      ? L.latLngBounds(markers.map((v) => [v.lat!, v.lon!]))
      : null;

  const fmt = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString();
  };
  /* ---------------- RENDER ---------------- */
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* ---------------- STUDENT CARDS ---------------- */}
        <div>
          <h2 className="text-2xl font-bold">My Children</h2>
          <p className="text-sm text-muted-foreground">
            Track your children's current bus status and live location.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingStudents ? (
            <p className="col-span-full text-center text-muted-foreground">
              Loading student data...
            </p>
          ) : studentViews.length === 0 ? (
            <Card className="col-span-full text-center py-8 text-muted-foreground">
              No students found for your account.
            </Card>
          ) : (
            studentViews.map((v) => (
              <Card key={v.student.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <CardTitle>{v.student.name}</CardTitle>
                  </div>
                  <CardDescription>
                    {v.student.grade ?? v.student.className ?? "Grade N/A"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Bus className="h-4 w-4 text-primary" />
                    <div>
                      <div>{v.busName}</div>
                      <div className="text-xs text-muted-foreground">
                        Plate: {v.plate}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <MapPin className="h-4 w-4 text-accent" />
                    <div>
                      <div>
                        {v.status === "CHECKED_IN"
                          ? "Boarded (On Bus)"
                          : v.status === "CHECKED_OUT"
                          ? "Offboarded"
                          : "Not Onboarded"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {v.readableLocation}
                        {v.lastSeen && ` — Last seen: ${fmt(v.lastSeen)}`}
                        {v.movementState && ` — Movement: ${v.movementState}`}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1 mt-3">
                    <p>Driver: {v.driver}</p>
                    <p>Assistant: {v.assistant}</p>
                    <p>
                      Boarding: {fmt(v.manifest?.boardingTime)} | Alighting:{" "}
                      {fmt(v.manifest?.alightingTime)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* ---------------- MAP ---------------- */}
        <div className="h-[500px]">
          <MapContainer
            center={[-1.28, 36.83]}
            zoom={13}
            style={{ width: "100%", height: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitBounds bounds={bounds} />

            {/* ---------------- MARKERS ---------------- */}
            {markers.map((v) => {
              const icon =
                v.movementState === "moving"
                  ? busIconGreen
                  : v.movementState === "stopped"
                  ? busIconRed
                  : busIconGray;

              // Only show **assigned buses** on map
              return (
                <Marker key={v.student.id} position={[v.lat!, v.lon!]} icon={icon}>
                  <Popup>
                    <div className="space-y-2">
                      <strong>{v.busName}</strong>
                      <div>Status: {v.status}</div>
                      <div>Driver: {v.driver}</div>
                      <div>Assistant: {v.assistant}</div>
                      {v.lastSeen && <div>Last Seen: {fmt(v.lastSeen)}</div>}
                      {v.movementState && <div>Movement: {v.movementState}</div>}
                      <div className="mt-2 font-semibold">Children on this bus:</div>
                      <ul className="list-disc pl-5">
                        {studentViews
                          .filter(
                            (s) =>
                              s.plate === v.plate && s.status === "CHECKED_IN"
                          )
                          .map((s) => (
                            <li key={s.student.id}>
                              <GraduationCap className="inline h-4 w-4 mr-1 text-primary" />
                              {s.student.name}
                            </li>
                          ))}
                      </ul>
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
