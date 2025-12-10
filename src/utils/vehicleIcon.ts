import L from "leaflet";

/**
 * Creates a Leaflet icon using the bus.png image with status-based color filters
 * and rotation support.
 * 
 * @param vehicle - Vehicle object with movementState, direction, lat, lng, plateNumber
 * @param isSelected - Whether the vehicle is currently selected (affects size)
 * @returns Leaflet Icon instance
 */
export function createBusIcon(vehicle: any, isSelected: boolean = false): L.Icon {
  const movementState = vehicle.movementState?.toLowerCase() || "unknown";
  // Check for fallback: either explicit __fallback flag or missing coordinates
  const isFallback = vehicle.__fallback === true || !vehicle.lat || !vehicle.lng;
  const direction = vehicle.direction || 0;
  
  // Determine status color
  // Green for moving/driving, Blue for stopped/standing, Gray for no GPS
  let filterColor = "";
  if (isFallback) {
    filterColor = "grayscale(100%) brightness(0.5)"; // Gray for no GPS
  } else if (movementState === "moving" || movementState === "driving") {
    filterColor = "hue-rotate(90deg) saturate(1.5)"; // Green tint
  } else {
    filterColor = "hue-rotate(200deg) saturate(1.2)"; // Blue tint
  }
  
  const size = isSelected ? 40 : 32;
  
  // Create a div wrapper with the bus image, filter, and rotation
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
  `;
  
  return L.divIcon({
    html: iconHtml,
    className: "vehicle-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

