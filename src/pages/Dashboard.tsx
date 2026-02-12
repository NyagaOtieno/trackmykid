// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Bus, Users, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { createBusIcon } from "@/utils/vehicleIcon";
import { getStudents, getBuses, getManifests, getUsers } from "@/api/axiosConfig";
import { getSession } from "@/lib/auth";

const ROWS_PER_PAGE = 10;

/* ---------------- helpers ---------------- */
const unwrapArray = (payload: any) => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const toNum = (v: any) => {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? (n as number) : null;
};

const safeDate = (v: any) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/* ---------------- reverse geocode cache ---------------- */
const locationCache: Record<string, string> = {};

const getLocationFromLatLon = async (lat: number, lon: number) => {
  const key = `${lat.toFixed(6)},${lon.toFixed(6)}`;
  if (locationCache[key]) return locationCache[key];

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "json");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));

    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    const json = await res.json();
    const address = json?.display_name || "Unknown location";
    locationCache[key] = address;
    return address;
  } catch {
    return "Unknown location";
  }
};

export default function Dashboard() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const tokenExists = !!session?.token;

  const [studentSearch, setStudentSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const [tripSearch, setTripSearch] = useState("");
  const [tripPage, setTripPage] = useState(1);

  const [studentLocations, setStudentLocations] = useState<Record<number, string>>({});
  const [manifestLocations, setManifestLocations] = useState<Record<number, any>>({});

  /* ---------------- Queries ---------------- */
  const studentsQ = useQuery({
    queryKey: ["students"],
    queryFn: getStudents,
    enabled: tokenExists,
  });

  const busesQ = useQuery({
    queryKey: ["buses"],
    queryFn: getBuses,
    enabled: tokenExists,
  });

  const manifestsQ = useQuery({
    queryKey: ["manifests"],
    queryFn: getManifests,
    enabled: tokenExists,
  });

  const usersQ = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
    enabled: tokenExists,
  });

  const students = unwrapArray(studentsQ.data);
  const buses = unwrapArray(busesQ.data);
  const manifests = unwrapArray(manifestsQ.data);
  const users = unwrapArray(usersQ.data);

  const studentsCount = studentsQ.data?.count ?? students.length ?? 0;
  const busesCount = busesQ.data?.count ?? buses.length ?? 0;

  useEffect(() => {
    if (studentsQ.isError || busesQ.isError || manifestsQ.isError || usersQ.isError) {
      toast.error("Dashboard API error (check Bearer token).");
    }
  }, [studentsQ.isError, busesQ.isError, manifestsQ.isError, usersQ.isError]);

  /* ---------------- Drivers Map ---------------- */
  const driversMap = useMemo(() => {
    const map: Record<number, any> = {};
    users.forEach((u: any) => {
      if (String(u?.role ?? "").toUpperCase() === "DRIVER") {
        map[u.id] = u;
      }
    });
    return map;
  }, [users]);

  /* ---------------- Today Manifests ---------------- */
  const todaysManifests = useMemo(() => {
    const today = new Date();
    return manifests.filter((m: any) => {
      const dt = safeDate(m.date || m.createdAt || m.updatedAt);
      return dt ? isSameDay(dt, today) : false;
    });
  }, [manifests]);

  const todaysTripsCount = todaysManifests.length;

  /* ---------------- Reverse geocode students ---------------- */
  useEffect(() => {
    let cancelled = false;

    students.forEach(async (s: any) => {
      const lat = toNum(s.latitude);
      const lon = toNum(s.longitude);
      if (lat === null || lon === null) return;
      if (studentLocations[s.id]) return;

      const addr = await getLocationFromLatLon(lat, lon);
      if (!cancelled) {
        setStudentLocations((p) => ({ ...p, [s.id]: addr }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [students]);

  /* ---------------- Reverse geocode manifests ---------------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const next: Record<number, any> = {};
      for (const m of todaysManifests) {
        const lat = toNum(m.latitude);
        const lon = toNum(m.longitude);

        if (lat === null || lon === null) {
          next[m.id] = { address: "No GPS recorded", latitude: null, longitude: null };
          continue;
        }

        const addr = await getLocationFromLatLon(lat, lon);
        next[m.id] = {
          latitude: lat,
          longitude: lon,
          address: addr,
        };
      }

      if (!cancelled) setManifestLocations(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [todaysManifests]);

  /* ---------------- Students Search ---------------- */
  const filteredStudents = useMemo(() => {
    const search = studentSearch.toLowerCase().trim();
    return students.filter((s: any) => {
      const loc = (studentLocations[s.id] || "").toLowerCase();
      return (
        String(s.name || "").toLowerCase().includes(search) ||
        String(s.grade || "").toLowerCase().includes(search) ||
        String(s.bus?.name || "").toLowerCase().includes(search) ||
        loc.includes(search)
      );
    });
  }, [students, studentSearch, studentLocations]);

  const totalStudentPages = Math.max(1, Math.ceil(filteredStudents.length / ROWS_PER_PAGE));
  const paginatedStudents = filteredStudents.slice(
    (studentPage - 1) * ROWS_PER_PAGE,
    studentPage * ROWS_PER_PAGE
  );

  /* ---------------- Trips Search ---------------- */
  const filteredTrips = useMemo(() => {
    const search = tripSearch.toLowerCase().trim();
    return todaysManifests.filter((t: any) => {
      const loc = String(manifestLocations[t.id]?.address ?? "").toLowerCase();
      const driverName =
        t.bus?.driver?.name || driversMap[t.bus?.driverId]?.name || "";

      return (
        String(t.bus?.name || "").toLowerCase().includes(search) ||
        String(driverName).toLowerCase().includes(search) ||
        loc.includes(search)
      );
    });
  }, [todaysManifests, tripSearch, manifestLocations, driversMap]);

  const totalTripPages = Math.max(1, Math.ceil(filteredTrips.length / ROWS_PER_PAGE));
  const paginatedTrips = filteredTrips.slice(
    (tripPage - 1) * ROWS_PER_PAGE,
    tripPage * ROWS_PER_PAGE
  );

  const isLoading =
    studentsQ.isLoading || busesQ.isLoading || manifestsQ.isLoading || usersQ.isLoading;

  /* ---------------- UI ---------------- */
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🚍 SchoolTrack Dashboard</h1>

      {/* STATS CARDS */}
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex justify-between pb-1">
              <CardTitle className="text-sm text-muted-foreground">
                Total Students
              </CardTitle>
              <Users className="w-5 h-5" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{studentsCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex justify-between pb-1">
              <CardTitle className="text-sm text-muted-foreground">
                Total Buses
              </CardTitle>
              <Bus className="w-5 h-5" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{busesCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex justify-between pb-1">
              <CardTitle className="text-sm text-muted-foreground">
                Today's Trips
              </CardTitle>
              <ClipboardList className="w-5 h-5" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{todaysTripsCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STUDENTS + TRIPS */}
      <div className="grid md:grid-cols-2 gap-4">
       {/* STUDENTS CARD */}
<Card>
  <CardHeader>
    <CardTitle>Students</CardTitle>
  </CardHeader>

  <CardContent className="space-y-4">
    {/* Search */}
    <input
      type="text"
      placeholder="Search by name, grade, bus..."
      value={studentSearch}
      onChange={(e) => {
        setStudentSearch(e.target.value);
        setStudentPage(1);
      }}
      className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    />

    {/* Results */}
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {paginatedStudents.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No students found
        </div>
      ) : (
        paginatedStudents.map((s: any) => (
          <div
            key={s.id}
            className="rounded-md border p-3 hover:bg-muted/40 transition"
          >
            <div className="font-medium text-sm">{s.name}</div>
            <div className="text-xs text-muted-foreground">
              Grade: {s.grade || "N/A"} • Bus: {s.bus?.name || "N/A"}
            </div>
          </div>
        ))
      )}
    </div>

    {/* Pagination */}
    <div className="flex items-center justify-between text-xs">
      <button
        className="px-2 py-1 border rounded disabled:opacity-50"
        disabled={studentPage <= 1}
        onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
      >
        Prev
      </button>

      <div>
        Page {studentPage} / {totalStudentPages}
      </div>

      <button
        className="px-2 py-1 border rounded disabled:opacity-50"
        disabled={studentPage >= totalStudentPages}
        onClick={() => setStudentPage((p) =>
          Math.min(totalStudentPages, p + 1)
        )}
      >
        Next
      </button>
    </div>
  </CardContent>
</Card>


       {/* TODAY TRIPS CARD */}
<Card>
  <CardHeader>
    <CardTitle>Today's Trips</CardTitle>
  </CardHeader>

  <CardContent className="space-y-4">
    {/* Search */}
    <input
      type="text"
      placeholder="Search by bus, driver, session, status..."
      value={tripSearch}
      onChange={(e) => {
        setTripSearch(e.target.value);
        setTripPage(1);
      }}
      className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    />

    {/* Results */}
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {paginatedTrips.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No trips found
        </div>
      ) : (
        paginatedTrips.map((t: any) => {
          const driverName =
            t.bus?.driver?.name ||
            driversMap?.[t.bus?.driverId]?.name ||
            "N/A";

          return (
            <div
              key={t.id}
              className="rounded-md border p-3 hover:bg-muted/40 transition"
            >
              <div className="font-medium text-sm">
                {t.bus?.name || `Bus ${t.busId || "N/A"}`}
              </div>

              <div className="text-xs text-muted-foreground mt-1">
                Driver: {driverName} • Session: {t.session || "N/A"} • Status:{" "}
                {t.status || "N/A"}
              </div>

              <div className="text-xs text-muted-foreground mt-1">
                Location: {manifestLocations?.[t.id]?.address || "Loading..."}
              </div>
            </div>
          );
        })
      )}
    </div>

    {/* Pagination */}
    <div className="flex items-center justify-between text-xs">
      <button
        className="px-2 py-1 border rounded disabled:opacity-50"
        disabled={tripPage <= 1}
        onClick={() => setTripPage((p) => Math.max(1, p - 1))}
      >
        Prev
      </button>

      <div>
        Page {tripPage} / {totalTripPages}
      </div>

      <button
        className="px-2 py-1 border rounded disabled:opacity-50"
        disabled={tripPage >= totalTripPages}
        onClick={() => setTripPage((p) => Math.min(totalTripPages, p + 1))}
      >
        Next
      </button>
    </div>
  </CardContent>
</Card>

      </div>

      {/* MAP BELOW */}
      <Card>
        <CardHeader>
          <CardTitle>Trip Locations Map</CardTitle>
        </CardHeader>
        <CardContent>
          <MapContainer
            center={[-1.286389, 36.817223]}
            zoom={12}
            style={{ height: "400px", width: "100%" }}
          >
            <TileLayer
              attribution="© OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {todaysManifests.map((m: any) => {
              const loc = manifestLocations[m.id];
              const lat = toNum(loc?.latitude);
              const lon = toNum(loc?.longitude);
              if (lat === null || lon === null) return null;

              return (
                <Marker
                  key={m.id}
                  position={[lat, lon]}
                  icon={createBusIcon(
                    {
                      lat,
                      lng: lon,
                      plateNumber: m.bus?.name,
                      movementState: "moving",
                      direction: 0,
                    },
                    false
                  )}
                >
                  <Popup>{loc?.address}</Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </CardContent>
      </Card>
    </div>
  );
}
