import axios, { AxiosError } from "axios";
import { getToken, clearSession } from "@/lib/auth"; // ✅

const BASE_URL =
  import.meta.env.VITE_API_URL?.trim() ||
  "https://schooltransport-production.up.railway.app/api";

const api = axios.create({
  baseURL: BASE_URL.replace(/\/+$/, ""),
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

api.interceptors.request.use(
  (config) => {
    const token = getToken(); // ✅ always authToken/token
    config.headers = config.headers ?? {};

    if (token) (config.headers as any).Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      // token missing/expired
      clearSession();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);




/* =========================
   Error normalization
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

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(normalizeError(err))
);

/* =========================
   Generic helpers
========================= */
export const apiGet = async <T = any>(path: string) => (await api.get<T>(path)).data;
export const apiPost = async <T = any>(path: string, body?: any) => (await api.post<T>(path, body)).data;
export const apiPut = async <T = any>(path: string, body?: any) => (await api.put<T>(path, body)).data;
export const apiDelete = async <T = any>(path: string) => (await api.delete<T>(path)).data;

/* =========================
   Domain API exports (what your pages import)
   NOTE: baseURL already ends with /api, so DO NOT prefix /api here
========================= */
export const getStudents = () => apiGet("/students");
export const getUsers = () => apiGet("/users");
export const getBuses = () => apiGet("/buses");
export const getManifests = () => apiGet("/manifests");

export const deleteBus = (busId: number | string) => apiDelete(`/buses/${busId}`);
export const deleteUser = (userId: number | string) => apiDelete(`/users/${userId}`);

// If assistants are users with role ASSISTANT:
export const createAssistant = (body: any) =>
  apiPost("/users", { ...body, role: "ASSISTANT" });

// Schools vs tenants: pick the one your backend actually has.
// If you previously used /tenants/me, you might have /tenants not /schools.
export const getSchools = () => apiGet("/schools"); // change to "/tenants" if needed

export default api;
