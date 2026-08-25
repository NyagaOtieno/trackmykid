import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";

const busIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function DriverPortal() {
  const navigate = useNavigate();

  const [driver, setDriver] = useState<any>(null);
  const [bus, setBus] = useState<any>(null);
  const [manifest, setManifest] = useState<any[]>([]);
  const [location, setLocation] = useState<any>(null);

  // ------------------------------
  //  FETCH USERS
  // ------------------------------
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await axios.get(
        "https://schooltransport-production.up.railway.app/api/users"
      );
      return res.data;
    },
  });

  // ------------------------------
  //  FETCH BUSES
  // ------------------------------
  const { data: busesData, isLoading: busesLoading } = useQuery({
    queryKey: ["buses"],
    queryFn: async () => {
      const res = await axios.get(
        "https://schooltransport-production.up.railway.app/api/buses"
      );
      return res.data;
    },
  });

  // ------------------------------
  //  FETCH MANIFESTS
  // ------------------------------
  const { data: manifestsData, isLoading: manifestsLoading } = useQuery({
    queryKey: ["manifests"],
    queryFn: async () => {
      const res = await axios.get(
        "https://schooltransport-production.up.railway.app/api/manifests"
      );
      return res.data;
    },
  });

  // ------------------------------
  //  FETCH LIVE LOCATION (Loc8 API)
  // ------------------------------
  const { data: loc8Data, isLoading: loc8Loading } = useQuery({
    queryKey: ["loc8"],
    queryFn: async () => {
      const res = await axios.get(
        "https://myfleet.track-loc8.com/api/v1/unit.json?key=44e824d4f70647af1bb9a314b4de7e73951c8ad6"
      );
      return res.data;
    },
    refetchInterval: 15000, // refresh every 15s
  });

  // ------------------------------
  //  ASSIGN DRIVER FROM SESSION
  // ------------------------------
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (!storedUser?.id || !Array.isArray(usersData)) return;

    const foundDriver = usersData.find((u: any) => u.id === storedUser.id);
    if (foundDriver) setDriver(foundDriver);
  }, [usersData]);

  // ------------------------------
  //  ASSIGN DRIVER’S BUS
  // ------------------------------
  useEffect(() => {
    if (!driver || !Array.isArray(busesData)) return;

    const assignedBus = busesData.find((b: any) => b.driverId === driver.id);
    setBus(assignedBus || null);
  }, [driver, busesData]);

  // ------------------------------
  //  FILTER MANIFEST FOR DRIVER’S BUS
  // ------------------------------
  useEffect(() => {
    if (!bus || !Array.isArray(manifestsData)) return;

    const filtered = manifestsData.filter((m: any) => m.busId === bus.id);
    setManifest(filtered);
  }, [bus, manifestsData]);

  // ------------------------------
  //  DETERMINE BUS LOCATION
  // ------------------------------
  useEffect(() => {
    if (!bus || !Array.isArray(loc8Data?.units)) return;

    const matchedUnit = loc8Data.units.find(
      (u: any) =>
        u.name?.toLowerCase() === bus.plateNumber?.toLowerCase() ||
        u.registration?.toLowerCase() === bus.plateNumber?.toLowerCase()
    );

    if (matchedUnit) {
      setLocation({
        lat: matchedUnit.latitude,
        lng: matchedUnit.longitude,
        status: matchedUnit.status,
      });
    } else {
      setLocation(null);
    }
  }, [bus, loc8Data]);

  // ------------------------------
  //  LOGOUT FUNCTION
  // ------------------------------
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("isAuthenticated");
    toast.success("Logged out successfully!");
    navigate("/");
  };

  // ------------------------------
  //  LOADING STATES
  // ------------------------------
  if (usersLoading || busesLoading || manifestsLoading || loc8Loading)
    return (
      <div className="flex justify-center items-center h-screen text-lg">
        Loading driver portal...
      </div>
    );

  const center: [number, number] = location
    ? [location.lat, location.lng]
    : [-1.2921, 36.8219]; // fallback Nairobi

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Driver Portal</h1>
            <p className="text-muted-foreground mt-1">
              {driver?.fullName || "Driver"} —{" "}
              {bus?.plateNumber || "No Vehicle Assigned"}
            </p>
          </div>
          <Button variant="destructive" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>My Bus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-semibold">{bus?.name || "Not Assigned"}</p>
                <p className="text-sm text-muted-foreground">
                  {bus?.plateNumber || "N/A"}
                </p>
                <p className="text-sm">Route: {bus?.route || "N/A"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Students Onboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {manifest.reduce(
                  (acc: number, m: any) =>
                    acc + (Array.isArray(m.students) ? m.students.length : 0),
                  0
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                Total students onboarded
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bus Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    location?.status === "Active" ? "bg-green-500" : "bg-gray-400"
                  } animate-pulse`}
                />
                <span className="text-sm font-medium">
                  {location?.status || "Inactive"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Route Map */}
        <Card>
          <CardHeader>
            <CardTitle>Route Map</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <MapContainer
              key="driver-map"
              center={center}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {location && (
                <Marker position={[location.lat, location.lng]} icon={busIcon}>
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold">{bus?.plateNumber}</h3>
                      <p className="text-sm">
                        Status: {location.status || "Unknown"}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </CardContent>
        </Card>

        {/* Student Manifest */}
        <Card>
          <CardHeader>
            <CardTitle>Student Manifest</CardTitle>
          </CardHeader>
          <CardContent>
            {manifest.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No manifest found for your bus.
              </p>
            ) : (
              manifest.map((m: any, i: number) => (
                <div
                  key={i}
                  className="p-4 bg-muted rounded-lg mb-3 space-y-2"
                >
                  <p className="font-semibold">Trip: {m.session || "N/A"}</p>
                  <p className="text-sm text-muted-foreground">
                    Students onboard: {Array.isArray(m.students) ? m.students.length : 0}
                  </p>
                  {Array.isArray(m.students) &&
                    m.students.slice(0, 5).map((s: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-2 border-b text-sm"
                      >
                        <span>{s.name}</span>
                        <span className="text-muted-foreground">
                          {s.status || "Pending"}
                        </span>
                      </div>
                    ))}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
