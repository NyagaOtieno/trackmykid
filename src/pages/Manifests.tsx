import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getManifests } from '@/lib/api';
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

export default function Manifests() {
  const { data: manifests = [], isLoading } = useQuery({
    queryKey: ['manifests'],
    queryFn: getManifests,
  });

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
  }, [search]);

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

        <div className="flex gap-2">
          <Input
            placeholder="Search by student, bus, or assistant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button onClick={downloadByBus}>Download Excel</Button>
        </div>
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
              <TableHead>Status</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading manifests...
                </TableCell>
              </TableRow>
            ) : currentManifests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  No manifests found
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
          Showing {indexOfFirstItem + 1}–
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
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
