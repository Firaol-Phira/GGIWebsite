import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import { useAuth } from "../../context/authocontext";
import "./member.css";

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const COLOR = { approved: "success", pending: "warning", rejected: "danger" };
const sum = (rows) =>
  rows
    .filter((p) => p.status === "approved")
    .reduce((s, p) => s + Number(p.amount), 0);
const label = (s) =>
  s === "approved" ? "Paid" : s === "pending" ? "In review" : "Not paid";

function Timing({ p }) {
  if (p.status === "rejected") return null;
  if (p.on_time === null || p.on_time === undefined) return "-";
  return (
    <span className={`badge text-bg-${p.on_time ? "success" : "danger"}`}>
      {p.on_time ? "On time" : "Late"}
    </span>
  );
}

function History({ title, rows, monthly }) {
  return (
    <div className="card ggi-panel mb-4">
      <div className="card-header py-3">
        <i className="bi bi-receipt me-2" />
        {title}
      </div>
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0 ggi-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Paid on</th>
              <th>Timing</th>
              <th>Status</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length && (
              <tr>
                <td colSpan="7" className="text-center text-muted py-4">
                  No payments yet
                </td>
              </tr>
            )}
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  {monthly
                    ? `${MONTHS[p.period_month - 1]} ${p.period_year}`
                    : `Quarter ${p.period_quarter} (${p.period_year})`}
                </td>
                <td>{Number(p.amount).toLocaleString()}</td>
                <td className="text-uppercase">{p.method}</td>
                <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                <td>
                  <Timing p={p} />
                </td>
                <td>
                  <span
                    className={`badge rounded-pill text-bg-${COLOR[p.status]}`}
                  >
                    {p.status}
                  </span>
                  {p.status === "rejected" && (
                    <div className="small text-danger">{p.reject_reason}</div>
                  )}
                </td>
                <td>
                  {p.receipt_url && (
                    <a
                      href={p.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View receipt"
                    >
                      <i className="bi bi-eye fs-5" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MemberPortal() {
  const { user } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [info, setInfo] = useState(null);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/payments/my-status", { params: { year } }),
      api.get("/payments/mine"),
    ])
      .then(([s, p]) => {
        setInfo(s.data);
        setPayments(p.data.payments);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [year]);

  const monthly = payments.filter((p) => p.payment_type === "monthly");
  const yearly = payments.filter((p) => p.payment_type === "yearly");
  const pending = payments.filter((p) => p.status === "pending").length;
  const months = info?.months || [];
  const quarters = info?.quarters || [];
  const freeMonths = months.filter((m) => !m.status).length;
  const freeQuarters = quarters.filter((q) => !q.status).length;

  return (
    <>
      <h1 className="h3 ggi-page-title mb-0">Member portal</h1>
      <p className="text-muted mb-4">Welcome, {user.full_name}</p>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-4">
        {[
          ["Monthly paid", `${sum(monthly).toLocaleString()} birr`, "success"],
          ["Yearly paid", `${sum(yearly).toLocaleString()} birr`, "success"],
          ["Waiting for review", pending, "warning"],
        ].map(([l, v, c]) => (
          <div className="col-12 col-md-4" key={l}>
            <div className="card ggi-panel h-100">
              <div className="card-body">
                <div className="text-muted small">{l}</div>
                <div className={`h3 fw-bold mb-0 text-${c}`}>{v}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="d-flex align-items-center gap-2 mb-3">
        <h2 className="h5 mb-0">Year {year}</h2>
        <div className="btn-group btn-group-sm">
          <button
            className="btn btn-outline-secondary"
            onClick={() => setYear(year - 1)}
          >
            <i className="bi bi-chevron-left" />
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => setYear(year + 1)}
          >
            <i className="bi bi-chevron-right" />
          </button>
        </div>
      </div>

      {info && !info.configured && (
        <div className="alert alert-warning">
          Amounts for {year} have not been set yet.
        </div>
      )}

      {info?.configured && (
        <div className="row g-4 mb-4">
          {/* Yearly, paid in 4 quarters */}
          <div className="col-12 col-lg-5">
            <div className="card ggi-panel ggi-pay-card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h3 className="h5 fw-bold mb-0">Yearly contribution</h3>
                    <div className="text-muted small">
                      {Number(info.yearly_amount).toLocaleString()} birr, paid
                      25% each quarter (
                      {Number(info.quarter_amount).toLocaleString()} birr)
                    </div>
                  </div>
                  {freeQuarters > 0 && (
                    <Link to="/member/pay-yearly" className="btn ggi-btn-green">
                      Pay quarter
                    </Link>
                  )}
                </div>
                <div className="ggi-month-grid">
                  {quarters.map((q) => (
                    <div
                      key={q.quarter}
                      className={`ggi-month ${q.status || ""}`}
                    >
                      <strong>Quarter {q.quarter}</strong>
                      <small>{label(q.status)}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Monthly */}
          <div className="col-12 col-lg-7">
            <div className="card ggi-panel h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h3 className="h5 fw-bold mb-0">Monthly contribution</h3>
                    <div className="text-muted small">
                      {Number(info.monthly_amount).toLocaleString()} birr per
                      month
                    </div>
                  </div>
                  {freeMonths > 0 && (
                    <Link
                      to="/member/pay-monthly"
                      className="btn ggi-btn-green"
                    >
                      Pay monthly
                    </Link>
                  )}
                </div>
                <div className="ggi-month-grid">
                  {months.map((m) => (
                    <div
                      key={m.month}
                      className={`ggi-month ${m.status || ""}`}
                    >
                      <strong>{MONTHS[m.month - 1]}</strong>
                      <small>{label(m.status)}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <History
        title="Yearly payment history (quarterly installments)"
        rows={yearly}
      />
      <History title="Monthly payment history" rows={monthly} monthly />
    </>
  );
}
