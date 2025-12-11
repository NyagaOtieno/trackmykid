import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import axios from "axios";

// Form Validation Schema
const busSchema = z.object({
  name: z.string().min(1, "Bus name is required"),
  plateNumber: z.string().min(1, "Plate number is required"),
  capacity: z.preprocess(
    (val) => Number(val),
    z.number().min(1, "Capacity is required")
  ),
  route: z.string().optional(),
  driverId: z.string().min(1, "Driver is required"),
  assistantId: z.string().min(1, "Assistant is required"),
  schoolId: z.string().min(1, "School is required"),
});

// API Helpers
const getDrivers = async () => {
  const token = localStorage.getItem("token");
  const res = await axios.get(
    "https://schooltransport-production.up.railway.app/api/users/drivers",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

const getAssistants = async () => {
  const token = localStorage.getItem("token");
  const res = await axios.get(
    "https://schooltransport-production.up.railway.app/api/users/assistants",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

const getSchools = async () => {
  const token = localStorage.getItem("token");
  const res = await axios.get(
    "https://schooltransport-production.up.railway.app/api/schools",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

const addBus = async (bus: any) => {
  const token = localStorage.getItem("token");
  const body = {
    ...bus,
    driverId: Number(bus.driverId),
    assistantId: Number(bus.assistantId),
    schoolId: Number(bus.schoolId),
    capacity: Number(bus.capacity),
  };
  const res = await axios.post(
    "https://schooltransport-production.up.railway.app/api/buses",
    body,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

type AddBusFormProps = {
  onSuccess?: () => void;
  bus?: any; // TODO: wire up edit mode
  embedded?: boolean;
};

export default function AddBusForm({ onSuccess, embedded = false }: AddBusFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!user || !token) navigate("/login");

  const [form, setForm] = useState({
    name: "",
    plateNumber: "",
    capacity: "",
    route: "",
    driverId: "",
    assistantId: "",
    schoolId: user?.schoolId || "",
  });

  const [errors, setErrors] = useState<any>({});

  // Fetch drivers, assistants, schools
  const { data: driversData, isLoading: driversLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: getDrivers,
  });

  const { data: assistantsData, isLoading: assistantsLoading } = useQuery({
    queryKey: ["assistants"],
    queryFn: getAssistants,
  });

  const { data: schoolsData, isLoading: schoolsLoading } = useQuery({
    queryKey: ["schools"],
    queryFn: getSchools,
  });

  // Filter only unassigned users with correct roles and same school
  const drivers =
    driversData?.filter(
      (d: any) =>
        !d.assignedBusId &&
        d.role.toUpperCase() === "DRIVER" &&
        d.schoolId === Number(form.schoolId)
    ) || [];

  const assistants =
    assistantsData?.filter(
      (a: any) =>
        !a.assignedBusId &&
        a.role.toUpperCase() === "ASSISTANT" &&
        a.schoolId === Number(form.schoolId)
    ) || [];

  // Auto-select first available driver/assistant if value not set
  useEffect(() => {
    if (!form.driverId && drivers.length > 0) {
      setForm((prev) => ({ ...prev, driverId: drivers[0].id.toString() }));
    }
    if (!form.assistantId && assistants.length > 0) {
      setForm((prev) => ({ ...prev, assistantId: assistants[0].id.toString() }));
    }
  }, [drivers, assistants]);

  // Mutation to add bus
  const mutation = useMutation({
    mutationFn: addBus,
    onSuccess: () => {
      toast.success("Bus added successfully!");
      queryClient.invalidateQueries(["buses"]);
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/buses");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to add bus");
    },
  });

  const handleSubmit = () => {
    const parsed = busSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: any = {};
      parsed.error.errors.forEach((e) => {
        if (e.path.length > 0) fieldErrors[e.path[0]] = e.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Convert IDs to numbers before sending
    const payload = {
      ...parsed.data,
      driverId: Number(parsed.data.driverId),
      assistantId: Number(parsed.data.assistantId),
      schoolId: Number(parsed.data.schoolId),
      capacity: Number(parsed.data.capacity),
    };

    mutation.mutate(payload);
  };

  const resetForm = () => {
    setForm({
      name: "",
      plateNumber: "",
      capacity: "",
      route: "",
      driverId: drivers[0]?.id.toString() || "",
      assistantId: assistants[0]?.id.toString() || "",
      schoolId: user?.schoolId || "",
    });
    setErrors({});
  };

  if (driversLoading || assistantsLoading || schoolsLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const containerClasses = embedded ? "p-1 sm:p-2" : "min-h-screen bg-muted/30 p-6";
  const cardClasses = embedded ? "shadow-none border-none" : "max-w-xl mx-auto";

  return (
    <div className={containerClasses}>
      <Card className={`${cardClasses} w-full`}>
        <CardHeader className="pb-2">
          <CardTitle>Add New Bus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bus Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Westlands Shuttle"
              />
              {errors.name && <p className="text-red-600 text-sm">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label>Plate Number</Label>
              <Input
                value={form.plateNumber}
                onChange={(e) =>
                  setForm({ ...form, plateNumber: e.target.value })
                }
                placeholder="e.g., KBB456Y"
              />
              {errors.plateNumber && (
                <p className="text-red-600 text-sm">{errors.plateNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                placeholder="e.g., 35"
              />
              {errors.capacity && (
                <p className="text-red-600 text-sm">{errors.capacity}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Route</Label>
              <Input
                value={form.route}
                onChange={(e) => setForm({ ...form, route: e.target.value })}
                placeholder="e.g., Route B"
              />
            </div>

            {/* Driver */}
            <div className="space-y-2">
              <Label>Driver</Label>
              <Select
                value={form.driverId}
                onValueChange={(val) => setForm({ ...form, driverId: val })}
              >
                <SelectTrigger>
                  <SelectValue>
                    {drivers.find((d: any) => d.id.toString() === form.driverId)?.name ||
                      "Select Driver"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {drivers.length > 0 ? (
                    drivers.map((d: any) => (
                      <SelectItem key={d.id} value={d.id.toString()}>
                        {d.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem disabled value="none">
                      No available drivers
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.driverId && <p className="text-red-600 text-sm">{errors.driverId}</p>}
            </div>

            {/* Assistant */}
            <div className="space-y-2">
              <Label>Assistant</Label>
              <Select
                value={form.assistantId}
                onValueChange={(val) => setForm({ ...form, assistantId: val })}
              >
                <SelectTrigger>
                  <SelectValue>
                    {assistants.find((a: any) => a.id.toString() === form.assistantId)?.name ||
                      "Select Assistant"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {assistants.length > 0 ? (
                    assistants.map((a: any) => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem disabled value="none">
                      No available assistants
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.assistantId && (
                <p className="text-red-600 text-sm">{errors.assistantId}</p>
              )}
            </div>

            {/* School */}
            <div className="space-y-2">
              <Label>School</Label>
              <Select
                onValueChange={(val) => setForm({ ...form, schoolId: val })}
                value={form.schoolId}
              >
                <SelectTrigger>
                  <SelectValue>
                    {schoolsData?.find((s: any) => s.id.toString() === form.schoolId)?.name ||
                      "Select School"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {schoolsData?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.schoolId && <p className="text-red-600 text-sm">{errors.schoolId}</p>}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-end pt-2">
            <Button onClick={handleSubmit} disabled={mutation.isLoading} className="sm:min-w-[120px]">
              {mutation.isLoading ? "Saving..." : "Save Bus"}
            </Button>
            <Button variant="secondary" onClick={resetForm} className="sm:min-w-[120px]">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
