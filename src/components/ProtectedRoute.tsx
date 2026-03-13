import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getSession } from "@/lib/auth";

export function ProtectedRoute() {
  const location = useLocation();
  const session = getSession();

  if (!session?.token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
