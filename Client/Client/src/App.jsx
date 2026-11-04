import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./Layouts/MainLayouts/MainLayout";
import AuthLayout from "./Layouts/AuthLayouts/AuthLayout";
import DashboardLayout from "./Layouts/dashboard/dashboard";

import Home from "./pages/Home/Home";

import ChangePassword from "./componenets/changepass/changePassword";
import Login from "./pages/Login/Login";
import ProtectedRoute from "./routes/protectedRoute";

import Users from "./componenets/user/user";
import MemberPortal from "./componenets/memeber/member";
import Contribute from "./componenets/contribute/contribute";
import Finance from "./componenets/Finance/finance";
import About from "./pages/About/About";

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
        <Route path="/About" element={<About />} />
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
        <Route path="/finance" element={<Finance title="Payments" />} />
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
          <ProtectedRoute roles={["member", "admin", "finance", "secretary"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/member" element={<MemberPortal title="My Payments" />} />
        <Route
          path="/member/pay-monthly"
          element={<Contribute key="m" type="monthly" />}
        />
        <Route
          path="/member/pay-yearly"
          element={<Contribute key="y" type="yearly" />}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
