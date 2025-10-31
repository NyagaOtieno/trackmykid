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
  const [busLocation, setBusLocation] = useState<{ lat: number; lng: number } | null>(null);

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

  // Match bus with GPS unit
  useEffect(() => {
    if (bus && gpsData) {
      const unit = gpsData.find(
        (u) =>
          u.number?.toLowerCase() === bus.plateNumber?.toLowerCase() ||
          u.name?.toLowerCase() === bus.plateNumber?.toLowerCase()
      );
      if (unit) setBusLocation({ lat: unit.lat, lng: unit.lng });
    }
  }, [bus, gpsData]);

  // Fetch Manifests (safe guard)
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

  // Loading & error states
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

  // Filter manifests for today only
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayManifests = manifests.filter((m) => {
    const manifestDate = new Date(m.date);
    return manifestDate >= today && m.assistantId === assistantId && m.busId === bus?.id;
  });

  // Session-based stats
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
          {/* Morning */}
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

          {/* Evening */}
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

          {/* Total */}
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
                      {bus.name} ({bus.plateNumber})
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
            {assignedStudents.map((student) => {
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

                  {/* Morning Controls */}
                  <div className="flex items-center gap-3 mt-3 md:mt-0">
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
                      variant="outline"
                      onClick={() =>
                        checkMutation.mutate({
                          studentId: student.id,
                          status: "CHECKED_IN",
                          session: "MORNING",
                        })
                      }
                      disabled={morning?.status === "CHECKED_IN"}
                    >
                      In (M)
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        checkMutation.mutate({
                          studentId: student.id,
                          status: "CHECKED_OUT",
                          session: "MORNING",
                        })
                      }
                      disabled={morning?.status === "CHECKED_OUT"}
                    >
                      Out (M)
                    </Button>
                  </div>

                  {/* Evening Controls */}
                  <div className="flex items-center gap-3 mt-3 md:mt-0">
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
                      variant="outline"
                      onClick={() =>
                        checkMutation.mutate({
                          studentId: student.id,
                          status: "CHECKED_IN",
                          session: "EVENING",
                        })
                      }
                      disabled={evening?.status === "CHECKED_IN"}
                    >
                      In (E)
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        checkMutation.mutate({
                          studentId: student.id,
                          status: "CHECKED_OUT",
                          session: "EVENING",
                        })
                      }
                      disabled={evening?.status === "CHECKED_OUT"}
                    >
                      Out (E)
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
