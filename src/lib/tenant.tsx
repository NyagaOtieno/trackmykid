// src/lib/tenant.ts
export function getTenantId() {
  const raw =
    localStorage.getItem("tenantId") ||
    localStorage.getItem("TenantId") ||
    localStorage.getItem("schoolId");

  const n = raw ? Number(raw) : null;
  return Number.isFinite(n) ? n : null;
}

export function setTenantId(id: number | string) {
  localStorage.setItem("tenantId", String(id));
}
