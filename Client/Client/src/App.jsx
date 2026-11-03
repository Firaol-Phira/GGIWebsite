import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./Layouts/MainLayouts/MainLayout";
import AuthLayout from "./Layouts/AuthLayouts/AuthLayout";
import DashboardLayout from "./Layouts/dashboard/dashboard";

import Home from "./pages/Home/Home";

import ChangePassword from "./componenets/changepass/changePassword";
import Login from "./pages/Login/Login";
import ProtectedRoute from "./routes/protectedRoute";

import Users from "./componenets/user/user";

const ComingSoon = ({ title }) => (
  <div className="text-center py-5">
    <h1 className="h3 ggi-page-title">{title}</h1>
    <p className="text-muted">This page is coming soon.</p>
  </div>
);

export default function App() {
  return (
    <Routes>
      {/* Public website */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
      </Route>

      {/* Login and change password */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Admin dashboard */}
      <Route
        element={
          <ProtectedRoute roles={["admin"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route path="/admin/users" element={<Users />} />
      </Route>

      {/* Other dashboards (built next) */}
      <Route
        element={
          <ProtectedRoute roles={["finance"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/finance" element={<ComingSoon title="Payments" />} />
      </Route>

      <Route
        element={
          <ProtectedRoute roles={["secretary"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/secretary"
          element={<ComingSoon title="Announcements" />}
        />
      </Route>

      <Route
        element={
          <ProtectedRoute roles={["member"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/member" element={<ComingSoon title="My Payments" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
