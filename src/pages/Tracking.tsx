import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import axios from "axios";

// ---------------- Fly to selected vehicle ----------------
function FlyToLocation({ selectedVehicle }: { selectedVehicle: Vehicle | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedVehicle?.lat != null && selectedVehicle?.lng != null) {
      map.flyTo([selectedVehicle.lat, selectedVehicle.lng], 15, { animate: true });
    }
  }, [selectedVehicle, map]);
  return null;
}

// ---------------- Vehicle Icon ----------------
const createVehicleIcon = (vehicle: Vehicle) => {
  const color =
    vehicle.speed === 0
      ? "#6c757d"
      : vehicle.speed < 50
      ? "#28a745"
      : vehicle.speed < 80
      ? "#ffc107"
      : "#dc3545";

  return L.divIcon({
    html: `<div style="
      transform: rotate(${vehicle.direction || 0}deg);
      display:flex; align-items:center; justify-content:center;
      background:${color}; color:white; font-size:10px; font-weight:bold;
      border-radius:4px; border:1px solid #fff; padding:2px 4px;
      min-width:28px; height:24px; white-space:nowrap;
    ">🚍 ${vehicle.plateNumber}</div>`,
    className: "",
    iconSize: [28, 24],
    iconAnchor: [14, 12],
  });
};

// ---------------- Vehicle Type ----------------
interface Vehicle {
  ID: number;
  LastLat: number | null;
  LastLng: number | null;
  lat: number;
  lng: number;
  speed: number;
  direction: number;
  plateNumber: string;
  __fallback: boolean;
}

// ---------------- Coordinate Normalizer ----------------
function normalizeCoordinates(v: any): Vehicle {
  let lat = v.LastLat != null ? Number(v.LastLat) : null;
  let lng = v.LastLng != null ? Number(v.LastLng) : null;

  if (lat === null || lng === null) {
    return {
      ...v,
      lat: -1.2921,
      lng: 36.8219,
      __fallback: true,
      direction: 0,
      speed: 0,
      plateNumber: v.VehicleNo || "Unknown",
      ID: v.ID,
      LastLat: v.LastLat,
      LastLng: v.LastLng,
    };
  }

  if (lat > 5 && lng < 5) [lat, lng] = [lng, lat];

  return {
    ...v,
    lat,
    lng,
    __fallback: false,
    direction: Number(v.direction || 0),
    speed: Number(v.speed || 0),
    plateNumber: v.VehicleNo || "Unknown",
    ID: v.ID,
    LastLat: v.LastLat,
    LastLng: v.LastLng,
  };
}

// ---------------- Fetch Devices ----------------
async function getBuses(): Promise<Vehicle[]> {
  try {
    const token = import.meta.env.VITE_PUBLIC_MYTRACK_API_KEY;

    const response = await axios.get(
      "https://mytrack-production.up.railway.app/api/devices/list",
      { headers: { "X-API-Key": token } }
    );

    const devices = response.data || [];
    return devices.map(normalizeCoordinates);
  } catch (e) {
    console.error("Error fetching devices:", e);
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
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const routesRef = useRef<Record<number, [number, number][]>>({});

  // Filter search (case-insensitive)
  const filteredLocations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return buses.filter((v) => v.plateNumber.toLowerCase().includes(term));
  }, [buses, search]);

  // Auto-center on a real location
  useEffect(() => {
    const realBus = filteredLocations.find((v) => !v.__fallback);
    setSelectedVehicle(realBus || filteredLocations[0] || null);
  }, [filteredLocations]);

  // Update route history for polylines
  useEffect(() => {
    if (!selectedVehicle) return;
    const busId = selectedVehicle.ID;
    if (!routesRef.current[busId]) routesRef.current[busId] = [];
    routesRef.current[busId].push([selectedVehicle.lat, selectedVehicle.lng]);
    if (routesRef.current[busId].length > 50) routesRef.current[busId].shift();
  }, [selectedVehicle]);

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

          {filteredLocations.map((bus) =>
            bus.lat != null && bus.lng != null ? (
              <Marker
                key={bus.ID}
                position={[bus.lat, bus.lng]}
                icon={createVehicleIcon(bus)}
                eventHandlers={{ click: () => setSelectedVehicle(bus) }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold">{bus.plateNumber}</h3>
                    <p>Lat: {bus.lat?.toFixed(5) ?? "N/A"}</p>
                    <p>Lng: {bus.lng?.toFixed(5) ?? "N/A"}</p>
                    <p>Speed: {bus.speed ?? 0} km/h</p>
                  </div>
                </Popup>
              </Marker>
            ) : null
          )}

          {/* Polylines */}
          {filteredLocations.map((bus) => {
            const positions = routesRef.current[bus.ID];
            return positions?.length ? (
              <Polyline key={`poly-${bus.ID}`} positions={positions} pathOptions={{ color: "blue", weight: 2 }} />
            ) : null;
          })}

          <FlyToLocation selectedVehicle={selectedVehicle} />
        </MapContainer>
      </div>

      {/* Vehicle List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLocations.map((bus) => (
          <div
            key={bus.ID}
            className={`bg-card border rounded-lg p-4 cursor-pointer hover:bg-accent ${
              selectedVehicle?.ID === bus.ID ? "border-primary" : ""
            }`}
            onClick={() => setSelectedVehicle(bus)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{bus.plateNumber}</h3>
                <p className="text-sm text-muted-foreground">Speed: {bus.speed} km/h</p>
              </div>
              <div
                className={`h-3 w-3 rounded-full ${
                  bus.speed === 0
                    ? "bg-gray-500"
                    : bus.speed < 50
                    ? "bg-green-500"
                    : bus.speed < 80
                    ? "bg-yellow-500"
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
