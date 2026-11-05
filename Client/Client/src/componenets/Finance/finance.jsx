import { useEffect, useState } from "react";
import api, { errorMessage } from "../../services/api";
import { MONTHS } from "../memeber/member";

const COLOR = { approved: "success", pending: "warning", rejected: "danger" };
const TABS = [
  ["monthly", "Monthly payments"],
  ["yearly", "Yearly payments"],
  ["unpaid", "Unpaid"],
  ["amounts", "Amounts & deadlines"],
];
const thisYear = new Date().getFullYear();
const EMPTY = {
  year: thisYear,
  monthly_amount: "",
  yearly_amount: "",
  monthly_due_day: 15,
  q1_due: "",
  q2_due: "",
  q3_due: "",
  q4_due: "",
};

function Timing({ p }) {
  if (p.status === "rejected") return null;
  if (p.on_time === null || p.on_time === undefined) return "-";
  return (
    <span className={`badge text-bg-${p.on_time ? "success" : "danger"}`}>
      {p.on_time ? "On time" : "Late"}
    </span>
  );
}

function Table({ head, empty, emptyText = "No data yet", children }) {
  return (
    <div className="card ggi-panel">
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0 ggi-table">
          <thead>
            <tr>
              {head.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empty && (
              <tr>
                <td
                  colSpan={head.length}
                  className="text-center text-muted py-4"
                >
                  {emptyText}
                </td>
              </tr>
            )}
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Finance() {
  const [tab, setTab] = useState("monthly");
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState([]);
  const [year, setYear] = useState(thisYear);
  const [period, setPeriod] = useState(`m${new Date().getMonth() + 1}`); // m1..m12 or q1..q4
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = async () => {
    setError("");
    try {
      if (tab === "amounts")
        setRows((await api.get("/settings/contributions")).data.settings);
      else if (tab === "unpaid") {
        const key = period[0] === "q" ? "quarter" : "month";
        setRows(
          (
            await api.get("/payments/unpaid", {
              params: { year, [key]: period.slice(1) },
            })
          ).data.members,
        );
      } else {
        setRows(
          (
            await api.get("/payments", {
              params: {
                type: tab,
                status: status === "pending" ? "pending" : undefined,
              },
            })
          ).data.payments,
        );
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  useEffect(() => {
    load();
  }, [tab, status, year, period]);

  const go = (key) => {
    setRows([]);
    setTab(key);
  };

  const review = async (p, action) => {
    const body = {};
    if (action === "reject") {
      const reason = window.prompt("Reason for rejecting?");
      if (!reason) return;
      body.reason = reason;
    }
    setError("");
    setOk("");
    try {
      await api.patch(`/payments/${p.id}/${action}`, body);
      setOk(`Payment ${action === "approve" ? "approved" : "rejected"}`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const saveAmounts = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      await api.put(`/settings/contributions/${form.year}`, form);
      setOk(`Amounts and deadlines for ${form.year} saved`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const quarter = form.yearly_amount
    ? (Number(form.yearly_amount) / 4).toLocaleString()
    : "-";
  const edit = (s) =>
    setForm({
      ...EMPTY,
      ...s,
      q1_due: s.q1_due || "",
      q2_due: s.q2_due || "",
      q3_due: s.q3_due || "",
      q4_due: s.q4_due || "",
    });

  return (
    <>
      <h1 className="h3 ggi-page-title mb-3">Payments</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      {ok && <div className="alert alert-success">{ok}</div>}

      <ul className="nav nav-tabs mb-3">
        {TABS.map(([key, label]) => (
          <li className="nav-item" key={key}>
            <button
              className={`nav-link ${tab === key ? "active" : ""}`}
              onClick={() => go(key)}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>

      {tab === "amounts" && (
        <>
          <form className="card ggi-panel mb-3" onSubmit={saveAmounts}>
            <div className="card-body row g-3 align-items-end">
              <div className="col-6 col-md-2">
                <label className="form-label fw-semibold">Year</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.year}
                  onChange={f("year")}
                  required
                />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label fw-semibold">
                  Monthly amount (birr)
                </label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={form.monthly_amount}
                  onChange={f("monthly_amount")}
                  required
                />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label fw-semibold">
                  Yearly amount (birr)
                </label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={form.yearly_amount}
                  onChange={f("yearly_amount")}
                  required
                />
               
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label fw-semibold">
                  Monthly deadline (day of the month)
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  className="form-control"
                  value={form.monthly_due_day}
                  onChange={f("monthly_due_day")}
                  required
                />
                
              </div>

              {[1, 2, 3, 4].map((q) => (
                <div className="col-6 col-md-3" key={q}>
                  <label className="form-label fw-semibold">
                    Quarter {q} deadline
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={form[`q${q}_due`] || ""}
                    onChange={f(`q${q}_due`)}
                  />
                </div>
              ))}

              <div className="col-12">
                <button className="btn ggi-btn-green">
                  Save amounts &amp; deadlines
                </button>
              </div>
            </div>
          </form>

          <Table
            head={[
              "Year",
              "Monthly",
              "Yearly",
              "Per quarter",
              "Monthly deadline",
              "Q1",
              "Q2",
              "Q3",
              "Q4",
              "",
            ]}
            empty={!rows.length}
          >
            {rows.map((s) => (
              <tr key={s.year}>
                <td>{s.year}</td>
                <td>{Number(s.monthly_amount).toLocaleString()}</td>
                <td>{Number(s.yearly_amount).toLocaleString()}</td>
                <td>{(Number(s.yearly_amount) / 4).toLocaleString()}</td>
                <td>Day {s.monthly_due_day}</td>
                {[1, 2, 3, 4].map((q) => (
                  <td key={q}>{s[`q${q}_due`] || "-"}</td>
                ))}
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => edit(s)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        </>
      )}

      {tab === "unpaid" && (
        <>
          <div className="d-flex gap-2 mb-3">
            <select
              className="form-select w-auto"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <optgroup label="Monthly">
                {MONTHS.map((m, i) => (
                  <option key={m} value={`m${i + 1}`}>
                    {m}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Yearly">
                {[1, 2, 3, 4].map((q) => (
                  <option key={q} value={`q${q}`}>
                    Quarter {q}
                  </option>
                ))}
              </optgroup>
            </select>
            <input
              type="number"
              className="form-control w-auto"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
          <Table
            head={["Member", "Phone"]}
            empty={!rows.length}
            emptyText="Everyone has paid"
          >
            {rows.map((m) => (
              <tr key={m.id}>
                <td>{m.full_name}</td>
                <td>{m.phone || "-"}</td>
              </tr>
            ))}
          </Table>
        </>
      )}

      {(tab === "monthly" || tab === "yearly") && (
        <>
          <div className="btn-group btn-group-sm mb-3">
            {[
              ["pending", "Pending review"],
              ["all", "All"],
            ].map(([k, l]) => (
              <button
                key={k}
                className={`btn btn-outline-secondary ${status === k ? "active" : ""}`}
                onClick={() => setStatus(k)}
              >
                {l}
              </button>
            ))}
          </div>
          <Table
            head={[
              "Member",
              tab === "monthly" ? "Month" : "Quarter",
              "Amount",
              "Method",
              "Deadline",
              "Paid on",
              "Timing",
              "Receipt",
              "Status",
              "",
            ]}
            empty={!rows.length}
            emptyText={
              status === "pending"
                ? "Nothing waiting for review"
                : "No payments yet"
            }
          >
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="fw-semibold">{p.member_name}</td>
                <td>
                  {tab === "monthly"
                    ? `${MONTHS[p.period_month - 1]} ${p.period_year}`
                    : `Quarter ${p.period_quarter} (${p.period_year})`}
                </td>
                <td>{Number(p.amount).toLocaleString()}</td>
                <td className="text-uppercase">{p.method}</td>
                <td>
                  {p.due_date ? new Date(p.due_date).toLocaleDateString() : "-"}
                </td>
                <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                <td>
                  <Timing p={p} />
                </td>
                <td>
                  {p.receipt_url ? (
                    <a
                      href={p.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open receipt"
                    >
                      <i className="bi bi-eye fs-5" />
                    </a>
                  ) : (
                    <span className="text-muted small">None</span>
                  )}
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
                <td className="text-nowrap">
                  {p.status === "pending" && (
                    <>
                      <button
                        className="btn btn-sm btn-success me-1"
                        onClick={() => review(p, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => review(p, "reject")}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        </>
      )}
    </>
  );
}
