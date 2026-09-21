import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---------------- API ----------------
// Self-contained fetch (same pattern as ParentPortal.tsx: Bearer token from
// localStorage "token", set by Login.tsx) rather than going through
// getManifests() from @/lib/api — that function's exact return shape
// (raw {success,data} vs already-unwrapped array) wasn't confirmed, and a
// shape mismatch there (component expecting {data:[...]} from something
// that already returns [...] directly) is the most likely explanation for
// "manifest not showing anything": Array.isArray(data?.data) would be
// false either way you get it wrong, silently rendering an empty table
// with no visible error. Fetching directly here removes that uncertainty.
const API_BASE = "https://tmk-api.joshpitah.co.ke/api";
const MANIFESTS_ENDPOINT = `${API_BASE}/manifests`;

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper to reverse geocode lat/lon into readable location
const getLocationName = async (lat: number, lon: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    );
    const data = await res.json();
    return data.display_name || 'Unknown location';
  } catch (error) {
    console.error('Geocoding error:', error);
    return 'Location unavailable';
  }
};

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export default function Manifests() {
  // Date range + session filter — backend (GET /api/manifests) supports
  // ?from=&to=&session=&busId=&status=, capped at 31 days apart ("up to
  // the past month"). Default to the last 31 days, matching the backend's
  // own default when no range is given at all.
  const today = useMemo(() => new Date(), []);
  const oneMonthAgo = useMemo(() => new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), []);

  const [fromDate, setFromDate] = useState(toDateInputValue(oneMonthAgo));
  const [toDate, setToDate] = useState(toDateInputValue(today));
  const [sessionFilter, setSessionFilter] = useState<string>("ALL");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['manifests', fromDate, toDate, sessionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ from: fromDate, to: toDate });
      if (sessionFilter !== "ALL") params.set("session", sessionFilter);

      const res = await fetch(`${MANIFESTS_ENDPOINT}?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to fetch manifests (${res.status})`);
      const json = await res.json();
      // Tolerant of either {success,data:[...]} or a bare [...] response.
      return Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    },
  });

  const manifests = Array.isArray(data) ? data : [];

  const [search, setSearch] = useState('');
  const [locations, setLocations] = useState<{ [key: number]: string }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Fetch readable location names for coordinates (with caching)
  useEffect(() => {
    const fetchLocations = async () => {
      const newLocations: { [key: number]: string } = { ...locations };

      for (const m of manifests) {
        if (m.latitude && m.longitude && !newLocations[m.id]) {
          const locName = await getLocationName(m.latitude, m.longitude);
          newLocations[m.id] = locName;
        }
      }

      setLocations(newLocations);
    };

    if (manifests.length > 0) fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifests]);

  // Filter manifests based on search
  const filteredManifests = useMemo(() => {
    if (!search.trim()) return manifests;
    const term = search.toLowerCase();
    return manifests.filter((m: any) => {
      const studentName = m.student?.name?.toLowerCase() || '';
      const assistantName = m.assistant?.name?.toLowerCase() || '';
      const busPlate = m.bus?.plateNumber?.toLowerCase() || '';
      return (
        studentName.includes(term) ||
        assistantName.includes(term) ||
        busPlate.includes(term)
      );
    });
  }, [search, manifests]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentManifests = filteredManifests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredManifests.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, fromDate, toDate, sessionFilter]);

  // Keep the date range within the backend's 31-day cap — clamp `from`
  // forward if the gap ever exceeds that, rather than letting a request
  // silently get clamped server-side with no visible explanation here.
  const handleFromChange = (value: string) => {
    setFromDate(value);
    const from = new Date(value);
    const to = new Date(toDate);
    if (to.getTime() - from.getTime() > 31 * 24 * 60 * 60 * 1000) {
      setToDate(toDateInputValue(new Date(from.getTime() + 31 * 24 * 60 * 60 * 1000)));
    }
  };
  const handleToChange = (value: string) => {
    setToDate(value);
    const to = new Date(value);
    const from = new Date(fromDate);
    if (to.getTime() - from.getTime() > 31 * 24 * 60 * 60 * 1000) {
      setFromDate(toDateInputValue(new Date(to.getTime() - 31 * 24 * 60 * 60 * 1000)));
    }
  };

  // Download manifests by bus as Excel
  const downloadByBus = () => {
    if (!filteredManifests.length) {
      alert('No manifests available to download.');
      return;
    }

    const grouped = filteredManifests.reduce((acc: any, m: any) => {
      const plate = m.bus?.plateNumber || m.busId || 'Unknown Bus';
      if (!acc[plate]) acc[plate] = [];
      acc[plate].push(m);
      return acc;
    }, {});

    const wb = XLSX.utils.book_new();

    Object.keys(grouped).forEach((bus) => {
      const sheetData = grouped[bus].map((m: any) => ({
        ID: m.id,
        Student: m.student?.name || 'N/A',
        Assistant: m.assistant?.name || 'N/A',
        Bus: m.bus?.plateNumber || m.busId || 'N/A',
        Session: m.session || 'N/A',
        Status: m.status,
        Timestamp: m.date
          ? new Date(m.date).toLocaleString()
          : new Date(m.createdAt).toLocaleString(),
        Latitude: m.latitude,
        Longitude: m.longitude,
        Location: locations[m.id] || 'N/A',
      }));

      const ws = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, bus.slice(0, 31));
    });

    XLSX.writeFile(wb, `Trip_Manifests_By_Bus.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold">Trip Manifests</h2>
          <p className="text-muted-foreground mt-1">
            View all student check-in and check-out records
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search by student, bus, or assistant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button onClick={downloadByBus}>Download Excel</Button>
        </div>
      </div>

      {/* Date range + session filter — "choose manifest from up to past
          one month" */}
      <div className="flex flex-wrap items-end gap-3 bg-card border rounded-lg p-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">From</label>
          <Input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => handleFromChange(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <Input
            type="date"
            value={toDate}
            min={fromDate}
            max={toDateInputValue(today)}
            onChange={(e) => handleToChange(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Session</label>
          <Select value={sessionFilter} onValueChange={setSessionFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All sessions</SelectItem>
              <SelectItem value="MORNING">Morning</SelectItem>
              <SelectItem value="EVENING">Evening</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          Range capped at 31 days.
        </span>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead>Bus Plate</TableHead>
              <TableHead>Assistant Name</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading manifests...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-red-600">
                  Failed to load manifests. Try Refresh, or check that you're still logged in.
                </TableCell>
              </TableRow>
            ) : currentManifests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No manifests found for this date range.
                </TableCell>
              </TableRow>
            ) : (
              currentManifests.map((m: any) => {
                const timestamp = m.date || m.createdAt;
                const formattedDate = timestamp
                  ? new Date(timestamp).toLocaleString()
                  : 'N/A';

                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.id}</TableCell>
                    <TableCell>{m.student?.name || 'N/A'}</TableCell>
                    <TableCell>{m.bus?.plateNumber || m.busId || 'N/A'}</TableCell>
                    <TableCell>{m.assistant?.name || 'N/A'}</TableCell>
                    <TableCell>{m.session || 'N/A'}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          m.status === 'CHECKED_IN'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {m.status}
                      </span>
                    </TableCell>
                    <TableCell>{formattedDate}</TableCell>
                    <TableCell className="text-xs">
                      {m.latitude && m.longitude ? (
                        <div>
                          <p>
                            {m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {locations[m.id] || 'Loading location...'}
                          </p>
                          <a
                            href={`https://www.google.com/maps?q=${m.latitude},${m.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 underline text-xs"
                          >
                            View on Map
                          </a>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4">
        <span className="text-sm text-gray-600">
          Showing {filteredManifests.length === 0 ? 0 : indexOfFirstItem + 1}–
          {Math.min(indexOfLastItem, filteredManifests.length)} of {filteredManifests.length} entries
        </span>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm font-medium">
            Page {currentPage} of {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
