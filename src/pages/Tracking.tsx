import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bus, User, UserCog, MapPin, Gauge, Navigation, Clock, AlertCircle } from "lucide-react";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import axios from "axios";
import { createBusIcon } from "@/utils/vehicleIcon";

// ---------------- Fly to selected vehicle ----------------
function FlyToLocation({ selectedVehicle }: { selectedVehicle: any }) {
  const map = useMap();
  useEffect(() => {
    if (selectedVehicle?.lat != null && selectedVehicle?.lng != null) {
      map.flyTo([selectedVehicle.lat, selectedVehicle.lng], 15, { animate: true });
    }
  }, [selectedVehicle, map]);

  return null;
}

// ---------------- Persistent Marker with Popup ----------------
function PersistentMarker({ 
  bus, 
  isSelected, 
  onSelect 
}: { 
  bus: any; 
  isSelected: boolean; 
  onSelect: () => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    if (markerRef.current) {
      if (isSelected) {
        markerRef.current.openPopup();
      } else {
        markerRef.current.closePopup();
      }
    }
  }, [isSelected]);

  return (
    <Marker
      ref={markerRef}
      position={[bus.lat, bus.lng]}
      icon={createBusIcon(bus, isSelected)}
      eventHandlers={{ 
        click: () => {
          onSelect();
        }
      }}
      zIndexOffset={isSelected ? 1000 : 100}
    >
      <Popup 
        maxWidth={200} 
        className="custom-popup"
        closeButton={false}
        autoPan={true}
        autoPanPadding={[80, 50]}
        offset={[0, -40]}
      >
        <CompactVehicleCard vehicle={bus} />
      </Popup>
    </Marker>
  );
}


