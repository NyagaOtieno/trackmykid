export type Role = "ADMIN" | "MERCHANT" | "PARENT" | "DRIVER" | "ASSISTANT";
export type TenantMode = "KID" | "ASSET";

export type User = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: Role;
  tenantId: number;
  schoolId?: number;
};

export const TOKEN_KEY = "authToken";
export const USER_KEY = "user";
export const AUTH_KEY = "isAuthenticated";
export const MODE_KEY = "tenantMode";

export function saveSession(token: string, user?: User) {
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem("token", token); // legacy
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(AUTH_KEY, "true");
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(MODE_KEY);

  localStorage.removeItem("token");
  localStorage.removeItem("jwt");
  localStorage.removeItem("accessToken");
}

export function getToken(): string {
  const t =
    localStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem("token") ||
    "";

  // remove accidental wrapping quotes
  return t.replace(/^"+|"+$/g, "").trim();
}


export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function getSession(): { token: string; user: User } | null {
  const token = getToken();
  const user = getCurrentUser();
  const ok = localStorage.getItem(AUTH_KEY) === "true";
  if (!token || !user || !ok) return null;
  return { token, user };
}

export function isLoggedIn(): boolean {
  return !!getSession();
}

export function logout(redirectTo = "/login") {
  clearSession();
  window.location.href = redirectTo;
}

export function routeByRole(role?: string) {
  switch ((role || "").toUpperCase() as Role) {
    case "ADMIN":
      return "/dashboard";
    case "MERCHANT":
      return "/merchant-dashboard";
    case "PARENT":
      return "/parent-portal";
    case "DRIVER":
      return "/driver-portal";
    case "ASSISTANT":
      return "/assistant-portal";
    default:
      return "/login";
  }
}
