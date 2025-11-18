import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import axios from "axios";

// --- Backend API endpoints ---
const BUSES_API = "https://schooltransport-production.up.railway.app/api/buses";
const LIVE_API = "https://mytrack-production.up.railway.app/api/devices/list";
const API_KEY = "x2AJdCzZaM5y8tPaui5of6qhuovc5SST7y-y6rR_fD0=";

// --- Mock data for dev fallback ---
const MOCK_BUSES = [
  { id: 1, plateNumber: "KAA123A", route: "Route 1", driver: { name: "John" }, assistant: { name: "Doe" }, school: "ABC School" },
  { id: 2, plateNumber: "KBB456B", route: "Route 2", driver: { name: "Jane" }, assistant: { name: "Smith" }, school: "XYZ School" },
];

const MOCK_LIVE = [
  { vehicle_no: "KAA123A", last_lat: 36.8219, last_lng: -1.2921, movement_state: { name: "Moving" }, direction: 45, last_update: new Date().toISOString() },
  { vehicle_no: "KBB456B", last_lat: 36.8100, last_lng: -1.3000, movement_state: { name: "Standing" }, direction: 0, last_update: new Date().toISOString() },
];

// --- Fetch buses ---
async function getBuses() {
  if (import.meta.env.DEV) return MOCK_BUSES;
  try {
    const response = await axios.get(BUSES_API, { withCredentials: true });
    return response.data || [];
  } catch (error) {
    console.error("Error fetching buses:", error);
    return [];
  }
}

// --- Fetch live locations ---
async function getLiveLocations() {
  if (import.meta.env.DEV) return MOCK_LIVE;
  try {
    const response = await axios.get(LIVE_API, {
      headers: { "X-API-Key": API_KEY },
    });
    return response.data || [];
  } catch (error) {
    console.error("Error fetching live locations:", error);
    return [];
  }
}

// --- Fly to selected vehicle ---
function FlyToLocation({ selectedVehicle }: { selectedVehicle: any }) {
  const map = useMap();
  useEffect(() => {
    if (selectedVehicle?.lat && selectedVehicle?.lng) {
      map.flyTo([selectedVehicle.lat, selectedVehicle.lng], 15, { animate: true });
    }
  }, [selectedVehicle, map]);
  return null;
}

// --- Vehicle icon ---
const createVehicleIcon = (vehicle: any) => {
  const color = vehicle.movement_state?.name?.toLowerCase() === "standing" ? "#28a745" : "#dc3545";

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
    ">🚍 ${vehicle.number}</div>`,
    className: "",
    iconSize: [28, 24],
    iconAnchor: [14, 12],
  });
};

// --- Main Tracking Component ---
export default function Tracking() {
  const { data: buses = [], isLoading: loadingBuses } = useQuery({
    queryKey: ["buses"],
    queryFn: getBuses,
  });

  const { data: live = [], isLoading: loadingLive, refetch } = useQuery({
    queryKey: ["liveLocations"],
    queryFn: getLiveLocations,
    refetchInterval: 5000,
  });

  const [search, setSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  // --- Combine buses and live locations ---
  const locations = useMemo(() => {
    if (!buses || !live) return [];

    return buses
      .map((bus: any) => {
        const liveData = live.find(
          (v: any) => v.vehicle_no?.replace(/\s+/g, '').toUpperCase() === bus.plateNumber?.replace(/\s+/g, '').toUpperCase()
        );

        if (!liveData || !liveData.last_lat || !liveData.last_lng) return null;

        return {
          unit_id: bus.id,
          number: bus.plateNumber,
          route: bus.route,
          driver: bus.driver,
          assistant: bus.assistant,
          school: bus.school,
          lat: Number(liveData.last_lng), // swap lat/lng
          lng: Number(liveData.last_lat), // swap lat/lng
          movement_state: liveData.movement_state || { name: "N/A" },
          direction: liveData.direction || 0,
          last_update: liveData.last_update || null,
        };
      })
      .filter(Boolean);
  }, [buses, live]);

  const filteredLocations = useMemo(
    () => locations.filter((v: any) => v.number?.toLowerCase().includes(search.toLowerCase())),
    [locations, search]
  );

  useEffect(() => {
    setSelectedVehicle(filteredLocations[0] || null);
  }, [filteredLocations]);

  const center: [number, number] = selectedVehicle
    ? [selectedVehicle.lat, selectedVehicle.lng]
    : locations[0]
    ? [locations[0].lat, locations[0].lng]
    : [-1.2921, 36.8219];

  if (loadingBuses || loadingLive)
    return <div className="flex items-center justify-center h-[600px]">Loading live vehicle map...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Live Vehicle Tracking</h2>
          <p className="text-muted-foreground mt-1">Real-time updates for all active fleet vehicles</p>
        </div>
        <div className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleTimeString()}</div>
      </div>

      {/* Search & Refresh */}
      <div className="flex gap-2 items-center">
        <Input placeholder="Search by vehicle number..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Button onClick={() => refetch()}>Refresh</Button>
      </div>

      {/* Map */}
      <div className="bg-card rounded-lg border overflow-hidden h-[600px]">
        <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {filteredLocations.map((vehicle) => (
            <Marker key={vehicle.unit_id} position={[vehicle.lat, vehicle.lng]} icon={createVehicleIcon(vehicle)} eventHandlers={{ click: () => setSelectedVehicle(vehicle) }}>
              <Popup>
                <div className="p-2 space-y-1">
                  <h3 className="font-bold text-base">{vehicle.number}</h3>
                  <p className="text-xs text-muted-foreground">
                    Lat: {vehicle.lat.toFixed(4)}, Lng: {vehicle.lng.toFixed(4)}
                  </p>
                  <p className="text-xs text-muted-foreground">Movement: {vehicle.movement_state?.name || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">Direction: {vehicle.direction}°</p>
                  <p className="text-xs text-muted-foreground">Last Update: {vehicle.last_update ? new Date(vehicle.last_update).toLocaleString() : "N/A"}</p>
                  <p className="text-xs text-muted-foreground">Route: {vehicle.route}</p>
                  <p className="text-xs text-muted-foreground">Driver: {vehicle.driver?.name || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">Assistant: {vehicle.assistant?.name || "N/A"}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          <FlyToLocation selectedVehicle={selectedVehicle} />
        </MapContainer>
      </div>

      {/* Vehicle List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLocations.map((vehicle) => (
          <div key={vehicle.unit_id} className={`bg-card rounded-lg border p-4 cursor-pointer hover:bg-accent ${selectedVehicle?.unit_id === vehicle.unit_id ? "border-primary" : ""}`} onClick={() => setSelectedVehicle(vehicle)}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{vehicle.number}</h3>
                <p className="text-sm text-muted-foreground">Route: {vehicle.route}</p>
              </div>
              <div className={`h-3 w-3 rounded-full animate-pulse ${vehicle.movement_state?.name?.toLowerCase() === "standing" ? "bg-green-500" : "bg-red-500"}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
