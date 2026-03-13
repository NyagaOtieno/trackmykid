// ParentPortal.tsx
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  Car,
  Navigation,
  Clock,
  User,
  UserCog,
  AlertCircle,
  ShieldAlert,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
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
import { getCurrentUser, getToken, clearSession, logout } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo, useEffect, useState } from "react";
import { createBusIcon } from "@/utils/vehicleIcon";

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
      map.flyTo([selectedVehicle.lat, selectedVehicle.lng], 15, {
        animate: true,
        duration: 1.5,
      });
    }
  }, [selectedVehicle, map]);
  return null;
}

/* ---------------- Base URLs ---------------- */
const API_BASE_RAW =
  import.meta.env.VITE_API_URL?.trim() ||
  "https://schooltransport-production.up.railway.app/api";
const API_BASE = API_BASE_RAW.endsWith("/api")
  ? API_BASE_RAW
  : `${API_BASE_RAW.replace(/\/+$/, "")}/api`;

const STUDENTS_ENDPOINT = `${API_BASE}/students`;
const MANIFESTS_ENDPOINT = `${API_BASE}/manifests`;
const BUSES_ENDPOINT = `${API_BASE}/buses`;
const USERS_ENDPOINT = `${API_BASE}/users`;
const PANIC_ENDPOINT = `${API_BASE}/panic`;

// Tracking service (separate)
const TRACK_BASE_RAW =
  import.meta.env.VITE_API_URL_TRACK?.trim() ||
  "https://mytrack-production.up.railway.app/api";
const TRACK_BASE = TRACK_BASE_RAW.endsWith("/api")
  ? TRACK_BASE_RAW
  : `${TRACK_BASE_RAW.replace(/\/+$/, "")}/api`;

const BUS_LOCATIONS_API = `${TRACK_BASE}/devices/list`;
const TRACKING_KEY = import.meta.env.VITE_PUBLIC_MYTRACK;

/* ---------------- Auth fetch helpers ---------------- */
function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function authFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers || {}),
    },
  });

  if (res.status === 401) {
    clearSession();
    window.location.href = "/";
    throw new Error("Session expired. Please login again.");
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.message || json?.error || "Request failed");
  }

  // Normalize: array OR { success, data } OR { data }
  return (Array.isArray(json) ? json : json?.data ?? json) as T;
}

async function trackingFetch<T = any>(url: string): Promise<T> {
  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(TRACKING_KEY ? { "X-API-Key": String(TRACKING_KEY) } : {}),
      },
    });
    if (!res.ok) return [] as any;
    const json = await res.json().catch(() => ({}));
    return (Array.isArray(json) ? json : json?.data ?? json) as T;
  } catch {
    return [] as any;
  }
}

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
  showOnMap?: boolean;
};

type VehicleView = {
  plateNumber: string;
  busName: string;
  lat?: number;
  lng?: number;
  driver?: string;
  assistant?: string;
  lastSeen?: string;
  movementState?: string;
  readableLocation: string;
  students: StudentView[];
};

