import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Bus, Users, ClipboardList, MapPin } from "lucide-react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

/**
 * Dashboard (single-file)
 *
 * - Students, buses, manifests, users: authenticated API calls.
 * - Live bus locations: real Teltonika-backed pipeline via
 *   GET /api/tracking/bus-locations, matched by busId.
 */

// --- API calls (existing endpoints kept) ---
const authHeaders = () => {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
};

const getStudents = async () => {
  const { data } = await axios.get(
    "https://tmk-api.joshpitah.co.ke/api/students",
    { headers: authHeaders() }
  );
  return data.data || [];
};

const getBuses = async () => {
  const { data } = await axios.get(
    "https://tmk-api.joshpitah.co.ke/api/buses",
    { headers: authHeaders() }
  );
  return Array.isArray(data) ? data : data?.data || [];
};

const getManifests = async () => {
  const { data } = await axios.get(
    "https://tmk-api.joshpitah.co.ke/api/manifests",
    { headers: authHeaders() }
  );
  return data.data || [];
};

const getUsers = async () => {
  const { data } = await axios.get(
    "https://tmk-api.joshpitah.co.ke/api/users",
    { headers: authHeaders() }
  );
  return Array.isArray(data) ? data : data?.data || [];
};

// Real live bus locations — backed by the Teltonika devicelistener pipeline,
// matched by busId (not fragile plate-string matching).
const getLiveBusLocations = async () => {
  try {
    const { data } = await axios.get(
      "https://tmk-api.joshpitah.co.ke/api/tracking/bus-locations",
      { headers: authHeaders() }
    );
    return Array.isArray(data?.data) ? data.data : [];
  } catch (err) {
    console.error("getLiveBusLocations error", err);
    return [];
  }
};

// --- Reverse geocode helper (Nominatim) ---
const locationCache: Record<string, string> = {};
const getLocationFromLatLon = async (lat: number, lon: number) => {
  const key = `${lat},${lon}`;
  if (locationCache[key]) return locationCache[key];
  try {
    const { data } = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
      params: { format: "json", lat, lon },
    });
    const address = data.display_name || "Unknown location";
    locationCache[key] = address;
    return address;
  } catch (err) {
    console.error("Reverse geocode error:", err);
    return "Unknown location";
  }
};

// --- Leaflet bus icon ---
const busIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/61/61222.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

