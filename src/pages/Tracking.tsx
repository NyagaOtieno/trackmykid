import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import axios from "axios";

// ---------------- Fly to selected vehicle ----------------
function FlyToLocation({ selectedVehicle }: { selectedVehicle: any }) {
  const map = useMap();
  useEffect(() => {
    if (selectedVehicle?.lat != null && selectedVehicle?.lng != null) {
      map.flyTo([selectedVehicle.lat, selectedVehicle.lng], 15, { animate: true });
    }
  }, [selectedVehicle, map]);

  return null;
}

// ---------------- Vehicle Icon ----------------
const createVehicleIcon = (vehicle: any) => {
  const isFallback = vehicle.__fallback === true;

  const color = isFallback
    ? "#6c757d"
    : vehicle.movementState?.toLowerCase() === "standing"
    ? "#28a745"
    : "#dc3545";

  return L.divIcon({
    html: `<div style="
      transform: rotate(${vehicle.direction || 0}deg);
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
    ">🚍 ${vehicle.plateNumber}</div>`,
    className: "",
    iconSize: [28, 24],
    iconAnchor: [14, 12],
  });
};

// ---------------- Coordinate Normalizer ----------------
function normalizeCoordinates(v: any) {
  let lat = v.lat !== null ? Number(v.lat) : null;
  let lng = v.lng !== null ? Number(v.lng) : null;
  let fallback = false;

  // Case: Missing GPS
  if (lat === null || lng === null) {
    return { ...v, lat: -1.2921, lng: 36.8219, __fallback: true };
  }

  // Case: Swapped (36.x, -1.x)
  if (lat > 5 && lng < 5) {
    [lat, lng] = [lng, lat];
  }

  // Teltonika case: sends huge numbers sometimes → drop them
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    fallback = true;
    lat = -1.2921;
    lng = 36.8219;
  }

  // Kenya bounds check
  const kenyaLat = lat > -5 && lat < 5;
  const kenyaLng = lng > 34 && lng < 42;

  if (!kenyaLat || !kenyaLng) {
    fallback = true;
    lat = -1.2921;
    lng = 36.8219;
  }

  return {
    ...v,
    lat,
    lng,
    __fallback: fallback,
    direction: Number(v.direction || 0),
    speed: Number(v.speed || 0),
  };
}

// ---------------- Fetch and Fix Bus Coordinates ----------------
async function getBuses() {
  try {
    const token = sessionStorage.getItem("token");

    const response = await axios.get(
      "https://schooltransport-production.up.railway.app/api/tracking/bus-locations",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const buses = response.data?.data || [];
    return buses.map((v: any) => normalizeCoordinates(v));

  } catch (e) {
    console.error("Error fetching buses:", e);
    return [];
  }
}

// ---------------- Main Component ----------------
export default function Tracking() {
  const { data: buses = [], isLoading, refetch } = useQuery({
    queryKey: ["buses"],
    queryFn: getBuses,
    refetchInterval: 5000,
  });

  const [search, setSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  const filteredLocations = useMemo(() => {
    return buses.filter((v: any) =>
      v.plateNumber?.toLowerCase().includes(search.toLowerCase())
    );
  }, [buses, search]);

  // Auto-center on a valid real location
  useEffect(() => {
    const realBus = filteredLocations.find((v) => !v.__fallback);
    setSelectedVehicle(realBus || filteredLocations[0] || null);
  }, [filteredLocations]);

  const center: [number, number] = selectedVehicle
    ? [selectedVehicle.lat, selectedVehicle.lng]
    : [-1.2921, 36.8219];

  if (isLoading)
    return <div className="flex items-center justify-center h-[600px]">Loading map...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Live Vehicle Tracking</h2>
          <p className="text-muted-foreground mt-1">Real-time tracking for all vehicles</p>
        </div>
        <div className="text-sm text-muted-foreground">
          Last update: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Search plate number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => refetch()}>Refresh</Button>
      </div>

      {/* Map */}
      <div className="bg-card rounded-lg border overflow-hidden h-[600px]">
        <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {filteredLocations.map((bus) => (
            <Marker
              key={bus.busId}
              position={[bus.lat, bus.lng]}
              icon={createVehicleIcon(bus)}
              eventHandlers={{ click: () => setSelectedVehicle(bus) }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold">{bus.plateNumber}</h3>
                  <p>Lat: {bus.lat.toFixed(5)}</p>
                  <p>Lng: {bus.lng.toFixed(5)}</p>
                  <p>Movement: {bus.movementState}</p>
                  <p>Driver: {bus.driver?.name || "N/A"}</p>
                  <p>Assistant: {bus.assistant?.name || "N/A"}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          <FlyToLocation selectedVehicle={selectedVehicle} />
        </MapContainer>
      </div>

      {/* Vehicle List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLocations.map((bus) => (
          <div
            key={bus.busId}
            className={`bg-card border rounded-lg p-4 cursor-pointer hover:bg-accent ${
              selectedVehicle?.busId === bus.busId ? "border-primary" : ""
            }`}
            onClick={() => setSelectedVehicle(bus)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{bus.plateNumber}</h3>
                <p className="text-sm text-muted-foreground">Driver: {bus.driver?.name}</p>
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
