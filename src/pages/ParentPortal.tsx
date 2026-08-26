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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo, useEffect, useState } from "react";

/* ---------------- Bus Icon (matches admin Tracking view: labeled, colored box) ---------------- */
function createVehicleIcon(v: { plate?: string; movementState?: string }) {
  const color =
    v.movementState === "moving"
      ? "#dc3545"
      : v.movementState === "standing" || v.movementState === "stopped"
      ? "#28a745"
      : "#6c757d";

  return L.divIcon({
    html: `<div style="
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${color};
      color: white;
      font-size: 10px;
      font-weight: bold;
      border-radius: 4px;
      border: 1px solid #fff;
      padding: 2px 4px;
      min-width: 26px;
      height: 24px;
      white-space: nowrap;
    ">🚍 ${v.plate ?? "N/A"}</div>`,
    className: "",
    iconSize: [28, 24],
    iconAnchor: [14, 12],
  });
}

/* ---------------- Auto-fit map bounds component ---------------- */
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds, map]);
  return null;
}

/* ---------------- API ENDPOINTS ---------------- */
const STUDENTS_ENDPOINT =
  "https://tmk-api.joshpitah.co.ke/api/students";
const MANIFESTS_ENDPOINT =
  "https://tmk-api.joshpitah.co.ke/api/manifests";
const BUSES_ENDPOINT =
  "https://tmk-api.joshpitah.co.ke/api/buses";
const USERS_ENDPOINT =
  "https://tmk-api.joshpitah.co.ke/api/users";