export default function Dashboard() {
  // UI state
  const [studentSearch, setStudentSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const [tripSearch, setTripSearch] = useState("");
  const [tripPage, setTripPage] = useState(1);
  const rowsPerPage = 10;

  // Data state
  const [studentLocations, setStudentLocations] = useState<Record<number, string>>({});
  const [manifestLocations, setManifestLocations] = useState<Record<number, any>>({});
  const [driversMap, setDriversMap] = useState<Record<number, any>>({});

  // Queries for existing endpoints
  const { data: students = [], isLoading: loadingStudents, error: errorStudents } = useQuery({
    queryKey: ["students"],
    queryFn: getStudents,
  });

  const { data: buses = [], isLoading: loadingBuses, error: errorBuses } = useQuery({
    queryKey: ["buses"],
    queryFn: getBuses,
  });

  const { data: manifests = [], isLoading: loadingManifests, error: errorManifests } = useQuery({
    queryKey: ["manifests"],
    queryFn: getManifests,
  });

  const { data: users = [], isLoading: loadingUsers, error: errorUsers } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  // Real live bus locations (Teltonika-backed), refreshed every 20s.
  const { data: liveLocations = [], isLoading: loadingDevices, error: errorDevices } = useQuery({
    queryKey: ["live-bus-locations"],
    queryFn: getLiveBusLocations,
    refetchInterval: 20000,
  });

  // Map driverId -> driver object
  useEffect(() => {
    if (users.length > 0) {
      const map: Record<number, any> = {};
      users.forEach((u: any) => {
        if (u.role === "DRIVER") map[u.id] = u;
      });
      setDriversMap(map);
    }
  }, [users]);

  // Error toast
  const errorOccurred = errorStudents || errorBuses || errorManifests || errorUsers || errorDevices;
  useEffect(() => {
    if (errorOccurred) toast.error("Failed to load some dashboard data. Please refresh.");
  }, [errorOccurred]);

  const isLoading =
    loadingStudents || loadingBuses || loadingManifests || loadingUsers || loadingDevices;

  // Today's manifests — memoized so its reference is stable across renders
  // (was recomputed fresh every render, which fed a useEffect dependency
  // and caused an infinite render loop / "Maximum update depth exceeded")
  const today = new Date().toISOString().split("T")[0];
  const todaysManifests = useMemo(
    () => manifests.filter((m: any) => m.date?.startsWith(today)),
    [manifests, today]
  );

  // Student location reverse-geocode (unchanged)
  useEffect(() => {
    students.forEach(async (s: any) => {
      const lat = s.student?.latitude ?? s.latitude;
      const lon = s.student?.longitude ?? s.longitude;
      if (lat && lon && !studentLocations[s.id]) {
        const loc = await getLocationFromLatLon(lat, lon);
        setStudentLocations((prev) => ({ ...prev, [s.id]: loc }));
      }
    });
  }, [students]);

  // Resolve each of today's manifests to its bus's real live location,
  // matched by busId (reliable) instead of plate-string matching.
  useEffect(() => {
    if (!liveLocations || liveLocations.length === 0) return;

    todaysManifests.forEach(async (m: any) => {
      const busId = m.bus?.id ?? m.busId;
      if (!busId) {
        if (manifestLocations[m.id] !== "No bus assigned") {
          setManifestLocations((prev) => ({ ...prev, [m.id]: "No bus assigned" }));
        }
        return;
      }

      const loc = liveLocations.find((l: any) => l.busId === busId);

      if (!loc || loc.lat == null || loc.lng == null) {
        if (manifestLocations[m.id] !== "No live location yet") {
          setManifestLocations((prev) => ({ ...prev, [m.id]: "No live location yet" }));
        }
        return;
      }

      const existing = manifestLocations[m.id];
      const alreadyHasAddressForSamePoint =
        existing &&
        typeof existing === "object" &&
        existing.latitude === loc.lat &&
        existing.longitude === loc.lng &&
        existing.address;

      const address = alreadyHasAddressForSamePoint
        ? existing.address
        : await getLocationFromLatLon(loc.lat, loc.lng);

      setManifestLocations((prev) => ({
        ...prev,
        [m.id]: {
          latitude: loc.lat,
          longitude: loc.lng,
          timestamp: loc.lastUpdate,
          address,
          movementState: loc.movementState,
        },
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveLocations, todaysManifests]);

  // ensure manifestLocations that have lat/lon but no address get reverse-geocoded
  useEffect(() => {
    Object.entries(manifestLocations).forEach(async ([mid, val]) => {
      if (typeof val === "object" && val.latitude && val.longitude && !val.address) {
        const address = await getLocationFromLatLon(val.latitude, val.longitude);
        setManifestLocations((prev) => ({ ...prev, [Number(mid)]: { ...val, address } }));
      }
    });
  }, [manifestLocations]);

  // --- Filtered & paginated Students (unchanged) ---
  const filteredStudents = useMemo(() => {
    const search = studentSearch.toLowerCase();
    return students.filter((s: any) => {
      const locationName = studentLocations[s.id] || "";
      return (
        (s.name?.toLowerCase().includes(search)) ||
        (s.grade?.toLowerCase().includes(search)) ||
        (s.school?.name?.toLowerCase().includes(search)) ||
        (s.bus?.name?.toLowerCase().includes(search)) ||
        (s.parent?.user?.name?.toLowerCase().includes(search)) ||
        (locationName.toLowerCase().includes(search))
      );
    });
  }, [students, studentSearch, studentLocations]);

  const paginatedStudents = filteredStudents.slice(
    (studentPage - 1) * rowsPerPage,
    studentPage * rowsPerPage
  );

  // --- Filtered & paginated Trips (uses manifestLocations for location text) ---
  const filteredTrips = useMemo(() => {
    const search = tripSearch.toLowerCase();
    return todaysManifests.filter((t: any) => {
      const locObj = manifestLocations[t.id];
      const loc = typeof locObj === "string" ? locObj : (locObj?.address || "");
      const driverName = driversMap[t.bus?.driverId]?.name || "";
      return (
        (t.bus?.name?.toLowerCase().includes(search)) ||
        (t.bus?.route?.toLowerCase().includes(search)) ||
        (driverName.toLowerCase().includes(search)) ||
        (t.assistant?.name?.toLowerCase().includes(search)) ||
        (t.assistantName?.toLowerCase().includes(search)) ||
        (t.session?.toLowerCase().includes(search)) ||
        (t.status?.toLowerCase().includes(search)) ||
        loc.toLowerCase().includes(search)
      );
    });
  }, [todaysManifests, tripSearch, manifestLocations, driversMap]);

  const paginatedTrips = filteredTrips.slice(
    (tripPage - 1) * rowsPerPage,
    tripPage * rowsPerPage
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">🚍 SchoolTrack Dashboard</h1>
      <p className="text-gray-500">Welcome back! Overview of your school transport operations.</p>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-md hover:shadow-lg transition-all">
            <CardHeader className="flex justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
              <Users className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{students.length}</div>
              <p className="text-xs text-muted-foreground">Enrolled across all buses</p>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-all">
            <CardHeader className="flex justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Buses</CardTitle>
              <Bus className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{buses.length}</div>
              <p className="text-xs text-muted-foreground">Active in your school fleet</p>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-all">
            <CardHeader className="flex justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Trips</CardTitle>
              <ClipboardList className="w-5 h-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{todaysManifests.length}</div>
              <p className="text-xs text-muted-foreground">Trip manifests recorded today</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Students */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Recent Students</h2>
        <input
          type="text"
          placeholder="Search students..."
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
          className="mb-2 p-2 border rounded w-full"
        />
        {paginatedStudents.length > 0 ? (
          <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-gray-600 border-b">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Grade</th>
                  <th className="py-2 px-3">School</th>
                  <th className="py-2 px-3">Bus</th>
                  <th className="py-2 px-3">Parent</th>
                  <th className="py-2 px-3">Home Location</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.map((s, idx) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                    <td className="py-2 px-3">{(studentPage - 1) * rowsPerPage + idx + 1}</td>
                    <td className="py-2 px-3">{s.name}</td>
                    <td className="py-2 px-3">{s.grade}</td>
                    <td className="py-2 px-3">{s.school?.name || "N/A"}</td>
                    <td className="py-2 px-3">{s.bus?.name || "N/A"}</td>
                    <td className="py-2 px-3">{s.parent?.user?.name || "N/A"}</td>
                    <td className="py-2 px-3">
                      {studentLocations[s.id] ? studentLocations[s.id] : (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="mt-2 flex justify-end space-x-2">
              {Array.from({ length: Math.ceil(filteredStudents.length / rowsPerPage) }, (_, i) => (
                <button
                  key={i}
                  className={`px-3 py-1 rounded ${i + 1 === studentPage ? "bg-blue-600 text-white" : "bg-gray-200"}`}
                  onClick={() => setStudentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No student data available.</p>
        )}
      </div>

      {/* Today's Trip Activity */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Today's Trip Activity</h2>
        <input
          type="text"
          placeholder="Search trips or locations..."
          value={tripSearch}
          onChange={(e) => setTripSearch(e.target.value)}
          className="mb-2 p-2 border rounded w-full"
        />
        {paginatedTrips.length > 0 ? (
          <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-gray-600 border-b">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Bus</th>
                  <th className="py-2 px-3">Route</th>
                  <th className="py-2 px-3">Driver</th>
                  <th className="py-2 px-3">Assistant</th>
                  <th className="py-2 px-3">Session</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Drop Off Location</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTrips.map((trip, idx) => (
                  <tr key={trip.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                    <td className="py-2 px-3">{(tripPage - 1) * rowsPerPage + idx + 1}</td>
                    <td className="py-2 px-3">{trip.bus?.name || "N/A"}</td>
                    <td className="py-2 px-3">{trip.bus?.route || "N/A"}</td>
                    <td className="py-2 px-3">{driversMap[trip.bus?.driverId]?.name || "N/A"}</td>
                    <td className="py-2 px-3">{trip.assistant?.name || trip.assistantName || "N/A"}</td>
                    <td className="py-2 px-3">{trip.session || "N/A"}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          trip.status === "CHECKED_OUT"
                            ? "bg-green-100 text-green-700"
                            : trip.status === "CHECKED_IN"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {trip.status || "UNKNOWN"}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {manifestLocations[trip.id] ? (
                        typeof manifestLocations[trip.id] === "string" ? (
                          manifestLocations[trip.id]
                        ) : (
                          <>
                            <div>{manifestLocations[trip.id].address || "Loading..."}</div>
                            <div className="text-xs text-muted-foreground">
                              {manifestLocations[trip.id].imei ? `IMEI: ${manifestLocations[trip.id].imei}` : ""}
                              {manifestLocations[trip.id].timestamp ? ` • ${new Date(manifestLocations[trip.id].timestamp).toLocaleString()}` : ""}
                            </div>
                          </>
                        )
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading location...
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="mt-2 flex justify-end space-x-2">
              {Array.from({ length: Math.ceil(filteredTrips.length / rowsPerPage) }, (_, i) => (
                <button
                  key={i}
                  className={`px-3 py-1 rounded ${i + 1 === tripPage ? "bg-blue-600 text-white" : "bg-gray-200"}`}
                  onClick={() => setTripPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No trips today.</p>
        )}
      </div>

      {/* Map View */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Trip Locations Map</h2>
        <MapContainer
          center={[-1.04544, 37.09609]}
          zoom={12}
          style={{ height: "400px", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {todaysManifests.map((m: any) => {
            // prefer resolved manifestLocations map entry
            const resolved = manifestLocations[m.id];
            let lat: number | undefined;
            let lon: number | undefined;
            let popupAddress = "";

            if (typeof resolved === "object" && resolved?.latitude && resolved?.longitude) {
              lat = resolved.latitude;
              lon = resolved.longitude;
              popupAddress = resolved.address || "";
            } else {
              // fallback to existing manifest/bus coordinates if any
              const candidateLat = m.latitude ?? m.bus?.latitude;
              const candidateLon = m.longitude ?? m.bus?.longitude;
              if (candidateLat && candidateLon) {
                lat = candidateLat;
                lon = candidateLon;
                popupAddress = typeof resolved === "string" ? resolved : "";
              }
            }

            if (!lat || !lon) return null;

            return (
              <Marker key={m.id} position={[lat, lon]} icon={busIcon}>
                <Popup>
                  <strong>Bus:</strong> {m.bus?.name || "N/A"} <br />
                  <strong>Driver:</strong> {driversMap[m.bus?.driverId]?.name || "N/A"} <br />
                  <strong>Assistant:</strong> {m.assistant?.name || "N/A"} <br />
                  <strong>Status:</strong> {m.status || "N/A"} <br />
                  <strong>Session:</strong> {m.session || "N/A"} <br />
                  <strong>Drop Off:</strong> {popupAddress || "Loading..."}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
