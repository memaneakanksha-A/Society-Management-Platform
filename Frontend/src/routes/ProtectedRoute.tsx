import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/types/auth.types";

export const homeForRole = (role: Role): string => {
  if (role === "superadmin") return "/superadmin";
  if (role === "admin") return "/admin";
  return "/member";
};

export default function ProtectedRoute({ allow }: { allow: Role[] }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to={homeForRole(user.role)} replace />;

  return <Outlet />;
}