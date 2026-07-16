import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Role } from "./AuthContext";

export function ProtectedRoute({ allow }: { allow: Role[] }) {
  const { token, role } = useAuth();

  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }

  if (!allow.includes(role)) {
    return <Navigate to={`/${role}`} replace />;
  }

  return <Outlet />;
}
