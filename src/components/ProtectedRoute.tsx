import { Navigate, Outlet } from 'react-router-dom';
import { useSessionTimeout, isSessionExpired, clearSession } from '@/hooks/useSessionTimeout';

export function ProtectedRoute() {
  // Called unconditionally (rules of hooks) — it internally re-checks on
  // an interval and redirects on its own; the synchronous check below
  // additionally catches the very first render, before that effect has
  // had a chance to run, so there's no one-frame flash of protected
  // content for an already-expired session.
  useSessionTimeout();

  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  if (isAuthenticated && isSessionExpired()) {
    clearSession();
    return <Navigate to="/" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
