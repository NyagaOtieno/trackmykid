import L from "leaflet";

/**
 * Creates a Leaflet icon using the bus.png image with status-based color
 * filters and rotation support.
 *
 * Color meaning (driven by the backend's `colorState` field):
 *   RED    - bus stopped
 *   YELLOW - bus moving, at least one child onboard
 *   GREEN  - bus moving, empty (no children onboard); pulses if `nearPickup`
 *            is true (within 500m of a student not yet picked up)
 *   GRAY   - no GPS signal / no device linked
 *
 * Falls back to the old movementState-based heuristic if colorState isn't present,
 * so this stays backward compatible with any caller that hasn't been updated yet.
 */
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

  const direction = vehicle.direction || 0;
  const size = isSelected ? 40 : 32;
  const pulse = colorState === "GREEN" && vehicle.nearPickup;

  const iconHtml = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${size}px;
      height: ${size}px;
      filter: ${filterColor} drop-shadow(0 3px 6px rgba(0,0,0,0.4));
      transform: rotate(${direction}deg);
      z-index: ${isSelected ? 1000 : 100};
      ${pulse ? "animation: tmk-pulse 1s ease-in-out infinite;" : ""}
    ">
      <img
        src="/bus.png"
        alt="Bus"
        style="
          width: 100%;
          height: 100%;
          object-fit: contain;
        "
      />
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
    case "GREEN":  return { label: "Moving \u00b7 empty",   className: "bg-green-500 text-white" };
    default:       return { label: "No GPS",                className: "bg-gray-400 text-white" };
  }
}
