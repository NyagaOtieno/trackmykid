import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";

// --- Backend API endpoint ---
const FLEET_API =
  "https://myfleet.track-loc8.com/api/v1/unit.json?key=44e824d4f70647af1bb9a314b4de7e73951c8ad6";

// --- Fetch live vehicle data ---
async function getLiveLocations() {
  try {
    const response = await axios.get(FLEET_API);
    const units = response.data?.data?.units;
    return Array.isArray(units) ? units : [];
  } catch (error) {
    console.error("Error fetching live locations:", error);
    return [];
  }
}

// --- Smooth fly-to animation for selected vehicle ---
function FlyToLocation({ selectedVehicle }: { selectedVehicle: any }) {
  const map = useMap();
  useEffect(() => {
    if (selectedVehicle?.lat && selectedVehicle?.lng) {
      map.flyTo([selectedVehicle.lat, selectedVehicle.lng], 15, { animate: true });
    }
  }, [selectedVehicle, map]);
  return null;
}

// --- Custom vehicle icon ---
function createVehicleIcon(vehicle: any) {
  const { number, movement_state, direction } = vehicle;
  const color =
    movement_state?.name?.toLowerCase() === "standing" ? "#28a745" : "#dc3545"; // green=stopped, red=moving

  return L.divIcon({
    html: `
      <div style="
        transform: rotate(${direction || 0}deg);
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
      ">
        🚍 ${number || "N/A"}
      </div>`,
    className: "",
    iconSize: [28, 24],
    iconAnchor: [14, 12],
  });
}

// --- Main component ---
export default function Tracking() {
  const { data: locations = [], isLoading, refetch, isError } = useQuery({
    queryKey: ["liveLocations"],
    queryFn: getLiveLocations,
    refetchInterval: 5000, // auto-refresh every 5s
  });

  const [search, setSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  const safeLocations = Array.isArray(locations) ? locations : [];

  // --- Filter vehicles by search ---
  const filteredLocations = useMemo(() => {
    return safeLocations.filter((v: any) =>
      v.number?.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, safeLocations]);

  // --- Auto-select first filtered vehicle ---
  useEffect(() => {
    if (filteredLocations.length > 0) {
      setSelectedVehicle(filteredLocations[0]);
    } else {
      setSelectedVehicle(null);
    }
  }, [filteredLocations]);

  const center =
    selectedVehicle?.lat && selectedVehicle?.lng
      ? [selectedVehicle.lat, selectedVehicle.lng]
      : safeLocations.length > 0
      ? [safeLocations[0].lat, safeLocations[0].lng]
      : [-1.2921, 36.8219]; // Default to Nairobi

  // --- Loading and Error states ---
  if (isLoading)
    return (
      <div className="flex items-center justify-center h-[600px]">
        <p>Loading live vehicle map...</p>
      </div>
    );

  if (isError)
    return (
      <div className="text-center text-red-500 py-10">
        Failed to load vehicle locations. Please try again later.
      </div>
    );

  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Live Vehicle Tracking</h2>
          <p className="text-muted-foreground mt-1">
            Real-time updates for all active fleet vehicles
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Search and Refresh */}
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Search by vehicle number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => refetch()}>Refresh</Button>
      </div>

      {/* Map */}
      <div className="bg-card rounded-lg border overflow-hidden h-[600px]">
        <MapContainer
          key={safeLocations.length}
          center={center as [number, number]}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {filteredLocations.map((vehicle: any) => (
            <Marker
              key={vehicle.unit_id}
              position={[vehicle.lat, vehicle.lng]}
              icon={createVehicleIcon(vehicle)}
              eventHandlers={{
                click: () => setSelectedVehicle(vehicle),
              }}
            >
              <Popup>
                <div className="p-2 space-y-1">
                  <h3 className="font-bold text-base">{vehicle.number}</h3>
                  <p className="text-xs text-muted-foreground">
                    Lat: {vehicle.lat.toFixed(4)}, Lng: {vehicle.lng.toFixed(4)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Movement: {vehicle.movement_state?.name || "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Direction: {vehicle.direction}°
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last Update:{" "}
                    {vehicle.last_update
                      ? new Date(vehicle.last_update).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

          <FlyToLocation selectedVehicle={selectedVehicle} />
        </MapContainer>
      </div>

      {/* Vehicle List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLocations.map((vehicle: any) => (
          <div
            key={vehicle.unit_id}
            className={`bg-card rounded-lg border p-4 cursor-pointer hover:bg-accent ${
              selectedVehicle?.unit_id === vehicle.unit_id ? "border-primary" : ""
            }`}
            onClick={() => setSelectedVehicle(vehicle)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{vehicle.number}</h3>
                <p className="text-sm text-muted-foreground">
                  ID: {vehicle.unit_id}
                </p>
              </div>
              <div
                className={`h-3 w-3 rounded-full animate-pulse ${
                  vehicle.movement_state?.name?.toLowerCase() === "standing"
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              />
            </div>
            <div className="mt-3 text-xs text-muted-foreground space-y-1">
              <p>Lat: {vehicle.lat.toFixed(4)}</p>
              <p>Lng: {vehicle.lng.toFixed(4)}</p>
              <p>State: {vehicle.state?.name}</p>
              <p>Movement: {vehicle.movement_state?.name}</p>
              <p>Direction: {vehicle.direction}°</p>
              <p>
                Last Update:{" "}
                {vehicle.last_update
                  ? new Date(vehicle.last_update).toLocaleString()
                  : "N/A"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
