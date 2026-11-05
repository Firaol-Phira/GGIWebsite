import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import { PAY_ACCOUNTS } from "../../config/payAccounts";
import { MONTHS } from "../memeber/member";
import "../memeber/member.css";

const today = () => new Date().toISOString().slice(0, 10);

export default function Contribute({ type }) {
  const yearly = type === "yearly";
  const [year, setYear] = useState(new Date().getFullYear());
  const [info, setInfo] = useState(null);
  const [f, setF] = useState({
    period: "",
    method: "cbe",
    date: today(),
    url: "",
    note: "",
  });
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    setInfo(null);
    setF((x) => ({ ...x, period: "" }));
    api
      .get("/payments/my-status", { params: { year } })
      .then(({ data }) => setInfo(data))
      .catch((err) => setError(errorMessage(err)));
  }, [year, type]);

  const ready = info?.configured;
  const free = !ready
    ? []
    : yearly
      ? (info.quarters || []).filter((q) => !q.status)
      : (info.months || []).filter((m) => !m.status);
  const amount = ready
    ? yearly
      ? info.quarter_amount
      : info.monthly_amount
    : 0;

  // Deadline of the chosen period, and whether the chosen payment date is past it
  const chosen = free.find(
    (x) => String(yearly ? x.quarter : x.month) === String(f.period),
  );
  const due = chosen?.due || null;
  const willBeLate = due && f.date > due;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/payments/submit", {
        payment_type: type,
        period_year: year,
        ...(yearly ? { period_quarter: f.period } : { period_month: f.period }),
        method: f.method,
        payment_date: f.date,
        receipt_url: f.url,
        note: f.note,
      });
      setDone({ ...data, late: willBeLate });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <div className="card ggi-panel text-center p-4 p-md-5">
        <i className="bi bi-hourglass-split display-4 text-warning" />
        <h2 className="h4 mt-3">Payment submitted</h2>
        <p className="text-muted">
          Your payment of{" "}
          <strong>{Number(done.amount).toLocaleString()} birr</strong> is
          waiting for review. It counts as paid only after finance approves it.
        </p>
        {done.late && (
          <p className="text-danger fw-semibold">
            It was paid after the deadline, so it will be marked Late.
          </p>
        )}
        <Link to="/member" className="btn ggi-btn-green">
          Back to member portal
        </Link>
      </div>
    );

  return (
    <>
      <h1 className="h3 ggi-page-title mb-4">
        {yearly
          ? "Pay yearly contribution (quarter)"
          : "Pay monthly contribution"}
      </h1>
      {error && <div className="alert alert-danger">{error}</div>}
      {info && !ready && (
        <div className="alert alert-warning">
          Amounts for {year} have not been set yet.
        </div>
      )}
      {ready && !free.length && (
        <div className="alert alert-warning">
          Every {yearly ? "quarter" : "month"} of {year} is already paid or in
          review.
        </div>
      )}

      {ready && free.length > 0 && (
        <div className="row g-4">
          <div className="col-12 col-lg-5">
            <div className="card ggi-panel ggi-pay-card h-100">
              <div className="card-body">
                <h2 className="h5 fw-bold">Step 1: Send the money</h2>
                <div className="ggi-amount-box my-3">
                  <div className="small">
                    Amount to pay{yearly && " (25% of the yearly amount)"}
                  </div>
                  <div className="value">
                    {Number(amount).toLocaleString()} birr
                  </div>
                </div>
                {!yearly && (
                  <p className="small mb-3">
                    <i className="bi bi-calendar-check me-1" />
                    Deadline: day <strong>{info.monthly_due_day}</strong> of the
                    month you are paying for. After that it is marked Late.
                  </p>
                )}
                {PAY_ACCOUNTS.map((a) => (
                  <div className="ggi-account mb-2" key={a.method}>
                    <div className="fw-semibold">{a.label}</div>
                    <div className="small text-muted">{a.name}</div>
                    <div className="num">{a.number}</div>
                  </div>
                ))}
                <p className="small text-muted mt-3 mb-0">
                  Pay the exact amount, then copy the receipt link you get after
                  the transfer.
                </p>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-7">
            <form className="card ggi-panel" onSubmit={submit}>
              <div className="card-body">
                <h2 className="h5 fw-bold mb-3">Step 2: Report your payment</h2>
                <div className="row g-3">
                  <div className="col-6">
                    <label className="form-label fw-semibold">Year</label>
                    <select
                      className="form-select"
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                    >
                      {[year - 1, year, year + 1]
                        .filter((v, i, a) => a.indexOf(v) === i)
                        .map((y) => (
                          <option key={y}>{y}</option>
                        ))}
                    </select>
                  </div>

                  <div className="col-6">
                    <label className="form-label fw-semibold">
                      {yearly ? "Quarter" : "Month"}
                    </label>
                    <select
                      className="form-select"
                      value={f.period}
                      onChange={set("period")}
                      required
                    >
                      <option value="">Choose</option>
                      {yearly
                        ? free.map((q) => (
                            <option key={q.quarter} value={q.quarter}>
                              Quarter {q.quarter}
                            </option>
                          ))
                        : free.map((m) => (
                            <option key={m.month} value={m.month}>
                              {MONTHS[m.month - 1]}
                            </option>
                          ))}
                    </select>
                  </div>

                  {chosen && (
                    <div className="col-12">
                      <div
                        className={`alert py-2 mb-0 ${willBeLate ? "alert-danger" : "alert-info"}`}
                      >
                        {due ? (
                          <>
                            Deadline:{" "}
                            <strong>
                              {new Date(due).toLocaleDateString()}
                            </strong>
                            .{" "}
                            {willBeLate
                              ? "Your payment date is after it, so it will be marked Late."
                              : "Your payment date is on time."}
                          </>
                        ) : (
                          "Finance has not set a deadline for this quarter yet."
                        )}
                      </div>
                    </div>
                  )}

                  <div className="col-6">
                    <label className="form-label fw-semibold">Paid with</label>
                    <select
                      className="form-select"
                      value={f.method}
                      onChange={set("method")}
                    >
                      {PAY_ACCOUNTS.map((a) => (
                        <option key={a.method} value={a.method}>
                          {a.label}
                        </option>
                      ))}
                      <option value="other">Other bank</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-semibold">Date paid</label>
                    <input
                      type="date"
                      className="form-control"
                      value={f.date}
                      max={today()}
                      onChange={set("date")}
                      required
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold">
                      Receipt link
                    </label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://..."
                      value={f.url}
                      onChange={set("url")}
                      required
                    />
                    <div className="form-text">
                      Paste the link to your receipt. Finance will open it to
                      check your payment.
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold">
                      Note (optional)
                    </label>
                    <input
                      className="form-control"
                      value={f.note}
                      onChange={set("note")}
                    />
                  </div>

                  <div className="col-12 d-flex gap-2">
                    <button className="btn ggi-btn-green" disabled={busy}>
                      {busy ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Submitting...
                        </>
                      ) : (
                        "Submit for review"
                      )}
                    </button>
                    <Link to="/member" className="btn btn-outline-secondary">
                      Cancel
                    </Link>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
