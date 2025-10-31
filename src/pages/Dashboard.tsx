import { useQuery } from "@tanstack/react-query";
import {
  getStudents,
  getBuses,
  getManifests,
  getLiveLocations,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Bus, Users, MapPin, ClipboardList } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  // Fetch all data using react-query
  const {
    data: students,
    isLoading: loadingStudents,
    error: errorStudents,
  } = useQuery({
    queryKey: ["students"],
    queryFn: getStudents,
  });

  const {
    data: buses,
    isLoading: loadingBuses,
    error: errorBuses,
  } = useQuery({
    queryKey: ["buses"],
    queryFn: getBuses,
  });

  const {
    data: manifests,
    isLoading: loadingManifests,
    error: errorManifests,
  } = useQuery({
    queryKey: ["manifests"],
    queryFn: getManifests,
  });

  const {
    data: liveData,
    isLoading: loadingTracking,
    error: errorTracking,
  } = useQuery({
    queryKey: ["liveLocations"],
    queryFn: getLiveLocations,
  });

  // Normalize live locations
  const liveLocations = Array.isArray(liveData)
    ? liveData
    : liveData?.data && Array.isArray(liveData.data)
    ? liveData.data
    : [];

  // Show errors as toast
  if (errorStudents || errorBuses || errorManifests || errorTracking) {
    toast.error("Failed to load some dashboard data. Please refresh.");
  }

  const isLoading =
    loadingStudents || loadingBuses || loadingManifests || loadingTracking;

  const totalStudents = Array.isArray(students) ? students.length : 0;
  const totalBuses = Array.isArray(buses) ? buses.length : 0;
  const totalTrips = Array.isArray(manifests) ? manifests.length : 0;
  const totalActiveBuses = liveLocations.filter(
    (loc: any) =>
      loc.status === "ACTIVE" || loc.movementState === "moving"
  ).length;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">
        🚍 SchoolTrack Dashboard
      </h1>
      <p className="text-gray-500">
        Welcome back! Here’s the current overview of your school transport
        operations.
      </p>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Students */}
          <Card className="shadow-md hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Students
              </CardTitle>
              <Users className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalStudents}</div>
              <p className="text-xs text-muted-foreground">
                Enrolled across all buses
              </p>
            </CardContent>
          </Card>

          {/* Buses */}
          <Card className="shadow-md hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Buses
              </CardTitle>
              <Bus className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalBuses}</div>
              <p className="text-xs text-muted-foreground">
                Active in your school fleet
              </p>
            </CardContent>
          </Card>

          {/* Manifests (Trips) */}
          <Card className="shadow-md hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Trips
              </CardTitle>
              <ClipboardList className="w-5 h-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalTrips}</div>
              <p className="text-xs text-muted-foreground">
                Trip manifests recorded
              </p>
            </CardContent>
          </Card>

          {/* Live Tracking */}
          <Card className="shadow-md hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Buses
              </CardTitle>
              <MapPin className="w-5 h-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalActiveBuses}</div>
              <p className="text-xs text-muted-foreground">
                Buses currently on the move
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">
          Recent Trip Activity
        </h2>
        {Array.isArray(manifests) && manifests.length > 0 ? (
          <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-gray-600 border-b">
                <tr>
                  <th className="py-2 px-3">Bus</th>
                  <th className="py-2 px-3">Route</th>
                  <th className="py-2 px-3">Assistant</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {manifests.slice(0, 5).map((trip: any, i: number) => (
                  <tr
                    key={i}
                    className="border-b last:border-0 hover:bg-gray-50 transition"
                  >
                    <td className="py-2 px-3">{trip.bus?.name || "N/A"}</td>
                    <td className="py-2 px-3">{trip.bus?.route || "N/A"}</td>
                    <td className="py-2 px-3">{trip.assistant?.name || "—"}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          trip.status === "CHECKED_OUT"
                            ? "bg-green-100 text-green-700"
                            : trip.status === "CHECKED_IN"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {trip.status || "UNKNOWN"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No recent trips available.</p>
        )}
      </div>
    </div>
  );
}
