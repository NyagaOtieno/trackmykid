import L from "leaflet";

/**
 * Creates a Leaflet icon using the bus.png image with status-based color
 * filters and Uber-style smooth rotation toward the direction of travel.
 *
 * IMPORTANT ASSUMPTION: bus.png must be drawn pointing "up" (north) in its
 * default orientation. GPS `direction`/course is 0 = north, increasing
 * clockwise. If the icon looks like it's facing the wrong way, the source
 * image needs to be re-drawn pointing up, or add a fixed offset below
 * (e.g. `direction - 90` if the art points east by default).
 *
 * NOTE: earlier testing cycled the offset through 0/180/270 while the icon
 * still looked wrong each time — root cause was the device's raw GPS
 * `direction` field being unreliable at low speed, not the image orientation.
 * Tracking.tsx now computes `direction` as a real bearing from consecutive
 * GPS fixes before it reaches this component, so ROTATION_OFFSET_DEG is
 * reset to 0 as a clean starting point. Only change it if the icon is still
 * visibly off after testing with the new computed bearing (adjust in 90deg
 * steps, same as before).
 *
 * Color meaning (driven by the backend's `colorState` field):
 *   RED    - bus stopped
 *   YELLOW - bus moving, at least one child onboard
 *   GREEN  - bus moving, empty (no children onboard); pulses if `nearPickup`
 *            is true (within 500m of a student not yet picked up)
 *   GRAY   - no GPS signal / no device linked
 */

/**
 * Degrees to add to the computed direction before rotating the icon.
 * Reset to 0 now that Tracking.tsx supplies a real computed bearing instead
 * of the raw (unreliable) device direction field. Adjust in 90deg steps only
 * if the icon is still visibly off after testing.
 */
const ROTATION_OFFSET_DEG = 0;

export function createBusIcon(vehicle: any, isSelected: boolean = false): L.DivIcon {
  const isFallback = vehicle.__fallback === true || !vehicle.lat || !vehicle.lng;

  let colorState: "RED" | "YELLOW" | "GREEN" | "GRAY" = vehicle.colorState;
  if (!colorState) {
    if (isFallback) colorState = "GRAY";
    else {
      const movementState = vehicle.movementState?.toLowerCase() || "unknown";
      colorState = movementState === "moving" || movementState === "driving" ? "GREEN" : "RED";
    }
  }

  const filters: Record<string, string> = {
    RED:    "hue-rotate(-40deg) saturate(2)",
    YELLOW: "hue-rotate(40deg) saturate(2) brightness(1.1)",
    GREEN:  "hue-rotate(90deg) saturate(1.5)",
    GRAY:   "grayscale(100%) brightness(0.5)",
  };
  const filterColor = filters[colorState] || filters.GRAY;

  const rawDirection = vehicle.direction || 0;
  const direction = (rawDirection + ROTATION_OFFSET_DEG + 260) % 360;
  const size = isSelected ? 50 : 38;
  const pulse = colorState === "GREEN" && vehicle.nearPickup;

  // The rotation itself is applied to an INNER div so the outer wrapper
  // (used for positioning by Leaflet) never gets a CSS transition fighting
  // with Leaflet's own transform-based positioning. The `transition` here
  // is what makes turns look smooth ("Uber style") instead of snapping.
  const iconHtml = `
    <div style="width:${size}px;height:${size}px;">
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        filter: ${filterColor} drop-shadow(0 3px 6px rgba(0,0,0,0.4));
        transform: rotate(${direction}deg);
        transition: transform 0.6s linear;
        ${pulse ? "animation: tmk-pulse 1s ease-in-out infinite;" : ""}
      ">
        <img
          src="/bus.png"
          alt="Bus"
          style="width: 100%; height: 100%; object-fit: contain;"
        />
      </div>
    </div>
    <style>
      @keyframes tmk-pulse {
        0%, 100% { filter: ${filterColor} drop-shadow(0 3px 6px rgba(0,0,0,0.4)); }
        50%      { filter: ${filterColor} drop-shadow(0 0 12px rgba(34,197,94,0.9)); }
      }
    </style>
  `;

  return L.divIcon({
    html: iconHtml,
    className: "vehicle-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Human-readable label + tailwind-ish color for the given colorState (for badges/legends). */
export function colorStateLabel(colorState?: string): { label: string; className: string } {
  switch (colorState) {
    case "RED":    return { label: "Stopped",              className: "bg-red-500 text-white" };
    case "YELLOW": return { label: "Moving \u00b7 onboard", className: "bg-yellow-400 text-black" };
    case "GREEN":  return { label: "Moving \u00b7 Onboard",   className: "bg-green-500 text-white" };
    default:       return { label: "No GPS",                className: "bg-gray-400 text-white" };
  }
}
