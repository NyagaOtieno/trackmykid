import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bus, Car, User, UserCog, MapPin, Gauge, Navigation, Clock, AlertCircle, Search } from "lucide-react";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import axios from "axios";
import { createBusIcon } from "@/utils/vehicleIcon";

// ---------------- Fly to selected vehicle ----------------
function FlyToLocation({ selectedVehicle }: { selectedVehicle: Bus | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedVehicle?.lat != null && selectedVehicle?.lng != null) {
      map.flyTo([selectedVehicle.lat, selectedVehicle.lng], 15, { animate: true });
    }
  }, [selectedVehicle, map]);
  return null;
}

// ---------------- Persistent Marker with Popup ----------------
function PersistentMarker({ 
  bus, 
  isSelected, 
  onSelect 
}: { 
  bus: any; 
  isSelected: boolean; 
  onSelect: () => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    if (markerRef.current) {
      if (isSelected) {
        markerRef.current.openPopup();
      } else {
        markerRef.current.closePopup();
      }
    }
  }, [isSelected]);

  return (
    <Marker
      ref={markerRef}
      position={[bus.lat, bus.lng]}
      icon={createBusIcon(bus, isSelected)}
      eventHandlers={{ 
        click: () => {
          onSelect();
        }
      }}
      zIndexOffset={isSelected ? 1000 : 100}
    >
      <Popup 
        maxWidth={200} 
        className="custom-popup"
        closeButton={false}
        autoPan={true}
        autoPanPadding={[80, 50]}
        offset={[0, -40]}
      >
        <CompactVehicleCard vehicle={bus} />
      </Popup>
    </Marker>
  );
}


