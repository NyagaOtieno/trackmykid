// src/components/BusPlayback.tsx
// Reusable playback modal — shows a bus's recent GPS trail on a map with
// play / pause / speed / scrub controls. Used by both the Admin Tracking
// page and the Parent Portal. Calls GET /api/tracking/bus/:busId/history.

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { X, Play, Pause, RotateCcw } from "lucide-react";
import { getBusHistory } from "@/lib/api";

type HistoryPoint = { lat: number; lng: number; speed?: number; timestamp: string };

interface Props {
  busId: number | string;
  busLabel?: string;
  onClose: () => void;
}

const busDotIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:2px solid white;box-shadow:0 0 0 2px #2563eb;"></div>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export default function BusPlayback({ busId, busLabel, onClose }: Props) {
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getBusHistory(busId, 200);
        const raw: HistoryPoint[] = Array.isArray(res?.data) ? res.data : [];
        const valid = raw.filter((p) => p.lat != null && p.lng != null);
        // Oldest -> newest, so playback moves forward in time
        valid.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        if (!cancelled) {
          setPoints(valid);
          setIndex(0);
        }
      } catch (e) {
        if (!cancelled) setError("Failed to load trip history.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [busId]);

  // Playback ticker
  useEffect(() => {
    if (!playing || points.length === 0) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIndex((i) => {
        if (i >= points.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, Math.max(120, 600 / speedMultiplier));
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, speedMultiplier, points.length]);

  const path = useMemo(() => points.map((p) => [p.lat, p.lng] as [number, number]), [points]);
  const current = points[index];
  const center = current ? [current.lat, current.lng] as [number, number] : path[0] ?? [-1.2921, 36.8219];

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">
            Trip playback {busLabel ? `\u2014 ${busLabel}` : ""}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div style={{ height: 380 }}>
          {loading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">Loading trip history...</div>
          ) : error ? (
            <div className="h-full flex items-center justify-center text-destructive">{error}</div>
          ) : points.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">No history available for this bus yet.</div>
          ) : (
            <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }}>
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Polyline positions={path} color="#2563eb" weight={3} opacity={0.6} />
              {current && <Marker position={[current.lat, current.lng]} icon={busDotIcon} />}
            </MapContainer>
          )}
        </div>

        {!loading && points.length > 0 && (
          <div className="p-4 border-t space-y-3">
            <div className="flex items-center gap-3">
              <Button size="icon" variant="outline" onClick={() => { setIndex(0); setPlaying(false); }}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button size="icon" onClick={() => setPlaying((p) => !p)}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="flex-1">
                <Slider
                  value={[index]}
                  max={points.length - 1}
                  step={1}
                  onValueChange={(v) => { setPlaying(false); setIndex(v[0]); }}
                />
              </div>
              <select
                className="text-sm border rounded px-2 py-1 bg-background"
                value={speedMultiplier}
                onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
              >
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{current ? new Date(current.timestamp).toLocaleString() : ""}</span>
              <span>{current?.speed != null ? `${current.speed} km/h` : ""}</span>
              <span>{index + 1} / {points.length}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
