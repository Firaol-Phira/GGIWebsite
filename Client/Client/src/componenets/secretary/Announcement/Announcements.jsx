import { useEffect, useState } from "react";
import api, { errorMessage } from "../../../services/api";
import "./Announcements.css"

export const CATEGORIES = {
  general: "General news",
  monthly_rate: "Monthly payment rate",
  yearly_rate: "Yearly payment rate",
  committee_meeting: "Committee meeting",
  general_meeting: "General assembly",
};
const EMPTY = {
  title: "",
  category: "general",
  content: "",
  meeting_link: "",
  is_pinned: false,
};

export default function Announcements() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    api
      .get("/announcements/manage/all")
      .then(({ data }) => setRows(data.announcements))
      .catch((err) => setError(errorMessage(err)));
  useEffect(() => {
    load();
  }, []);

  const set = (k) => (e) =>
    setForm({
      ...form,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    });
  const reset = () => {
    setForm(EMPTY);
    setEditId(null);
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    setBusy(true);
    try {
      if (editId) await api.patch(`/announcements/${editId}`, form);
      else await api.post("/announcements", form);
      setOk(
        editId
          ? "Announcement updated"
          : "Saved as draft. Click Publish to show it on the website.",
      );
      reset();
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const edit = async (a) => {
    setError("");
    setOk("");
    try {
      const { data } = await api.get(`/announcements/manage/${a.id}`);
      const x = data.announcement;
      setForm({
        title: x.title,
        category: x.category,
        content: x.content,
        meeting_link: x.meeting_link || "",
        is_pinned: !!x.is_pinned,
      });
      setEditId(a.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const act = async (fn, msg) => {
    setError("");
    setOk("");
    try {
      await fn();
      setOk(msg);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  const toggle = (a) =>
    act(
      () =>
        api.patch(
          `/announcements/${a.id}/${a.status === "published" ? "unpublish" : "publish"}`,
        ),
      a.status === "published"
        ? "Moved back to draft"
        : "Published on the website",
    );
  const remove = (a) =>
    window.confirm(`Delete "${a.title}"?`) &&
    act(() => api.delete(`/announcements/${a.id}`), "Deleted");

  return (
    <>
      <h1 className="h3 ggi-page-title mb-4">News &amp; Announcements</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      {ok && <div className="alert alert-success">{ok}</div>}

      <form className="card ggi-panel mb-4" onSubmit={save}>
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <span>
            <i className="bi bi-megaphone me-2" />
            {editId ? "Edit announcement" : "New announcement"}
          </span>
          {editId && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={reset}
            >
              Cancel edit
            </button>
          )}
        </div>
        <div className="card-body row g-3">
          <div className="col-md-8">
            <label className="form-label fw-semibold">Title</label>
            <input
              className="form-control"
              value={form.title}
              onChange={set("title")}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Category</label>
            <select
              className="form-select"
              value={form.category}
              onChange={set("category")}
            >
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12">
            <label className="form-label fw-semibold">Details</label>
            <textarea
              className="form-control"
              rows="4"
              value={form.content}
              onChange={set("content")}
              required
            />
          </div>
          <div className="col-md-8">
            <label className="form-label fw-semibold">
              Meeting link (optional)
            </label>
            <input
              type="url"
              className="form-control"
              placeholder="https://meet.google.com/..."
              value={form.meeting_link}
              onChange={set("meeting_link")}
            />
          </div>
          <div className="col-md-4 d-flex align-items-end">
            <div className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                id="pin"
                checked={form.is_pinned}
                onChange={set("is_pinned")}
              />
              <label className="form-check-label fw-semibold" htmlFor="pin">
                Pin to the top
              </label>
            </div>
          </div>
          <div className="col-12">
            <button className="btn ggi-btn-green" disabled={busy}>
              {busy ? "Saving..." : editId ? "Update" : "Save as draft"}
            </button>
          </div>
        </div>
      </form>

      <div className="card ggi-panel">
        <div className="card-header py-3">
          <i className="bi bi-list-task me-2" />
          All announcements ({rows.length})
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 ggi-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Date</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!rows.length && (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">
                    No announcements yet
                  </td>
                </tr>
              )}
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="fw-semibold">
                    {a.title}
                    {!!a.is_pinned && (
                      <span className="badge text-bg-warning ms-2">
                        <i className="bi bi-pin-angle-fill" /> Pinned
                      </span>
                    )}
                  </td>
                  <td>{CATEGORIES[a.category]}</td>
                  <td>
                    <span
                      className={`badge rounded-pill text-bg-${a.status === "published" ? "success" : "secondary"}`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td>{new Date(a.created_at).toLocaleDateString()}</td>
                  <td className="text-end text-nowrap">
                    <button
                      className="btn btn-sm btn-outline-success me-1"
                      onClick={() => toggle(a)}
                    >
                      {a.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-primary me-1"
                      onClick={() => edit(a)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => remove(a)}
                    >
                      Delete
                    </button>
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
