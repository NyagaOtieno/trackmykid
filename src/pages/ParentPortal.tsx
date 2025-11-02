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
import { getStudents } from "@/lib/api";
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

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("parent");
    localStorage.removeItem("token");
    navigate("/");
  };

  // Fetch students
  const { data: rawStudents, isLoading: loadingStudents } = useQuery({
    queryKey: ["students"],
    queryFn: getStudents,
  });

  const students = Array.isArray(rawStudents?.data) ? rawStudents.data : [];

  // Filter children by logged-in parent
  const myStudents = students.filter(
    (s: any) => s.parent?.user?.id === parentUserId
  );

  // ✅ Fetch student live location from our backend
  const [studentLocations, setStudentLocations] = useState<
    Record<number, { lat: number; lon: number; status: string }>
  >({});

  useEffect(() => {
    const fetchLocations = async () => {
      for (const student of myStudents) {
        try {
          const res = await fetch(
            `/api/tracking/student/${student.id}`
          );
          const data = await res.json();
          if (data.location) {
            setStudentLocations((prev) => ({
              ...prev,
              [student.id]: {
                lat: data.location.lat,
                lon: data.location.lon,
                status: data.status,
              },
            }));
          } else {
            setStudentLocations((prev) => ({
              ...prev,
              [student.id]: { lat: 0, lon: 0, status: data.status },
            }));
          }
        } catch (err) {
          console.error("Error fetching student location:", err);
        }
      }
    };

    if (myStudents.length > 0) {
      fetchLocations();
      const interval = setInterval(fetchLocations, 30000); // refresh every 30s
      return () => clearInterval(interval);
    }
  }, [myStudents]);

  // Map center
  const center =
    Object.values(studentLocations).length > 0
      ? [Object.values(studentLocations)[0].lat, Object.values(studentLocations)[0].lon]
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

      {/* MAIN */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* CHILDREN SECTION */}
        <div>
          <h2 className="text-2xl font-bold">My Children</h2>
          <p className="text-muted-foreground">
            Track your children’s location during school trips.
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
            myStudents.map((student: any) => {
              const loc = studentLocations[student.id];
              return (
                <Card key={student.id}>
                  <CardHeader>
                    <CardTitle>{student.name}</CardTitle>
                    <CardDescription>{student.grade || "N/A"}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Bus className="h-4 w-4 text-primary" />
                      <span className="text-sm">
                        {student.bus?.name || "No Bus Assigned"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-accent" />
                      <span className="text-sm">
                        {loc && loc.status === "On trip"
                          ? `Lat: ${loc.lat}, Lon: ${loc.lon}`
                          : loc?.status || "Not onboarded"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* LIVE MAP */}
        <Card>
          <CardHeader>
            <CardTitle>Live Bus Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] rounded-lg overflow-hidden">
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
                {Object.entries(studentLocations).map(([id, loc]) => {
                  if (loc.status !== "On trip") return null;
                  return (
                    <Marker
                      key={id}
                      position={[loc.lat, loc.lon]}
                      icon={busIcon}
                    >
                      <Popup>
                        <div className="p-2">
                          <h3 className="font-bold">
                            {myStudents.find((s) => s.id === Number(id))?.bus?.name || "Bus"}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Status: {loc.status}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
