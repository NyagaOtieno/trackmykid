// Tracking.tsx — Admin live vehicle tracking
// ✅ Calls /tracking/live-locations (NOT /tracking/bus-locations which is history)
// ✅ Map does NOT jump on every poll — only flies when user explicitly clicks a vehicle
// ✅ Playback (history) uses getBusLocationHistory separately

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import "leaflet/dist/leaflet.css";
import { getLiveLocations } from "./api";
import { createBusIcon } from "@/utils/vehicleIcon";

// ── FlyTo: only fires when userSelected changes (not on every poll) ──
function FlyToLocation({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  const prevRef = useRef<string>("");
  useEffect(() => {
    if (!target) return;
    const key = `${target.lat.toFixed(5)},${target.lng.toFixed(5)}`;
    if (key === prevRef.current) return; // same coords — don't fly again
    prevRef.current = key;
    map.flyTo([target.lat, target.lng], 15, { animate: true, duration: 1 });
  }, [target, map]);
  return null;
}

// ── Coordinate validator ──
function normalizeCoords(v: any) {
  let lat = v.lat != null ? Number(v.lat) : null;
  let lng = v.lng != null ? Number(v.lng) : null;

  if (lat === null || lng === null) return { ...v, lat: -1.2921, lng: 36.8219, __fallback: true };
  if (lat > 5 && lng < 5) [lat, lng] = [lng, lat]; // swapped
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180)   return { ...v, lat: -1.2921, lng: 36.8219, __fallback: true };
  const inKenya = lat > -5 && lat < 5 && lng > 34 && lng < 42;
  if (!inKenya) return { ...v, lat: -1.2921, lng: 36.8219, __fallback: true };

  return { ...v, lat, lng, direction: Number(v.direction || 0), speed: Number(v.speed || 0), __fallback: false };
}

async function fetchLiveVehicles() {
  try {
    const data = await getLiveLocations(); // ← /tracking/live-locations (NOT history)
    return (Array.isArray(data) ? data : []).map(normalizeCoords);
  } catch {
    return [];
  }
}

export default function Tracking() {
  const { data: vehicles = [], isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["liveLocations"],
    queryFn:  fetchLiveVehicles,
    refetchInterval: 5000,  // poll every 5s
    retry: 2,
    staleTime: 4000,         // don't refetch more than once per 4s
  });

  const [search, setSearch] = useState("");
  // userSelectedId: only set when user CLICKS a vehicle — never auto-set by poll
  const [userSelectedId, setUserSelectedId] = useState<string | null>(null);

  const list = Array.isArray(vehicles) ? vehicles : [];

  const filtered = useMemo(() =>
    list.filter((v: any) =>
      v.plateNumber?.toLowerCase().includes(search.toLowerCase()) ||
      v.vehicleReg?.toLowerCase().includes(search.toLowerCase())
    ),
  [list, search]);

  // Fly-to target: only the user-selected vehicle, never auto-selected
  const selectedVehicle = userSelectedId
    ? filtered.find((v: any) => String(v.busId ?? v.vehicleReg) === userSelectedId) ?? null
    : null;
  const flyTarget = selectedVehicle && !selectedVehicle.__fallback
    ? { lat: selectedVehicle.lat, lng: selectedVehicle.lng }
    : null;

  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—";
  const liveCount  = filtered.filter((v: any) => !v.__fallback).length;

  if (isLoading)
    return <div className="flex items-center justify-center h-[600px] text-muted-foreground">Loading live map...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-3xl font-bold">Live Vehicle Tracking</h2>
          <p className="text-muted-foreground mt-1">
            Real-time positions from GPS devices · auto-refreshes every 5s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {liveCount} / {filtered.length} with live GPS
          </Badge>
          <span className="text-xs text-muted-foreground">Updated: {lastUpdate}</span>
          <Button size="sm" onClick={() => refetch()}>Refresh Now</Button>
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
        {userSelectedId && (
          <Button variant="ghost" size="sm" onClick={() => setUserSelectedId(null)}>
            Clear selection
          </Button>
        )}
      </div>

      {/* Map */}
      <div className="bg-card rounded-lg border overflow-hidden" style={{ height: 520 }}>
        <MapContainer center={[-1.2921, 36.8219]} zoom={11} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Only flies when user clicks — not on every poll */}
          <FlyToLocation target={flyTarget} />

          {filtered.map((bus: any) => {
            const id = String(bus.busId ?? bus.vehicleReg);
            return (
              <Marker
                key={id}
                position={[bus.lat, bus.lng]}
                icon={createBusIcon(bus, userSelectedId === id)}
                eventHandlers={{ click: () => setUserSelectedId(id) }}
              >
                <Popup>
                  <div className="space-y-1 text-sm">
                    <p className="font-bold">{bus.plateNumber ?? bus.vehicleReg}</p>
                    {bus.__fallback && (
                      <p className="text-orange-500 text-xs">⚠ No GPS signal — showing default location</p>
                    )}
                    <p>Speed: {bus.speed ?? 0} km/h</p>
                    <p>Direction: {bus.direction ?? 0}°</p>
                    <p>State: {bus.movementState ?? "—"}</p>
                    {bus.driver?.name && <p>Driver: {bus.driver.name}</p>}
                    {bus.assistant?.name && <p>Assistant: {bus.assistant.name}</p>}
                    {bus.lastUpdate && (
                      <p className="text-xs text-muted-foreground">
                        GPS: {new Date(bus.lastUpdate).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Vehicle cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground py-8">
            No vehicles found. Check that the GPS listener is running and devices are registered.
          </p>
        ) : filtered.map((bus: any) => {
          const id  = String(bus.busId ?? bus.vehicleReg);
          const sel = userSelectedId === id;
          return (
            <div
              key={id}
              className={`bg-card border rounded-lg p-4 cursor-pointer transition-all hover:border-primary ${sel ? "border-primary ring-1 ring-primary" : ""}`}
              onClick={() => setUserSelectedId(sel ? null : id)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{bus.plateNumber ?? bus.vehicleReg}</span>
                <span className={`h-2.5 w-2.5 rounded-full ${
                  bus.__fallback ? "bg-gray-400"
                  : (bus.speed ?? 0) > 0 ? "bg-green-500 animate-pulse"
                  : "bg-yellow-400"
                }`} />
              </div>
              <p className="text-xs text-muted-foreground">Driver: {bus.driver?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">
                {bus.__fallback ? "No GPS signal"
                  : `${bus.speed ?? 0} km/h · ${bus.movementState ?? "unknown"}`}
              </p>
              {!bus.__fallback && (
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {bus.lat.toFixed(4)}, {bus.lng.toFixed(4)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