// ---------------- Compact Popup Card (for map) ----------------
function CompactVehicleCard({ vehicle }: { vehicle: any }) {
  const isFallback = vehicle.__fallback === true;
  const isStanding = vehicle.movementState?.toLowerCase() === "standing";
  
  const statusColor = isFallback
    ? "bg-gray-500"
    : isStanding
    ? "bg-blue-500"
    : "bg-green-500";

  const statusText = isFallback
    ? "No GPS"
    : isStanding
    ? "Standing"
    : "Moving";

  return (
    <div className="w-48 p-2 bg-white rounded-lg shadow-lg border-2">
      <div className={`${statusColor} text-white rounded-t px-2 py-1.5 -m-2 mb-1.5 flex items-center justify-between`}>
        <div className="flex items-center gap-1.5">
          <Bus className="h-3.5 w-3.5" />
          <span className="font-bold text-xs">{vehicle.plateNumber}</span>
        </div>
        <span className="text-[10px] font-semibold">{statusText}</span>
      </div>
      <div className="space-y-1.5 text-[11px]">
        {vehicle.busId && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID:</span>
            <span className="font-medium">{vehicle.busId}</span>
          </div>
        )}
        {vehicle.speed !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Speed:</span>
            <span className="font-medium flex items-center gap-1">
              <Gauge className="h-3 w-3" />
              {vehicle.speed} km/h
            </span>
          </div>
        )}
        {vehicle.driver?.name && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Driver:</span>
            <span className="font-medium truncate ml-1 max-w-[100px]">{vehicle.driver.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Vehicle Details Card Component (Full - for side panel) ----------------
function VehicleDetailsCard({ vehicle }: { vehicle: any }) {
  const isFallback = vehicle.__fallback === true;
  const isStanding = vehicle.movementState?.toLowerCase() === "standing";
  
  const statusColor = isFallback
    ? "bg-gray-500"
    : isStanding
    ? "bg-blue-500"
    : "bg-green-500";

  const statusText = isFallback
    ? "No GPS Signal"
    : isStanding
    ? "Standing"
    : "Moving";

  return (
    <Card className="w-full max-w-md border-2 shadow-lg">
      <CardHeader className={`${statusColor} text-white rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Bus className="h-6 w-6" />
            {vehicle.plateNumber}
          </CardTitle>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm`}>
            {statusText}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Registration Details */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg border-b pb-2">Registration Details</h3>
          
          {vehicle.busId && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bus ID</p>
                <p className="font-medium">{vehicle.busId}</p>
              </div>
            </div>
          )}

          {vehicle.plateNumber && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Navigation className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Plate Number</p>
                <p className="font-medium text-lg">{vehicle.plateNumber}</p>
              </div>
            </div>
          )}

          {vehicle.bus?.name && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bus Name</p>
                <p className="font-medium">{vehicle.bus.name}</p>
              </div>
            </div>
          )}

          {vehicle.bus?.route && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Route</p>
                <p className="font-medium">{vehicle.bus.route}</p>
              </div>
            </div>
          )}
        </div>

        {/* Location Information */}
        <div className="space-y-3 pt-3 border-t">
          <h3 className="font-semibold text-lg border-b pb-2">Location Information</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Latitude</p>
              <p className="font-medium">{vehicle.lat?.toFixed(6) || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Longitude</p>
              <p className="font-medium">{vehicle.lng?.toFixed(6) || "N/A"}</p>
            </div>
          </div>

          {vehicle.speed !== undefined && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Gauge className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Speed</p>
                <p className="font-medium">{vehicle.speed} km/h</p>
              </div>
            </div>
          )}

          {vehicle.direction !== undefined && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Navigation className="h-4 w-4 text-primary" style={{ transform: `rotate(${vehicle.direction}deg)` }} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Direction</p>
                <p className="font-medium">{vehicle.direction}°</p>
              </div>
            </div>
          )}
        </div>

        {/* Personnel Information */}
        <div className="space-y-3 pt-3 border-t">
          <h3 className="font-semibold text-lg border-b pb-2">Personnel</h3>
          
          {vehicle.driver?.name && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Driver</p>
                <p className="font-medium">{vehicle.driver.name}</p>
                {vehicle.driver.phone && (
                  <p className="text-xs text-muted-foreground">{vehicle.driver.phone}</p>
                )}
              </div>
            </div>
          )}

          {vehicle.assistant?.name && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <UserCog className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Assistant</p>
                <p className="font-medium">{vehicle.assistant.name}</p>
                {vehicle.assistant.phone && (
                  <p className="text-xs text-muted-foreground">{vehicle.assistant.phone}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status Warning */}
        {isFallback && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                GPS signal unavailable. Showing default location.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------- Normalize Coordinates ----------------
function normalizeCoordinates(bus: Bus) {
  let lat = bus.lat != null ? Number(bus.lat) : null;
  let lng = bus.lng != null ? Number(bus.lng) : null;
  let fallback = false;

  if (lat === null || lng === null) fallback = true;
  if (lat > 5 && lng < 5) [lat, lng] = [lng, lat];
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) fallback = true;

  const kenyaLat = lat! > -5 && lat! < 5;
  const kenyaLng = lng! > 34 && lng! < 42;

  if (!kenyaLat || !kenyaLng) fallback = true;

  return {
    ...bus,
    lat: fallback ? -1.2921 : lat,
    lng: fallback ? 36.8219 : lng,
    __fallback: fallback,
    direction: Number(bus.direction || 0),
    speed: Number(bus.speed || 0),
  };
}

// ---------------- Fetch buses (your backend) ----------------
async function fetchBuses(): Promise<Bus[]> {
  const token = sessionStorage.getItem("token");
  const apiUrl = import.meta.env.VITE_API_URL;

  const response = await axios.get(`${apiUrl}/buses`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data || [];
}

// ---------------- Fetch live GPS from MyTrack ----------------
async function fetchVehicleLocation(plateNumber: string) {
  try {
    const apiKey = import.meta.env.VITE_PUBLIC_MYTRACK;
    const trackApiUrl = import.meta.env.VITE_API_URL_TRACK;

    const response = await axios.get(`${trackApiUrl}/devices/list`, {
      headers: { "X-API-Key": apiKey },
    });

    const device = response.data.find((d: any) => d.VehicleNo === plateNumber);

    if (!device) return { lat: null, lng: null };

    return {
      lat: Number(device.LastLat),
      lng: Number(device.LastLng),
    };
  } catch (e) {
    console.error("Error fetching vehicle location:", e);
    return { lat: null, lng: null };
  }
}

// ---------------- Merge buses + GPS ----------------
async function getBusesWithLocations(): Promise<Bus[]> {
  const buses = await fetchBuses();

  const withLocations = await Promise.all(
    buses.map(async (bus) => {
      const { lat, lng } = await fetchVehicleLocation(bus.plateNumber);
      return normalizeCoordinates({ ...bus, lat, lng });
    })
  );

  return withLocations;
}

// ---------------- Snap GPS points to road (OSRM) ----------------
async function snapToRoad(points: { lat: number; lng: number }[]) {
  if (points.length < 2) return [];

  const coords = points
    .map(p => `${p.lng},${p.lat}`)
    .join(";");

const radiuses = points.map(() => 10).join(";"); // tighter snap

const url = `https://router.project-osrm.org/match/v1/driving/${coords}?geometries=geojson&overview=full&radiuses=${radiuses}&steps=false&annotations=false`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.matchings?.length) return [];

  return data.matchings[0].geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng]
  );
}


