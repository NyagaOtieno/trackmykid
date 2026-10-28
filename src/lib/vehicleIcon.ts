import * as L from "leaflet";

/**
 * Shared bus marker icon — used by both the admin Tracking page and the
 * Parent Portal so a bus looks the same everywhere in the app.
 *
 * Color: gray = fallback/stale location, green = standing, red = moving.
 * (Matches the original admin Tracking.tsx convention.)
 */
export function createVehicleIcon(vehicle: {
  __fallback?: boolean;
  movementState?: string | null;
  direction?: number | null;
  plateNumber?: string | null;
}) {
  const isFallback = vehicle.__fallback === true;

  const color = isFallback
    ? "#6c757d"
    : vehicle.movementState?.toLowerCase() === "standing"
    ? "#28a745"
    : "#dc3545";

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
    ">🚍 ${vehicle.plateNumber ?? ""}</div>`,
    className: "",
    iconSize: [28, 24],
    iconAnchor: [14, 12],
  });
}
