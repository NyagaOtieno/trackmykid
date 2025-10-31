import axios from "axios";

// ✅ Create Axios instance using .env value or fallback
const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL?.trim() ||
    "https://schooltransport-production.up.railway.app/api",
  headers: {
    "Content-Type": "application/json",
  },
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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
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
export const getStudents = () => api.get("/students").then((res) => res.data);
export const getBuses = () => api.get("/buses").then((res) => res.data);
export const getManifests = () => api.get("/manifests").then((res) => res.data);

// ✅ Tracking Routes
export const getLiveLocations = () =>
  api.get("/tracking/live-locations").then((res) => res.data);
export const syncTracking = () =>
  api.get("/tracking/sync").then((res) => res.data);
export const getBusLocations = () =>
  api.get("/tracking/bus-locations").then((res) => res.data);

// ✅ User Role Routes
export const getAssistants = () =>
  api.get("/users?role=ASSISTANT").then((res) => res.data);
export const getParents = () =>
  api.get("/users?role=PARENT").then((res) => res.data);
export const getDrivers = () =>
  api.get("/users?role=DRIVER").then((res) => res.data);
export const getAdmins = () =>
  api.get("/users?role=ADMIN").then((res) => res.data);
export const getSchools = () => api.get("/schools").then((res) => res.data);

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
