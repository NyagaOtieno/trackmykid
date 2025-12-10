import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Bus, Users, ClipboardList, MapPin } from "lucide-react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { createBusIcon } from "@/utils/vehicleIcon";

/**
 * Dashboard (single-file)
 *
 * - Keeps existing APIs (students, buses, manifests, users).
 * - Replaces the old tracking call with mytrack-production endpoints:
 *   - GET /api/devices/list
 *   - GET /api/devices/latest?imei=
 * - Uses X-API-Key header when calling mytrack-production.
 */

// === CONFIG ===
const TRACK_API_BASE = "https://mytrack-production.up.railway.app";
const TRACK_API_KEY = "x2AJdCzZaM5y8tPaui5of6qhuovc5SST7y-y6rR_fD0="; // from your Postman collection
const POLL_INTERVAL_MS = 30_000; // 30 seconds

// --- API calls (existing endpoints kept) ---
const getStudents = async () => {
  const { data } = await axios.get(
    "https://schooltransport-production.up.railway.app/api/students"
  );
  return data.data || [];
};

const getBuses = async () => {
  const { data } = await axios.get(
    "https://schooltransport-production.up.railway.app/api/buses"
  );
  return data || [];
};

const getManifests = async () => {
  const { data } = await axios.get(
    "https://schooltransport-production.up.railway.app/api/manifests"
  );
  return data.data || [];
};

const getUsers = async () => {
  const { data } = await axios.get(
    "https://schooltransport-production.up.railway.app/api/users"
  );
  return data.data || [];
};

// --- TrackMyKid API helpers (use X-API-Key header) ---
const trackAxios = axios.create({
  baseURL: TRACK_API_BASE,
  headers: {
    "X-API-Key": TRACK_API_KEY,
  },
});

const getDevices = async () => {
  const { data } = await trackAxios.get("/api/devices/list");
  // support responses that are either array or { data: [...] }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return data || [];
};

