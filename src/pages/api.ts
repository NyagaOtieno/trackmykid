import axios from "axios";

// Backend list endpoints return { success, count, data }. Some legacy ones
// return a raw array. This normalizes either shape to a plain array so
// callers can always safely .filter()/.map() the result.
const unwrap = (res: any) => (Array.isArray(res) ? res : res?.data ?? []);

// ✅ Create Axios instance using .env value or fallback
const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL?.trim() ||
    "https://tmk-api.joshpitah.co.ke/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ✅ Automatically attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Handle expired tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// ======================
// LIVE TRACKING — polls every 5s in Tracking.tsx (admin)
// GET /tracking/live-locations
// Returns latest position per vehicle from LiveLocation table
// ======================
export const getLiveLocations = () =>
  api.get("/tracking/live-locations").then((res) => unwrap(res.data));

// ======================
// BUS LOCATION HISTORY — for playback / history views only
// GET /tracking/bus-locations  (returns BusLocation history rows)
// Do NOT use for live tracking — it returns historical records and
// will make the map jump as old coords get mixed with live coords.
// ======================
export const getBusLocationHistory = () =>
  api.get("/tracking/bus-locations").then((res) => unwrap(res.data));

// Alias kept for backward compat — points to LIVE, not history
export const getBusLocations = getLiveLocations;

// ======================
// PER-STUDENT TRACKING — for ParentPortal
// GET /tracking/student/:studentId
// Returns { tripStatus, location: { lat, lng, speed, ... } | null }
// Only returns location when child is CHECKED_IN (onboard)
// ======================
export const getStudentTracking = (studentId: number | string) =>
  api.get(`/tracking/student/${studentId}`).then((res) => res.data);

// ======================
// OTHER DATA ENDPOINTS
// ======================
export const getStudents = () => api.get("/students").then((res) => unwrap(res.data));
export const getBusesWithRelations = () =>
  api.get("/buses?includeRelations=true").then((res) => unwrap(res.data));
export const getBuses = () => api.get("/buses").then((res) => unwrap(res.data));
export const getManifests = () => api.get("/manifests").then((res) => unwrap(res.data));
export const syncTracking = () => api.get("/tracking/sync").then((res) => res.data);
export const getAssistants = () => api.get("/users?role=ASSISTANT").then((res) => unwrap(res.data));
export const getParents = () => api.get("/users?role=PARENT").then((res) => unwrap(res.data));
export const getDrivers = () => api.get("/users?role=DRIVER").then((res) => unwrap(res.data));
export const getAdmins = () => api.get("/users?role=ADMIN").then((res) => unwrap(res.data));
export const getSchools = () => api.get("/schools").then((res) => unwrap(res.data));

// CRUD
export const createStudent = (data: any) => api.post("/students", data);
export const updateStudent = (id: number, data: any) => api.put(`/students/${id}`, data);
export const deleteStudent = (id: number) => api.delete(`/students/${id}`);
export const createBus = (data: any) => api.post("/buses", data);
export const updateBus = (id: number, data: any) => api.put(`/buses/${id}`, data);
export const deleteBus = (id: number) => api.delete(`/buses/${id}`);
export const addBus = (busData: any) => api.post("/buses", busData).then((res) => res.data);
export const createSchool = (data: any) => api.post("/schools", data);
export const updateSchool = (id: number, data: any) => api.put(`/schools/${id}`, data);
export const deleteSchool = (id: number) => api.delete(`/schools/${id}`);
export const createUser = (data: any) => api.post("/users", data);
export const updateUser = (id: number, data: any) => api.put(`/users/${id}`, data);
export const deleteUser = (id: number) => api.delete(`/users/${id}`);
export const createAssistant = (data: any) => createUser({ ...data, role: "ASSISTANT" });
export const createParent = (data: any) => createUser({ ...data, role: "PARENT" });
export const createDriver = (data: any) => createUser({ ...data, role: "DRIVER" });
export const createAdmin = (data: any) => createUser({ ...data, role: "ADMIN" });
export const createManifest = (data: any) => api.post("/manifests", data);
export const updateManifest = (id: number, data: any) => api.put(`/manifests/${id}`, data);
export const deleteManifest = (id: number) => api.delete(`/manifests/${id}`);

export default api;