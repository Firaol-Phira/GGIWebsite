import { useState } from "react";
import api, { errorMessage } from "../../../services/api";
import { MONTHS } from "../../memeber/member";

const RESULT = {
  matched: { label: "Matched", color: "success" },
  differs: { label: "Amount differs", color: "warning" },
  missing: { label: "Not in statement", color: "danger" },
  noref: { label: "No reference", color: "secondary" },
};

// Reads CSV text into rows of cells (handles quotes and commas inside quotes)
function parseCsv(text) {
  const rows = [];
  let row = [],
    cell = "",
    q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const guess = (headers, re) => {
  const i = headers.findIndex((h) => re.test(h));
  return i >= 0 ? String(i) : "";
};

const period = (p) =>
  p.payment_type === "monthly"
    ? `${MONTHS[p.period_month - 1]} ${p.period_year}`
    : p.payment_type === "yearly"
      ? `Quarter ${p.period_quarter} (${p.period_year})`
      : p.reason || "Other";

export default function StatementMatch() {
  const [method, setMethod] = useState("cbe");
  const [fileName, setFileName] = useState("");
  const [table, setTable] = useState([]);
  const [headerRow, setHeaderRow] = useState(1);
  const [refCol, setRefCol] = useState("");
  const [amtCol, setAmtCol] = useState("");
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const headers = table[headerRow - 1] || [];
  const data = table.slice(headerRow);

  const chooseHeader = (rows, n) => {
    const h = rows[n - 1] || [];
    setRefCol(guess(h, /ref|transaction|trans.?id|receipt/i));
    setAmtCol(guess(h, /credit|deposit|amount/i));
  };

  const onFile = async (e) => {
    const file = e.target.files[0];
    setResults(null);
    setError("");
    setOk("");
    if (!file) return;
    if (!/\.csv$/i.test(file.name))
      return setError("Please choose a CSV file. In Excel: Save As, then CSV.");
    const rows = parseCsv(await file.text());
    if (rows.length < 2) return setError("The file looks empty");
    setFileName(file.name);
    setTable(rows);
    setHeaderRow(1);
    chooseHeader(rows, 1);
  };

  const body = () => ({
    method,
    rows: data.map((r) => ({
      reference: r[Number(refCol)],
      amount: r[Number(amtCol)],
    })),
  });

  const check = async () => {
    setError("");
    setOk("");
    if (refCol === "" || amtCol === "")
      return setError("Choose the Reference and Amount columns");
    setBusy(true);
    try {
      setResults((await api.post("/payments/match", body())).data.results);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    const n = results.filter((r) => r.result === "matched").length;
    if (!window.confirm(`Approve ${n} matched payment(s)?`)) return;
    setError("");
    setOk("");
    setBusy(true);
    try {
      const { data: d } = await api.post("/payments/approve-matched", body());
      setOk(
        `${d.approved} approved${d.skipped ? `, ${d.skipped} skipped (you recorded them yourself)` : ""}`,
      );
      setResults((await api.post("/payments/match", body())).data.results);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const count = (k) => (results || []).filter((r) => r.result === k).length;

  return (
    <>
      {error && <div className="alert alert-danger">{error}</div>}
      {ok && <div className="alert alert-success">{ok}</div>}

      <div className="card ggi-panel mb-3">
        <div className="card-body row g-3 align-items-end">
          <div className="col-6 col-md-3">
            <label className="form-label fw-semibold">Statement of</label>
            <select
              className="form-select"
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setResults(null);
              }}
            >
              <option value="cbe">CBE</option>
              <option value="telebirr">Telebirr</option>
              <option value="other">Other bank</option>
            </select>
          </div>
          <div className="col-12 col-md-5">
            <label className="form-label fw-semibold">
              Statement file (CSV)
            </label>
            <input
              type="file"
              accept=".csv"
              className="form-control"
              onChange={onFile}
            />
          </div>

          {table.length > 0 && (
            <>
              <div className="col-4 col-md-2">
                <label className="form-label fw-semibold">Header row</label>
                <input
                  type="number"
                  min="1"
                  max={Math.min(table.length - 1, 30)}
                  className="form-control"
                  value={headerRow}
                  onChange={(e) => {
                    const n = Math.max(1, Number(e.target.value) || 1);
                    setHeaderRow(n);
                    chooseHeader(table, n);
                    setResults(null);
                  }}
                />
              </div>
              <div className="col-4 col-md-3">
                <label className="form-label fw-semibold">
                  Reference column
                </label>
                <select
                  className="form-select"
                  value={refCol}
                  onChange={(e) => setRefCol(e.target.value)}
                >
                  <option value="">Choose</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-4 col-md-3">
                <label className="form-label fw-semibold">Amount column</label>
                <select
                  className="form-select"
                  value={amtCol}
                  onChange={(e) => setAmtCol(e.target.value)}
                >
                  <option value="">Choose</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <button
                  className="btn ggi-btn-green"
                  onClick={check}
                  disabled={busy}
                >
                  {busy ? "Checking..." : `Check ${data.length} statement rows`}
                </button>
              </div>
              <div className="col-12 small text-muted">
                {fileName}. Use <strong>Header row</strong> if the file has
                title lines above the column names. Use the{" "}
                <em>credit / deposit</em> amount column, since that is money
                received.
              </div>
            </>
          )}
        </div>
      </div>

      {results && (
        <>
          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            {Object.entries(RESULT).map(([k, v]) => (
              <span
                key={k}
                className={`badge rounded-pill text-bg-${v.color} fs-6`}
              >
                {v.label}: {count(k)}
              </span>
            ))}
            <button
              className="btn btn-success ms-auto"
              disabled={busy || !count("matched")}
              onClick={approve}
            >
              <i className="bi bi-check2-all me-1" />
              Approve {count("matched")} matched
            </button>
          </div>

          <div className="card ggi-panel">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 ggi-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>For</th>
                    <th>Reported amount</th>
                    <th>Reference</th>
                    <th>Statement amount</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {!results.length && (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-4">
                        No pending {method.toUpperCase()} payments
                      </td>
                    </tr>
                  )}
                  {results.map((r) => (
                    <tr key={r.id}>
                      <td className="fw-semibold">{r.member_name}</td>
                      <td>{period(r)}</td>
                      <td>{Number(r.amount).toLocaleString()}</td>
                      <td>{r.reference_no || "-"}</td>
                      <td>
                        {r.statement_amount === null
                          ? "-"
                          : Number(r.statement_amount).toLocaleString()}
                      </td>
                      <td>
                        <span
                          className={`badge rounded-pill text-bg-${RESULT[r.result].color}`}
                        >
                          {RESULT[r.result].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="small text-muted mt-2">
            Anything that is not Matched stays pending. Open its receipt link in
            the other tabs and approve or reject it by hand.
          </p>
        </>
      )}
    </>
  );
}
