import axios from "axios";

// Backend list endpoints return { success, count, data }. Some legacy ones
// return a raw array. This normalizes either shape to a plain array so
// callers can always safely .filter()/.map() the result.
const unwrap = (res: any) => (Array.isArray(res) ? res : res?.data || []);

// ✅ Create Axios instance using .env value or fallback
const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL?.trim() ||
    "https://tmk-api.joshpitah.co.ke/api",
  headers: {
    "Content-Type": "application/json",
  },
  // Without a timeout, a slow/unresponsive backend leaves any caller's
  // useQuery stuck in isLoading forever (this was the "Tracking page
  // hangs" bug — Tracking.tsx used a raw axios call with no timeout).
  timeout: 15000,
});

// ✅ Automatically attach Bearer token (if available)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Handle expired tokens or unauthorized responses
// This backend's authMiddleware (src/middleware/auth.js) returns 403 —
// not the conventional 401 — for both an expired JWT ({ error: "Token
// expired." }) and an invalid one ({ error: "Invalid token." }), because
// tokens are signed with `expiresIn: "1d"`. Without this, a session that
// outlives 24h just silently breaks every tenant-scoped request (403 on
// students/buses/manifests/users/tracking) with no recovery — the user
// sees a blank/broken page instead of being sent back to log in.
const AUTH_FAILURE_MESSAGES = ["token expired.", "invalid token."];
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const serverMessage = (error.response?.data?.error || error.response?.data?.message || "")
      .toString()
      .toLowerCase();
    const isAuthFailure =
      status === 401 || (status === 403 && AUTH_FAILURE_MESSAGES.some((m) => serverMessage.includes(m)));

    if (isAuthFailure) {
      console.warn("⚠️ Session expired or unauthorized — logging out...");
      localStorage.removeItem("token");
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("user");
      window.location.href = "/"; // redirect to login
    }
    return Promise.reject(error);
  }
);

// ======================
// GET / FETCH Functions
// ======================
export const getStudents = () => api.get("/students").then((res) => unwrap(res.data));

// ✅ Fetch buses with expanded relations (driver, assistant, school)
export const getBusesWithRelations = () =>
  api.get("/buses?includeRelations=true").then((res) => unwrap(res.data));

// ✅ Simple buses list
export const getBuses = () => api.get("/buses").then((res) => unwrap(res.data));

export const getManifests = () => api.get("/manifests").then((res) => unwrap(res.data));

// ✅ Tracking Routes
export const getLiveLocations = () =>
  api.get("/tracking/live-locations").then((res) => unwrap(res.data));
export const syncTracking = () =>
  api.get("/tracking/sync").then((res) => res.data);
export const getBusLocations = () =>
  api.get("/tracking/bus-locations").then((res) => unwrap(res.data));

// ✅ User Role Routes
export const getAssistants = () =>
  api.get("/users?role=ASSISTANT").then((res) => unwrap(res.data));
export const getParents = () =>
  api.get("/users?role=PARENT").then((res) => unwrap(res.data));
export const getDrivers = () =>
  api.get("/users?role=DRIVER").then((res) => unwrap(res.data));
export const getAdmins = () =>
  api.get("/users?role=ADMIN").then((res) => unwrap(res.data));
export const getSchools = () => api.get("/schools").then((res) => unwrap(res.data));

// ======================
// CRUD Functions
// ======================

// ---------- Students ----------
export const createStudent = (data: any) => api.post("/students", data);
export const updateStudent = (id: number, data: any) =>
  api.put(`/students/${id}`, data);
export const deleteStudent = (id: number) => api.delete(`/students/${id}`);

// ---------- Buses ----------
export const createBus = (data: any) => api.post("/buses", data);
export const updateBus = (id: number, data: any) =>
  api.put(`/buses/${id}`, data);
export const deleteBus = (id: number) => api.delete(`/buses/${id}`);

// ✅ Explicit `addBus` function for AddBusForm.tsx
export const addBus = (busData: any) => api.post("/buses", busData).then(res => res.data);

// ---------- Schools ----------
export const createSchool = (data: any) => api.post("/schools", data);
export const updateSchool = (id: number, data: any) =>
  api.put(`/schools/${id}`, data);
export const deleteSchool = (id: number) => api.delete(`/schools/${id}`);

// ---------- Users ----------
export const createUser = (data: any) => api.post("/users", data);
export const updateUser = (id: number, data: any) =>
  api.put(`/users/${id}`, data);
export const deleteUser = (id: number) => api.delete(`/users/${id}`);

// Role-specific helpers
export const createAssistant = (data: any) =>
  createUser({ ...data, role: "ASSISTANT" });
export const createParent = (data: any) =>
  createUser({ ...data, role: "PARENT" });
export const createDriver = (data: any) =>
  createUser({ ...data, role: "DRIVER" });
export const createAdmin = (data: any) =>
  createUser({ ...data, role: "ADMIN" });

// ---------- Manifests ----------
export const createManifest = (data: any) => api.post("/manifests", data);
export const updateManifest = (id: number, data: any) =>
  api.put(`/manifests/${id}`, data);
export const deleteManifest = (id: number) => api.delete(`/manifests/${id}`);

// ======================
// Export default API instance
// ======================
export default api;
