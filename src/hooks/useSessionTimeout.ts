import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const SESSION_MAX_MS = 60 * 60 * 1000; // 1 hour

export function isSessionExpired(): boolean {
  const loginTime = Number(localStorage.getItem("loginTime"));
  // No timestamp at all (e.g. an old session from before this was added)
  // is treated as expired too, rather than trusted indefinitely — forces
  // a clean re-login instead of silently grandfathering old sessions in.
  if (!loginTime || Number.isNaN(loginTime)) return true;
  return Date.now() - loginTime > SESSION_MAX_MS;
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("isAuthenticated");
  localStorage.removeItem("loginTime");
}

/**
 * Proactively logs the user out 1 hour after they logged in, instead of
 * waiting for a request to fail mid-use with a stale-token error (which is
 * what was producing the broken-page/403 errors seen earlier — api.ts's
 * response interceptor is a reactive safety net for that; this is the
 * proactive fix so that path ideally never gets hit in normal use).
 *
 * Mounted once at the ProtectedRoute level so it's active on every
 * authenticated page automatically, without each portal needing its own
 * copy of this logic.
 */
export function useSessionTimeout() {
  const navigate = useNavigate();

  useEffect(() => {
    const check = () => {
      if (localStorage.getItem("isAuthenticated") === "true" && isSessionExpired()) {
        clearSession();
        toast.error("Your session expired after 1 hour. Please log in again.");
        navigate("/", { replace: true });
      }
    };

    check(); // catches "tab was left open / reopened after 1hr+" immediately
    const interval = setInterval(check, 30_000); // catches "sat on this page for 1hr+ without navigating"
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
