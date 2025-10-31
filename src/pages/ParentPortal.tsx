import { useQuery } from "@tanstack/react-query";
import { MapPin, Bus } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getStudents, getBusLocations } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";

// ✅ Custom green bus marker icon
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

export default function ParentPortal() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const parentUserId = currentUser?.id;

  // ✅ Logout handler
  const handleLogout = () => {
    localStorage.removeItem("parent");
    localStorage.removeItem("token");
    navigate("/");
  };

  // ✅ Fetch students
  const { data: rawStudents, isLoading: loadingStudents } = useQuery({
    queryKey: ["students"],
    queryFn: getStudents,
  });

  const students = Array.isArray(rawStudents?.data) ? rawStudents.data : [];

  // ✅ Filter children by logged-in parent
  const myStudents = students.filter(
    (s: any) => s.parent?.user?.id === parentUserId
  );

  // ✅ Fetch live bus locations
  const { data: rawLiveLocations, isLoading: loadingLocations } = useQuery({
    queryKey: ["busLocations"],
    queryFn: getBusLocations,
    refetchInterval: 30000, // every 30 seconds
  });

  const allLiveLocations: any[] = Array.isArray(rawLiveLocations)
    ? rawLiveLocations
    : [];

  // ✅ Create a list of buses belonging to the logged-in parent’s children
  const myBuses = myStudents
    .filter((s: any) => s.bus)
    .map((s: any) => ({
      id: s.bus.id,
      plateNumber: s.bus.plateNumber?.toLowerCase(),
      name: s.bus.name?.toLowerCase(),
    }));

  // ✅ Filter live locations for parent’s buses
  const myBusLocations = allLiveLocations.filter((loc: any) => {
    return myBuses.some(
      (b) =>
        b.id === loc.busId ||
        (loc.plateNumber && b.plateNumber === loc.plateNumber.toLowerCase())
    );
  }).filter((loc) => loc.lat != null && loc.lng != null); // ensure valid coordinates

  // ✅ Reverse geocoded addresses (OpenStreetMap)
  const [addressCache, setAddressCache] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAddresses = async () => {
      for (const loc of myBusLocations) {
        const key = `${loc.lat},${loc.lng}`;
        if (addressCache[key]) continue;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}`
          );
          const data = await response.json();
          const address = data.display_name || "Unknown location";
          setAddressCache((prev) => ({ ...prev, [key]: address }));
        } catch {
          setAddressCache((prev) => ({ ...prev, [key]: "Address unavailable" }));
        }
      }
    };

    if (myBusLocations.length > 0) fetchAddresses();
  }, [myBusLocations]);

  // ✅ Map center
  const center =
    myBusLocations.length > 0
      ? [myBusLocations[0].lat, myBusLocations[0].lng]
      : myStudents.length > 0
      ? [myStudents[0].latitude, myStudents[0].longitude]
      : [-1.2921, 36.8219]; // Default: Nairobi

  return (
    <div className="min-h-screen bg-muted/30">
      {/* HEADER */}
      <header className="bg-card border-b p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bus className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Parent Portal</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {currentUser?.name || "Parent"}
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* CHILDREN SECTION */}
        <div>
          <h2 className="text-2xl font-bold">My Children</h2>
          <p className="text-muted-foreground">
            Track your children’s assigned buses and real-time status.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingStudents ? (
            <p className="text-center col-span-full text-muted-foreground">
              Loading children...
            </p>
          ) : myStudents.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-muted-foreground">
                No children found for your account.
              </CardContent>
            </Card>
          ) : (
            myStudents.map((student: any) => (
              <Card key={student.id}>
                <CardHeader>
                  <CardTitle>{student.name}</CardTitle>
                  <CardDescription>{student.grade || "N/A"}</CardDescription>
                  <p className="text-sm text-muted-foreground">
                    School: {student.school?.name || "Not Assigned"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Bus className="h-4 w-4 text-primary" />
                    <span className="text-sm">{student.bus?.name || "No Bus Assigned"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent" />
                    <span className="text-sm">{student.bus?.plateNumber || "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Route</span>
                    <span className="text-xs">{student.bus?.route || "Not Set"}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* LIVE BUS MAP */}
        <Card>
          <CardHeader>
            <CardTitle>Live Bus Tracking</CardTitle>
            <CardDescription>
              See live movement of buses assigned to your children.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] rounded-lg overflow-hidden">
              {loadingLocations ? (
                <p className="text-center text-muted-foreground">Loading locations...</p>
              ) : myBusLocations.length === 0 ? (
                <div className="h-full flex items-center justify-center bg-muted">
                  <p className="text-muted-foreground">
                    No live bus data available right now.
                  </p>
                </div>
              ) : (
                <MapContainer
                  key="parent-map"
                  center={center as [number, number]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {myBusLocations.map((loc: any) => {
                    const key = `${loc.lat},${loc.lng}`;
                    const address = addressCache[key] || "Fetching address...";
                    return (
                      <Marker key={loc.busId} position={[loc.lat, loc.lng]} icon={busIcon}>
                        <Popup>
                          <div className="p-2">
                            <h3 className="font-bold">{loc.plateNumber || "Unknown Bus"}</h3>
                            <p className="text-xs mt-1">{address}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Updated: {loc.lastUpdate ? new Date(loc.lastUpdate).toLocaleTimeString() : "N/A"}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
