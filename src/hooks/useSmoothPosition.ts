import { useEffect, useRef, useState } from "react";

/**
 * Smoothly interpolates between GPS fixes so the marker appears to move
 * continuously on screen even though the backend only updates every ~30s.
 * Purely a visual glide — it does NOT invent new GPS data, it just eases
 * from the last known point to the newest known point.
 */
export function useSmoothPosition(
  target: { lat: number; lng: number } | null,
  durationMs: number = 4000
) {
  const [display, setDisplay] = useState<{ lat: number; lng: number } | null>(target);
  const fromRef = useRef<{ lat: number; lng: number } | null>(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!target) return;
    const from = fromRef.current ?? target;

    // No meaningful change — snap instantly, nothing to animate.
    if (from.lat === target.lat && from.lng === target.lng) {
      setDisplay(target);
      return;
    }

    const start = performance.now();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay({
        lat: from.lat + (target.lat - from.lat) * eased,
        lng: from.lng + (target.lng - from.lng) * eased,
      });
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.lat, target?.lng]);

  return display;
}
