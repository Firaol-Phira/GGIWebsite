import { useEffect, useRef, useState } from "react";
import api, { errorMessage } from "../../../services/api";
import "./projectManager.css";

export const STATUS = {
  planned: { label: "Planned", color: "secondary" },
  ongoing: { label: "Ongoing", color: "success" },
  completed: { label: "Completed", color: "primary" },
};
const EMPTY = {
  title: "",
  status: "planned",
  summary: "",
  description: "",
  is_published: false,
};

export default function ProjectManager() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [current, setCurrent] = useState(null); // image of the project being edited
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const input = useRef();

  const load = () =>
    api
      .get("/projects/manage/all")
      .then(({ data }) => setRows(data.projects))
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
    setFile(null);
    setCurrent(null);
    setEditId(null);
    if (input.current) input.current.value = "";
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    setBusy(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append("image", file);
    try {
      if (editId) await api.patch(`/projects/${editId}`, fd);
      else await api.post("/projects", fd);
      setOk(
        editId
          ? "Project updated"
          : "Project saved. Click Publish to show it on the website.",
      );
      reset();
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const edit = async (r) => {
    setError("");
    setOk("");
    try {
      const { data } = await api.get(`/projects/manage/${r.id}`);
      const p = data.project;
      setForm({
        title: p.title,
        status: p.status,
        summary: p.summary || "",
        description: p.description || "",
        is_published: !!p.is_published,
      });
      setCurrent(p.image_path);
      setFile(null);
      setEditId(r.id);
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
  const toggle = (r) =>
    act(
      () =>
        api.patch(
          `/projects/${r.id}/${r.is_published ? "unpublish" : "publish"}`,
        ),
      r.is_published ? "Moved back to draft" : "Published on the website",
    );
  const remove = (r) =>
    window.confirm(`Delete "${r.title}"?`) &&
    act(() => api.delete(`/projects/${r.id}`), "Project deleted");

  return (
    <div className="pm-page">
      <h1 className="h3 ggi-page-title mb-4">Projects</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      {ok && <div className="alert alert-success">{ok}</div>}

      <form className="card ggi-panel mb-4" onSubmit={save}>
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <span>
            <i className="bi bi-briefcase me-2" />
            {editId ? "Edit project" : "New project"}
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
            <label className="form-label fw-semibold">Project name</label>
            <input
              className="form-control"
              maxLength={150}
              value={form.title}
              onChange={set("title")}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Status</label>
            <select
              className="form-select"
              value={form.status}
              onChange={set("status")}
            >
              {Object.entries(STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12">
            <label className="form-label fw-semibold">
              Short summary (shown on the card, max 300 characters)
            </label>
            <input
              className="form-control"
              maxLength={300}
              value={form.summary}
              onChange={set("summary")}
            />
          </div>
          <div className="col-12">
            <label className="form-label fw-semibold">Full description</label>
            <textarea
              className="form-control"
              rows="5"
              value={form.description}
              onChange={set("description")}
            />
          </div>
          <div className="col-md-8">
            <label className="form-label fw-semibold">
              Cover image (JPG, PNG or WebP, max 5 MB)
            </label>
            <input
              ref={input}
              type="file"
              className="form-control"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => setFile(e.target.files[0] || null)}
            />
            {editId && current && !file && (
              <div className="form-text">
                Current image is kept unless you choose a new one.
              </div>
            )}
          </div>
          <div className="col-md-4 d-flex align-items-end">
            <div className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                id="pub"
                checked={form.is_published}
                onChange={set("is_published")}
              />
              <label className="form-check-label fw-semibold" htmlFor="pub">
                Publish on the website
              </label>
            </div>
          </div>
          {(file || current) && (
            <div className="col-12">
              <img
                className="pm-preview"
                alt=""
                src={
                  file
                    ? URL.createObjectURL(file)
                    : `/uploads/projects/${current}`
                }
              />
            </div>
          )}
          <div className="col-12">
            <button className="btn ggi-btn-green" disabled={busy}>
              {busy ? "Saving..." : editId ? "Update project" : "Save project"}
            </button>
          </div>
        </div>
      </form>

      <div className="card ggi-panel">
        <div className="card-header py-3">
          <i className="bi bi-list-task me-2" />
          All projects ({rows.length})
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 ggi-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Project</th>
                <th>Status</th>
                <th>Website</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!rows.length && (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">
                    No projects yet
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.image_path ? (
                      <img
                        className="pm-thumb"
                        alt=""
                        src={`/uploads/projects/${r.image_path}`}
                      />
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="fw-semibold pm-title">
                    {r.title}
                    <div className="small text-muted fw-normal">
                      {r.summary}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge rounded-pill text-bg-${STATUS[r.status].color}`}
                    >
                      {STATUS[r.status].label}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge rounded-pill text-bg-${r.is_published ? "success" : "secondary"}`}
                    >
                      {r.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="text-end text-nowrap">
                    <button
                      className="btn btn-sm btn-outline-success me-1"
                      onClick={() => toggle(r)}
                    >
                      {r.is_published ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-primary me-1"
                      onClick={() => edit(r)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => remove(r)}
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
    </div>
  );
}
