import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Bus, School, Users } from "lucide-react";

// ✅ Token-safe API (interceptor attaches Bearer token)
import api from "@/api/axiosConfig";

type Props = {
  onSuccess?: () => void;
  bus?: any; // pass bus for edit mode (optional)
  embedded?: boolean;
};

function pickArray(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function toInt(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export default function AddBusForm({ onSuccess, bus }: Props) {
  const queryClient = useQueryClient();

  const isEdit = !!bus?.id;

  const [form, setForm] = useState({
    name: bus?.name ?? "",
    plateNumber: bus?.plateNumber ?? "",
    route: bus?.route ?? "",
    capacity: bus?.capacity ?? 40,
    tenantId: bus?.tenantId ?? "",
    driverId: bus?.driverId ?? "",
    assistantId: bus?.assistantId ?? "",
  });

  // ✅ Fetch tenants/schools (your buses response uses tenant)
  const tenantsQ = useQuery({
    queryKey: ["tenants-or-schools"],
    queryFn: async () => {
      // backend endpoint you have:
      const res = await api.get("/schools"); // if you actually have /tenants, switch to "/tenants"
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // ✅ Fetch all users
  const usersQ = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/users")).data,
    staleTime: 1000 * 60 * 2,
  });

  // ✅ Fetch all buses
  const busesQ = useQuery({
    queryKey: ["buses"],
    queryFn: async () => (await api.get("/buses")).data,
    staleTime: 1000 * 60 * 2,
  });

  const tenants = useMemo(() => pickArray(tenantsQ.data), [tenantsQ.data]);
  const allUsers = useMemo(() => pickArray(usersQ.data), [usersQ.data]);
  const buses = useMemo(() => pickArray(busesQ.data), [busesQ.data]);

  // If in edit mode and tenantId missing, try infer
  useEffect(() => {
    if (!isEdit) return;
    if (form.tenantId) return;
    if (bus?.tenantId) setForm((p) => ({ ...p, tenantId: String(bus.tenantId) }));
  }, [isEdit, bus?.tenantId, form.tenantId]);

  // ✅ Restrict to current tenantId (recommended)
  const usersForTenant = useMemo(() => {
    const tId = String(form.tenantId || "");
    if (!tId) return allUsers;

    // if users have tenantId in your backend, filter them
    // otherwise keep allUsers
    const anyHasTenant = allUsers.some((u: any) => u?.tenantId != null);
    if (!anyHasTenant) return allUsers;

    return allUsers.filter((u: any) => String(u.tenantId) === tId);
  }, [allUsers, form.tenantId]);

  const busesForTenant = useMemo(() => {
    const tId = String(form.tenantId || "");
    if (!tId) return buses;
    return buses.filter((b: any) => String(b.tenantId) === tId);
  }, [buses, form.tenantId]);

  // ✅ busy lists (exclude current bus when editing)
  const busyDriverIds = useMemo(() => {
    return busesForTenant
      .filter((b: any) => !isEdit || String(b.id) !== String(bus?.id))
      .map((b: any) => String(b.driverId))
      .filter(Boolean);
  }, [busesForTenant, isEdit, bus?.id]);

  const busyAssistantIds = useMemo(() => {
    return busesForTenant
      .filter((b: any) => !isEdit || String(b.id) !== String(bus?.id))
      .map((b: any) => String(b.assistantId))
      .filter(Boolean);
  }, [busesForTenant, isEdit, bus?.id]);

  const availableDrivers = useMemo(() => {
    return usersForTenant.filter(
      (u: any) =>
        String(u?.role || "").toUpperCase() === "DRIVER" &&
        (!busyDriverIds.includes(String(u.id)) || String(u.id) === String(form.driverId))
    );
  }, [usersForTenant, busyDriverIds, form.driverId]);

  const availableAssistants = useMemo(() => {
    return usersForTenant.filter(
      (u: any) =>
        String(u?.role || "").toUpperCase() === "ASSISTANT" &&
        (!busyAssistantIds.includes(String(u.id)) || String(u.id) === String(form.assistantId))
    );
  }, [usersForTenant, busyAssistantIds, form.assistantId]);

  // ✅ Save bus (create or update)
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: form.name.trim(),
        plateNumber: form.plateNumber.trim(),
        route: form.route.trim(),
        capacity: toInt(form.capacity) ?? 40,
        tenantId: toInt(form.tenantId),
        driverId: toInt(form.driverId),
        assistantId: toInt(form.assistantId),
      };

      // basic cleanup
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      if (isEdit) {
        return (await api.put(`/buses/${bus.id}`, payload)).data;
      }
      return (await api.post(`/buses`, payload)).data;
    },
    onSuccess: () => {
      toast.success(isEdit ? "Bus updated successfully!" : "Bus created successfully!");
      queryClient.invalidateQueries({ queryKey: ["buses"] });
      onSuccess?.();
    },
    onError: (e: any) => {
      toast.error(e?.message || e?.detail?.message || "Failed to save bus");
    },
  });

  const isLoading = tenantsQ.isLoading || usersQ.isLoading || busesQ.isLoading;
  const hasError = tenantsQ.isError || usersQ.isError || busesQ.isError;

  const selectStyle =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";

  const canSubmit =
    form.name.trim() &&
    form.plateNumber.trim() &&
    form.tenantId &&
    form.driverId &&
    form.assistantId;

  if (isLoading) {
    return (
      <div className="p-10 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading...
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="p-6 text-sm text-red-600">
        Failed to load required data (tenants/users/buses). Check token/login.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <DialogTitle className="text-xl font-bold flex items-center gap-2">
        <Bus className="h-5 w-5" />
        {isEdit ? "Edit Bus" : "New Bus"}
      </DialogTitle>

      <DialogDescription>
        Fill details exactly as required by the system. Driver + Assistant must be selected.
      </DialogDescription>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            placeholder="Morning Express"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Plate Number</Label>
          <Input
            placeholder="KBM448Y"
            value={form.plateNumber}
            onChange={(e) => setForm((p) => ({ ...p, plateNumber: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Route</Label>
          <Input
            placeholder="Route A - City to School"
            value={form.route}
            onChange={(e) => setForm((p) => ({ ...p, route: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Capacity</Label>
          <Input
            type="number"
            min={1}
            value={form.capacity}
            onChange={(e) => setForm((p) => ({ ...p, capacity: Number(e.target.value || 0) }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          <School className="h-4 w-4" /> School / Tenant
        </Label>
        <select
          className={selectStyle}
          value={form.tenantId}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              tenantId: e.target.value,
              driverId: "",
              assistantId: "",
            }))
          }
        >
          <option value="">-- Choose School/Tenant --</option>
          {tenants.map((t: any) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Tip: select school first to filter drivers/assistants.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <Users className="h-4 w-4" /> Driver
          </Label>
          <select
            className={selectStyle}
            value={form.driverId}
            onChange={(e) => setForm((p) => ({ ...p, driverId: e.target.value }))}
            disabled={!form.tenantId}
          >
            <option value="">{form.tenantId ? "-- Select Driver --" : "← Select School first"}</option>
            {availableDrivers.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.phone ? `(${d.phone})` : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Available: {availableDrivers.length}
          </p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <Users className="h-4 w-4" /> Assistant
          </Label>
          <select
            className={selectStyle}
            value={form.assistantId}
            onChange={(e) => setForm((p) => ({ ...p, assistantId: e.target.value }))}
            disabled={!form.tenantId}
          >
            <option value="">{form.tenantId ? "-- Select Assistant --" : "← Select School first"}</option>
            {availableAssistants.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.name} {a.phone ? `(${a.phone})` : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Available: {availableAssistants.length}
          </p>
        </div>
      </div>

      <Button
        className="w-full mt-2 font-bold"
        onClick={() => saveMutation.mutate()}
        disabled={!canSubmit || saveMutation.isPending}
      >
        {saveMutation.isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </span>
        ) : isEdit ? (
          "Update Bus"
        ) : (
          "Create Bus"
        )}
      </Button>

      <div className="text-[11px] text-muted-foreground italic">
        System check: {tenants.length} school(s) | {availableDrivers.length} driver(s) |{" "}
        {availableAssistants.length} assistant(s)
      </div>
    </div>
  );
}
