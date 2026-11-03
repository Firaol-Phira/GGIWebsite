import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Offcanvas } from "bootstrap";
import { useAuth } from "../../context/authocontext";
import "./Dashboard.css";

const MENU = {
  admin: [{ to: "/admin/users", label: "Users & Roles", icon: "bi-people" }],
  finance: [{ to: "/finance", label: "Payments", icon: "bi-cash-coin" }],
  secretary: [
    { to: "/secretary", label: "Announcements", icon: "bi-megaphone" },
  ],
  member: [{ to: "/member", label: "My Payments", icon: "bi-receipt" }],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Close the mobile menu after choosing a page
  useEffect(() => {
    const el = document.getElementById("dashMenu");
    const instance = el && Offcanvas.getInstance(el);
    if (instance) instance.hide();
  }, [pathname]);

  const signOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="ggi-dash d-lg-flex">
      {/* Sidebar: static on large screens, slide-in menu on small ones */}
      <aside
        className="offcanvas-lg offcanvas-start ggi-sidebar-wrap"
        tabIndex="-1"
        id="dashMenu"
      >
        <div className="ggi-sidebar d-flex flex-column">
          <div className="d-flex align-items-center justify-content-between p-3">
            <NavLink to="/" className="ggi-side-logo text-decoration-none">
              GGI
            </NavLink>
            <button
              type="button"
              className="btn-close btn-close-white d-lg-none"
              data-bs-dismiss="offcanvas"
              data-bs-target="#dashMenu"
              aria-label="Close"
            />
          </div>

          <nav className="nav flex-column px-2 flex-grow-1">
            {(MENU[user.role] || []).map((m) => (
              <NavLink key={m.to} to={m.to} className="ggi-side-link">
                <i className={`bi ${m.icon} me-2`} />
                {m.label}
              </NavLink>
            ))}
            <NavLink to="/change-password" className="ggi-side-link">
              <i className="bi bi-key me-2" />
              Change password
            </NavLink>
          </nav>

          <div className="p-3 border-top border-secondary-subtle">
            <NavLink to="/" className="ggi-side-link">
              <i className="bi bi-house me-2" />
              Public website
            </NavLink>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="ggi-dash-main flex-grow-1">
        <header className="ggi-topbar d-flex align-items-center justify-content-between px-3 px-lg-4 py-3">
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-light d-lg-none"
              type="button"
              data-bs-toggle="offcanvas"
              data-bs-target="#dashMenu"
              aria-controls="dashMenu"
              aria-label="Open menu"
            >
              <i className="bi bi-list fs-5" />
            </button>
            <span className="fw-semibold">Goal Gate Institution</span>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="text-end lh-sm">
              <div className="fw-semibold">{user.full_name}</div>
              <span className="badge ggi-role-badge text-capitalize">
                {user.role}
              </span>
            </div>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={signOut}
            >
              <i className="bi bi-box-arrow-right me-1" />
              Log out
            </button>
          </div>
        </header>

        <main className="p-3 p-lg-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
