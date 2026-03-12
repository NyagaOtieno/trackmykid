import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL?.trim() ||
  "https://schooltransport-production.up.railway.app/api";

function getStoredToken() {
  const candidates = [
    localStorage.getItem("token"),
    sessionStorage.getItem("token"),
    localStorage.getItem("accessToken"),
    sessionStorage.getItem("accessToken"),
  ];

  const raw = candidates.find((value) => value && value !== "null" && value !== "undefined");
  if (!raw) return null;

  let token = raw.trim();

  // remove accidental JSON quotes: "eyJ..."
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }

  // if token was stored as "Bearer xxx", normalize it
  token = token.replace(/^Bearer\s+/i, "").trim();

  // must look like a JWT
  if (token.split(".").length !== 3) {
    console.warn("Invalid token format in storage:", token);
    return null;
  }

  return token;
}

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();

    config.headers = config.headers ?? {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
      console.warn("No valid auth token found for request:", config.url);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401 || status === 403) {
      console.warn("Auth failed:", status, error.response?.data);

      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("user");

      sessionStorage.removeItem("token");
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("isAuthenticated");
      sessionStorage.removeItem("user");

      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

// ======================
// GET / FETCH Functions
// ======================
export const getStudents = () => api.get("/students").then((res) => res.data);
export const getBusesWithRelations = () =>
  api.get("/buses?includeRelations=true").then((res) => res.data);
export const getBuses = () => api.get("/buses").then((res) => res.data);
export const getManifests = () => api.get("/manifests").then((res) => res.data);

export const getLiveLocations = () =>
  api.get("/tracking/live-locations").then((res) => res.data);
export const syncTracking = () =>
  api.get("/tracking/sync").then((res) => res.data);
export const getBusLocations = () =>
  api.get("/tracking/bus-locations").then((res) => res.data);

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