// ---------------- Main Component ----------------
export default function Tracking() {
  // ----------- TEST MyTrack API (top of component) -----------
  useEffect(() => {
    const apiKey = import.meta.env.VITE_PUBLIC_MYTRACK;
    const trackApiUrl = import.meta.env.VITE_API_URL_TRACK;

    console.log("Testing MyTrack API...", { apiKey, trackApiUrl });

    axios.get(`${trackApiUrl}/devices/list`, {
      headers: { "X-API-Key": apiKey }
    })
    .then(res => console.log("MyTrack GET response:", res.data))
    .catch(err => console.error("MyTrack GET error:", err));
  }, []);
  // ----------------------------------------------------------

  const { data: buses = [], isLoading, refetch } = useQuery({
    queryKey: ["busesWithLocations"],
    queryFn: getBusesWithLocations,
    refetchInterval: 5000,
  });

  const [search, setSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Bus | null>(null);
  type RoutePoint = {
  lat: number;
  lng: number;
  ts: number;
};

  const [routePositions, setRoutePositions] = useState<RoutePoint[]>([]);
  const [snappedRoute, setSnappedRoute] = useState<[number, number][]>([]);
  const [drawIndex, setDrawIndex] = useState<number | null>(null);
  const prevVehicleId = useRef<string | null>(null);
  const routeStore = useRef<Record<string, RoutePoint[]>>({});
  const totalVehicles = buses.length;
  const liveVehicles = buses.filter((v: any) => !v.__fallback).length;
  const standingVehicles = buses.filter(
    (v: any) => v.movementState?.toLowerCase() === "standing",
  ).length;
  const selectedLabel = selectedVehicle?.plateNumber ?? "None selected";

  const filteredLocations = useMemo(() => {
    return buses.filter((v: any) =>
      v.plateNumber?.toLowerCase().includes(search.toLowerCase())
    );
  }, [buses, search]);

// ---------------- Handle vehicle switch (restore route, reset animation) ----------------
useEffect(() => {
  if (!selectedVehicle?.busId) return;

  const stored = routeStore.current[selectedVehicle.busId] || [];

  const now = Date.now();

  // Ensure route ends at current vehicle position
  const withLivePoint =
    selectedVehicle.lat != null && selectedVehicle.lng != null
      ? [
          ...stored.filter(p => p.lat != null && p.lng != null),
          { lat: selectedVehicle.lat, lng: selectedVehicle.lng, ts: now }
        ]
      : stored;

  routeStore.current[selectedVehicle.busId] = withLivePoint;

  prevVehicleId.current = selectedVehicle.busId;

  setRoutePositions(withLivePoint);
  setSnappedRoute([]);
  setDrawIndex(null);
}, [selectedVehicle?.busId]);

// ---------------- Accumulate route for selected vehicle ----------------
useEffect(() => {
  if (
    selectedVehicle?.lat == null ||
    selectedVehicle?.lng == null ||
    !selectedVehicle.busId
  ) {
    return;
  }

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  setRoutePositions((prev) => {
    // Filter to last 24 hours
    const recent = prev.filter(p => now - p.ts <= DAY_MS);

    // Vehicle switched → reset visible route only
 
    const last = recent[recent.length - 1];

  if (!last) {
  const initial = [
    { lat: selectedVehicle.lat, lng: selectedVehicle.lng, ts: now }
  ];

  routeStore.current[selectedVehicle.busId] = initial; // ✅ persist
  return initial;
}

    const moved =
      Math.abs(last.lat - selectedVehicle.lat) > 0.00005 ||
      Math.abs(last.lng - selectedVehicle.lng) > 0.00005;

    if (!moved) return recent;

   const updated = [
  ...recent,
  { lat: selectedVehicle.lat, lng: selectedVehicle.lng, ts: now }
];
routeStore.current[selectedVehicle.busId] = updated;

return updated;

  });
}, [selectedVehicle?.lat, selectedVehicle?.lng, selectedVehicle?.busId]);

// ---------------- Snap route to road ----------------
useEffect(() => {
  if (routePositions.length < 2) return;

  const snapPoints = routePositions
  .filter(p => p.lat != null && p.lng != null)
  .slice(-20);

  snapToRoad(snapPoints).then((snapped) => {
    if (snapped.length > 1) {
      setSnappedRoute(snapped);
    } else {
      setSnappedRoute([]); // fallback to raw
    }
  });
}, [routePositions]);

useEffect(() => {
  if (snappedRoute.length < 2) return;

  setDrawIndex(1);
  const interval = setInterval(() => {
    setDrawIndex((i) => {
      if (i == null || i >= snappedRoute.length) {
        clearInterval(interval);
        return snappedRoute.length;
      }
      return i + 1;
    });
  }, 120);

  return () => clearInterval(interval);
}, [snappedRoute]);



  // Default center to Nairobi (no auto-selection)
  const center: [number, number] = [-1.2921, 36.8219];

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-[600px]">
        Loading map...
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-primary/10 text-primary grid place-items-center">
            <Car className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Live Vehicle Tracking</h1>
            <p className="text-sm text-muted-foreground">
              Real-time visibility across your fleet with quick filters and details.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 bg-card">
            <Clock className="h-4 w-4" />
            <span className="font-medium">Last update</span>
            <span className="text-foreground">{new Date().toLocaleTimeString()}</span>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Card className="border-muted shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Fleet size</p>
              <p className="text-2xl font-bold">{totalVehicles}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center">
              <Car className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-muted shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Live GPS</p>
              <p className="text-2xl font-bold">{liveVehicles}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center dark:bg-emerald-950/40 dark:text-emerald-300">
              <Navigation className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-muted shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Standing</p>
              <p className="text-2xl font-bold">{standingVehicles}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 grid place-items-center dark:bg-blue-950/40 dark:text-blue-300">
              <Gauge className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-muted shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected</p>
              <p className="text-sm font-semibold truncate max-w-[180px]">{selectedLabel}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-muted text-foreground grid place-items-center">
              <Bus className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-muted shadow-sm">
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by plate number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              Refresh data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Map and Details */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
        <Card className="overflow-hidden border-muted shadow-sm">
          <CardHeader className="flex flex-col gap-1">
            <CardTitle className="text-lg">Live map</CardTitle>
            <p className="text-sm text-muted-foreground">
              Tap a vehicle to view quick details and center the map.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[420px] sm:h-[520px] xl:h-[620px]">
  <MapContainer center={center} zoom={12} className="h-full w-full" zoomControl={true}>
  <TileLayer
    attribution='&copy; OpenStreetMap contributors'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />

  {filteredLocations.map((bus: Bus, index) => {
    const isSelected = selectedVehicle?.busId === bus.busId;
    const key = bus.busId || bus.plateNumber || index;

    // Ensure valid coordinates
    const lat = bus.lat ?? -1.2921;
    const lng = bus.lng ?? 36.8219;

    return (
      <PersistentMarker
        key={key}
        bus={{ ...bus, lat, lng }}
        isSelected={isSelected}
        onSelect={() => setSelectedVehicle(bus)}
      />
    );
  })}

  {/* Snapped route */}
  {snappedRoute.length > 1 && (
    <Polyline
      positions={
  drawIndex
    ? [
        [selectedVehicle!.lat, selectedVehicle!.lng],
        ...snappedRoute.slice(0, drawIndex)
      ]
    : snappedRoute
}

      pathOptions={{
        color: "#2563eb",
        weight: 6,
        opacity: 0.9,
      }}
    />
  )}

  {/* Raw route fallback */}
  {snappedRoute.length === 0 && routePositions.length > 1 && (
    <Polyline
      positions={routePositions
        .filter(p => p.lat != null && p.lng != null)
        .map(p => [p.lat!, p.lng!])}
      pathOptions={{
        color: "#dc2626",
        weight: 3,
        dashArray: "6,6",
      }}
    />
  )}

  <FlyToLocation selectedVehicle={selectedVehicle} />
</MapContainer>


            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selectedVehicle ? (
            <div className="sticky top-4">
              <VehicleDetailsCard vehicle={selectedVehicle} />
            </div>
          ) : (
            <Card className="h-full min-h-[240px] flex items-center justify-center border-muted shadow-sm">
              <CardContent className="text-center text-muted-foreground space-y-3">
                <Bus className="h-10 w-10 mx-auto opacity-70" />
                <p className="font-medium">Select a vehicle to view trip details.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Vehicle List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xl font-semibold">All Vehicles ({filteredLocations.length})</h3>
          <p className="text-sm text-muted-foreground">Tap to focus and see driver details.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredLocations.map((bus: any) => (
            <Card
              key={bus.busId}
              className={`cursor-pointer transition-all border-muted shadow-sm hover:-translate-y-0.5 hover:shadow-md ${
                selectedVehicle?.busId === bus.busId ? "border-primary ring-1 ring-primary/20" : ""
              }`}
              onClick={() => setSelectedVehicle(bus)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Bus className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">{bus.plateNumber}</h3>
                    </div>
                    {bus.bus?.route && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <p className="truncate max-w-[220px]">{bus.bus.route}</p>
                      </div>
                    )}
                    {bus.driver?.name && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <p>{bus.driver.name}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div
                      className={`h-5 w-5 rounded-full ${
                        bus.__fallback
                          ? "bg-gray-400"
                          : bus.movementState?.toLowerCase() === "standing"
                          ? "bg-blue-500"
                          : "bg-green-500"
                      }`}
                      title={
                        bus.__fallback
                          ? "No GPS"
                          : bus.movementState?.toLowerCase() === "standing"
                          ? "Standing"
                          : "Moving"
                      }
                    />
                    {bus.speed !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        <Gauge className="h-3 w-3 inline mr-1" />
                        {bus.speed} km/h
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
