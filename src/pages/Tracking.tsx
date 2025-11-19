import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import axios from "axios";

// --- Fly to selected vehicle ---
function FlyToLocation({ selectedVehicle }: { selectedVehicle: any }) {
  const map = useMap();
  useEffect(() => {
    if (selectedVehicle?.lat != null && selectedVehicle?.lng != null) {
      map.flyTo([selectedVehicle.lat, selectedVehicle.lng], 15, { animate: true });
    }
  }, [selectedVehicle, map]);
  return null;
}

// --- Vehicle icon ---
const createVehicleIcon = (vehicle: any) => {
  const color = vehicle.movementState?.toLowerCase() === "standing" ? "#28a745" : "#dc3545";

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

// --- Fetch buses with live positions ---
async function getBuses() {
  try {
    const token = sessionStorage.getItem("token"); // <-- Session-based Bearer
    const response = await axios.get(
      "https://schooltransport-production.up.railway.app/api/tracking/bus-locations",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const buses = response.data?.data || [];

    // Fix lat/lng and ensure numbers
    return buses.map((v: any) => {
      let lat = Number(v.lat);
      let lng = Number(v.lng);

      // Swap if obviously reversed (lat > 5 or lng < 10 for Kenya)
      if (lat > 5 && lng < 10) {
        [lat, lng] = [lng, lat];
      }

      return {
        ...v,
        lat: !isNaN(lat) ? lat : null,
        lng: !isNaN(lng) ? lng : null,
        direction: Number(v.direction || 0),
        speed: Number(v.speed || 0),
      };
    });
  } catch (error) {
    console.error("Error fetching buses:", error);
    return [];
  }
}

// --- Main Tracking Component ---
export default function Tracking() {
  const { data: buses = [], isLoading: loadingBuses, refetch } = useQuery({
    queryKey: ["buses"],
    queryFn: getBuses,
    refetchInterval: 5000, // Poll every 5s
  });

  const [search, setSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  // Filter buses by search AND valid Kenyan coordinates
  const filteredLocations = useMemo(() => {
    return buses
      .filter((v: any) => v.plateNumber?.toLowerCase().includes(search.toLowerCase()))
      .filter((v: any) => v.lat != null && v.lng != null)
      .filter((v: any) => v.lat > -5 && v.lat < 5 && v.lng > 34 && v.lng < 42); // Kenya bounding box
  }, [buses, search]);

  useEffect(() => {
    setSelectedVehicle(filteredLocations[0] || null);
  }, [filteredLocations]);

  const center: [number, number] = selectedVehicle
    ? [selectedVehicle.lat, selectedVehicle.lng]
    : [-1.2921, 36.8219]; // Nairobi default

  if (loadingBuses)
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
        <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {filteredLocations.map((vehicle) => (
            <Marker
              key={vehicle.busId}
              position={[vehicle.lat!, vehicle.lng!]}
              icon={createVehicleIcon(vehicle)}
              eventHandlers={{ click: () => setSelectedVehicle(vehicle) }}
            >
              <Popup>
                <div className="p-2 space-y-1">
                  <h3 className="font-bold text-base">{vehicle.plateNumber}</h3>
                  <p className="text-xs text-muted-foreground">
                    Lat: {vehicle.lat?.toFixed(4) ?? "N/A"}, Lng: {vehicle.lng?.toFixed(4) ?? "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">Movement: {vehicle.movementState || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">Direction: {vehicle.direction}</p>
                  <p className="text-xs text-muted-foreground">
                    Last Update: {vehicle.lastUpdate ? new Date(vehicle.lastUpdate).toLocaleString() : "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">Route: {vehicle.route}</p>
                  <p className="text-xs text-muted-foreground">Driver: {vehicle.driver?.name || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">Assistant: {vehicle.assistant?.name || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">School: {vehicle.school || "N/A"}</p>
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
          <div
            key={vehicle.busId}
            className={`bg-card rounded-lg border p-4 cursor-pointer hover:bg-accent ${
              selectedVehicle?.busId === vehicle.busId ? "border-primary" : ""
            }`}
            onClick={() => setSelectedVehicle(vehicle)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{vehicle.plateNumber}</h3>
                <p className="text-sm text-muted-foreground">Route: {vehicle.route}</p>
              </div>
              <div
                className={`h-3 w-3 rounded-full animate-pulse ${
                  vehicle.movementState?.toLowerCase() === "standing" ? "bg-green-500" : "bg-red-500"
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