const getDeviceLatest = async (imei: string) => {
  try {
    const { data } = await trackAxios.get("/api/devices/latest", { params: { imei } });
    const payload = data?.data ?? data ?? null;
    if (!payload) return null;

    // Accept both { latitude, longitude } and { lat, lng }
    let latitude = payload.latitude ?? payload.lat ?? null;
    let longitude = payload.longitude ?? payload.lng ?? null;
    const timestamp = payload.timestamp ?? payload.time ?? payload.server_time ?? null;

    // Convert to numbers where possible
    latitude = latitude !== null && latitude !== undefined ? Number(latitude) : null;
    longitude = longitude !== null && longitude !== undefined ? Number(longitude) : null;

    // Defensive swap: if latitude appears > 90 but longitude <= 90, swap them
    if (
      Number.isFinite(latitude) &&
      Math.abs(latitude) > 90 &&
      Number.isFinite(longitude) &&
      Math.abs(longitude) <= 90
    ) {
      const tmp = latitude;
      latitude = longitude;
      longitude = tmp;
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return {
      latitude,
      longitude,
      timestamp,
      raw: payload,
    };
  } catch (err) {
    console.error("getDeviceLatest error", imei, err);
    return null;
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
  const [devices, setDevices] = useState<any[]>([]);
  const manifestDeviceMapRef = useRef<Record<number, any>>({}); // manifestId -> device

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

  // Fetch devices (track backend)
  const { data: devicesData = [], isLoading: loadingDevices, error: errorDevices } = useQuery({
    queryKey: ["track-devices"],
    queryFn: getDevices,
  });

  // Sync devicesData to devices state
  useEffect(() => {
    if (devicesData) {
      setDevices(devicesData || []);
    }
  }, [devicesData]);

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

  // Normalize plate helper
  const normalizePlate = (v: any) => {
    if (!v) return "";
    return String(v).replace(/[\s\-]/g, "").toUpperCase();
  };

  // Resolve device match & fetch initial locations for manifests
  useEffect(() => {
    // require devices to be loaded
    if (!devices || devices.length === 0) return;

    // iterate manifests for today
    todaysManifests.forEach(async (m: any) => {
      // skip if already resolved
      if (manifestLocations[m.id]) return;

      const busObj = m.bus || {};
      const candidates = [
        busObj.registration,
        busObj.vehicle_no,
        busObj.name,
        m.bus_no,
        m.vehicle_no,
      ]
        .filter(Boolean)
        .map(normalizePlate);

      if (candidates.length === 0) {
        setManifestLocations((prev) => ({ ...prev, [m.id]: "No vehicle registration available" }));
        return;
      }

      const foundDevice = devices.find((d: any) => {
        const devPlate = normalizePlate(d.vehicle_no ?? d.vehicleNo ?? d.vehicle_no ?? d.vehicleNo);
        return candidates.includes(devPlate);
      });

      if (!foundDevice) {
        setManifestLocations((prev) => ({ ...prev, [m.id]: "No tracking device matched" }));
        return;
      }

      // save mapping
      manifestDeviceMapRef.current[m.id] = foundDevice;

      if (!foundDevice.imei) {
        setManifestLocations((prev) => ({ ...prev, [m.id]: "Device found but IMEI missing" }));
        return;
      }

      // temp loading state
      setManifestLocations((prev) => ({ ...prev, [m.id]: "Loading location..." }));

      // fetch latest
      const latest = await getDeviceLatest(foundDevice.imei);
      if (!latest) {
        setManifestLocations((prev) => ({ ...prev, [m.id]: "No location returned" }));
        return;
      }

      // reverse geocode
      const address = await getLocationFromLatLon(latest.latitude, latest.longitude);

      setManifestLocations((prev) => ({
        ...prev,
        [m.id]: {
          latitude: latest.latitude,
          longitude: latest.longitude,
          timestamp: latest.timestamp,
          address,
          imei: foundDevice.imei,
          deviceId: foundDevice.id,
          raw: latest.raw,
        },
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, todaysManifests]);

  // Polling: refresh latest positions for unique IMEIs matched to today's manifests
  useEffect(() => {
    let cancelled = false;
    const runPoll = async () => {
      try {
        // collect unique IMEIs from manifestDeviceMapRef
        const imeis = Array.from(
          new Set(
            Object.values(manifestDeviceMapRef.current)
              .filter(Boolean)
              .map((d: any) => d.imei)
              .filter(Boolean)
          )
        );

        if (imeis.length === 0) return;

        // fetch all latest concurrently
        const results = await Promise.all(
          imeis.map(async (imei) => {
            const latest = await getDeviceLatest(imei);
            return { imei, latest };
          })
        );

        if (cancelled) return;

        // Update each manifestLocations entry that maps to a given imei
        const updates: Record<number, any> = {};
        Object.entries(manifestDeviceMapRef.current).forEach(([manifestIdStr, device]) => {
          const manifestId = Number(manifestIdStr);
          const found = results.find((r) => r.imei === device.imei);
          const entry = found?.latest;
          if (!entry) return;
          // reverse geocode if address changed or missing
          (async () => {
            const address =
              manifestLocations[manifestId]?.address ||
              (entry ? await getLocationFromLatLon(entry.latitude, entry.longitude) : "Unknown location");

            updates[manifestId] = {
              latitude: entry.latitude,
              longitude: entry.longitude,
              timestamp: entry.timestamp,
              address,
              imei: device.imei,
              deviceId: device.id,
              raw: entry.raw,
            };

            // push updates into state (batch)
            setManifestLocations((prev) => ({ ...prev, ...updates }));
          })();
        });
      } catch (err) {
        console.error("Polling error", err);
      }
    };

    // initial run
    runPoll();

    const id = setInterval(() => {
      runPoll();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, todaysManifests]);

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
          className="mb-2 p-2 border rounded w-1/2"
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
                {paginatedStudents.map((s: any, idx: number) => (
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
                {paginatedTrips.map((trip: any, idx: number) => (
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

            // Create vehicle-like object for icon creation
            const vehicleData = {
              lat,
              lng: lon,
              plateNumber: m.bus?.plateNumber || m.bus?.registration || m.bus?.name || "N/A",
              movementState: m.status === "CHECKED_IN" ? "moving" : "standing",
              direction: 0,
            };

            return (
              <Marker key={m.id} position={[lat, lon]} icon={createBusIcon(vehicleData, false)}>
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
