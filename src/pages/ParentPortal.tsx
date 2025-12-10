// ParentPortal.tsx
import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCurrentUser } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import L from "leaflet";


/* ---------------- AUTO-FIT MAP BOUNDS ---------------- */
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds, map]);
  return null;
}

/* ---------------- Fly to selected vehicle ---------------- */
function FlyToLocation({ selectedVehicle }: { selectedVehicle: any }) {
  const map = useMap();
  useEffect(() => {
    if (selectedVehicle?.lat != null && selectedVehicle?.lng != null) {
      map.flyTo([selectedVehicle.lat, selectedVehicle.lng], 15, { animate: true, duration: 1.5 });
    }
  }, [selectedVehicle, map]);
  return null;
}

/* ---------------- API ENDPOINTS ---------------- */


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

export default function ParentPortal() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const parentUserId = currentUser?.id;
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  // Mobile bottom sheet expansion state (collapsed by default to keep map primary)
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [panicTriggerKey, setPanicTriggerKey] = useState(0);

  const handleLogout = () => {
    localStorage.removeItem("parent");
    localStorage.removeItem("token");
    navigate("/");
  };

  const triggerPanic = () => {
    setPanicTriggerKey((k) => k + 1);
    setShowMobileDetails(true);
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

  // Default to first student on mobile list when nothing is selected
  useEffect(() => {
    if (!selectedStudentId && studentViews.length > 0) {
      setSelectedStudentId(studentViews[0].student.id);
    }
  }, [selectedStudentId, studentViews]);

  const fmt = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Car className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Parent Portal</h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground">Live tracking & updates</p>
            </div>
          </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm sm:text-base"
            >
              Logout
            </button>
          </div>
        </div>
      </header>


                      </div>
                      <Badge
                        className={`text-white ${
                          selectedStudentView.status === "CHECKED_IN"
                            ? "bg-green-500"
                            : selectedStudentView.status === "CHECKED_OUT"
                            ? "bg-blue-500"
                            : "bg-gray-500"
                        }`}
                      >
                        {selectedStudentView.status === "CHECKED_IN"
                          ? "Boarded"
                          : selectedStudentView.status === "CHECKED_OUT"
                          ? "Checked Out"
                          : "Not Onboarded"}
                      </Badge>
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
 main
    </div>
  );
}