/* ---------------- Vehicle Details Card ---------------- */
function VehicleDetailsCard({
  vehicle,
  students,
  parentId,
  showPanicButton = true,
  onPanicClick,
  panicTrigger,
  variant = "full",
}: {
  vehicle: VehicleView | null;
  students: StudentView[];
  parentId?: number | null;
  showPanicButton?: boolean;
  onPanicClick?: () => void;
  panicTrigger?: number;
  variant?: "full" | "sheet";
}) {
  const [showPanicDialog, setShowPanicDialog] = useState(false);
  const [panicReason, setPanicReason] = useState("");
  const [isSubmittingPanic, setIsSubmittingPanic] = useState(false);

  useEffect(() => {
    if (panicTrigger !== undefined && panicTrigger > 0) setShowPanicDialog(true);
  }, [panicTrigger]);

  const handlePanicSubmit = async () => {
    if (!panicReason || !vehicle || !parentId) {
      toast.error("Please select a reason for the panic alert");
      return;
    }

    const firstStudent = vehicle.students[0];
    if (!firstStudent) {
      toast.error("No student found on this vehicle");
      return;
    }

    setIsSubmittingPanic(true);
    try {
      const token = getToken();
      const res = await fetch(PANIC_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          studentId: firstStudent.student.id,
          parentId,
          reason: panicReason,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to send panic alert");

      toast.success("Panic sent! Help is being notified.");
      setShowPanicDialog(false);
      setPanicReason("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send panic alert. Please try again.");
    } finally {
      setIsSubmittingPanic(false);
    }
  };

  if (!vehicle) {
    return (
      <Card className="w-full border shadow-md flex items-center justify-center min-h-[150px]">
        <CardContent className="text-center p-3 sm:p-4">
          <Car className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-xs sm:text-sm text-muted-foreground">
            Select a student to view vehicle details
          </p>
        </CardContent>
      </Card>
    );
  }

  const movementState = vehicle.movementState?.toLowerCase() || "unknown";
  const isFallback = !vehicle.lat || !vehicle.lng;
  const isMoving = movementState === "moving" || movementState === "driving";

  const statusColor = isFallback
    ? "bg-gray-500"
    : isMoving
    ? "bg-green-500"
    : "bg-blue-500";

  const statusText = isFallback ? "No GPS Signal" : isMoving ? "Moving" : "Stopped";

  const vehicleStudents = students.filter((s) => s.plate === vehicle.plateNumber);

  return (
    <>
      <Card className="w-full border shadow-md">
        {variant === "full" && (
          <CardHeader className={`${statusColor} text-white rounded-t p-2 sm:p-4 lg:p-6`}>
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold flex items-center gap-1.5">
                <Car className="h-4 w-4 sm:h-5 sm:w-5" />
                {vehicle.plateNumber || "N/A"}
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-white/20 text-white border-white/30 text-[10px] sm:text-xs"
              >
                {statusText}
              </Badge>
            </div>
          </CardHeader>
        )}

        <CardContent
          className={`p-2 sm:p-3 lg:p-6 space-y-2 sm:space-y-3 lg:space-y-4 ${
            variant === "sheet" ? "pt-3" : ""
          }`}
        >
          {variant === "full" && (
            <div className="space-y-2">
              <h3 className="font-semibold text-xs sm:text-sm border-b pb-1">
                Vehicle Information
              </h3>

              {vehicle.busName && vehicle.busName !== "No Bus Assigned" && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded">
                    <Car className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Vehicle Name</p>
                    <p className="font-medium text-xs sm:text-sm">{vehicle.busName}</p>
                  </div>
                </div>
              )}

              {vehicle.plateNumber && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded">
                    <Navigation className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Plate Number</p>
                    <p className="font-medium text-sm sm:text-base">
                      {vehicle.plateNumber}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 pt-2 border-t">
            <h3 className="font-semibold text-xs sm:text-sm border-b pb-1">Staff</h3>

            {vehicle.driver && vehicle.driver !== "N/A" && (
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded">
                  <User className="h-3 w-3 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Driver</p>
                  <p className="font-medium text-xs sm:text-sm">{vehicle.driver}</p>
                </div>
              </div>
            )}

            {vehicle.assistant && vehicle.assistant !== "N/A" && (
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded">
                  <UserCog className="h-3 w-3 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Assistant</p>
                  <p className="font-medium text-xs sm:text-sm">{vehicle.assistant}</p>
                </div>
              </div>
            )}
          </div>

          {vehicle.lat && vehicle.lng && (
            <div className="space-y-2 pt-2 border-t">
              <h3 className="font-semibold text-xs sm:text-sm border-b pb-1">Location</h3>

              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded">
                  <MapPin className="h-3 w-3 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground">Current Location</p>
                  <p className="font-medium text-xs sm:text-sm truncate">
                    {vehicle.readableLocation || "Location unavailable"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <p className="text-muted-foreground">Latitude</p>
                  <p className="font-medium text-xs">{vehicle.lat.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Longitude</p>
                  <p className="font-medium text-xs">{vehicle.lng.toFixed(6)}</p>
                </div>
              </div>

              {vehicle.lastSeen && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded">
                    <Clock className="h-3 w-3 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-muted-foreground">Last Update</p>
                    <p className="font-medium text-xs truncate">
                      {new Date(vehicle.lastSeen).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {vehicleStudents.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t">
              <h3 className="font-semibold text-xs sm:text-sm border-b pb-1">
                Students on Vehicle
              </h3>
              <div className="space-y-1">
                {vehicleStudents.map((sv) => (
                  <div
                    key={sv.student.id}
                    className="flex items-center gap-1.5 p-1.5 bg-muted/50 rounded"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm truncate">
                        {sv.student.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {sv.status === "CHECKED_IN"
                          ? "On Board"
                          : sv.status === "CHECKED_OUT"
                          ? "Checked Out"
                          : "Unknown"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showPanicButton && (
            <div className="pt-2 border-t">
              <Button
                onClick={() => {
                  onPanicClick?.();
                  setShowPanicDialog(true);
                }}
                variant="destructive"
                className="w-full h-9 sm:h-10 text-xs sm:text-sm font-semibold"
                size="sm"
              >
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                <span>Emergency</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPanicDialog} onOpenChange={setShowPanicDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-destructive flex-shrink-0" />
              <span>Emergency Notification Alert</span>
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base mt-2 text-left">
              Please select a reason for this emergency alert. Help will be notified
              immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Select value={panicReason} onValueChange={setPanicReason}>
              <SelectTrigger className="w-full h-11 sm:h-10 text-base sm:text-sm">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent
                className="max-h-[60vh] sm:max-h-[200px] !z-[10001]"
                position="popper"
              >
                <SelectItem value="Emergency" className="text-base sm:text-sm py-3 sm:py-2">
                  Emergency
                </SelectItem>
                <SelectItem value="Accident" className="text-base sm:text-sm py-3 sm:py-2">
                  Accident
                </SelectItem>
                <SelectItem
                  value="Medical Issue"
                  className="text-base sm:text-sm py-3 sm:py-2"
                >
                  Medical Issue
                </SelectItem>
                <SelectItem value="Other" className="text-base sm:text-sm py-3 sm:py-2">
                  Other
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowPanicDialog(false);
                setPanicReason("");
              }}
              disabled={isSubmittingPanic}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={handlePanicSubmit}
              disabled={!panicReason || isSubmittingPanic}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {isSubmittingPanic ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Sending...
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Send Alert
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------------- MAIN PAGE ---------------- */
export default function ParentPortal() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const parentUserId = currentUser?.id;

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [panicTriggerKey, setPanicTriggerKey] = useState(0);

  const triggerPanic = () => {
    setPanicTriggerKey((k) => k + 1);
    setShowMobileDetails(true);
  };

  const handleLogout = () => {
    logout("/");
    navigate("/", { replace: true });
  };

  /* ---------------- FETCH DATA (WITH TOKEN!) ---------------- */
  const { data: studentsData = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["students"],
    queryFn: () => authFetch<Student[]>(STUDENTS_ENDPOINT),
    refetchInterval: 15000,
  });

  const { data: manifestsData = [] } = useQuery({
    queryKey: ["manifests"],
    queryFn: () => authFetch<Manifest[]>(MANIFESTS_ENDPOINT),
    refetchInterval: 15000,
  });

  const { data: busesData = [] } = useQuery({
    queryKey: ["buses"],
    queryFn: () => authFetch<BusItem[]>(BUSES_ENDPOINT),
    refetchInterval: 30000,
  });

  const { data: usersData = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => authFetch<UserItem[]>(USERS_ENDPOINT),
    refetchInterval: 30000,
  });

  const { data: busLocationsRaw = [] } = useQuery({
    queryKey: ["busLocations"],
    queryFn: () => trackingFetch<DeviceItem[]>(BUS_LOCATIONS_API),
    refetchInterval: 15000,
  });

  const students: Student[] = studentsData ?? [];
  const manifests: Manifest[] = manifestsData ?? [];
  const buses: BusItem[] = busesData ?? [];
  const users: UserItem[] = usersData ?? [];
  const busLocations: DeviceItem[] = busLocationsRaw ?? [];

  /* ---------------- filter my students (supports multiple shapes) ---------------- */
  const myStudents = students.filter((s: any) => {
    const pid1 = s?.parent?.user?.id;
    const pid2 = s?.parent?.userId;
    const pid3 = s?.parentId;
    const pid4 = s?.parent?.id;
    return [pid1, pid2, pid3, pid4].some((x) => Number(x) === Number(parentUserId));
  });

  /* ---------------- MAP HELPERS ---------------- */
  const busesById = useMemo(() => {
    const map = new Map<number, BusItem>();
    buses.forEach((b) => b?.id && map.set(b.id, b));
    return map;
  }, [buses]);

  const usersById = useMemo(() => {
    const map = new Map<number, UserItem>();
    users.forEach((u) => u?.id && map.set(u.id, u));
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
    const sorted = [...manifests].sort(
      (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
    );
    sorted.forEach((m) => {
      const sid = m.studentId ?? m.student?.id;
      if (sid && !map.has(sid)) map.set(sid, m);
    });
    return map;
  }, [manifests]);

  const studentViews: StudentView[] = myStudents.map((s: any) => {
    const latest = latestManifestByStudent.get(s.id);

    if (!latest) {
      return {
        student: s,
        status: "UNKNOWN",
        readableLocation: "No manifest",
      };
    }

    const bus =
      latest.bus ?? s.bus ?? (latest.busId ? busesById.get(latest.busId) : undefined);

    const plate = bus?.plateNumber?.trim() ?? "";
    const plateKey = plate.replace(/\s+/g, "").toUpperCase();
    const device = busLocationsByPlate.get(plateKey);

    let lat: number | undefined;
    let lon: number | undefined;
    let movementState: string | undefined;
    let lastSeen: string | undefined;

    if (device?.LastLat != null && device?.LastLng != null) {
      lat = Number(device.LastLat);
      lon = Number(device.LastLng);
      movementState = device.movementState ?? "unknown";
      lastSeen = device.lastUpdate ?? "";
    }

    const driver =
      bus?.driver?.name ?? (bus?.driverId ? usersById.get(bus.driverId)?.name : "N/A");
    const assistant =
      bus?.assistant?.name ??
      (bus?.assistantId ? usersById.get(bus.assistantId)?.name : "N/A");

    let status: StudentView["status"] = "UNKNOWN";
    const st = String(latest.status ?? "").toUpperCase();
    if (["CHECKED_IN", "ONBOARDED"].includes(st)) status = "CHECKED_IN";
    else if (["CHECKED_OUT"].includes(st)) status = "CHECKED_OUT";

    const showOnMap =
      status === "CHECKED_IN" &&
      lat != null &&
      lon != null &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180;

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
      showOnMap,
    };
  });

  /* ---------------- Vehicles grouped by plate ---------------- */
  const vehiclesByPlate = useMemo(() => {
    const map = new Map<string, VehicleView>();

    studentViews.forEach((sv) => {
      const plate = sv.plate || "UNKNOWN";
      if (!map.has(plate)) {
        map.set(plate, {
          plateNumber: plate,
          busName: sv.busName || "No Bus Assigned",
          lat: sv.lat,
          lng: sv.lon,
          driver: sv.driver,
          assistant: sv.assistant,
          lastSeen: sv.lastSeen,
          movementState: sv.movementState,
          readableLocation: sv.readableLocation,
          students: [],
        });
      }

      const vehicle = map.get(plate)!;
      vehicle.students.push(sv);

      if (sv.lat && sv.lon && (!vehicle.lat || !vehicle.lng)) {
        vehicle.lat = sv.lat;
        vehicle.lng = sv.lon;
        vehicle.lastSeen = sv.lastSeen;
        vehicle.movementState = sv.movementState;
        vehicle.readableLocation = sv.readableLocation;
      }
    });

    return Array.from(map.values());
  }, [studentViews]);

  /* ---------------- NEW: only show vehicles that have at least one CHECKED_IN student (showOnMap=true) ---------------- */
  const visibleVehiclesByPlate = useMemo(() => {
    return vehiclesByPlate.filter((v) => v.students.some((s) => s.showOnMap));
  }, [vehiclesByPlate]);

  const selectedStudentView = useMemo(() => {
    return (
      studentViews.find((sv) => sv.student.id === selectedStudentId) ??
      studentViews[0] ??
      null
    );
  }, [selectedStudentId, studentViews]);

  /* ---------------- NEW: hide selected vehicle if the selected child is CHECKED_OUT ---------------- */
  const selectedVehicle = useMemo(() => {
    if (!selectedStudentId) return null;

    const selectedStudent = studentViews.find((sv) => sv.student.id === selectedStudentId);
    if (!selectedStudent) return null;

    // If selected child is checked out, hide bus/details
    if (selectedStudent.status === "CHECKED_OUT") return null;

    // Only choose from visible vehicles (means at least one child is CHECKED_IN)
    return visibleVehiclesByPlate.find((v) => v.plateNumber === selectedStudent.plate) || null;
  }, [selectedStudentId, studentViews, visibleVehiclesByPlate]);

  /* ---------------- NEW: Polyline trail for selected child using manifest lat/lon ---------------- */
  const selectedTrail = useMemo(() => {
    if (!selectedStudentView) return [];
    if (selectedStudentView.status === "CHECKED_OUT") return [];

    const sid = selectedStudentView.student.id;

    const pts = manifests
      .filter((m) => Number(m.studentId ?? m.student?.id) === Number(sid))
      .filter((m) => m.latitude != null && m.longitude != null)
      .sort(
        (a, b) =>
          new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime()
      )
      .slice(-80) // last 80 points
      .map((m) => [Number(m.latitude), Number(m.longitude)] as [number, number]);

    return pts;
  }, [manifests, selectedStudentView]);

  const vehicleMarkers = visibleVehiclesByPlate.filter(
    (v) =>
      v.lat != null &&
      v.lng != null &&
      v.lat >= -90 &&
      v.lat <= 90 &&
      v.lng >= -180 &&
      v.lng <= 180
  );

  const vehicleBounds = vehicleMarkers.length
    ? L.latLngBounds(vehicleMarkers.map((v) => [v.lat!, v.lng!]))
    : null;

  useEffect(() => {
    if (!selectedStudentId && studentViews.length > 0) {
      setSelectedStudentId(studentViews[0].student.id);
    }
  }, [selectedStudentId, studentViews]);

  const fmt = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? String(iso) : d.toLocaleString();
  };

  const mobileMovementState = selectedVehicle?.movementState?.toLowerCase() || "unknown";
  const mobileIsMoving =
    mobileMovementState === "moving" || mobileMovementState === "driving";

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Car className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">
                Parent Portal
              </h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Live tracking & updates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-sm font-semibold text-foreground">
                {currentUser?.name ?? "Parent"}
              </span>
              <span className="text-[11px] text-muted-foreground">Welcome back</span>
            </div>

            <Avatar className="h-9 w-9 border">
              <AvatarImage src="" alt={currentUser?.name ?? "Parent"} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {(currentUser?.name || "P").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm sm:text-base"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 lg:pb-6 space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">My Children</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Track your children's current vehicle status and live location.
            </p>
          </div>

          <div className="bg-card border rounded-lg shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">Select child</p>
              <p className="text-xs text-muted-foreground">
                {loadingStudents
                  ? "Loading..."
                  : studentViews.length === 0
                  ? "No students found for your account."
                  : studentViews.length === 1
                  ? "Single child detected. Showing details."
                  : "Choose a child to focus the map and details."}
              </p>
            </div>

            {studentViews.length > 0 && (
              <Select
                value={selectedStudentId?.toString() ?? ""}
                onValueChange={(val) => {
                  const id = Number(val);
                  setSelectedStudentId(id);
                  setShowMobileDetails(false);
                }}
              >
                <SelectTrigger className="w-full sm:w-[280px] md:w-[320px]">
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent className="max-h-[240px]">
                  {studentViews.map((v) => {
                    const s = v.student;
                    const label =
                      v.status === "CHECKED_IN"
                        ? "Boarded"
                        : v.status === "CHECKED_OUT"
                        ? "Checked Out"
                        : "Not Onboarded";
                    return (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name} — {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-foreground">Vehicle Locations</h2>
            <div className="h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg overflow-hidden shadow-lg border relative z-0">
              <MapContainer
                center={[-1, 36]}
                zoom={4}
                style={{ width: "100%", height: "100%", position: "relative", zIndex: 0 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <FitBounds bounds={vehicleBounds} />
                <FlyToLocation selectedVehicle={selectedVehicle || undefined} />

                {/* NEW: Polyline visible (trail for selected student, if points exist) */}
                {selectedTrail.length >= 2 && <Polyline positions={selectedTrail} />}

                {vehicleMarkers.map((vehicle) => {
                  const isSelected = selectedVehicle?.plateNumber === vehicle.plateNumber;
                  const movementState = vehicle.movementState?.toLowerCase() || "unknown";
                  const isMoving = movementState === "moving" || movementState === "driving";

                  return (
                    <Marker
                      key={vehicle.plateNumber}
                      position={[Number(vehicle.lat!), Number(vehicle.lng!)] as [number, number]}
                      icon={createBusIcon(vehicle, isSelected)}
                      zIndexOffset={isSelected ? 1000 : 100}
                      eventHandlers={{
                        click: () => {
                          const firstStudent = vehicle.students[0];
                          if (firstStudent) {
                            setSelectedStudentId(firstStudent.student.id);
                            setShowMobileDetails(true);
                          }
                        },
                      }}
                    >
                      <Popup
                        maxWidth={240}
                        minWidth={180}
                        autoPan
                        autoPanPadding={[12, 12]}
                        closeButton={false}
                        className="shadow-md"
                      >
                        <div className="w-[220px] max-w-[90vw] space-y-2 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-foreground truncate">
                                {vehicle.busName}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                Plate: {vehicle.plateNumber}
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium ${
                                isMoving ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  isMoving ? "bg-green-500" : "bg-amber-500"
                                }`}
                              />
                              {isMoving ? "Moving" : "Stopped"}
                            </span>
                          </div>

                          <div className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                            {vehicle.readableLocation}
                          </div>

                          {vehicle.students.length > 0 && (
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>Students</span>
                              <span className="font-semibold text-foreground">
                                {vehicle.students.length}
                              </span>
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        </main>

        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-[400px] bg-card border-l shadow-lg p-6 overflow-y-auto">
          <div className="sticky top-6 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Details</h2>
                <div className="text-xs text-muted-foreground">
                  {selectedStudentView ? "Selected child" : "No child selected"}
                </div>
              </div>

              {selectedStudentView ? (
                <Card className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">
                          {selectedStudentView.student.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {selectedStudentView.student.grade ??
                            selectedStudentView.student.className ??
                            "Grade N/A"}
                        </CardDescription>
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
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <p className="font-semibold text-foreground text-sm">Route / Bus</p>
                        <p className="truncate">{selectedStudentView.busName}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">Plate</p>
                        <p className="truncate">{selectedStudentView.plate}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Boarding</p>
                        <p className="font-medium">
                          {selectedStudentView.manifest?.boardingTime
                            ? fmt(selectedStudentView.manifest?.boardingTime)
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Alighting</p>
                        <p className="font-medium">
                          {selectedStudentView.manifest?.alightingTime
                            ? fmt(selectedStudentView.manifest?.alightingTime)
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed border text-center text-muted-foreground py-10">
                  <CardContent>Select a child to view details</CardContent>
                </Card>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 text-foreground">Vehicle Details</h3>

              {/* NOTE: selectedVehicle is null when selected child is CHECKED_OUT */}
              <VehicleDetailsCard
                vehicle={selectedVehicle}
                students={studentViews}
                parentId={parentUserId}
                variant="full"
              />
            </div>
          </div>
        </aside>

        {/* Mobile bottom sheet */}
        {/* NOTE: selectedVehicle is null when selected child is CHECKED_OUT, so this will not render */}
        {selectedVehicle && (
          <aside
            className={`fixed bottom-0 left-0 right-0 bg-muted/70 backdrop-blur-sm border-t shadow-2xl z-50 lg:hidden transition-all duration-300 ${
              showMobileDetails ? "max-h-[55vh]" : "h-[110px]"
            }`}
          >
            <div className="sticky top-0 bg-card px-3 py-2.5 flex items-center gap-3 border-b z-10">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground truncate">
                    {selectedVehicle.busName}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      mobileIsMoving ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        mobileIsMoving ? "bg-green-500" : "bg-amber-500"
                      }`}
                    />
                    {mobileIsMoving ? "Moving" : "Stopped"}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  Plate: {selectedVehicle.plateNumber ?? "N/A"}
                </div>
              </div>

              <Button
                variant="destructive"
                size="sm"
                className="shrink-0 px-3 h-9 text-xs font-semibold"
                onClick={triggerPanic}
                aria-label="Emergency"
              >
                <ShieldAlert className="h-3.5 w-3.5 mr-2" />
                Emergency
              </Button>

              <button
                onClick={() => setShowMobileDetails((prev) => !prev)}
                className="p-2 rounded-full hover:bg-muted transition-colors shrink-0"
                aria-label={showMobileDetails ? "Collapse details" : "Expand details"}
              >
                {showMobileDetails ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
            </div>

            <div
              className={`transition-all duration-300 ${
                showMobileDetails ? "opacity-100 max-h-[46vh] pb-2" : "opacity-0 max-h-0 pointer-events-none"
              } overflow-y-auto`}
            >
              <div className="p-3 space-y-3">
                {selectedStudentView && (
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-sm font-semibold truncate">
                            {selectedStudentView.student.name}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {selectedStudentView.student.grade ??
                              selectedStudentView.student.className ??
                              "Grade N/A"}
                          </CardDescription>
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
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-muted-foreground">Route / Bus</p>
                          <p className="font-medium text-foreground truncate">
                            {selectedStudentView.busName}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Plate</p>
                          <p className="font-medium text-foreground truncate">
                            {selectedStudentView.plate}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-muted-foreground">Boarding</p>
                          <p className="font-medium">
                            {selectedStudentView.manifest?.boardingTime
                              ? fmt(selectedStudentView.manifest?.boardingTime)
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Alighting</p>
                          <p className="font-medium">
                            {selectedStudentView.manifest?.alightingTime
                              ? fmt(selectedStudentView.manifest?.alightingTime)
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <VehicleDetailsCard
                  vehicle={selectedVehicle}
                  students={studentViews}
                  parentId={parentUserId}
                  showPanicButton={false}
                  panicTrigger={panicTriggerKey}
                  variant="sheet"
                />
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
