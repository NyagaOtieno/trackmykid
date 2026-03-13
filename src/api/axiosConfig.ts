// src/api/axiosConfig.ts
import axios, { AxiosError } from "axios";
import { getToken, clearSession } from "@/lib/auth";

/* =========================
   Base Axios instance
========================= */
const BASE_URL =
  import.meta.env.VITE_API_URL?.trim() ||
  "https://schooltransport-production.up.railway.app/api";

// Ensure no trailing slash
const baseURL = BASE_URL.replace(/\/+$/, "");

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

/* =========================
   Error type + normalizer
========================= */
export type ApiError = {
  status?: number;
  message: string;
  detail?: any;
  url?: string;
};

function normalizeError(err: unknown): ApiError {
  const e = err as AxiosError<any>;
  return {
    status: e?.response?.status,
    url: (e?.config?.url as string) || undefined,
    message:
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Request failed",
    detail: e?.response?.data,
  };
}

/* =========================
   Request interceptor: Bearer token
========================= */
api.interceptors.request.use(
  (config) => {
    const token = getToken(); // authToken || token
    config.headers = config.headers ?? {};

    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* =========================
   Response interceptor:
   - auto logout on 401
   - normalize error once
========================= */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;

    if (status === 401) {
      clearSession();
      const next = encodeURIComponent(
        window.location.pathname + window.location.search
      );
      window.location.href = `/login?next=${next}`;
    }

    return Promise.reject(normalizeError(err));
  }
);

/* =========================
   Helpers: unwrap backend shapes
   - supports: Array
   - supports: { success, data, count }
========================= */
function unwrap<T = any>(resData: any): T {
  if (Array.isArray(resData)) return resData as T;
  if (resData && typeof resData === "object" && "data" in resData)
    return resData.data as T;
  return resData as T;
}

/* =========================
   Generic helpers
========================= */
export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await api.get(path);
  return unwrap<T>(res.data);
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const res = await api.post(path, body);
  return unwrap<T>(res.data);
}

export async function apiPut<T = any>(path: string, body?: any): Promise<T> {
  const res = await api.put(path, body);
  return unwrap<T>(res.data);
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  const res = await api.delete(path);
  return unwrap<T>(res.data);
}

/* =========================
   Domain API exports
   NOTE: baseURL already ends with /api
========================= */

// --- Students / Manifests / Buses / Users ---
export const getStudents = () => apiGet<any[]>("/students");
export const getManifests = () => apiGet<any[]>("/manifests");

export const getBuses = () => apiGet<any[]>("/buses");
export const createBus = (body: any) => apiPost("/buses", body);
export const updateBus = (id: number | string, body: any) =>
  apiPut(`/buses/${id}`, body);
export const deleteBus = (id: number | string) => apiDelete(`/buses/${id}`);

export const getUsers = () => apiGet<any[]>("/users");
export const updateUser = (id: number | string, body: any) =>
  apiPut(`/users/${id}`, body);
export const deleteUser = (id: number | string) => apiDelete(`/users/${id}`);

// --- Role based helpers (Drivers / Assistants / Parents) ---
export const getDrivers = async () => {
  const users = await getUsers();
  return (users || []).filter(
    (u: any) => String(u.role || "").toUpperCase() === "DRIVER"
  );
};

export const getAssistants = async () => {
  const users = await getUsers();
  return (users || []).filter(
    (u: any) => String(u.role || "").toUpperCase() === "ASSISTANT"
  );
};

export const getParents = async () => {
  const users = await getUsers();
  return (users || []).filter(
    (u: any) => String(u.role || "").toUpperCase() === "PARENT"
  );
};

// --- Create users by role ---
export const createUser = (body: any) => apiPost("/users", body);

export const createDriver = (body: any) => createUser({ ...body, role: "DRIVER" });

export const createAssistant = (body: any) =>
  createUser({ ...body, role: "ASSISTANT" });

export const createParent = (body: any) => createUser({ ...body, role: "PARENT" });

// --- Schools / Tenants ---
export const getSchools = () => apiGet<any[]>("/schools"); // change if backend uses /tenants

export default api;
