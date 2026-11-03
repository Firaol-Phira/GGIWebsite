import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import { useAuth, homeFor } from "../../context/authocontext";
import PasswordInput from "../../componenets/PasswordInput/passwordInput";
import "./ChangePassword.css"
export default function ChangePassword() {
  const { user, passwordChanged, logout } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const forced = user?.must_change_password;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (next !== confirm) return setError("New passwords do not match");
    if (next === current)
      return setError("New password must be different from the current one");

    setBusy(true);
    try {
      await api.patch("/auth/change-password", {
        current_password: current,
        new_password: next,
      });
      passwordChanged();
      navigate(homeFor(user.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ggi-auth d-flex align-items-center justify-content-center px-3">
      <div className="ggi-auth-card card border-0 shadow-lg w-100">
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <span className="ggi-logo">GGI</span>
            <h1 className="h4 fw-bold mt-2 mb-1">Change password</h1>
            {forced ? (
              <p className="text-muted mb-0">
                You are using a temporary password. Please choose your own to
                continue.
              </p>
            ) : (
              <p className="text-muted mb-0">
                Choose a new password for your account.
              </p>
            )}
          </div>

          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={submit}>
            <PasswordInput
              label={forced ? "Temporary password" : "Current password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
            <PasswordInput
              label="New password (min 8 characters)"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              minLength={8}
              autoComplete="new-password"
            />
            <PasswordInput
              label="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              autoComplete="new-password"
            />

            <button
              className="btn ggi-btn-navy btn-lg w-100 rounded-pill mt-2"
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Saving...
                </>
              ) : (
                "Change password"
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            {forced ? (
              <button
                className="btn btn-link text-muted"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                Sign out
              </button>
            ) : (
              <Link to={homeFor(user.role)} className="text-muted">
                Cancel
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