const TRACKING_ENDPOINT =
  "https://tmk-api.joshpitah.co.ke/api/tracking/bus-locations";

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
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const handleLogout = () => {
    localStorage.removeItem("parent");
    localStorage.removeItem("token");
    navigate("/");
  };

  /* ---------------- FETCH DATA ---------------- */
  const { data: studentsData, isLoading: loadingStudents } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(STUDENTS_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const token = localStorage.getItem("token");
      const res = await fetch(MANIFESTS_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const token = localStorage.getItem("token");
      const res = await fetch(BUSES_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const token = localStorage.getItem("token");
      const res = await fetch(USERS_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    },
    refetchInterval: 30000,
  });
  const users: UserItem[] = Array.isArray(usersData) ? usersData : [];

  /* ---------------- FETCH LIVE BUS LOCATIONS ---------------- */
  const { data: busLocationsRaw } = useQuery<DeviceItem[]>({
    queryKey: ["busLocations"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(TRACKING_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json?.data) ? json.data : [];
    },
    refetchInterval: 15000,
  });
  const busLocations: DeviceItem[] = Array.isArray(busLocationsRaw) ? busLocationsRaw : [];

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

  const busLocationsByPlate = useMemo(() => {
    const map = new Map<string, DeviceItem>();
    for (const d of busLocations) {
      const key = (d.plateNumber ?? "").toString().trim().replace(/\s+/g, "").toUpperCase();
      if (key) map.set(key, d);
    }
    return map;
  }, [busLocations]);

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
    const plateKey = rawPlate.replace(/\s+/g, "").toUpperCase();

    // Determine boarding status FIRST — location is only ever shown while onboard.
    let onboardStatus: "CHECKED_IN" | "CHECKED_OUT" | "UNKNOWN" = "UNKNOWN";
    if (latest?.status) {
      const st = (latest.status ?? "").toString().toUpperCase();
      if (["CHECKED_IN", "ONBOARDED", "ONBOARD"].includes(st)) onboardStatus = "CHECKED_IN";
      else if (["CHECKED_OUT", "OFFBOARDED"].includes(st)) onboardStatus = "CHECKED_OUT";
    } else {
      if (latest?.boardingTime && !latest?.alightingTime) onboardStatus = "CHECKED_IN";
      else if (latest?.alightingTime) onboardStatus = "CHECKED_OUT";
    }

    let lat: number | undefined = undefined;
    let lon: number | undefined = undefined;
    let readableLocation = onboardStatus === "CHECKED_IN" ? "Location unavailable" : "Not onboard";
    let liveSource: StudentView["liveSource"] = "student";
    let lastSeen: string | undefined = undefined;
    let movementState: string | undefined = undefined;

    // Only resolve a live location while the child is actually checked in.
    if (onboardStatus === "CHECKED_IN") {
      // Match device by plate
      let deviceMatch = busLocationsByPlate.get(plateKey);

      if (deviceMatch && deviceMatch.lat != null && deviceMatch.lng != null) {
        lat = Number(deviceMatch.lat);
        lon = Number(deviceMatch.lng);
        readableLocation = s.name; // show student name instead of plate
        liveSource = "device";
        lastSeen = deviceMatch.lastUpdate;
        movementState = deviceMatch.movementState ?? "unknown";
      }

      if ((!lat || !lon) && latest?.latitude != null && latest?.longitude != null) {
        lat = Number(latest.latitude);
        lon = Number(latest.longitude);
        readableLocation = latest?.bus?.route ?? latest?.bus?.name ?? "Manifest location";
        liveSource = "manifest";
        movementState = "unknown";
      }
    }

    const driverName =
      busCandidate?.driver?.name ?? (busCandidate?.driverId ? usersById.get(Number(busCandidate.driverId))?.name : undefined) ?? "N/A";
    const assistantName =
      busCandidate?.assistant?.name ?? (busCandidate?.assistantId ? usersById.get(Number(busCandidate.assistantId))?.name : undefined) ?? "N/A";

    return {
      student: s,
      manifest: latest,
      status: onboardStatus,
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

  // Auto-select the first child once data loads, if none selected yet
  useEffect(() => {
    if (selectedStudentId == null && studentViews.length > 0) {
      setSelectedStudentId(studentViews[0].student.id);
    }
  }, [studentViews, selectedStudentId]);

  const selectedView =
    studentViews.find((v) => v.student.id === selectedStudentId) ?? null;

  const markersWithCoords = (selectedView ? [selectedView] : []).filter(
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

        {loadingStudents ? (
          <p className="text-center text-muted-foreground">Loading student data...</p>
        ) : studentViews.length === 0 ? (
          <Card className="text-center py-8 text-muted-foreground">
            No students found for your account.
          </Card>
        ) : (
          <>
            <div className="max-w-sm">
              <Select
                value={selectedStudentId != null ? String(selectedStudentId) : ""}
                onValueChange={(val) => setSelectedStudentId(Number(val))}
              >
                <SelectTrigger>
                  <SelectValue>
                    {studentViews.find((v) => v.student.id === selectedStudentId)?.student
                      ?.name || "Select a child"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {studentViews.map((v) => (
                    <SelectItem key={v.student.id} value={String(v.student.id)}>
                      {v.student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedView && (
              (() => {
                const v = selectedView;
                const s = v.student;
                const manifest = v.manifest;
                const statusLabel =
                  v.status === "CHECKED_IN"
                    ? "Boarded (On Bus)"
                    : v.status === "CHECKED_OUT"
                    ? "Offboarded (Checked Out)"
                    : "Not Onboarded";

                return (
                  <Card key={s.id} className="max-w-xl">
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
              })()
            )}
          </>
        )}

        <div className="h-[500px]">
          <MapContainer
            center={[-1, 36]}
            zoom={4}
            style={{ width: "100%", height: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitBounds bounds={bounds} />

            {markersWithCoords.map((v) => {
              const icon = createVehicleIcon(v);

              return (
                <Marker
                  key={v.student.id}
                  position={[Number(v.lat!), Number(v.lon!)]}
                  icon={icon}
                >
                  <Popup>
                    <div className="space-y-1">
                      <div><strong>Plate: {v.plate}</strong></div>
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