// ---------------- Compact Popup Card (for map) ----------------
function CompactVehicleCard({ vehicle }: { vehicle: any }) {
  const isFallback = vehicle.__fallback === true;
  const isStanding = vehicle.movementState?.toLowerCase() === "standing";
  
  const statusColor = isFallback
    ? "bg-gray-500"
    : isStanding
    ? "bg-blue-500"
    : "bg-green-500";

  const statusText = isFallback
    ? "No GPS"
    : isStanding
    ? "Standing"
    : "Moving";

  return (
    <div className="w-48 p-2 bg-white rounded-lg shadow-lg border-2">
      <div className={`${statusColor} text-white rounded-t px-2 py-1.5 -m-2 mb-1.5 flex items-center justify-between`}>
        <div className="flex items-center gap-1.5">
          <Bus className="h-3.5 w-3.5" />
          <span className="font-bold text-xs">{vehicle.plateNumber}</span>
        </div>
        <span className="text-[10px] font-semibold">{statusText}</span>
      </div>
      <div className="space-y-1.5 text-[11px]">
        {vehicle.busId && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID:</span>
            <span className="font-medium">{vehicle.busId}</span>
          </div>
        )}
        {vehicle.speed !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Speed:</span>
            <span className="font-medium flex items-center gap-1">
              <Gauge className="h-3 w-3" />
              {vehicle.speed} km/h
            </span>
          </div>
        )}
        {vehicle.driver?.name && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Driver:</span>
            <span className="font-medium truncate ml-1 max-w-[100px]">{vehicle.driver.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Vehicle Details Card Component (Full - for side panel) ----------------
function VehicleDetailsCard({ vehicle }: { vehicle: any }) {
  const isFallback = vehicle.__fallback === true;
  const isStanding = vehicle.movementState?.toLowerCase() === "standing";
  
  const statusColor = isFallback
    ? "bg-gray-500"
    : isStanding
    ? "bg-blue-500"
    : "bg-green-500";

  const statusText = isFallback
    ? "No GPS Signal"
    : isStanding
    ? "Standing"
    : "Moving";

  return (
    <Card className="w-full max-w-md border-2 shadow-lg">
      <CardHeader className={`${statusColor} text-white rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Bus className="h-6 w-6" />
            {vehicle.plateNumber}
          </CardTitle>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm`}>
            {statusText}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Registration Details */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg border-b pb-2">Registration Details</h3>
          
          {vehicle.busId && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bus ID</p>
                <p className="font-medium">{vehicle.busId}</p>
              </div>
            </div>
          )}

          {vehicle.plateNumber && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Navigation className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Plate Number</p>
                <p className="font-medium text-lg">{vehicle.plateNumber}</p>
              </div>
            </div>
          )}

          {vehicle.bus?.name && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bus Name</p>
                <p className="font-medium">{vehicle.bus.name}</p>
              </div>
            </div>
          )}

          {vehicle.bus?.route && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Route</p>
                <p className="font-medium">{vehicle.bus.route}</p>
              </div>
            </div>
          )}
        </div>

        {/* Location Information */}
        <div className="space-y-3 pt-3 border-t">
          <h3 className="font-semibold text-lg border-b pb-2">Location Information</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Latitude</p>
              <p className="font-medium">{vehicle.lat?.toFixed(6) || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Longitude</p>
              <p className="font-medium">{vehicle.lng?.toFixed(6) || "N/A"}</p>
            </div>
          </div>

          {vehicle.speed !== undefined && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Gauge className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Speed</p>
                <p className="font-medium">{vehicle.speed} km/h</p>
              </div>
            </div>
          )}

          {vehicle.direction !== undefined && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Navigation className="h-4 w-4 text-primary" style={{ transform: `rotate(${vehicle.direction}deg)` }} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Direction</p>
                <p className="font-medium">{vehicle.direction}°</p>
              </div>
            </div>
          )}
        </div>

        {/* Personnel Information */}
        <div className="space-y-3 pt-3 border-t">
          <h3 className="font-semibold text-lg border-b pb-2">Personnel</h3>
          
          {vehicle.driver?.name && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Driver</p>
                <p className="font-medium">{vehicle.driver.name}</p>
                {vehicle.driver.phone && (
                  <p className="text-xs text-muted-foreground">{vehicle.driver.phone}</p>
                )}
              </div>
            </div>
          )}

          {vehicle.assistant?.name && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <UserCog className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Assistant</p>
                <p className="font-medium">{vehicle.assistant.name}</p>
                {vehicle.assistant.phone && (
                  <p className="text-xs text-muted-foreground">{vehicle.assistant.phone}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status Warning */}
        {isFallback && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                GPS signal unavailable. Showing default location.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------- Coordinate Normalizer ----------------
function normalizeCoordinates(v: any) {
  let lat = v.lat !== null ? Number(v.lat) : null;
  let lng = v.lng !== null ? Number(v.lng) : null;
  let fallback = false;

  // Case: Missing GPS
  if (lat === null || lng === null) {
    return { ...v, lat: -1.2921, lng: 36.8219, __fallback: true };
  }

  // Case: Swapped (36.x, -1.x)
  if (lat > 5 && lng < 5) {
    [lat, lng] = [lng, lat];
  }

  // Teltonika case: sends huge numbers sometimes → drop them
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    fallback = true;
    lat = -1.2921;
    lng = 36.8219;
  }

  // Kenya bounds check
  const kenyaLat = lat > -5 && lat < 5;
  const kenyaLng = lng > 34 && lng < 42;

  if (!kenyaLat || !kenyaLng) {
    fallback = true;
    lat = -1.2921;
    lng = 36.8219;
  }

  return {
    ...v,
    lat,
    lng,
    __fallback: fallback,
    direction: Number(v.direction || 0),
    speed: Number(v.speed || 0),
  };
}

// ---------------- Fetch and Fix Bus Coordinates ----------------
async function getBuses() {
  try {
    const token = sessionStorage.getItem("token");

    const response = await axios.get(
      "https://schooltransport-production.up.railway.app/api/tracking/bus-locations",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const buses = response.data?.data || [];
    return buses.map((v: any) => normalizeCoordinates(v));

  } catch (e) {
    console.error("Error fetching buses:", e);
    return [];
  }
}

// ---------------- Main Component ----------------
export default function Tracking() {
  const { data: buses = [], isLoading, refetch } = useQuery({
    queryKey: ["buses"],
    queryFn: getBuses,
    refetchInterval: 5000,
  });

  const [search, setSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  const filteredLocations = useMemo(() => {
    return buses.filter((v: any) =>
      v.plateNumber?.toLowerCase().includes(search.toLowerCase())
    );
  }, [buses, search]);

  // Default center to Nairobi (no auto-selection)
  const center: [number, number] = [-1.2921, 36.8219];

  if (isLoading)
    return <div className="flex items-center justify-center h-[600px]">Loading map...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Live Vehicle Tracking</h2>
          <p className="text-muted-foreground mt-1">Real-time tracking for all vehicles</p>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Last update: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Search plate number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => refetch()}>Refresh</Button>
      </div>

      {/* Map and Details Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map - Takes 2 columns */}
        <div className="lg:col-span-2 bg-card rounded-lg border overflow-hidden h-[600px]">
          <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {filteredLocations.map((bus) => {
              const isSelected = selectedVehicle?.busId === bus.busId;
              return (
                <PersistentMarker
                  key={bus.busId}
                  bus={bus}
                  isSelected={isSelected}
                  onSelect={() => setSelectedVehicle(bus)}
                />
              );
            })}

            <FlyToLocation selectedVehicle={selectedVehicle} />
          </MapContainer>
        </div>

        {/* Vehicle Details Card - Takes 1 column */}
        <div className="lg:col-span-1">
          {selectedVehicle ? (
            <div className="sticky top-6">
              <VehicleDetailsCard vehicle={selectedVehicle} />
            </div>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                <Bus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a vehicle on the map to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Vehicle List - Real-time data from API */}
      <div>
        <h3 className="text-xl font-semibold mb-4">All Vehicles ({filteredLocations.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.map((bus) => (
            <Card
              key={bus.busId}
              className={`cursor-pointer hover:shadow-lg transition-all ${
                selectedVehicle?.busId === bus.busId ? "border-primary border-2 shadow-lg" : ""
              }`}
              onClick={() => setSelectedVehicle(bus)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Bus className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">{bus.plateNumber}</h3>
                    </div>
                    {bus.driver?.name && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <p>{bus.driver.name}</p>
                      </div>
                    )}
                    {bus.bus?.route && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-4 w-4" />
                        <p>{bus.bus.route}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div
                      className={`h-4 w-4 rounded-full ${
                        bus.__fallback
                          ? "bg-gray-500"
                          : bus.movementState?.toLowerCase() === "standing"
                          ? "bg-blue-500"
                          : "bg-green-500"
                      }`}
                    />
                    {bus.speed !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        <Gauge className="h-3 w-3 inline mr-1" />
                        {bus.speed} km/h
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
