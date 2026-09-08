// Tracking.tsx - Admin live vehicle tracking
// - Calls /tracking/live-locations (NOT /tracking/bus-locations which is history)
// - Polls every 30s; markers glide smoothly between updates (useSmoothPosition)
// - Color: RED = stopped, YELLOW = moving with child onboard, GREEN = moving empty
//   (pulses when within 500m of a pickup), GRAY = no GPS
// - Map does NOT jump on every poll - only flies when user explicitly clicks a vehicle
// - Playback (history) opens a modal calling GET /tracking/bus/:busId/history

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import "leaflet/dist/leaflet.css";
import { getLiveLocations } from "@/lib/api";
import { createBusIcon, colorStateLabel } from "@/utils/vehicleIcon";
import { useSmoothPosition } from "@/hooks/useSmoothPosition";
import BusPlayback from "@/components/BusPlayback";

const POLL_MS = 30000;

// -- FlyTo: only fires when userSelected changes (not on every poll) --
function FlyToLocation({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  const prevRef = useRef<string>("");
  useEffect(() => {
    if (!target) return;
    const key = `${target.lat.toFixed(5)},${target.lng.toFixed(5)}`;
    if (key === prevRef.current) return;
    prevRef.current = key;
    map.flyTo([target.lat, target.lng], 15, { animate: true, duration: 1 });
  }, [target, map]);
  return null;
}

// -- Coordinate validator --
function normalizeCoords(v: any) {
  let lat = v.lat != null ? Number(v.lat) : null;
  let lng = v.lng != null ? Number(v.lng) : null;

  if (lat === null || lng === null) return { ...v, lat: null, lng: null, __fallback: true, colorState: "GRAY" };
  if (lat > 5 && lng < 5) [lat, lng] = [lng, lat]; // swapped
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180)   return { ...v, lat: null, lng: null, __fallback: true, colorState: "GRAY" };
  const inKenya = lat > -5 && lat < 5 && lng > 34 && lng < 42;
  if (!inKenya) return { ...v, lat: null, lng: null, __fallback: true, colorState: "GRAY" };

  return { ...v, lat, lng, direction: Number(v.direction || 0), speed: Number(v.speed || 0), __fallback: false };
}

async function fetchLiveVehicles() {
  try {
    const res = await getLiveLocations();
    const data = Array.isArray(res) ? res : res?.data ?? [];
    return (Array.isArray(data) ? data : []).map(normalizeCoords);
  } catch {
    return [];
  }
}

// -- Individual marker with smooth glide between polls --
function AnimatedBusMarker({ bus, isSelected, onClick }: { bus: any; isSelected: boolean; onClick: () => void }) {
  const target = bus.lat != null && bus.lng != null ? { lat: bus.lat, lng: bus.lng } : null;
  const display = useSmoothPosition(target, POLL_MS * 0.6);
  if (!display) return null;

  const { label, className } = colorStateLabel(bus.colorState);

  return (
    <Marker
      position={[display.lat, display.lng]}
      icon={createBusIcon(bus, isSelected)}
      eventHandlers={{ click: onClick }}
    >
      <Popup>
        <div className="space-y-1 text-sm">
          <p className="font-bold">{bus.plateNumber ?? bus.vehicleReg}</p>
          <span className={`inline-block text-xs px-2 py-0.5 rounded ${className}`}>{label}</span>
          {bus.nearPickup && (
            <p className="text-green-600 text-xs">Approaching pickup ({bus.nearPickupMeters}m away)</p>
          )}
          <p>Speed: {bus.speed ?? 0} km/h</p>
          <p>Direction: {bus.direction ?? 0}deg</p>
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
}

export default function Tracking() {
  const { data: vehicles = [], isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["liveLocations"],
    queryFn:  fetchLiveVehicles,
    refetchInterval: POLL_MS,
    retry: 2,
    staleTime: POLL_MS - 1000,
  });

  const [search, setSearch] = useState("");
  const [userSelectedId, setUserSelectedId] = useState<string | null>(null);
  const [playbackBusId, setPlaybackBusId] = useState<number | string | null>(null);

  const list = Array.isArray(vehicles) ? vehicles : [];

  const filtered = useMemo(() =>
    list.filter((v: any) =>
      v.plateNumber?.toLowerCase().includes(search.toLowerCase()) ||
      v.vehicleReg?.toLowerCase().includes(search.toLowerCase())
    ),
  [list, search]);

  const selectedVehicle = userSelectedId
    ? filtered.find((v: any) => String(v.busId ?? v.vehicleReg) === userSelectedId) ?? null
    : null;
  const flyTarget = selectedVehicle && !selectedVehicle.__fallback
    ? { lat: selectedVehicle.lat, lng: selectedVehicle.lng }
    : null;

  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "-";
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
            Real-time positions from GPS devices &middot; auto-refreshes every 30s
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

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Stopped</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-yellow-400" /> Moving - onboard</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Moving - empty</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-gray-400" /> No GPS</span>
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
          <FlyToLocation target={flyTarget} />
          {filtered.map((bus: any) => {
            const id = String(bus.busId ?? bus.vehicleReg);
            return (
              <AnimatedBusMarker
                key={id}
                bus={bus}
                isSelected={userSelectedId === id}
                onClick={() => setUserSelectedId(id)}
              />
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
          const { label, className } = colorStateLabel(bus.colorState);
          return (
            <div
              key={id}
              className={`bg-card border rounded-lg p-4 cursor-pointer transition-all hover:border-primary ${sel ? "border-primary ring-1 ring-primary" : ""}`}
              onClick={() => setUserSelectedId(sel ? null : id)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{bus.plateNumber ?? bus.vehicleReg}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${className}`}>{label}</span>
              </div>
              <p className="text-xs text-muted-foreground">Driver: {bus.driver?.name ?? "-"}</p>
              <p className="text-xs text-muted-foreground">
                {bus.__fallback ? "No GPS signal"
                  : `${bus.speed ?? 0} km/h`}
                {bus.nearPickup && <span className="text-green-600 ml-1">- approaching pickup</span>}
              </p>
              {!bus.__fallback && bus.lat != null && (
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {Number(bus.lat).toFixed(4)}, {Number(bus.lng).toFixed(4)}
                </p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                onClick={(e) => { e.stopPropagation(); setPlaybackBusId(bus.busId ?? id); }}
              >
                View trip playback
              </Button>
            </div>
          );
        })}
      </div>

      {playbackBusId != null && (
        <BusPlayback
          busId={playbackBusId}
          busLabel={filtered.find((v: any) => (v.busId ?? v.vehicleReg) === playbackBusId)?.plateNumber}
          onClose={() => setPlaybackBusId(null)}
        />
      )}
    </div>
  );
}
