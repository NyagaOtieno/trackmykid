import { useEffect, useRef, useState } from "react";

type Pos = { lat: number; lng: number; direction?: number };

/**
 * Smoothly interpolates between GPS fixes (and heading) so the marker glides
 * and turns continuously on screen even though the backend only updates every
 * ~30s. Purely a visual glide — it does NOT invent new GPS data, it just eases
 * from the last known point/heading to the newest known one.
 *
 * Heading is interpolated along the shortest angular path (e.g. 350deg -> 10deg
 * turns forward 20deg, not backward 340deg), so the bus icon never "spins the
 * wrong way" like it would with naive linear interpolation of raw degrees.
 */
export function useSmoothPosition(
  target: Pos | null,
  durationMs: number = 4000
) {
  const [display, setDisplay] = useState<Pos | null>(target);
  const fromRef = useRef<Pos | null>(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!target) return;
    const from = fromRef.current ?? target;

    const latSame = from.lat === target.lat && from.lng === target.lng;
    const dirSame = (from.direction ?? 0) === (target.direction ?? from.direction ?? 0);
    if (latSame && dirSame) {
      setDisplay(target);
      return;
    }

    const fromDir = from.direction ?? target.direction ?? 0;
    const toDir = target.direction ?? fromDir;
    // Shortest angular delta, in range (-180, 180]
    let deltaDir = ((toDir - fromDir + 540) % 360) - 180;

    const start = performance.now();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const direction = (fromDir + deltaDir * eased + 360) % 360;

      setDisplay({
        lat: from.lat + (target.lat - from.lat) * eased,
        lng: from.lng + (target.lng - from.lng) * eased,
        direction,
      });

      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = { ...target, direction: toDir };
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.lat, target?.lng, target?.direction]);

  return display;
}