// src/pages/AssistantPortal.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { Toaster, toast } from "sonner";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker icons (common leaflet + Vite fix)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// API Endpoints (use Vite envs)
const API_BASE = import.meta.env.VITE_API_URL ?? "https://schooltransport-production.up.railway.app/api";
const STUDENTS_API = `${API_BASE}/students`;
const MANIFEST_API = `${API_BASE}/manifests`;
const BUS_LOCATIONS_API = (import.meta.env.VITE_API_URL_TRACK ?? "https://mytrack-production.up.railway.app/api") + "/devices/list";
const PANIC_API = `${API_BASE}/panic`;

export default function AssistantPortal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");
  const assistantId = user?.id;

  // PANIC MODAL STATE
  const [panicModalOpen, setPanicModalOpen] = useState(false);
  const [panicTarget, setPanicTarget] = useState<{ type: "bus" | "student"; student?: any } | null>(null);
  const [panicReason, setPanicReason] = useState("Assistance needed!");
  const [panicRemarks, setPanicRemarks] = useState("");

  // BUS & STUDENT STATE
  const [busLocation, setBusLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [routePositions, setRoutePositions] = useState<Array<[number, number]>>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const routeRef = useRef<Array<string>>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Redirect if not logged in
  useEffect(() => {
    if (!user || !token) navigate("/login");
  }, [user, token, navigate]);

  // Helper: Kenya time
  const getKenyaNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));

  const isWithinSession = (session: "MORNING" | "EVENING") => {
    const now = getKenyaNow();
    if (isNaN(now.getTime())) return false;
    if (session === "MORNING") {
      const start = new Date(now); start.setHours(5, 0, 0, 0);
      const end = new Date(now); end.setHours(11, 59, 59, 999);
      return now >= start && now <= end;
    } else {
      const start = new Date(now); start.setHours(12, 0, 0, 0);
      const end = new Date(now); end.setHours(21, 30, 0, 0);
      return now >= start && now <= end;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    toast.success("Logged out successfully!");
    navigate("/");
  };

  const sendSmsNotification = async (payload: any) => {
    try {
      await axios.post(`${API_BASE}/sms/manifest`, payload, { headers: { Authorization: `Bearer ${token}` } });
      toast.message("SMS notification sent (backend).");
    } catch (err: any) {
      console.warn("SMS notify failed:", err?.response?.data ?? err.message);
      if (err?.response?.status && err.response.status !== 404) {
        toast.error(`SMS send failed: ${err?.response?.data?.message || err.message}`);
      }
    }
  };

  // --------------------- Data Fetching ---------------------

  // 1) Bus locations from myTrack (uses public API key from .env)
  const { data: busLocationsData = [] } = useQuery({
    queryKey: ["bus-locations"],
    queryFn: async () => {
      const res = await axios.get(BUS_LOCATIONS_API, {
        headers: {
          // Parent portal used X-API-Key — using the same header from your .env
          "X-API-Key": import.meta.env.VITE_PUBLIC_MYTRACK,
        },
      });
      // normalize: some APIs return { data: [...] } or raw array
      return res.data?.data ?? res.data ?? [];
    },
    refetchInterval: 15000, // every 15s
    onError: (err: any) => {
      // don't spam user repeatedly but show once
      console.warn("Bus locations fetch error:", err?.response?.status, err?.message);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        toast.error("Unauthorized fetching bus locations. Check API key.");
      }
    },
  });

  // 2) Students (assistant's students)
  const { data: studentsData = [], isLoading: studentsLoading, isError: studentsError } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const res = await axios.get(STUDENTS_API, { headers: { Authorization: `Bearer ${token}` } });
      return Array.isArray(res.data?.data) ? res.data.data : (res.data ?? []);
    },
    onError: () => toast.error("Failed to load students"),
  });

  // 3) Manifests (today)
  const { data: manifestsData, refetch: refetchManifests } = useQuery({
    queryKey: ["manifests"],
    queryFn: async () => {
      const res = await axios.get(MANIFEST_API, { headers: { Authorization: `Bearer ${token}` } });
      return Array.isArray(res.data?.data) ? res.data.data : (res.data?.data ?? res.data ?? []);
    },
    onError: () => toast.error("Failed to load manifests"),
  });
  const manifests = Array.isArray(manifestsData) ? manifestsData : [];

  // assigned students & bus (filter by assistant)
  const assignedStudents = Array.isArray(studentsData)
    ? studentsData.filter((s) => s.bus?.assistantId === assistantId)
    : [];
  const bus = assignedStudents[0]?.bus || null;

  // today's manifests filtered for this assistant & bus
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayManifests = manifests.filter((m: any) => {
    const dateOk = m.date ? new Date(m.date) >= today : true;
    const assistantOk = m.assistantId === assistantId;
    const busOk = m.busId === bus?.id || (m.bus?.id === bus?.id);
    return dateOk && assistantOk && busOk;
  });

  // Helper: safely parse manifest timestamp
  const parseManifestTs = (m: any) => {
    const ts = m.createdAt ?? m.timestamp ?? m.time ?? m.date ?? null;
    const d = ts ? new Date(ts) : null;
    return (d && !isNaN(d.getTime())) ? d : null;
  };

  // Compute first onboard and last offboard timestamps (for route limiting)
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

  // Helper: find last known manifest location (todayManifests first, then all manifests)
  const getLastKnownManifestLocation = () => {
    const candidates = (todayManifests.length ? todayManifests : manifests)
      .filter((m: any) => (m.latitude || m.lat || m.longitude || m.lng || m.coords))
      .map((m: any) => {
        const lat = Number(m.latitude ?? m.lat ?? m.coords?.lat ?? m.position?.lat);
        const lng = Number(m.longitude ?? m.lng ?? m.coords?.lng ?? m.position?.lng);
        const ts = parseManifestTs(m) ?? new Date();
        return { lat, lng, ts };
      })
      .filter((x: any) => !isNaN(x.lat) && !isNaN(x.lng) && x.lat !== 0 && x.lng !== 0)
      .sort((a: any, b: any) => b.ts.getTime() - a.ts.getTime()); // most recent first

    return candidates.length ? candidates[0] : null;
  };

  // --------------------- Bus Tracking ---------------------
  useEffect(() => {
    if (!bus || !Array.isArray(busLocationsData)) return;

    // find unit for this bus (match plate normalized)
    const plate = (bus.plateNumber || "").toString().toLowerCase().replace(/\s+/g, "");
    const unit = busLocationsData.find((u: any) => {
      const number = ((u.number ?? u.plate ?? u.plateNumber ?? u.name) || "").toString().toLowerCase().replace(/\s+/g, "");
      return number === plate;
    });

    if (!unit) {
      // No live unit: use last-known manifest location as fallback (if available)
      const fallback = getLastKnownManifestLocation();
      if (fallback) {
        setBusLocation({ lat: fallback.lat, lng: fallback.lng, address: "Last known manifest location" });
        setMapCenter([fallback.lat, fallback.lng]);
        setLastUpdated(new Date(fallback.ts).toLocaleString("en-GB", { timeZone: "Africa/Nairobi" }));
      } else {
        setBusLocation(null);
        setLastUpdated(null);
      }
      return;
    }

    // extract lat/lng robustly
    const lat = Number(unit.lat ?? unit.latitude ?? unit.position?.lat ?? unit.coords?.lat);
    const lng = Number(unit.lng ?? unit.longitude ?? unit.position?.lng ?? unit.coords?.lng);
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      // try fallback to last manifest
      const fallback = getLastKnownManifestLocation();
      if (fallback) {
        toast.info("Using last known manifest location (gps invalid).");
        setBusLocation({ lat: fallback.lat, lng: fallback.lng, address: "Last known manifest location" });
        setMapCenter([fallback.lat, fallback.lng]);
        setLastUpdated(new Date(fallback.ts).toLocaleString("en-GB", { timeZone: "Africa/Nairobi" }));
      } else {
        toast.error("GPS coordinates invalid for this bus.");
        setBusLocation(null);
        setLastUpdated(null);
      }
      return;
    }

    // reverse geocode for nicer address (best-effort)
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/geocode/reverse`, { params: { lat, lon: lng }, headers: { Authorization: `Bearer ${token}` } });
        const geoData = res.data ?? {};
        const addr = geoData.display_name ?? geoData.address ?? geoData.name ?? geoData.result ?? "Unknown location";
        setBusLocation({ lat, lng, address: addr });
      } catch {
        setBusLocation({ lat, lng, address: "Address unavailable" });
      }
    })();

    // determine timestamp for this unit reading (fallback to now)
    const tsRaw = unit.timestamp ?? unit.time ?? unit.lastUpdated ?? unit.ts ?? unit.updatedAt ?? null;
    const unitTs = tsRaw ? new Date(tsRaw) : new Date();
    const unitTsValid = unitTs && !isNaN(unitTs.getTime()) ? unitTs : new Date();

    setLastUpdated(unitTsValid ? unitTsValid.toLocaleString("en-GB", { timeZone: "Africa/Nairobi" }) : new Date().toLocaleString("en-GB", { timeZone: "Africa/Nairobi" }));

    // Decide whether to record this point based on firstOnboardTs / lastOffboardTs:
    // - Start recording only after firstOnboardTs exists and unitTs >= firstOnboardTs
    // - Stop recording after lastOffboardTs if it exists (don't add if unitTs > lastOffboardTs)
    const shouldRecord = (() => {
      // if we don't have a start time, do not record (assistant asked to track from first onboard)
      if (!firstOnboardTs) return false;
      // only start when unit timestamp is >= firstOnboardTs
      if (unitTsValid.getTime() < firstOnboardTs.getTime()) return false;
      // if there's an end time, stop after it
      if (lastOffboardTs && unitTsValid.getTime() > lastOffboardTs.getTime()) return false;
      // also allow recording if start exists and either no end or within range
      return true;
    })();

    // create a unique id token to avoid duplicates (use timestamp + coords)
    const idToken = `${unitTsValid.getTime()}-${lat.toFixed(6)}-${lng.toFixed(6)}`;

    if (shouldRecord) {
      if (!routeRef.current.includes(idToken)) {
        routeRef.current.push(idToken);
        setRoutePositions((prev) => {
          const next = [...prev, [lat, lng] as [number, number]];
          // cap route history to last 200 points
          return next.slice(-200);
        });
      }
    } else {
      // if we're outside recording window, do not grow routePositions
      // but still update map center so the bus is visible
    }

    // always set map center to latest reading (even if not recording)
    setMapCenter([lat, lng]);
  }, [busLocationsData, bus, firstOnboardTs, lastOffboardTs, token]);

  // --------------------- Mutations ---------------------
  const checkMutation = useMutation({
    mutationFn: async ({ studentId, status, session }: any) => {
      // try live unit first
      const plate = (bus?.plateNumber || "").toLowerCase().replace(/\s+/g, "");
      const unit = busLocationsData.find((u: any) => ((u.number || u.plate || u.plateNumber || u.name || "").toString().toLowerCase().replace(/\s+/g, "")) === plate);

      let latitude = unit ? (unit.lat ?? unit.latitude ?? unit.position?.lat ?? 0) : 0;
      let longitude = unit ? (unit.lng ?? unit.longitude ?? unit.position?.lng ?? 0) : 0;
      let usedFallback = false;

      // if no live unit or invalid coords, try fallback to last manifest location
      if (!unit || latitude === 0 || longitude === 0 || isNaN(latitude) || isNaN(longitude)) {
        const fallback = getLastKnownManifestLocation();
        if (fallback) {
          latitude = fallback.lat;
          longitude = fallback.lng;
          usedFallback = true;
          // inform user that fallback was used
          toast.info("Using last known manifest location for manifest creation (GPS missing).");
        } else {
          throw new Error("GPS not available for this bus.");
        }
      }

      if (latitude === 0 && longitude === 0) throw new Error("Invalid GPS coordinates.");

      // call backend manifest API
      const res = await axios.post(MANIFEST_API, { studentId, busId: bus?.id, assistantId, status, session, latitude, longitude, usedFallback }, { headers: { Authorization: `Bearer ${token}` } });
      return res.data;
    },
    onSuccess: async (_, vars: any) => {
      toast.success(`${vars.status === "CHECKED_IN" ? vars.session + " Onboarded" : vars.session + " Offboarded"} successfully!`);
      queryClient.invalidateQueries(["manifests"]);
      refetchManifests();
      // try to notify via SMS (best-effort)
      try {
        await sendSmsNotification({ studentId: vars.studentId, status: vars.status, session: vars.session, busId: bus?.id, assistantId, latitude: vars.latitude, longitude: vars.longitude });
      } catch (e) {
        // already handled inside sendSmsNotification
      }
    },
    onError: (err: any) => toast.error(`Failed to update manifest: ${err?.response?.data?.message || err.message}`),
  });

  const panicMutation = useMutation({
    mutationFn: async ({ reason, remarks, studentId }: { reason: string; remarks?: string; studentId?: string }) => {
      const res = await axios.post(PANIC_API, { busId: bus?.id, assistantId, reason, remarks, studentId }, { headers: { Authorization: `Bearer ${token}` } });
      return res.data;
    },
    onSuccess: () => toast.success("Panic sent! Help is being notified."),
    onError: (err: any) => toast.error(`Failed to send panic: ${err?.response?.data?.message || err.message}`),
  });

  // --------------------- Utility ---------------------
  const handleCheck = (student: any, status: "CHECKED_IN" | "CHECKED_OUT", session: "MORNING" | "EVENING") => {
    if (!isWithinSession(session)) { toast.error(`${session} actions allowed only during session.`); return; }
    const morning = todayManifests.find((m: any) => (m.student?.id === student.id || m.studentId === student.id) && m.session === "MORNING");
    const evening = todayManifests.find((m: any) => (m.student?.id === student.id || m.studentId === student.id) && m.session === "EVENING");

    if (status === "CHECKED_OUT") {
      if ((session === "MORNING" && (!morning || morning.status !== "CHECKED_IN")) || (session === "EVENING" && (!evening || evening.status !== "CHECKED_IN"))) {
        toast.error(`Cannot offboard ${session.toLowerCase()}: student not onboarded yet.`); return;
      }
    }
    if (session === "EVENING" && status === "CHECKED_IN" && morning && morning.status !== "CHECKED_OUT") {
      toast.error("Cannot onboard for evening: Morning session not offboarded yet."); return;
    }
    checkMutation.mutate({ studentId: student.id, status, session });
  };

  const isActionDisabled = (student: any, action: string, session: string) => {
    if (!isWithinSession(session as "MORNING" | "EVENING")) return true;
    const morning = todayManifests.find((m: any) => (m.student?.id === student.id || m.studentId === student.id) && m.session === "MORNING");
    const evening = todayManifests.find((m: any) => (m.student?.id === student.id || m.studentId === student.id) && m.session === "EVENING");

    if (session === "MORNING") return action === "IN" ? morning?.status === "CHECKED_IN" : morning?.status !== "CHECKED_IN";
    if (session === "EVENING") return action === "IN" ? evening?.status === "CHECKED_IN" || (morning && morning.status !== "CHECKED_OUT") : evening?.status !== "CHECKED_IN";
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
    return busLocationsData.find((u: any) => ((u.number || u.plate || u.plateNumber || u.name || "").toString().toLowerCase().replace(/\s+/g, "")) === plate) ?? null;
  }, [busLocationsData, bus]);

  const latestSpeed = latestUnit ? (latestUnit.speed ?? latestUnit.speed_kmh ?? latestUnit.velocity ?? null) : null;

  // UI gating
  if (studentsLoading) return <p className="p-6 text-center text-muted-foreground">Loading assistant info...</p>;
  if (studentsError) return <p className="text-red-500 text-center mt-6">Error loading students.</p>;
  if (!bus) return (
    <div className="p-6 text-center">
      <p>No bus assigned for this assistant.</p>
      <Button onClick={handleLogout} variant="destructive" className="mt-4">Logout</Button>
    </div>
  );

  // Summaries
  const morningOnboarded = todayManifests.filter((m: any) => m.session === "MORNING" && m.status === "CHECKED_IN").length;
  const morningOffboarded = todayManifests.filter((m: any) => m.session === "MORNING" && m.status === "CHECKED_OUT").length;
  const eveningOnboarded = todayManifests.filter((m: any) => m.session === "EVENING" && m.status === "CHECKED_IN").length;
  const eveningOffboarded = todayManifests.filter((m: any) => m.session === "EVENING" && m.status === "CHECKED_OUT").length;
  const totalOnboarded = morningOnboarded + eveningOnboarded;
  const totalOffboarded = morningOffboarded + eveningOffboarded;

  const filteredStudents = assignedStudents.filter((s: any) => s.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <Toaster position="top-center" richColors closeButton />
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bus Assistant Portal</h1>
            <p className="text-muted-foreground mt-1">Welcome, {user?.name || "Assistant"} — manage student attendance</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2"><LogOut className="w-4 h-4" /> Logout</Button>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card><CardHeader><CardTitle>Morning Session</CardTitle></CardHeader><CardContent className="space-y-2">
            <div className="flex justify-between"><span>Onboarded</span><span className="font-bold">{morningOnboarded}</span></div>
            <div className="flex justify-between"><span>Offboarded</span><span className="font-bold">{morningOffboarded}</span></div>
          </CardContent></Card>

          <Card><CardHeader><CardTitle>Evening Session</CardTitle></CardHeader><CardContent className="space-y-2">
            <div className="flex justify-between"><span>Onboarded</span><span className="font-bold">{eveningOnboarded}</span></div>
            <div className="flex justify-between"><span>Offboarded</span><span className="font-bold">{eveningOffboarded}</span></div>
          </CardContent></Card>

          <Card><CardHeader><CardTitle>Total Summary</CardTitle></CardHeader><CardContent className="space-y-2">
            <div className="flex justify-between"><span>Onboarded</span><span className="font-bold">{totalOnboarded}</span></div>
            <div className="flex justify-between"><span>Offboarded</span><span className="font-bold">{totalOffboarded}</span></div>
          </CardContent></Card>
        </div>

        <div className="flex gap-4 mb-3">
          <Button size="sm" variant="destructive" onClick={() => paginatedStudents.forEach(s => handleCheck(s, "CHECKED_OUT", "MORNING"))}>
            Offboard All (Morning)
          </Button>
          <Button size="sm" onClick={() => paginatedStudents.forEach(s => handleCheck(s, "CHECKED_IN", "EVENING"))}>
            Onboard All (Evening)
          </Button>
          <Button className="bg-yellow-500 text-black hover:bg-yellow-600" onClick={() => { setPanicTarget({ type: "bus" }); setPanicReason("Assistance needed!"); setPanicModalOpen(true); }}>
            Panic Button
          </Button>
        </div>

        {/* PANIC MODAL */}
        {panicModalOpen && panicTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
              <h3 className="text-lg font-bold">
                {panicTarget.type === "bus" ? "Send Panic for Bus" : `Send Panic for ${panicTarget.student?.name}`}
              </h3>

              <label className="font-semibold">Select Panic Reason</label>
              <select className="w-full p-2 border rounded" value={panicReason} onChange={(e) => setPanicReason(e.target.value)}>
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
              <textarea className="w-full p-2 border rounded h-24" placeholder="Add more details (optional)" value={panicRemarks} onChange={(e) => setPanicRemarks(e.target.value)} />

              <div className="flex justify-end gap-3 pt-3">
                <Button variant="destructive" onClick={() => {
                  panicMutation.mutate({
                    reason: panicReason,
                    remarks: panicRemarks || "",
                    ...(panicTarget.type === "student" ? { studentId: panicTarget.student?.id } : {}),
                  });
                  setPanicModalOpen(false);
                  setPanicReason("Child Unwell");
                  setPanicRemarks("");
                  setPanicTarget(null);
                }}>
                  Send Panic
                </Button>

                <Button onClick={() => {
                  setPanicModalOpen(false);
                  setPanicReason("Child Unwell");
                  setPanicRemarks("");
                  setPanicTarget(null);
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Student Manifest */}
        <Card>
          <CardHeader><CardTitle>Student Manifest</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <input type="text" placeholder="Search student..." className="w-full p-2 border rounded" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />

            {paginatedStudents.map((student: any) => {
              const morning = todayManifests.find((m: any) => (m.student?.id === student.id || m.studentId === student.id) && m.session === "MORNING");
              const evening = todayManifests.find((m: any) => (m.student?.id === student.id || m.studentId === student.id) && m.session === "EVENING");

              return (
                <div key={student.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-muted-foreground">{student.grade}</p>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-3 mt-3 md:mt-0">
                    <Badge className={`${morning ? morning.status === "CHECKED_IN" ? "bg-green-600 text-white" : "bg-gray-500 text-white" : "bg-gray-400 text-white"}`}>Morning {morning ? morning.status === "CHECKED_IN" ? "Onboarded" : "Offboarded" : "No record"}</Badge>
                    <Button size="sm" className={`${morning?.status === "CHECKED_IN" ? "bg-gray-400 text-white" : "bg-green-600 text-white"}`} onClick={() => handleCheck(student, "CHECKED_IN", "MORNING")} disabled={isActionDisabled(student, "IN", "MORNING")}>In (M)</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleCheck(student, "CHECKED_OUT", "MORNING")} disabled={isActionDisabled(student, "OUT", "MORNING")}>Out (M)</Button>

                    <Badge className={`${evening ? evening.status === "CHECKED_IN" ? "bg-blue-600 text-white" : "bg-gray-500 text-white" : "bg-gray-400 text-white"}`}>Evening {evening ? evening.status === "CHECKED_IN" ? "Onboarded" : "Offboarded" : "No record"}</Badge>
                    <Button size="sm" className={`${evening?.status === "CHECKED_IN" ? "bg-gray-400 text-white" : "bg-green-600 text-white"}`} onClick={() => handleCheck(student, "CHECKED_IN", "EVENING")} disabled={isActionDisabled(student, "IN", "EVENING")}>In (E)</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleCheck(student, "CHECKED_OUT", "EVENING")} disabled={isActionDisabled(student, "OUT", "EVENING")}>Out (E)</Button>

                    <Button size="sm" className="bg-yellow-500 text-black hover:bg-yellow-600" onClick={() => { setPanicTarget({ type: "student", student }); setPanicReason("Assistance needed!"); setPanicModalOpen(true); }}>
                      Panic
                    </Button>
                  </div>
                </div>
              );
            })}

            <div className="flex justify-center items-center space-x-2 mt-4">
              <Button size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Prev</Button>
              <span>Page {currentPage} / {totalPages}</span>
              <Button size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </CardContent>
        </Card>

        {/* Bus Info & Map */}
        <Card>
          <CardHeader><CardTitle>My Bus: {bus.plateNumber}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Badge>Driver: {bus.driver?.name || "Unknown"}</Badge>
              <Badge>Latest Speed: {latestSpeed ?? "N/A"} km/h</Badge>
              <Badge>Last Updated: {lastUpdated ?? "N/A"}</Badge>
              <Badge>Current Location: {busLocation?.address ?? "N/A"}</Badge>
            </div>

            {/* Map: only show when we have a busLocation */}
            {busLocation && (
              <MapContainer
                key={`${busLocation.lat}-${busLocation.lng}`} // ensures Leaflet refreshes center when changed
                center={mapCenter || [busLocation.lat, busLocation.lng]}
                zoom={17}
                scrollWheelZoom
                style={{ height: "400px", width: "100%" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {/* Polyline for the route */}
                {routePositions.length > 0 && (
                  <Polyline
                    positions={routePositions.filter((pos, i, arr) => i === 0 || pos[0] !== arr[i - 1][0] || pos[1] !== arr[i - 1][1])}
                  />
                )}

                {/* Markers for each route point */}
                {routePositions.map((pos, idx) => (
                  <Marker
                    key={idx}
                    position={pos}
                    icon={
                      idx === routePositions.length - 1
                        ? new L.Icon({
                            iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-red.png",
                            iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
                            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
                            iconSize: [25, 41],
                            iconAnchor: [12, 41],
                          })
                        : new L.Icon.Default()
                    }
                  >
                    <Popup>
                      {`Point ${idx + 1}`}<br />
                      Lat: {pos[0]} <br />
                      Lng: {pos[1]}
                    </Popup>
                  </Marker>
                ))}

                <AutoCenter center={mapCenter} />
              </MapContainer>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
