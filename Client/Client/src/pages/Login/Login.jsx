import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth, homeFor } from "../../context/authocontext";
import { errorMessage } from "../../services/api";
import PasswordInput from "../../componenets/PasswordInput/passwordInput";
import "./Login.css"
export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const target = (u) =>
    u.must_change_password ? "/change-password" : homeFor(u.role);

  if (user) return <Navigate to={target(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const u = await login(email, password);
      navigate(target(u), { replace: true });
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
            <Link to="/" className="ggi-logo text-decoration-none">
              GGI
            </Link>
            <h1 className="h4 fw-bold mt-2 mb-1">Welcome back</h1>
            <p className="text-muted mb-0">Sign in to the Goal Gate portal</p>
          </div>

          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Email</label>
              <input
                type="email"
                className="form-control form-control-lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <PasswordInput
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <button
              className="btn ggi-btn-navy btn-lg w-100 rounded-pill mt-2"
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="text-center text-muted small mt-4 mb-0">
            Accounts are created by the administrator.
            <br />
            Need access? <Link to="/contact">Contact the GGI team</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
