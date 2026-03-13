// src/pages/AssistantPortal.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { Toaster, toast } from "sonner";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// API Endpoints
const API_BASE =
  import.meta.env.VITE_API_URL?.trim() ||
  "https://schooltransport-production.up.railway.app/api";

const BUS_LOCATIONS_API =
  (import.meta.env.VITE_API_URL_TRACK?.trim() ||
    "https://mytrack-production.up.railway.app/api") + "/devices/list";

type RoutePoint = {
  lat: number;
  lng: number;
  ts: number;
};

export default function AssistantPortal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const assistantId = user?.id;

  const [panicModalOpen, setPanicModalOpen] = useState(false);
  const [panicTarget, setPanicTarget] = useState<{ type: "bus" | "student"; student?: any } | null>(null);
  const [panicReason, setPanicReason] = useState("Assistance needed!");
  const [panicRemarks, setPanicRemarks] = useState("");

  const [busLocation, setBusLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [routePositions, setRoutePositions] = useState<RoutePoint[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [autoFollow] = useState<boolean>(true);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const token =
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("accessToken");

    if (!user || !token) {
      navigate("/login");
    }
  }, [user, navigate]);

  const getKenyaNow = () =>
    new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));

  const isWithinSession = (session: "MORNING" | "EVENING") => {
    const now = getKenyaNow();
    if (isNaN(now.getTime())) return false;

    if (session === "MORNING") {
      const start = new Date(now);
      start.setHours(5, 0, 0, 0);
      const end = new Date(now);
      end.setHours(11, 59, 59, 999);
      return now >= start && now <= end;
    }

    const start = new Date(now);
    start.setHours(12, 0, 0, 0);
    const end = new Date(now);
    end.setHours(21, 30, 0, 0);
    return now >= start && now <= end;
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("accessToken");
    toast.success("Logged out successfully!");
    navigate("/");
  };

  const handleStatusUpdate = async (manifestId: number, status: string) => {
    try {
      await api.put(`/manifests/${manifestId}`, { status });
      toast.success(`Student ${status === "CHECKED_IN" ? "Boarded" : "Dropped Off"}`);
    } catch (err: any) {
      console.error("Update failed:", err.response?.data || err.message);
      toast.error("Failed to update status on server.");
    }
  };

  const { data: busLocationsData = [] } = useQuery({
    queryKey: ["bus-locations"],
    queryFn: async () => {
      const res = await axios.get(BUS_LOCATIONS_API, {
        headers: {
          "X-API-Key": import.meta.env.VITE_PUBLIC_MYTRACK,
        },
      });
      return res.data?.data ?? res.data ?? [];
    },
    refetchInterval: 15000,
  });

  const {
    data: studentsData = [],
    isLoading: studentsLoading,
    isError: studentsError,
  } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const res = await api.get("/students");
      return Array.isArray(res.data?.data) ? res.data.data : res.data ?? [];
    },
    retry: false,
    onError: (err: any) => {
      console.error("Students fetch error:", err?.response?.data || err.message);
      toast.error("Failed to load students");
    },
  });

  const { data: manifestsData, refetch: refetchManifests } = useQuery({
    queryKey: ["manifests"],
    queryFn: async () => {
      const res = await api.get("/manifests");
      return Array.isArray(res.data?.data) ? res.data.data : res.data?.data ?? res.data ?? [];
    },
    retry: false,
    onError: (err: any) => {
      console.error("Manifests fetch error:", err?.response?.data || err.message);
      toast.error("Failed to load manifests");
    },
  });

  const manifests = Array.isArray(manifestsData) ? manifestsData : [];

  const assignedStudents = Array.isArray(studentsData)
    ? studentsData.filter((s: any) => s.bus?.assistantId === assistantId)
    : [];

  const bus = assignedStudents[0]?.bus || null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayManifests = manifests.filter((m: any) => {
    const dateOk = m.date ? new Date(m.date) >= today : true;
    const assistantOk = m.assistantId === assistantId;
    const busOk = m.busId === bus?.id || m.bus?.id === bus?.id;
    return dateOk && assistantOk && busOk;
  });

  const parseManifestTs = (m: any) => {
    const ts = m.createdAt ?? m.timestamp ?? m.time ?? m.date ?? null;
    const d = ts ? new Date(ts) : null;
    return d && !isNaN(d.getTime()) ? d : null;
  };

  const firstOnboardTs: Date | null = (() => {
    const checkedIn = todayManifests.filter((m: any) => m.status === "CHECKED_IN");
    if (!checkedIn.length) return null;
    const dates = checkedIn.map(parseManifestTs).filter(Boolean) as Date[];
    if (!dates.length) return null;
    dates.sort((a, b) => a.getTime() - b.getTime());
    return dates[0] ?? null;
  })();

  const lastOffboardTs: Date | null = (() => {
    const checkedOut = todayManifests.filter((m: any) => m.status === "CHECKED_OUT");
    if (!checkedOut.length) return null;
    const dates = checkedOut.map(parseManifestTs).filter(Boolean) as Date[];
    if (!dates.length) return null;
    dates.sort((a, b) => b.getTime() - a.getTime());
    return dates[0] ?? null;
  })();

  const getLastKnownManifestLocation = () => {
    const candidates = (todayManifests.length ? todayManifests : manifests)
      .filter((m: any) => m.latitude || m.lat || m.longitude || m.lng || m.coords)
      .map((m: any) => {
        const lat = Number(m.latitude ?? m.lat ?? m.coords?.lat ?? m.position?.lat);
        const lng = Number(m.longitude ?? m.lng ?? m.coords?.lng ?? m.position?.lng);
        const ts = parseManifestTs(m) ?? new Date();
        return { lat, lng, ts };
      })
      .filter((x: any) => !isNaN(x.lat) && !isNaN(x.lng) && x.lat !== 0 && x.lng !== 0)
      .sort((a: any, b: any) => b.ts.getTime() - a.ts.getTime());

    return candidates.length ? candidates[0] : null;
  };

  useEffect(() => {
    if (!bus || !Array.isArray(busLocationsData)) return;

    const plate = (bus.plateNumber || "").toString().toLowerCase().replace(/\s+/g, "");

    const unit = busLocationsData.find((u: any) => {
      const trackerPlate = (u.VehicleNo || u.number || u.plate || "")
        .toString()
        .toLowerCase()
        .replace(/\s+/g, "");
      return trackerPlate === plate;
    });

    if (!unit) {
      const fallback = getLastKnownManifestLocation();
      if (fallback) {
        setBusLocation({
          lat: fallback.lat,
          lng: fallback.lng,
          address: "Last known manifest location",
        });
        setMapCenter([fallback.lat, fallback.lng]);
        setLastUpdated(
          new Date(fallback.ts).toLocaleString("en-GB", { timeZone: "Africa/Nairobi" })
        );
      }
      return;
    }

    const lat = Number(unit.LastLat);
    const lng = Number(unit.LastLng);

    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

    (async () => {
      try {
        const res = await axios.get("https://nominatim.openstreetmap.org/reverse", {
          params: {
            format: "jsonv2",
            lat,
            lon: lng,
          },
          headers: {
            "Accept-Language": "en",
            "User-Agent": "SchoolTransportApp",
          },
        });

        const addr = res.data?.display_name || "Live Location";
        setBusLocation({ lat, lng, address: addr });
      } catch {
        setBusLocation({
          lat,
          lng,
          address: `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        });
      }
    })();

    const now = Date.now();

    const shouldRecord = (() => {
      if (!firstOnboardTs) return false;
      if (now < firstOnboardTs.getTime()) return false;
      if (lastOffboardTs && now > lastOffboardTs.getTime()) return false;
      return true;
    })();

    if (shouldRecord) {
      setRoutePositions((prev) => {
        if (!prev.length) {
          return [{ lat, lng, ts: now }];
        }

        const last = prev[prev.length - 1];
        const moved =
          Math.abs(last.lat - lat) > 0.00005 || Math.abs(last.lng - lng) > 0.00005;

        if (!moved) return prev;

        return [...prev, { lat, lng, ts: now }].slice(-500);
      });
    }

    setLastUpdated(new Date().toLocaleString("en-GB", { timeZone: "Africa/Nairobi" }));
    setMapCenter([lat, lng]);
  }, [busLocationsData, bus, firstOnboardTs, lastOffboardTs, manifests]);

  const checkMutation = useMutation({
    mutationFn: async ({ studentId, status, session }: any) => {
      const plate = (bus?.plateNumber || "").toLowerCase().replace(/\s+/g, "");

      const unit = busLocationsData.find(
        (u: any) =>
          ((u.VehicleNo || u.number || u.plate || u.plateNumber || u.name || "")
            .toString()
            .toLowerCase()
            .replace(/\s+/g, "")) === plate
      );

      let latitude = unit ? Number(unit.LastLat ?? unit.lat ?? unit.latitude ?? unit.position?.lat ?? 0) : 0;
      let longitude = unit ? Number(unit.LastLng ?? unit.lng ?? unit.longitude ?? unit.position?.lng ?? 0) : 0;
      let usedFallback = false;

      if (!unit || latitude === 0 || longitude === 0 || isNaN(latitude) || isNaN(longitude)) {
        const fallback = getLastKnownManifestLocation();
        if (fallback) {
          latitude = fallback.lat;
          longitude = fallback.lng;
          usedFallback = true;
          toast.info("Using last known manifest location for manifest creation (GPS missing).");
        } else {
          throw new Error("GPS not available for this bus.");
        }
      }

      if (latitude === 0 && longitude === 0) {
        throw new Error("Invalid GPS coordinates.");
      }

      const res = await api.post("/manifests", {
        studentId,
        busId: bus?.id,
        assistantId,
        status,
        session,
        latitude,
        longitude,
        usedFallback,
      });

      return res.data;
    },
    onSuccess: async (_, vars: any) => {
      toast.success(
        `${vars.status === "CHECKED_IN" ? `${vars.session} Onboarded` : `${vars.session} Offboarded`} successfully!`
      );
      queryClient.invalidateQueries({ queryKey: ["manifests"] });
      refetchManifests();
    },
    onError: (err: any) =>
      toast.error(`Failed to update manifest: ${err?.response?.data?.message || err.message}`),
  });

  const panicMutation = useMutation({
    mutationFn: async ({
      reason,
      remarks,
      studentId,
    }: {
      reason: string;
      remarks?: string;
      studentId?: string;
    }) => {
      const res = await api.post("/panic", {
        busId: bus?.id,
        assistantId,
        reason,
        remarks,
        studentId,
      });
      return res.data;
    },
    onSuccess: () => toast.success("Panic sent! Help is being notified."),
    onError: (err: any) =>
      toast.error(`Failed to send panic: ${err?.response?.data?.message || err.message}`),
  });

  const handleCheck = (
    student: any,
    status: "CHECKED_IN" | "CHECKED_OUT",
    session: "MORNING" | "EVENING"
  ) => {
    if (!isWithinSession(session)) {
      toast.error(`${session} actions allowed only during session.`);
      return;
    }

    const morning = todayManifests.find(
      (m: any) =>
        (m.student?.id === student.id || m.studentId === student.id) && m.session === "MORNING"
    );

    const evening = todayManifests.find(
      (m: any) =>
        (m.student?.id === student.id || m.studentId === student.id) && m.session === "EVENING"
    );

    if (status === "CHECKED_OUT") {
      if (
        (session === "MORNING" && (!morning || morning.status !== "CHECKED_IN")) ||
        (session === "EVENING" && (!evening || evening.status !== "CHECKED_IN"))
      ) {
        toast.error(`Cannot offboard ${session.toLowerCase()}: student not onboarded yet.`);
        return;
      }
    }

    if (session === "EVENING" && status === "CHECKED_IN" && morning && morning.status !== "CHECKED_OUT") {
      toast.error("Cannot onboard for evening: Morning session not offboarded yet.");
      return;
    }

    checkMutation.mutate({ studentId: student.id, status, session });
  };

  const isActionDisabled = (student: any, action: string, session: string) => {
    if (!isWithinSession(session as "MORNING" | "EVENING")) return true;

    const morning = todayManifests.find(
      (m: any) =>
        (m.student?.id === student.id || m.studentId === student.id) && m.session === "MORNING"
    );

    const evening = todayManifests.find(
      (m: any) =>
        (m.student?.id === student.id || m.studentId === student.id) && m.session === "EVENING"
    );

    if (session === "MORNING") {
      return action === "IN" ? morning?.status === "CHECKED_IN" : morning?.status !== "CHECKED_IN";
    }

    if (session === "EVENING") {
      return action === "IN"
        ? evening?.status === "CHECKED_IN" || (morning && morning.status !== "CHECKED_OUT")
        : evening?.status !== "CHECKED_IN";
    }

    return false;
  };

  const AutoCenter = ({ center }: { center: [number, number] | null }) => {
    const map = useMap();
    const first = useRef(true);

    useEffect(() => {
      if (!center) return;
      if (autoFollow || first.current) {
        map.flyTo(center, 15, { duration: 0.7 });
        first.current = false;
      }
    }, [center, map]);

    return null;
  };

  const latestUnit = useMemo(() => {
    if (!bus || !Array.isArray(busLocationsData)) return null;

    const plate = (bus.plateNumber || "").toLowerCase().replace(/\s+/g, "");

    return (
      busLocationsData.find(
        (u: any) =>
          ((u.VehicleNo || u.number || "").toString().toLowerCase().replace(/\s+/g, "")) === plate
      ) ?? null
    );
  }, [busLocationsData, bus]);

  const latestSpeed = latestUnit
    ? latestUnit.speed ?? latestUnit.speed_kmh ?? latestUnit.velocity ?? null
    : null;

  if (studentsLoading) {
    return <p className="p-6 text-center text-muted-foreground">Loading assistant info...</p>;
  }

  if (studentsError) {
    return <p className="text-red-500 text-center mt-6">Error loading students.</p>;
  }

  if (!bus) {
    return (
      <div className="p-6 text-center">
        <p>No bus assigned for this assistant.</p>
        <Button onClick={handleLogout} variant="destructive" className="mt-4">
          Logout
        </Button>
      </div>
    );
  }

  const morningOnboarded = todayManifests.filter(
    (m: any) => m.session === "MORNING" && m.status === "CHECKED_IN"
  ).length;

  const morningOffboarded = todayManifests.filter(
    (m: any) => m.session === "MORNING" && m.status === "CHECKED_OUT"
  ).length;

  const eveningOnboarded = todayManifests.filter(
    (m: any) => m.session === "EVENING" && m.status === "CHECKED_IN"
  ).length;

  const eveningOffboarded = todayManifests.filter(
    (m: any) => m.session === "EVENING" && m.status === "CHECKED_OUT"
  ).length;

  const totalOnboarded = morningOnboarded + eveningOnboarded;
  const totalOffboarded = morningOffboarded + eveningOffboarded;

  const filteredStudents = assignedStudents.filter((s: any) =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <Toaster position="top-center" richColors closeButton />
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bus Assistant Portal</h1>
            <p className="text-muted-foreground mt-1">
              Welcome, {user?.name || "Assistant"} — manage student attendance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Morning Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Onboarded</span>
                <span className="font-bold">{morningOnboarded}</span>
              </div>
              <div className="flex justify-between">
                <span>Offboarded</span>
                <span className="font-bold">{morningOffboarded}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evening Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Onboarded</span>
                <span className="font-bold">{eveningOnboarded}</span>
              </div>
              <div className="flex justify-between">
                <span>Offboarded</span>
                <span className="font-bold">{eveningOffboarded}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Onboarded</span>
                <span className="font-bold">{totalOnboarded}</span>
              </div>
              <div className="flex justify-between">
                <span>Offboarded</span>
                <span className="font-bold">{totalOffboarded}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4 mb-3">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => paginatedStudents.forEach((s) => handleCheck(s, "CHECKED_OUT", "MORNING"))}
          >
            Offboard All (Morning)
          </Button>
          <Button
            size="sm"
            onClick={() => paginatedStudents.forEach((s) => handleCheck(s, "CHECKED_IN", "EVENING"))}
          >
            Onboard All (Evening)
          </Button>
          <Button
            className="bg-yellow-500 text-black hover:bg-yellow-600"
            onClick={() => {
              setPanicTarget({ type: "bus" });
              setPanicReason("Assistance needed!");
              setPanicModalOpen(true);
            }}
          >
            Panic Button
          </Button>
        </div>

        {panicModalOpen && panicTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
              <h3 className="text-lg font-bold">
                {panicTarget.type === "bus"
                  ? "Send Panic for Bus"
                  : `Send Panic for ${panicTarget.student?.name}`}
              </h3>

              <label className="font-semibold">Select Panic Reason</label>
              <select
                className="w-full p-2 border rounded"
                value={panicReason}
                onChange={(e) => setPanicReason(e.target.value)}
              >
                <option value="Child Unwell">Child Unwell</option>
                <option value="Fight / Bullying">Fight / Bullying</option>
                <option value="Missing Item">Missing Item</option>
                <option value="Lost Child">Lost Child</option>
                <option value="Suspicious Person">Suspicious Person</option>
                <option value="Accident">Accident</option>
                <option value="Mechanical Issue">Mechanical Issue</option>
                <option value="Traffic">Traffic</option>
                <option value="Other">Other</option>
              </select>

              <label className="font-semibold mt-2">Additional Remarks (Optional)</label>
              <textarea
                className="w-full p-2 border rounded h-24"
                placeholder="Add more details (optional)"
                value={panicRemarks}
                onChange={(e) => setPanicRemarks(e.target.value)}
              />

              <div className="flex justify-end gap-3 pt-3">
                <Button
                  variant="destructive"
                  onClick={() => {
                    panicMutation.mutate({
                      reason: panicReason,
                      remarks: panicRemarks || "",
                      ...(panicTarget.type === "student"
                        ? { studentId: panicTarget.student?.id }
                        : {}),
                    });
                    setPanicModalOpen(false);
                    setPanicReason("Child Unwell");
                    setPanicRemarks("");
                    setPanicTarget(null);
                  }}
                >
                  Send Panic
                </Button>

                <Button
                  onClick={() => {
                    setPanicModalOpen(false);
                    setPanicReason("Child Unwell");
                    setPanicRemarks("");
                    setPanicTarget(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Student Manifest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="text"
              placeholder="Search student..."
              className="w-full p-2 border rounded"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />

            {paginatedStudents.map((student: any) => {
              const morning = todayManifests.find(
                (m: any) =>
                  (m.student?.id === student.id || m.studentId === student.id) &&
                  m.session === "MORNING"
              );

              const evening = todayManifests.find(
                (m: any) =>
                  (m.student?.id === student.id || m.studentId === student.id) &&
                  m.session === "EVENING"
              );

              return (
                <div
                  key={student.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-muted-foreground">{student.grade}</p>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-3 mt-3 md:mt-0">
                    <Badge
                      className={`${
                        morning
                          ? morning.status === "CHECKED_IN"
                            ? "bg-green-600 text-white"
                            : "bg-gray-500 text-white"
                          : "bg-gray-400 text-white"
                      }`}
                    >
                      Morning{" "}
                      {morning
                        ? morning.status === "CHECKED_IN"
                          ? "Onboarded"
                          : "Offboarded"
                        : "No record"}
                    </Badge>

                    <Button
                      size="sm"
                      className={`${
                        morning?.status === "CHECKED_IN"
                          ? "bg-gray-400 text-white"
                          : "bg-green-600 text-white"
                      }`}
                      onClick={() => handleCheck(student, "CHECKED_IN", "MORNING")}
                      disabled={isActionDisabled(student, "IN", "MORNING")}
                    >
                      In (M)
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCheck(student, "CHECKED_OUT", "MORNING")}
                      disabled={isActionDisabled(student, "OUT", "MORNING")}
                    >
                      Out (M)
                    </Button>

                    <Badge
                      className={`${
                        evening
                          ? evening.status === "CHECKED_IN"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-500 text-white"
                          : "bg-gray-400 text-white"
                      }`}
                    >
                      Evening{" "}
                      {evening
                        ? evening.status === "CHECKED_IN"
                          ? "Onboarded"
                          : "Offboarded"
                        : "No record"}
                    </Badge>

                    <Button
                      size="sm"
                      className={`${
                        evening?.status === "CHECKED_IN"
                          ? "bg-gray-400 text-white"
                          : "bg-green-600 text-white"
                      }`}
                      onClick={() => handleCheck(student, "CHECKED_IN", "EVENING")}
                      disabled={isActionDisabled(student, "IN", "EVENING")}
                    >
                      In (E)
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCheck(student, "CHECKED_OUT", "EVENING")}
                      disabled={isActionDisabled(student, "OUT", "EVENING")}
                    >
                      Out (E)
                    </Button>

                    <Button
                      size="sm"
                      className="bg-yellow-500 text-black hover:bg-yellow-600"
                      onClick={() => {
                        setPanicTarget({ type: "student", student });
                        setPanicReason("Assistance needed!");
                        setPanicModalOpen(true);
                      }}
                    >
                      Panic
                    </Button>
                  </div>
                </div>
              );
            })}

            <div className="flex justify-center items-center space-x-2 mt-4">
              <Button
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <span>
                Page {currentPage} / {totalPages}
              </span>
              <Button
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>My Bus: {bus.plateNumber}</span>
              {bus.driver?.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 border-green-600 text-green-700 hover:bg-green-50"
                  onClick={() => {
                    window.location.href = `tel:${bus.driver.phone}`;
                  }}
                >
                  <span className="text-lg">📞</span> Call Driver
                </Button>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 bg-muted rounded-lg border">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Driver</p>
                <p className="font-semibold">{bus.driver?.name || "Not Assigned"}</p>
              </div>

              <div className="p-3 bg-muted rounded-lg border">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Latest Speed</p>
                <p className="font-semibold">{latestSpeed ?? "0"} km/h</p>
              </div>

              <div className="p-3 bg-muted rounded-lg border">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Last Sync</p>
                <p className="font-semibold text-sm">{lastUpdated?.split(",")[1] ?? "N/A"}</p>
              </div>

              <div className="p-3 bg-muted rounded-lg border">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Bus Status</p>
                <Badge className={latestSpeed > 0 ? "bg-green-500" : "bg-slate-500"}>
                  {latestSpeed > 0 ? "Moving" : "Stationary"}
                </Badge>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start gap-2">
              <span className="mt-1">📍</span>
              <div>
                <p className="text-[10px] text-blue-700 font-bold uppercase">Current Location</p>
                <p className="text-sm text-blue-900">{busLocation?.address || "Locating bus..."}</p>
              </div>
            </div>

            {busLocation && (
              <MapContainer
                center={mapCenter || [busLocation.lat, busLocation.lng]}
                zoom={15}
                scrollWheelZoom
                style={{ height: "400px", width: "100%", borderRadius: "8px" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {routePositions.length > 1 && (
                  <Polyline
                    positions={routePositions.map((p) => [p.lat, p.lng])}
                    pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.7 }}
                  />
                )}

                <Marker
                  position={[busLocation.lat, busLocation.lng]}
                  icon={new L.Icon({
                    iconUrl:
                      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
                    iconRetinaUrl:
                      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
                    shadowUrl:
                      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                  })}
                >
                  <Popup>
                    <strong>{bus.plateNumber}</strong>
                    <br />
                    {busLocation.address}
                    <br />
                    Speed: {latestSpeed ?? 0} km/h
                  </Popup>
                </Marker>

                <AutoCenter center={mapCenter} />
              </MapContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}