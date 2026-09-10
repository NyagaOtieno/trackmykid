import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Bus, Users, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type L from "leaflet";
import { getLiveLocations } from "@/lib/api";
import { createBusIcon } from "@/utils/vehicleIcon";

/**
 * Dashboard (single-file)
 *
 * - Keeps existing APIs (students, buses, manifests, users).
 * - Live bus positions now come from OUR OWN backend's /tracking/live-locations
 *   (same source Tracking.tsx uses), NOT the old mytrack-production API —
 *   that API (tmk-api.joshpitah.co.ke/api/devices/list) no longer exists and
 *   was 404-ing on every load. All of that dead code has been removed.
 * - Map now supports click-to-center, same pattern as Tracking.tsx.
 */

// --- API calls (existing endpoints kept) ---
const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
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
  return data || [];
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
  return data.data || [];
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

// -- Fit the map to show all live buses once, on first load / whenever the set changes size --
function FitAllBuses({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const didFitRef = useRef(false);
  useEffect(() => {
    if (positions.length === 0 || didFitRef.current) return;
    map.fitBounds(positions, { padding: [40, 40] });
    didFitRef.current = true;
  }, [positions, map]);
  return null;
}

export default function Dashboard() {
  // UI state
  const [studentSearch, setStudentSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const [tripSearch, setTripSearch] = useState("");
  const [tripPage, setTripPage] = useState(1);
  const rowsPerPage = 10;

  // Data state
  const [studentLocations, setStudentLocations] = useState<Record<number, string>>({});
  const [tripAddresses, setTripAddresses] = useState<Record<number, string>>({});
  const [driversMap, setDriversMap] = useState<Record<number, any>>({});
  const [selectedBusId, setSelectedBusId] = useState<number | string | null>(null);
  const mapRef = useRef<L.Map | null>(null);

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

  // Live bus positions — from OUR OWN backend, same as Tracking.tsx
  const { data: liveLocations = [], error: errorLive } = useQuery({
    queryKey: ["liveLocations"],
    queryFn: async () => {
      const res = await getLiveLocations();
      return Array.isArray(res) ? res : res?.data ?? [];
    },
    refetchInterval: 5000,
  });

  const liveByBusId = useMemo(() => {
    const map = new Map<number, any>();
    for (const l of liveLocations as any[]) {
      if (l?.busId != null) map.set(Number(l.busId), l);
    }
    return map;
  }, [liveLocations]);

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
  const errorOccurred = errorStudents || errorBuses || errorManifests || errorUsers || errorLive;
  useEffect(() => {
    if (errorOccurred) toast.error("Failed to load some dashboard data. Please refresh.");
  }, [errorOccurred]);

  const isLoading =
    loadingStudents || loadingBuses || loadingManifests || loadingUsers;

  // Today's manifests
  const today = new Date().toISOString().split("T")[0];
  const todaysManifests = manifests.filter((m: any) => m.date?.startsWith(today));

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

  // Reverse-geocode each trip's CURRENT live bus position (replaces the old
  // dead-device-lookup logic entirely)
  useEffect(() => {
    todaysManifests.forEach(async (m: any) => {
      const busId = m.busId ?? m.bus?.id;
      if (busId == null) return;
      const live = liveByBusId.get(Number(busId));
      if (!live || live.lat == null || live.lng == null) return;
      const key = `${live.lat.toFixed(4)},${live.lng.toFixed(4)}`;
      if (tripAddresses[m.id] === key) return; // already resolved for this position
      const address = await getLocationFromLatLon(live.lat, live.lng);
      setTripAddresses((prev) => ({ ...prev, [m.id]: address }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todaysManifests, liveByBusId]);

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

  // --- Filtered & paginated Trips ---
  const filteredTrips = useMemo(() => {
    const search = tripSearch.toLowerCase();
    return todaysManifests.filter((t: any) => {
      const loc = tripAddresses[t.id] || "";
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
  }, [todaysManifests, tripSearch, tripAddresses, driversMap]);

  const paginatedTrips = filteredTrips.slice(
    (tripPage - 1) * rowsPerPage,
    tripPage * rowsPerPage
  );

  // Live buses with valid coordinates, ready for the map
  const mappableBuses = useMemo(
    () => (liveLocations as any[]).filter((b) => b.lat != null && b.lng != null),
    [liveLocations]
  );
  const allPositions: [number, number][] = mappableBuses.map((b) => [b.lat, b.lng]);

  function selectAndCenterBus(bus: any) {
    const id = bus.busId;
    setSelectedBusId((prev) => (prev === id ? null : id));
    if (bus.lat != null && bus.lng != null && mapRef.current) {
      mapRef.current.flyTo([bus.lat, bus.lng], 15, { animate: true, duration: 1 });
    }
  }

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
                  <th className="py-2 px-3">Current Location</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTrips.map((trip, idx) => {
                  const busId = trip.busId ?? trip.bus?.id;
                  const live = busId != null ? liveByBusId.get(Number(busId)) : null;
                  return (
                    <tr
                      key={trip.id}
                      className="border-b last:border-0 hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => live && selectAndCenterBus(live)}
                    >
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
                        {live ? (
                          <>
                            <div>{tripAddresses[trip.id] || "Loading..."}</div>
                            <div className="text-xs text-muted-foreground">
                              {live.lastUpdate ? `• ${new Date(live.lastUpdate).toLocaleTimeString()}` : ""}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs">No live GPS</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Live Fleet Map</h2>
        <p className="text-xs text-muted-foreground mb-2">Click a bus (on the map, or in the trip table above) to center on it.</p>
        <MapContainer
          ref={mapRef}
          center={[-1.04544, 37.09609]}
          zoom={12}
          style={{ height: "400px", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitAllBuses positions={allPositions} />
          {mappableBuses.map((bus: any) => (
            <Marker
              key={bus.busId}
              position={[bus.lat, bus.lng]}
              icon={createBusIcon(bus, selectedBusId === bus.busId)}
              eventHandlers={{ click: () => selectAndCenterBus(bus) }}
            >
              <Popup>
                <strong>Bus:</strong> {bus.plateNumber || "N/A"} <br />
                <strong>Speed:</strong> {bus.speed ?? 0} km/h <br />
                <strong>Driver:</strong> {driversMap[bus.driverId]?.name || "N/A"} <br />
                {bus.lastUpdate && (
                  <>
                    <strong>Updated:</strong> {new Date(bus.lastUpdate).toLocaleTimeString()}
                  </>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}