import L from "leaflet";

/**
 * Creates a Leaflet icon using the bus.png image with status-based color filters
 * and rotation support.
 * 
 * @param vehicle - Vehicle object with movementState, direction, lat, lng, plateNumber
 * @param isSelected - Whether the vehicle is currently selected (affects size)
 * @returns Leaflet Icon instance
 */
export function createBusIcon(vehicle: any, isSelected: boolean = false): L.DivIcon {
  const movementState = vehicle.movementState?.toLowerCase() || "unknown";
  // Check for fallback: either explicit __fallback flag or missing coordinates
  const isFallback = vehicle.__fallback === true || !vehicle.lat || !vehicle.lng;
  const direction = vehicle.direction || 0;
  
  // Determine status treatment. bus.png is a yellow school bus — keep
  // it yellow in every state (as requested) instead of hue-shifting it
  // to green/blue. Still convey state, but only via brightness/opacity
  // so the bus color itself stays consistent everywhere.
  let filterColor = "";
  if (isFallback) {
    filterColor = "grayscale(100%) brightness(0.6)"; // no GPS fix — grayed out
  } else if (movementState === "moving" || movementState === "driving") {
    filterColor = "saturate(1.3) brightness(1.05)"; // moving — vivid yellow
  } else {
    filterColor = "saturate(1.1) brightness(0.9)"; // stopped/standing — slightly dimmer yellow
  }
  
  const size = isSelected ? 40 : 32;
  const backingColor = isFallback ? "#9ca3af" : "#f4c430"; // gray badge for no-GPS, yellow otherwise
  
  // Wrap the bus image in a yellow rounded backing so the marker still
  // reads clearly as "a yellow bus" even before the image loads, and
  // falls back to a plain yellow badge (via onerror hiding the broken
  // image) if /bus.png ever fails to load instead of showing a blank
  // or broken-image glyph.
  const iconHtml = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${size}px;
      height: ${size}px;
      background: ${backingColor};
      border-radius: 6px;
      border: 2px solid #fff;
      box-shadow: 0 3px 6px rgba(0,0,0,0.4);
      transform: rotate(${direction}deg);
      z-index: ${isSelected ? 1000 : 100};
    ">
      <img 
        src="/bus.png" 
        alt="Bus" 
        onerror="this.style.display='none'"
        style="
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: ${filterColor};
        "
      />
    </div>
  `;
  
  return L.divIcon({
    html: iconHtml,
    className: "vehicle-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

