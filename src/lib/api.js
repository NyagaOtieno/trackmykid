import axios from "axios";
// ✅ Create Axios instance using .env value or fallback
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL?.trim() ||
        "https://schooltransport-production.up.railway.app/api",
    headers: {
        "Content-Type": "application/json",
    },
});
// ✅ Automatically attach Bearer token (if available)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));
// ✅ Handle expired tokens or unauthorized responses
api.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status === 401) {
        console.warn("⚠️ Session expired or unauthorized — logging out...");
        localStorage.removeItem("token");
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("user");
        window.location.href = "/"; // redirect to login
    }
    return Promise.reject(error);
});
// ======================
// GET / FETCH Functions
// ======================
export const getStudents = () => api.get("/students").then((res) => res.data);
// ✅ Fetch buses with expanded relations (driver, assistant, school)
export const getBusesWithRelations = () => api.get("/buses?includeRelations=true").then((res) => res.data);
// ✅ Simple buses list
export const getBuses = () => api.get("/buses").then((res) => res.data);
export const getManifests = () => api.get("/manifests").then((res) => res.data);
// ✅ Tracking Routes
export const getLiveLocations = () => api.get("/tracking/live-locations").then((res) => res.data);
export const syncTracking = () => api.get("/tracking/sync").then((res) => res.data);
export const getBusLocations = () => api.get("/tracking/bus-locations").then((res) => res.data);
// ✅ User Role Routes
export const getAssistants = () => api.get("/users?role=ASSISTANT").then((res) => res.data);
export const getParents = () => api.get("/users?role=PARENT").then((res) => res.data);
export const getDrivers = () => api.get("/users?role=DRIVER").then((res) => res.data);
export const getAdmins = () => api.get("/users?role=ADMIN").then((res) => res.data);
export const getSchools = () => api.get("/schools").then((res) => res.data);
// ======================
// CRUD Functions
// ======================
// ---------- Students ----------
export const createStudent = (data) => api.post("/students", data);
export const updateStudent = (id, data) => api.put(`/students/${id}`, data);
export const deleteStudent = (id) => api.delete(`/students/${id}`);
// ---------- Buses ----------
export const createBus = (data) => api.post("/buses", data);
export const updateBus = (id, data) => api.put(`/buses/${id}`, data);
export const deleteBus = (id) => api.delete(`/buses/${id}`);
// ✅ Explicit `addBus` function for AddBusForm.tsx
export const addBus = (busData) => api.post("/buses", busData).then(res => res.data);
// ---------- Schools ----------
export const createSchool = (data) => api.post("/schools", data);
export const updateSchool = (id, data) => api.put(`/schools/${id}`, data);
export const deleteSchool = (id) => api.delete(`/schools/${id}`);
// ---------- Users ----------
export const createUser = (data) => api.post("/users", data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
// Role-specific helpers
export const createAssistant = (data) => createUser({ ...data, role: "ASSISTANT" });
export const createParent = (data) => createUser({ ...data, role: "PARENT" });
export const createDriver = (data) => createUser({ ...data, role: "DRIVER" });
export const createAdmin = (data) => createUser({ ...data, role: "ADMIN" });
// ---------- Manifests ----------
export const createManifest = (data) => api.post("/manifests", data);
export const updateManifest = (id, data) => api.put(`/manifests/${id}`, data);
export const deleteManifest = (id) => api.delete(`/manifests/${id}`);
// ======================
// Export default API instance
// ======================
export default api;
