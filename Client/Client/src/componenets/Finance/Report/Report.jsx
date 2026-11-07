import { useEffect, useState } from "react";
import api, { errorMessage } from "../../../services/api";
import { MONTHS } from "../../memeber/member";

const money = (v) =>
  Number(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function Section({ title, icon, children }) {
  return (
    <div className="card ggi-panel mb-4">
      <div className="card-header py-3">
        <i className={`bi ${icon} me-2`} />
        {title}
      </div>
      {children}
    </div>
  );
}

// A list of periods with a total row at the bottom
function Breakdown({ label, names, data, totalLabel }) {
  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0 ggi-table">
        <thead>
          <tr>
            <th>{label}</th>
            <th className="text-end">Payments</th>
            <th className="text-end">Collected (birr)</th>
            <th className="text-end">Pending (birr)</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.key} className={r.total ? "" : "text-muted"}>
              <td>{names[r.key - 1]}</td>
              <td className="text-end">{r.count}</td>
              <td className="text-end fw-semibold">{money(r.total)}</td>
              <td className="text-end">{r.pending ? money(r.pending) : "-"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="table-light fw-bold">
            <td>{totalLabel}</td>
            <td className="text-end">{data.count}</td>
            <td className="text-end text-success">{money(data.total)}</td>
            <td className="text-end">
              {data.pending ? money(data.pending) : "-"}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function Report() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    setError("");
    api
      .get("/payments/report", { params: { year } })
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, [year]);

  const s = data?.summary;
  const cards = s && [
    ["1. Monthly total", s.monthly, "primary"],
    ["2. Quarterly total", s.quarterly, "primary"],
    ["3. Other / penalty total", s.other, "primary"],
    [`4. All money paid in ${year}`, s.grand, "success"],
  ];

  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <label className="fw-semibold mb-0">Year</label>
        <input
          type="number"
          className="form-control w-auto"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        />
        <span className="small text-muted ms-2">
          Only approved payments are counted. Pending payments are shown
          separately.
        </span>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {!data && !error && (
        <div className="text-center py-5">
          <div className="spinner-border" />
        </div>
      )}

      {data && (
        <>
          <div className="row g-3 mb-4">
            {cards.map(([label, value, color]) => (
              <div className="col-6 col-lg-3" key={label}>
                <div className="card ggi-panel h-100">
                  <div className="card-body">
                    <div className="text-muted small">{label}</div>
                    <div className={`h4 fw-bold mb-0 text-${color}`}>
                      {money(value)} <small className="fs-6">birr</small>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {s.pending > 0 && (
            <div className="alert alert-warning py-2">
              {money(s.pending)} birr is still waiting for review and is not
              included in the totals.
            </div>
          )}

          <Section title={`1. Monthly payments, ${year}`} icon="bi-calendar3">
            <Breakdown
              label="Month"
              names={MONTHS}
              data={data.monthly}
              totalLabel="Total of all months"
            />
          </Section>

          <Section
            title={`2. Yearly payments by quarter, ${year}`}
            icon="bi-calendar-range"
          >
            <Breakdown
              label="Quarter"
              names={["Quarter 1", "Quarter 2", "Quarter 3", "Quarter 4"]}
              data={data.quarterly}
              totalLabel="Total of all quarters"
            />
          </Section>

          <Section
            title={`3. Other payments / penalties, ${year}`}
            icon="bi-exclamation-diamond"
          >
            <Breakdown
              label="Month paid"
              names={MONTHS}
              data={data.other}
              totalLabel="Total of other payments"
            />
            <div className="card-body border-top">
              <h3 className="h6 fw-bold">Approved payments in detail</h3>
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0 ggi-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Member</th>
                      <th>Reason</th>
                      <th className="text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data.other.items.length && (
                      <tr>
                        <td colSpan="5" className="text-center text-muted py-3">
                          None this year
                        </td>
                      </tr>
                    )}
                    {data.other.items.map((p) => (
                      <tr key={p.id}>
                        <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                        <td>{p.member_name}</td>
                        <td style={{ whiteSpace: "normal", minWidth: 200 }}>
                          {p.reason}
                        </td>
                        
                        <td className="text-end">{money(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>

          <Section title="4. All money paid" icon="bi-bank">
            <div className="table-responsive">
              <table className="table align-middle mb-0 ggi-table">
                <thead>
                  <tr>
                    <th></th>
                    <th className="text-end">{year} (birr)</th>
                    <th className="text-end">All years so far (birr)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Monthly payments</td>
                    <td className="text-end">{money(s.monthly)}</td>
                    <td className="text-end">{money(data.allTime.monthly)}</td>
                  </tr>
                  <tr>
                    <td>Yearly payments (quarters)</td>
                    <td className="text-end">{money(s.quarterly)}</td>
                    <td className="text-end">{money(data.allTime.yearly)}</td>
                  </tr>
                  <tr>
                    <td>Other / penalty</td>
                    <td className="text-end">{money(s.other)}</td>
                    <td className="text-end">{money(data.allTime.other)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="table-light fw-bold fs-5">
                    <td>Grand total</td>
                    <td className="text-end text-success">{money(s.grand)}</td>
                    <td className="text-end text-success">
                      {money(data.allTime.grand)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>
        </>
      )}
    </>
  );
}
