// Tracking.tsx - Admin live vehicle tracking
// - Calls /tracking/live-locations (NOT /tracking/bus-locations which is history)
// - Polls every 1s; markers glide smoothly between updates (useSmoothPosition)
// - Color: RED = stopped, YELLOW = moving with child onboard, GREEN = moving empty
//   (pulses when within 500m of a pickup), GRAY = no GPS
// - Map flies to a vehicle once when selected, then keeps re-centering on it
//   every update (without resetting zoom) until deselected
// - Playback (history) opens a modal calling GET /tracking/bus/:busId/history
//
// HEADING FIX: the device-reported `direction` field was confirmed unreliable
// at low speed (observed swinging ~90-190deg between polls while the bus barely
// moved). Instead of trusting it, we now compute bearing ourselves from the
// last two real GPS fixes per vehicle (see the `list` useMemo below). Below a
// minimum movement threshold (GPS jitter range), we hold the last known
// bearing instead of recomputing from noise. The raw device `direction` is
// only used as a last resort before any second fix exists for a vehicle.

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

const POLL_MS = 1000;

// Minimum distance (meters) the vehicle must move between fixes before we
// trust the new bearing. Below this, GPS jitter alone can swing the computed
// bearing wildly, so we hold the last known good bearing instead.
const MIN_MOVE_METERS = 8;

// -- Haversine distance in meters --
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// -- Initial bearing (degrees, 0 = north, clockwise) from point 1 to point 2 --
function computeBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// -- FlyTo once on selection, then keep centered on the same vehicle every poll --
function FlyToLocation({ target, followKey }: { target: { lat: number; lng: number } | null; followKey: string | null }) {
  const map = useMap();
  const prevFollowKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!target || !followKey) {
      prevFollowKeyRef.current = null;
      return;
    }
    if (followKey !== prevFollowKeyRef.current) {
      map.flyTo([target.lat, target.lng], 15, { animate: true, duration: 1 });
      prevFollowKeyRef.current = followKey;
    } else {
      map.setView([target.lat, target.lng], map.getZoom(), { animate: true });
    }
  }, [target, followKey, map]);

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
  const target = bus.lat != null && bus.lng != null
    ? { lat: bus.lat, lng: bus.lng, direction: bus.direction ?? 0 }
    : null;
  const display = useSmoothPosition(target, POLL_MS * 0.6);
  if (!display) return null;

  const { label, className } = colorStateLabel(bus.colorState);

  return (
    <Marker
      position={[display.lat, display.lng]}
      icon={createBusIcon({ ...bus, direction: display.direction }, isSelected)}
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
          <p>Direction (computed): {Math.round(bus.direction ?? 0)}deg</p>
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

  // Persists last known {lat, lng, bearing} per vehicle across polls so we
  // can compute heading from real movement instead of the device's field.
  const prevPositionsRef = useRef<Map<string, { lat: number; lng: number; bearing: number }>>(new Map());

  const rawList = Array.isArray(vehicles) ? vehicles : [];

  // Recompute bearing per vehicle whenever a new batch of vehicles arrives.
  const list = useMemo(() => {
    return rawList.map((v: any) => {
      const id = String(v.busId ?? v.vehicleReg);
      if (v.__fallback || v.lat == null || v.lng == null) {
        return v;
      }

      const prev = prevPositionsRef.current.get(id);
      let bearing = v.direction ?? 0; // fallback: device value, only used before we have 2 fixes

      if (prev) {
        const dist = haversineMeters(prev.lat, prev.lng, v.lat, v.lng);
        bearing = dist >= MIN_MOVE_METERS
          ? computeBearing(prev.lat, prev.lng, v.lat, v.lng)
          : prev.bearing; // not enough movement to trust a new bearing - hold last one
      }

      prevPositionsRef.current.set(id, { lat: v.lat, lng: v.lng, bearing });
      return { ...v, direction: bearing };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawList]);

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
            Real-time positions from GPS devices &middot; live updates every second
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
          <FlyToLocation target={flyTarget} followKey={userSelectedId} />
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
