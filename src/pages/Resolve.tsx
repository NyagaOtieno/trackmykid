// src/pages/Resolve.tsx
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSession } from "@/lib/auth";

export default function Resolve() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const session = getSession();

    // not logged in
    if (!session?.token) {
      navigate("/login", { replace: true, state: { from: location.pathname } });
      return;
    }

    const role = String(session?.user?.role || session?.role || "").toUpperCase();

    // send to the correct styled area
    if (role === "PARENT") navigate("/parent-portal", { replace: true });
    else if (role === "DRIVER") navigate("/driver-portal", { replace: true });
    else if (role === "ASSISTANT") navigate("/assistant-portal", { replace: true });
    else navigate("/dashboard", { replace: true }); // ADMIN / SYSTEM / MERCHANT
  }, [navigate, location.pathname]);

  // styled fallback while redirecting
  return (
    <div className="min-h-screen bg-background text-foreground grid place-items-center">
      <div className="rounded-xl border bg-card px-5 py-3 text-sm text-muted-foreground shadow-sm">
        Loading...
      </div>
    </div>
  );
}
