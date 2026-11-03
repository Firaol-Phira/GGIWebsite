import { useState } from "react";

export default function PasswordInput({
  label,
  value,
  onChange,
  minLength,
  autoComplete,
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="mb-3">
      <label className="form-label fw-semibold">{label}</label>
      <div className="input-group">
        <input
          type={show ? "text" : "password"}
          className="form-control form-control-lg"
          value={value}
          onChange={onChange}
          minLength={minLength}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => setShow(!show)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          <i className={`bi ${show ? "bi-eye-slash" : "bi-eye"}`} />
        </button>
      </div>
    </div>
  );
}
