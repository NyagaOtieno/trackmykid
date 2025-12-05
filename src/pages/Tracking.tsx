// Tracking.tsx
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";

interface Bus {
  id: string;
  plateNumber: string;
  route?: string;
  driver?: { name?: string };
  assistant?: { name?: string };
  lat?: number | null;
  lng?: number | null;
  __fallback?: boolean;
  direction?: number;
  speed?: number;
  movementState?: string;
}

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

// ---------------- Vehicle Icon ----------------
const createVehicleIcon = (bus: Bus) => {
  const color = bus.__fallback
    ? "#6c757d"
    : bus.movementState?.toLowerCase() === "standing"
    ? "#28a745"
    : "#dc3545";

  return L.divIcon({
    html: `
      <div style="
        transform: rotate(${bus.direction || 0}deg);
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${color};
        color: white;
        font-size: 10px;
        font-weight: bold;
        border-radius: 4px;
        border: 1px solid #fff;
        padding: 2px 4px;
        min-width: 26px;
        height: 24px;
        white-space: nowrap;
      ">🚍 ${bus.plateNumber}</div>
    `,
    className: "",
    iconSize: [28, 24],
    iconAnchor: [14, 12],
  });
};

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
    const apiKey = import.meta.env.VITE_PUBLIC_MYTRACK; // Corrected
    const trackApiUrl = import.meta.env.VITE_API_URL_TRACK;

    const response = await axios.get(`${trackApiUrl}/devices/list`, {
      headers: { "X-API-Key": apiKey },
    });

    // response.data is already an array
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

// ---------------- Main Component ----------------
export default function Tracking() {
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
  }, []); // empty dependency array => runs once on mount
  // ----------------------------------------------------------

  const { data: buses = [], isLoading, refetch } = useQuery({
    queryKey: ["busesWithLocations"],
    queryFn: getBusesWithLocations,
    refetchInterval: 5000,
  });

  const [search, setSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Bus | null>(null);

  // ...rest of your Tracking component

  const { data: buses = [], isLoading, refetch } = useQuery({
    queryKey: ["busesWithLocations"],
    queryFn: getBusesWithLocations,
    refetchInterval: 5000,
  });

  const [search, setSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Bus | null>(null);

  const filteredBuses = useMemo(() => {
    return buses.filter((bus) =>
      bus.plateNumber.toLowerCase().includes(search.toLowerCase())
    );
  }, [buses, search]);

  useEffect(() => {
    const realBus = filteredBuses.find((b) => !b.__fallback);
    setSelectedVehicle(realBus || filteredBuses[0] || null);
  }, [filteredBuses]);

  const center: [number, number] = selectedVehicle
    ? [selectedVehicle.lat!, selectedVehicle.lng!]
    : [-1.2921, 36.8219];

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-[600px]">
        Loading map...
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Live Vehicle Tracking</h2>
        <div className="text-sm text-muted-foreground">
          Last update: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <Input
          placeholder="Search plate number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => refetch()}>Refresh</Button>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden h-[600px]">
        <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {filteredBuses.map((bus) => (
            <Marker
              key={bus.id}
              position={[bus.lat!, bus.lng!]}
              icon={createVehicleIcon(bus)}
              eventHandlers={{ click: () => setSelectedVehicle(bus) }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold">{bus.plateNumber}</h3>
                  <p>Lat: {bus.lat?.toFixed(5)}</p>
                  <p>Lng: {bus.lng?.toFixed(5)}</p>
                  <p>Route: {bus.route || "N/A"}</p>
                  <p>Driver: {bus.driver?.name || "N/A"}</p>
                  <p>Assistant: {bus.assistant?.name || "N/A"}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          <FlyToLocation selectedVehicle={selectedVehicle} />
        </MapContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBuses.map((bus) => (
          <div
            key={bus.id}
            className={`bg-card border rounded-lg p-4 cursor-pointer hover:bg-accent ${
              selectedVehicle?.id === bus.id ? "border-primary" : ""
            }`}
            onClick={() => setSelectedVehicle(bus)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{bus.plateNumber}</h3>
                <p className="text-sm text-muted-foreground">
                  Driver: {bus.driver?.name || "N/A"}
                </p>
              </div>
              <div
                className={`h-3 w-3 rounded-full ${
                  bus.__fallback
                    ? "bg-gray-500"
                    : bus.movementState?.toLowerCase() === "standing"
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
