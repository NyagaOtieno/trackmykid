import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import toast from "react-hot-toast";
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

// API endpoints
const STUDENTS_API =
  "https://schooltransport-production.up.railway.app/api/students";
const MANIFEST_API =
  "https://schooltransport-production.up.railway.app/api/manifests";
const GPS_API =
  "https://myfleet.track-loc8.com/api/v1/unit.json?key=44e824d4f70647af1bb9a314b4de7e73951c8ad6";

export default function AssistantPortal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Retrieve user info from localStorage (saved at login)
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");

  // Auto redirect if not logged in
  useEffect(() => {
    if (!user || !token) {
      navigate("/login");
    }
  }, [user, token, navigate]);

  const assistantId = user?.id;
  const [busLocation, setBusLocation] = useState<{ lat: number; lng: number } | null>(null);

  // ✅ Logout handler
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  // Fetch students
  const {
    data: studentsData,
    isLoading: studentsLoading,
    isError: studentsError,
  } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const res = await axios.get(STUDENTS_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data || [];
    },
  });

  // Fetch GPS data every 15 seconds
  const { data: gpsData } = useQuery({
    queryKey: ["gps"],
    queryFn: async () => {
      const res = await axios.get(GPS_API);
      return res.data.data?.units || [];
    },
    refetchInterval: 15000,
  });

  // Filter students for this assistant
  const assignedStudents = Array.isArray(studentsData)
    ? studentsData.filter((s: any) => s.bus?.assistantId === assistantId)
    : [];

  const bus = assignedStudents[0]?.bus || null;

  // Update bus location from GPS
  useEffect(() => {
    if (bus && gpsData) {
      const unit = gpsData.find((u: any) => u.number === bus.plateNumber);
      if (unit) setBusLocation({ lat: unit.lat, lng: unit.lng });
    }
  }, [bus, gpsData]);

  // Fetch manifests
  const { data: manifestsData } = useQuery({
    queryKey: ["manifests"],
    queryFn: async () => {
      const res = await axios.get(MANIFEST_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data || [];
    },
  });

  const manifests = manifestsData || [];
  const checkedIn = manifests.filter((m: any) => m.status === "CHECKED_IN").length;
  const checkedOut = manifests.filter((m: any) => m.status === "CHECKED_OUT").length;

  // Mutation for check-in/out
  const checkMutation = useMutation({
    mutationFn: async ({
      studentId,
      status,
    }: {
      studentId: number;
      status: "CHECKED_IN" | "CHECKED_OUT";
    }) => {
      const unit = gpsData?.find((u: any) => u.number === bus?.plateNumber);
      const latitude = unit?.lat || 0;
      const longitude = unit?.lng || 0;

      const body = {
        studentId,
        busId: bus?.id,
        assistantId,
        status,
        latitude,
        longitude,
      };
      const res = await axios.post(MANIFEST_API, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      toast.success(
        `Manifest updated: Student ID ${variables.studentId} is now ${
          variables.status === "CHECKED_IN" ? "Active" : "Inactive"
        }`
      );
      queryClient.invalidateQueries(["manifests"]);
    },
    onError: (error: any) => {
      toast.error(`Failed to update manifest: ${error?.message || "Unknown error"}`);
    },
  });

  if (studentsLoading)
    return <p className="p-6 text-center text-muted-foreground">Loading assistant info...</p>;
  if (studentsError)
    return <p className="text-red-500 text-center mt-6">Error loading students.</p>;
  if (!bus)
    return (
      <div className="p-6 text-center">
        <p>Could not load bus for this assistant.</p>
        <Button onClick={handleLogout} variant="destructive" className="mt-4">
          Logout
        </Button>
      </div>
    );

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bus Assistant Portal</h1>
            <p className="text-muted-foreground mt-1">
              Welcome, {user?.name || "Assistant"} — manage student attendance and safety
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>

        {/* Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <span className="text-3xl font-bold">{checkedIn}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inactive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="h-8 w-8 text-gray-400" />
                <span className="text-3xl font-bold">{checkedOut}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold">{assignedStudents.length}</span>
            </CardContent>
          </Card>
        </div>

        {/* Bus + Map */}
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
                <p className="text-sm text-muted-foreground mt-2">
                  Bus location not available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Student Manifest */}
        <Card>
          <CardHeader>
            <CardTitle>Student Manifest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignedStudents.map((student) => {
              const manifest = manifests.find((m) => m.studentId === student.id);
              const isActive = manifest?.status === "CHECKED_IN";
              const isInactive = manifest?.status === "CHECKED_OUT";

              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-muted-foreground">{student.grade}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {isActive ? (
                      <Badge className="bg-green-500 text-white">Active</Badge>
                    ) : isInactive ? (
                      <Badge className="bg-gray-400 text-white">Inactive</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isActive || checkMutation.isLoading}
                        onClick={() =>
                          checkMutation.mutate({
                            studentId: student.id,
                            status: "CHECKED_IN",
                          })
                        }
                      >
                        Check In
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isInactive || checkMutation.isLoading}
                        onClick={() =>
                          checkMutation.mutate({
                            studentId: student.id,
                            status: "CHECKED_OUT",
                          })
                        }
                      >
                        Check Out
                      </Button>
                    </div>
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
