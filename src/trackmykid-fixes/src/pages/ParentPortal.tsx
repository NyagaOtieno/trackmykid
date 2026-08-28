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

/* ---------------- Bus Icons (🚍 style) ---------------- */
const busIconGreen = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/61/61439.png", // green bus
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});
const busIconRed = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/61/61437.png", // red bus
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});
const busIconGray = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/61/61436.png", // gray bus
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

/* ---------------- Auto-fit map bounds component ---------------- */
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds, map]);
  return null;
}

/* ---------------- API ENDPOINTS ---------------- */
const API_BASE = "https://tmk-api.joshpitah.co.ke/api";
const STUDENTS_ENDPOINT = `${API_BASE}/students`;
const MANIFESTS_ENDPOINT = `${API_BASE}/manifests`;
const BUSES_ENDPOINT = `${API_BASE}/buses`;
const USERS_ENDPOINT = `${API_BASE}/users`;
// Secure, tenant-scoped, onboard-only per-child tracking endpoint.
// Returns { tripStatus: "ONBOARD" | ..., location: { lat, lng, movementState, lastUpdate } | null }
const studentTrackingUrl = (studentId: number | string) =>
  `${API_BASE}/tracking/student/${studentId}`;

// ✅ Login.tsx stores the session token under localStorage "token" —
// keep every fetch in this file consistent with that.
const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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
  session?: string | null;
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
type UserItem = { id: number; name?: string; role?: string; phone?: string | null };
type DeviceItem = {
  busId: number;
  plateNumber?: string;
  lat?: number | null;
  lng?: number | null;
  movementState?: string | null;
  lastUpdate?: string;
  [k: string]: any;
};

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
      const res = await fetch(STUDENTS_ENDPOINT, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to fetch students");
      const json = await res.json();
      return Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    },
    refetchInterval: 15000,
  });
  const students: Student[] = Array.isArray(studentsData) ? studentsData : [];
  const myStudents = students.filter(
    (s: any) =>
      (s.parent?.user?.id && s.parent?.user?.id === parentUserId) ||
      (s.parentId && s.parentId === parentUserId)
  );

  const { data: manifestsData } = useQuery<Manifest[]>({
    queryKey: ["manifests", parentUserId],
    queryFn: async () => {
      const res = await fetch(MANIFESTS_ENDPOINT, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to fetch manifests");
      const json = await res.json();
      return Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    },
    refetchInterval: 15000,
    keepPreviousData: true,
  });
  const manifests: Manifest[] = Array.isArray(manifestsData) ? manifestsData : [];

  const { data: busesData } = useQuery<BusItem[]>({
    queryKey: ["buses"],
    queryFn: async () => {
      const res = await fetch(BUSES_ENDPOINT, { headers: authHeaders() });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    },
    refetchInterval: 30000,
  });
  const buses: BusItem[] = Array.isArray(busesData) ? busesData : [];

  const { data: usersData } = useQuery<UserItem[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch(USERS_ENDPOINT, { headers: authHeaders() });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    },
    refetchInterval: 30000,
  });
  const users: UserItem[] = Array.isArray(usersData) ? usersData : [];

  /* ---------------- FETCH PER-CHILD TRACKING (secure, onboard-only) ---------------- */
  // One call per child to the backend's dedicated endpoint, which already
  // enforces tenant scope and CHECKED_IN/onboard status server-side, and
  // returns location: null when the child isn't actually on the bus.
  const myStudentIdsKey = myStudents.map((s: any) => s.id).join(",");
  const { data: childTracking = {} } = useQuery<Record<number, any>>({
    queryKey: ["childTracking", myStudentIdsKey],
    queryFn: async () => {
      const results: Record<number, any> = {};
      await Promise.all(
        myStudents.map(async (s: any) => {
          try {
            const res = await fetch(studentTrackingUrl(s.id), {
              headers: authHeaders(),
            });
            results[s.id] = res.ok ? await res.json() : null;
          } catch {
            results[s.id] = null;
          }
        })
      );
      return results;
    },
    enabled: myStudents.length > 0,
    refetchInterval: 15000,
  });

  /* ---------------- HELPER MAPS ---------------- */
  const busesById = useMemo(() => {
    const map = new Map<number, BusItem>();
    for (const b of buses) if (b?.id != null) map.set(Number(b.id), b);
    return map;
  }, [buses]);

  const usersById = useMemo(() => {
    const map = new Map<number, UserItem>();
    for (const u of users) if (u?.id != null) map.set(Number(u.id), u);
    return map;
  }, [users]);

  const latestManifestByStudent = useMemo(() => {
    const map = new Map<number, Manifest>();
    const sorted = manifests.slice().sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
    for (const m of sorted) {
      const sid = m.studentId ?? m.student?.id;
      if (sid && !map.has(sid)) map.set(sid, m);
    }
    return map;
  }, [manifests]);

  type StudentView = {
    student: Student;
    manifest?: Manifest | undefined;
    status: "CHECKED_IN" | "CHECKED_OUT" | "UNKNOWN";
    lat?: number;
    lon?: number;
    readableLocation: string;
    busName?: string;
    plate?: string;
    driver?: string;
    assistant?: string;
    lastSeen?: string;
    liveSource?: "device" | "manifest" | "student";
    movementState?: string;
  };

  const studentViews: StudentView[] = myStudents.map((s: any) => {
    const latest = latestManifestByStudent.get(s.id);
    const busCandidate =
      latest?.bus ?? s.bus ?? (typeof latest?.busId === "number" ? busesById.get(Number(latest.busId)) : undefined);

    const rawPlate = busCandidate?.plateNumber?.toString().trim() || "";

    let lat: number | undefined = undefined;
    let lon: number | undefined = undefined;
    let readableLocation = "Not onboard";
    let liveSource: StudentView["liveSource"] = "student";
    let lastSeen: string | undefined = undefined;
    let movementState: string | undefined = undefined;

    // Only show a live position when the backend confirms the child is
    // actually onboard right now — never derived client-side from plate
    // matching, which can't distinguish "bus is moving" from "child boarded".
    const tracking = childTracking[s.id];
    if (tracking?.tripStatus === "ONBOARD" && tracking?.location) {
      lat = tracking.location.lat != null ? Number(tracking.location.lat) : undefined;
      lon = tracking.location.lng != null ? Number(tracking.location.lng) : undefined;
      readableLocation = s.name;
      liveSource = "device";
      lastSeen = tracking.location.lastUpdate;
      movementState = tracking.location.movementState ?? "unknown";
    }

    if ((!lat || !lon) && latest?.latitude != null && latest?.longitude != null) {
      lat = Number(latest.latitude);
      lon = Number(latest.longitude);
      readableLocation = latest?.bus?.route ?? latest?.bus?.name ?? "Manifest location";
      liveSource = "manifest";
      movementState = "unknown";
    }

    const driverName =
      busCandidate?.driver?.name ?? (busCandidate?.driverId ? usersById.get(Number(busCandidate.driverId))?.name : undefined) ?? "N/A";
    const assistantName =
      busCandidate?.assistant?.name ?? (busCandidate?.assistantId ? usersById.get(Number(busCandidate.assistantId))?.name : undefined) ?? "N/A";

    let status: StudentView["status"] = "UNKNOWN";
    if (latest?.status) {
      const st = (latest.status ?? "").toString().toUpperCase();
      if (["CHECKED_IN", "ONBOARDED", "ONBOARD"].includes(st)) status = "CHECKED_IN";
      else if (["CHECKED_OUT", "OFFBOARDED"].includes(st)) status = "CHECKED_OUT";
    } else {
      if (latest?.boardingTime && !latest?.alightingTime) status = "CHECKED_IN";
      else if (latest?.alightingTime) status = "CHECKED_OUT";
    }

    return {
      student: s,
      manifest: latest,
      status,
      lat,
      lon,
      readableLocation,
      busName: busCandidate?.name ?? latest?.bus?.name ?? "No Bus Assigned",
      plate: rawPlate || "N/A",
      driver: driverName,
      assistant: assistantName,
      lastSeen,
      liveSource,
      movementState,
    };
  });

  const markersWithCoords = studentViews.filter(
    (v) =>
      v.lat != null &&
      v.lon != null &&
      v.lat >= -90 &&
      v.lat <= 90 &&
      v.lon >= -180 &&
      v.lon <= 180
  );
  const bounds = markersWithCoords.length
    ? L.latLngBounds(markersWithCoords.map((v) => [v.lat!, v.lon!]))
    : null;

  const fmt = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString();
  };

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
            studentViews.map((v) => {
              const s = v.student;
              const manifest = v.manifest;
              const statusLabel =
                v.status === "CHECKED_IN"
                  ? "Boarded (On Bus)"
                  : v.status === "CHECKED_OUT"
                  ? "Offboarded (Checked Out)"
                  : "Not Onboarded";

              return (
                <Card key={s.id}>
                  <CardHeader>
                    <CardTitle>{s.name}</CardTitle>
                    <CardDescription>{s.grade ?? s.className ?? "Grade N/A"}</CardDescription>
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
                        <div>{statusLabel}</div>
                        <div className="text-xs text-muted-foreground">
                          {v.readableLocation}
                          {v.lastSeen ? ` — last seen: ${fmt(v.lastSeen)}` : ""}
                          {v.movementState ? ` — Movement: ${v.movementState}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1 mt-3">
                      <p>Driver: {v.driver ?? "N/A"}</p>
                      <p>Assistant: {v.assistant ?? "N/A"}</p>
                      <p>
                        Boarding: {fmt(manifest?.boardingTime)}
                        {" | "}Alighting: {fmt(manifest?.alightingTime)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="h-[500px]">
          <MapContainer
            center={[-1, 36]}
            zoom={4}
            style={{ width: "100%", height: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitBounds bounds={bounds} />

            {markersWithCoords.map((v) => {
              // Default gray bus
              let icon = busIconGray;
              if (v.movementState === "moving") icon = busIconGreen;
              else if (v.movementState === "stopped") icon = busIconRed;

              return (
                <Marker
                  key={v.student.id}
                  position={[Number(v.lat!), Number(v.lon!)]}
                  icon={icon}
                >
                  <Popup>
                    <div className="space-y-1">
                      <strong>{v.student.name}</strong>
                      <div>{v.busName}</div>
                      <div>Status: {v.status}</div>
                      <div>{v.readableLocation}</div>
                      <div>Driver: {v.driver}</div>
                      <div>Assistant: {v.assistant}</div>
                      {v.lastSeen && <div>Last Seen: {fmt(v.lastSeen)}</div>}
                      {v.movementState && <div>Bus Movement: {v.movementState}</div>}
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
