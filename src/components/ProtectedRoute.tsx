import { Navigate, Outlet } from 'react-router-dom';
import { useSessionTimeout, isSessionExpired, clearSession } from '@/hooks/useSessionTimeout';

/**
 * Maps a role to its correct "home" route. Used to send a logged-in user
 * back to where THEY belong when they try to access a route meant for a
 * different role, rather than just blocking them - e.g. a PARENT hitting
 * /dashboard directly gets sent back to /parent-portal, not to login.
 * Kept here as the single source of truth so Login.tsx and ProtectedRoute
 * never drift out of sync with each other.
 */
export function getHomeForRole(role?: string): string {
  switch (role) {
    case 'ADMIN':
      return '/dashboard';
    case 'PARENT':
      return '/parent-portal';
    case 'DRIVER':
      return '/driver-portal';
    case 'ASSISTANT':
      return '/assistant-portal';
    default:
      return '/';
  }
}

interface ProtectedRouteProps {
  /**
   * If provided, only these roles may access the wrapped route(s). If the
   * logged-in user's role isn't in this list, they're redirected to their
   * OWN correct home instead of the route they tried to reach.
   *
   * If omitted, falls back to the previous behavior: any authenticated,
   * non-expired session may access the route, regardless of role.
   */
  allowedRoles?: string[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
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

  if (allowedRoles && allowedRoles.length > 0) {
    let role: string | undefined;
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      role = user?.role;
    } catch {
      role = undefined;
    }

    if (!role || !allowedRoles.includes(role)) {
      // Wrong role for this route - send them back to where THEY belong,
      // not to login (they ARE authenticated, just in the wrong place).
      return <Navigate to={getHomeForRole(role)} replace />;
    }
  }

  return <Outlet />;
}
