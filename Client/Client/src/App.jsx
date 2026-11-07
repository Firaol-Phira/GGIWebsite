import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./Layouts/MainLayouts/MainLayout";
import AuthLayout from "./Layouts/AuthLayouts/AuthLayout";
import DashboardLayout from "./Layouts/dashboard/dashboard";

import Home from "./pages/Home/Home";

import ChangePassword from "./componenets/changepass/changePassword";
import Login from "./pages/Login/Login";
import ProtectedRoute from "./routes/protectedRoute";

import Users from "./componenets/Admin/user/user";
import MemberPortal from "./componenets/memeber/member";
import Contribute from "./componenets/contribute/contribute";
import Finance from "./componenets/Finance/FinanceM/finance";
import About from "./pages/About/About";
import News from "./pages/News/News";
import Announcements from "./componenets/secretary/Announcement/Announcements";
import Contact from "./pages/Contact/Contact";
import Messages from "./componenets/Admin/Messages/Messages";
import Gallery from "./pages/Gallery/Gallery";
import GalleryManager from "./componenets/secretary/Gallery/GalleryManager";
import Projects from "./pages/Projects/Projects";
import ProjectManager from "./componenets/secretary/Project/projectManager";
import StatementMatch from "./componenets/Finance/Statement/StatementMatch";
import Report from "./componenets/Finance/Report/Report";

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
        <Route path="/News" element={<News />} />
        <Route path="/Contact" element={<Contact />} />
        <Route path="/Gallery" element={<Gallery />} />
        <Route path="/Projects" element={<Projects />} />
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
        <Route path="/admin/messages" element={<Messages />} />
        <Route path="/admin/report" element={<Report />} />
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

        <Route
          path="/finance/statement"
          element={<StatementMatch title="Payments" />}
        />
        <Route path="/finance/report" element={<Report title="Payments" />} />
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
          element={<Announcements title="Announcements" />}
        />
        <Route
          path="/secretary/gallery"
          element={<GalleryManager title="Announcements" />}
        />
        <Route
          path="/secretary/projects"
          element={<ProjectManager title="Announcements" />}
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
        <Route
          path="/member/pay-other"
          element={<Contribute key="y" type="other" />}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
