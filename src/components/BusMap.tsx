import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

interface BusMapProps {
  busLocation: {
    lat: number;
    lng: number;
  } | null;
  routePositions: { lat: number; lng: number }[];
  autoFollow: boolean;
}

const busIcon = L.icon({
  iconUrl: "/bus-icon.png",
  iconSize: [38, 38],
  iconAnchor: [19, 38],
});

export default function BusMap({ busLocation, routePositions, autoFollow }: BusMapProps) {
  const mapRef = useRef<any>(null);

  // Auto-follow bus when enabled
  useEffect(() => {
    if (autoFollow && busLocation && mapRef.current) {
      mapRef.current.setView([busLocation.lat, busLocation.lng], 16, {
        animate: true,
      });
    }
  }, [busLocation, autoFollow]);

  return (
    <div className="w-full h-[320px] rounded-xl overflow-hidden border shadow">
      <MapContainer
        center={[0.3476, 32.5825]}
        zoom={13}
        scrollWheelZoom={true}
        ref={mapRef}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Draw travelled route */}
        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions.map((p) => [p.lat, p.lng])}
          />
        )}

        {/* Bus Marker */}
        {busLocation && (
          <Marker
            position={[busLocation.lat, busLocation.lng]}
            icon={busIcon}
          >
            <Tooltip direction="top">Bus Current Location</Tooltip>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
