import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Toaster, toast } from "sonner";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// API Endpoints
const API_BASE = "https://schooltransport-production.up.railway.app/api";
const STUDENTS_API = `${API_BASE}/students`;
const MANIFEST_API = `${API_BASE}/manifests`;
const GPS_API =
  "https://myfleet.track-loc8.com/api/v1/unit.json?key=44e824d4f70647af1bb9a314b4de7e73951c8ad6";

export default function AssistantPortal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!user || !token) navigate("/login");
  }, [user, token, navigate]);

  const assistantId = user?.id;
  const [busLocation, setBusLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    toast.success("Logged out successfully!");
    navigate("/");
  };

  // Fetch Students
  const { data: studentsData, isLoading: studentsLoading, isError: studentsError } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const res = await axios.get(STUDENTS_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data?.data || [];
    },
    onError: () => toast.error("Failed to load students"),
  });

  // Fetch GPS data
  const { data: gpsData } = useQuery({
    queryKey: ["gps"],
    queryFn: async () => {
      const res = await axios.get(GPS_API);
      return res.data?.data?.units || [];
    },
    refetchInterval: 15000,
  });

  const assignedStudents = Array.isArray(studentsData)
    ? studentsData.filter((s) => s.bus?.assistantId === assistantId)
    : [];
  const bus = assignedStudents[0]?.bus || null;

  // Match bus with GPS unit and reverse geocode
  useEffect(() => {
    const fetchAddress = async (lat: number, lng: number) => {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const geoData = await geoRes.json();
        return geoData.display_name || "Unknown location";
      } catch {
        return "Address unavailable";
      }
    };

    if (bus && gpsData) {
      const unit = gpsData.find(
        (u) =>
          u.number?.toLowerCase() === bus.plateNumber?.toLowerCase() ||
          u.name?.toLowerCase() === bus.plateNumber?.toLowerCase()
      );
      if (unit) {
        fetchAddress(unit.lat, unit.lng).then((address) =>
          setBusLocation({ lat: unit.lat, lng: unit.lng, address })
        );
      }
    }
  }, [bus, gpsData]);

  // Fetch Manifests
  const { data: manifestsData, refetch: refetchManifests } = useQuery({
    queryKey: ["manifests"],
    queryFn: async () => {
      const res = await axios.get(MANIFEST_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
    onError: () => toast.error("Failed to load manifests"),
  });

  const manifests = Array.isArray(manifestsData) ? manifestsData : [];

  // Unified mutation for check-in/out
  const checkMutation = useMutation({
    mutationFn: async ({ studentId, status, session }: any) => {
      const unit = gpsData?.find(
        (u) =>
          u.number?.toLowerCase() === bus?.plateNumber?.toLowerCase() ||
          u.name?.toLowerCase() === bus?.plateNumber?.toLowerCase()
      );

      const latitude = unit?.lat || 0;
      const longitude = unit?.lng || 0;

      const body = { studentId, busId: bus?.id, assistantId, status, session, latitude, longitude };

      const res = await axios.post(MANIFEST_API, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: (_, vars) => {
      const label =
        vars.status === "CHECKED_IN" ? `${vars.session} Onboarded` : `${vars.session} Offboarded`;
      toast.success(`${label} successfully!`);
      queryClient.invalidateQueries(["manifests"]);
      refetchManifests();
    },
    onError: (err: any) => {
      toast.error(`Failed to update manifest: ${err?.response?.data?.message || err.message}`);
    },
  });

  if (studentsLoading)
    return <p className="p-6 text-center text-muted-foreground">Loading assistant info...</p>;
  if (studentsError)
    return <p className="text-red-500 text-center mt-6">Error loading students.</p>;
  if (!bus)
    return (
      <div className="p-6 text-center">
        <p>No bus assigned for this assistant.</p>
        <Button onClick={handleLogout} variant="destructive" className="mt-4">
          Logout
        </Button>
      </div>
    );

  // Filter manifests for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayManifests = manifests.filter(
    (m) => new Date(m.date) >= today && m.assistantId === assistantId && m.busId === bus?.id
  );

  // Helper: get current Kenya time (Africa/Nairobi)
  function getKenyaNow(): Date {
    const str = new Date().toLocaleString("en-GB", { timeZone: "Africa/Nairobi" });
    return new Date(str);
  }

  // Helper: is current time within a session
  function isWithinSession(session: "MORNING" | "EVENING"): boolean {
    const now = getKenyaNow();
    const hours = now.getHours();

    if (session === "MORNING") {
      const start = new Date(now);
      start.setHours(5, 0, 0, 0);
      const end = new Date(now);
      end.setHours(11, 59, 59, 999);
      return now >= start && now <= end;
    } else {
      const start = new Date(now);
      start.setHours(12, 0, 0, 0);
      const end = new Date(now);
      end.setHours(21, 30, 0, 0);
      return now >= start && now <= end;
    }
  }

  // Session stats
  const morningOnboarded = todayManifests.filter(
    (m) => m.session === "MORNING" && m.status === "CHECKED_IN"
  ).length;
  const morningOffboarded = todayManifests.filter(
    (m) => m.session === "MORNING" && m.status === "CHECKED_OUT"
  ).length;
  const eveningOnboarded = todayManifests.filter(
    (m) => m.session === "EVENING" && m.status === "CHECKED_IN"
  ).length;
  const eveningOffboarded = todayManifests.filter(
    (m) => m.session === "EVENING" && m.status === "CHECKED_OUT"
  ).length;

  const totalOnboarded = morningOnboarded + eveningOnboarded;
  const totalOffboarded = morningOffboarded + eveningOffboarded;

  // Search & Pagination logic
  const filteredStudents = assignedStudents.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Wrapper that enforces rules before calling mutation
  const handleCheck = (student: any, status: "CHECKED_IN" | "CHECKED_OUT", session: "MORNING" | "EVENING") => {
    const nowKenya = getKenyaNow();

    if (!isWithinSession(session)) {
      toast.error(
        `${session === "MORNING" ? "Morning" : "Evening"} actions are allowed only during their session window (Kenya time).`
      );
      return;
    }

    const morning = todayManifests.find(
      (m) => m.studentId === student.id && m.session === "MORNING"
    );
    const evening = todayManifests.find(
      (m) => m.studentId === student.id && m.session === "EVENING"
    );

    if (status === "CHECKED_OUT") {
      if (session === "MORNING") {
        if (!morning || morning.status !== "CHECKED_IN") {
          toast.error("Cannot offboard morning: student has not been onboarded in the morning.");
          return;
        }
      } else {
        if (!evening || evening.status !== "CHECKED_IN") {
          toast.error("Cannot offboard evening: student has not been onboarded in the evening.");
          return;
        }
      }
    }

    if (session === "EVENING" && status === "CHECKED_IN") {
      if (morning && morning.status !== "CHECKED_OUT") {
        toast.error("Cannot onboard for evening: Morning session has not been offboarded yet.");
        return;
      }
    }

    checkMutation.mutate({ studentId: student.id, status, session });
  };

  // Button disabled logic helper
  const isActionDisabled = (student: any, action: "IN" | "OUT", session: "MORNING" | "EVENING") => {
    if (!isWithinSession(session)) return true;

    const morning = todayManifests.find(
      (m) => m.studentId === student.id && m.session === "MORNING"
    );
    const evening = todayManifests.find(
      (m) => m.studentId === student.id && m.session === "EVENING"
    );

    if (session === "MORNING") {
      if (action === "IN") return morning?.status === "CHECKED_IN";
      return morning?.status !== "CHECKED_IN";
    } else {
      if (action === "IN") {
        if (evening?.status === "CHECKED_IN") return true;
        if (morning && morning.status !== "CHECKED_OUT") return true;
        return false;
      }
      return evening?.status !== "CHECKED_IN";
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <Toaster position="top-center" richColors closeButton />
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bus Assistant Portal</h1>
            <p className="text-muted-foreground mt-1">
              Welcome, {user?.name || "Assistant"} — manage student attendance
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>

        {/* Dashboard Cards */}
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

        {/* Bus Info */}
        <Card>
          <CardHeader>
            <CardTitle>My Bus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-semibold text-lg">{bus.name}</p>
              <p className="text-muted-foreground">{bus.plateNumber}</p>
              <p className="text-sm">Route: {bus.route || "N/A"}</p>

              {busLocation ? (
                <MapContainer
                  center={[busLocation.lat, busLocation.lng]}
                  zoom={15}
                  scrollWheelZoom={false}
                  className="h-48 w-full mt-2 rounded-lg"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />
                  <Marker position={[busLocation.lat, busLocation.lng]}>
                    <Popup>
                      {bus.name} ({bus.plateNumber})<br />
                      {busLocation.address}
                    </Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">Bus location not available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Student Manifest */}
        <Card>
          <CardHeader>
            <CardTitle>Student Manifest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Search */}
            <div className="mb-3">
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
            </div>

            {paginatedStudents.map((student) => {
              const morning = todayManifests.find(
                (m) => m.studentId === student.id && m.session === "MORNING"
              );
              const evening = todayManifests.find(
                (m) => m.studentId === student.id && m.session === "EVENING"
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
                    {morning && (
                      <Badge
                        className={`${
                          morning.status === "CHECKED_IN"
                            ? "bg-green-500 text-white"
                            : "bg-gray-400 text-white"
                        }`}
                      >
                        Morning {morning.status === "CHECKED_IN" ? "Onboarded" : "Offboarded"}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      className={`${
                        morning?.status === "CHECKED_IN" ? "bg-gray-400 text-white" : "bg-green-500 text-white"
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

                    {evening && (
                      <Badge
                        className={`${
                          evening.status === "CHECKED_IN"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-400 text-white"
                        }`}
                      >
                        Evening {evening.status === "CHECKED_IN" ? "Onboarded" : "Offboarded"}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      className={`${
                        evening?.status === "CHECKED_IN" ? "bg-gray-400 text-white" : "bg-green-500 text-white"
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
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
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
      </div>
    </div>
  );
}
