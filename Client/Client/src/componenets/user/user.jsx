import { useEffect, useMemo, useState } from "react";
import api, { errorMessage } from "../../services/api";
import { useAuth } from "../../context/authocontext";

const ROLES = ["member", "finance", "secretary", "admin"];
const EMPTY = { full_name: "", email: "", phone: "", role: "member" };

const ROLE_COLOR = {
  admin: "danger",
  finance: "success",
  secretary: "primary",
  member: "secondary",
};

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null); // temporary password, shown once
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(data.users);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const setField = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const showPassword = (who, email, password) => {
    setNotice({ who, email, password });
    setCopied(false);
  };

  const createUser = async (e) => {
    e.preventDefault();
    setError("");
    setNotice(null);
    setBusy(true);
    try {
      const { data } = await api.post("/users", form);
      showPassword(
        data.user.full_name,
        data.user.email,
        data.temporary_password,
      );
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (u, role) => {
    setError("");
    try {
      await api.patch(`/users/${u.id}/role`, { role });
    } catch (err) {
      setError(errorMessage(err));
    }
    load(); // reload so the dropdown always shows the real value
  };

  const toggleActive = async (u) => {
    setError("");
    try {
      await api.patch(`/users/${u.id}/status`, { is_active: !u.is_active });
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const resetPassword = async (u) => {
    if (!window.confirm(`Reset the password for ${u.full_name}?`)) return;
    setError("");
    try {
      const { data } = await api.post(`/users/${u.id}/reset-password`);
      showPassword(u.full_name, u.email, data.temporary_password);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(notice.password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, search]);

  return (
    <>
      <h1 className="h3 ggi-page-title mb-4">Users &amp; Roles</h1>

      {error && (
        <div className="alert alert-danger alert-dismissible" role="alert">
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError("")}
          />
        </div>
      )}

      {/* Temporary password (shown once) */}
      {notice && (
        <div className="alert alert-success" role="alert">
          <div className="fw-semibold">
            Temporary password for {notice.who} ({notice.email})
          </div>
          <div className="d-flex flex-wrap align-items-center gap-3 my-2">
            <span className="ggi-temp-pass">{notice.password}</span>
            <button
              className="btn btn-sm btn-outline-success"
              onClick={copyPassword}
            >
              <i
                className={`bi ${copied ? "bi-check2" : "bi-clipboard"} me-1`}
              />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="small mb-2">
            Give this to the person now. It is shown only once, and they must
            change it the first time they sign in.
          </div>
          <button
            className="btn btn-sm btn-success"
            onClick={() => setNotice(null)}
          >
            I have saved it
          </button>
        </div>
      )}

      {/* Create account */}
      <div className="card ggi-panel mb-4">
        <div className="card-header py-3">
          <i className="bi bi-person-plus me-2" />
          Add a person
        </div>
        <div className="card-body">
          <form onSubmit={createUser}>
            <div className="row g-3">
              <div className="col-12 col-md-6 col-xl-3">
                <label className="form-label fw-semibold">Full name</label>
                <input
                  className="form-control"
                  value={form.full_name}
                  onChange={setField("full_name")}
                  required
                />
              </div>
              <div className="col-12 col-md-6 col-xl-3">
                <label className="form-label fw-semibold">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={setField("email")}
                  required
                />
              </div>
              <div className="col-12 col-md-6 col-xl-2">
                <label className="form-label fw-semibold">Phone</label>
                <input
                  className="form-control"
                  value={form.phone}
                  onChange={setField("phone")}
                />
              </div>
              <div className="col-12 col-md-6 col-xl-2">
                <label className="form-label fw-semibold">Role</label>
                <select
                  className="form-select text-capitalize"
                  value={form.role}
                  onChange={setField("role")}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-xl-2 d-flex align-items-end">
                <button className="btn ggi-btn-green w-100" disabled={busy}>
                  {busy ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Creating...
                    </>
                  ) : (
                    "Create account"
                  )}
                </button>
              </div>
            </div>
            <div className="form-text mt-3">
              This also creates the person's member record. A temporary password
              is generated for their first sign in.
            </div>
          </form>
        </div>
      </div>

      {/* Accounts list */}
      <div className="card ggi-panel">
        <div className="card-header py-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <span>
            <i className="bi bi-people me-2" />
            All accounts ({filtered.length})
          </span>
          <input
            className="form-control form-control-sm w-auto"
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 ggi-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    <div className="spinner-border spinner-border-sm me-2" />
                    Loading...
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">
                    No accounts found
                  </td>
                </tr>
              )}

              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="fw-semibold">
                    {u.full_name}
                    {u.id === me.id && (
                      <span className="badge text-bg-light ms-2">You</span>
                    )}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      className={`form-select form-select-sm ggi-role-select text-capitalize border-${ROLE_COLOR[u.role]}`}
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span
                      className={`badge rounded-pill text-bg-${u.is_active ? "success" : "danger"}`}
                    >
                      {u.is_active ? "Active" : "Disabled"}
                    </span>
                    {!!u.must_change_password && (
                      <span className="badge rounded-pill text-bg-warning ms-1">
                        Temp password
                      </span>
                    )}
                  </td>
                  <td className="text-muted small">
                    {u.last_login_at
                      ? new Date(u.last_login_at).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-outline-secondary me-2"
                      onClick={() => resetPassword(u)}
                    >
                      <i className="bi bi-key me-1" />
                      Reset password
                    </button>
                    {u.id !== me.id && (
                      <button
                        className={`btn btn-sm btn-outline-${u.is_active ? "danger" : "success"}`}
                        onClick={() => toggleActive(u)}
                      >
                        {u.is_active ? "Disable" : "Enable"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
