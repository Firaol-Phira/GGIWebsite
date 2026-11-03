import { Navigate, useLocation } from "react-router-dom";
import { useAuth, homeFor } from "../context/authocontext";

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) return <p className="center">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;

  if (user.must_change_password && pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />;
  }
  return children;
}
