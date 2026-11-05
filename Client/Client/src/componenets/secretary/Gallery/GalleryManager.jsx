import { useEffect, useRef, useState } from "react";
import api, { errorMessage } from "../../../services/api";
import "./GallerManager.css";

export default function GalleryManager() {
  const [items, setItems] = useState([]);
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const input = useRef();

  const load = () =>
    api
      .get("/gallery")
      .then(({ data }) => setItems(data.items))
      .catch((err) => setError(errorMessage(err)));
  useEffect(() => {
    load();
  }, []);

  const upload = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    if (!files.length) return setError("Choose at least one photo");
    const fd = new FormData();
    files.forEach((f) => fd.append("photos", f));
    fd.append("caption", caption);
    setBusy(true);
    try {
      const { data } = await api.post("/gallery", fd);
      setOk(data.message);
      setFiles([]);
      setCaption("");
      if (input.current) input.current.value = "";
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const editCaption = async (it) => {
    const next = window.prompt("Caption", it.caption || "");
    if (next === null) return;
    setError("");
    setOk("");
    try {
      await api.patch(`/gallery/${it.id}`, { caption: next });
      setOk("Caption updated");
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = async (it) => {
    if (!window.confirm("Delete this photo?")) return;
    setError("");
    setOk("");
    try {
      await api.delete(`/gallery/${it.id}`);
      setOk("Photo deleted");
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="gm-page">
      <h1 className="h3 ggi-page-title mb-4">Gallery</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      {ok && <div className="alert alert-success">{ok}</div>}

      <form className="card ggi-panel mb-4" onSubmit={upload}>
        <div className="card-header py-3">
          <i className="bi bi-cloud-arrow-up me-2" />
          Upload photos
        </div>
        <div className="card-body row g-3">
          <div className="col-md-6">
            <label className="form-label fw-semibold">
              Photos (JPG, PNG or WebP, up to 10, max 5 MB each)
            </label>
            <input
              ref={input}
              type="file"
              className="form-control"
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files))}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">
              Caption (optional, applies to all selected)
            </label>
            <input
              className="form-control"
              maxLength={200}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          {files.length > 0 && (
            <div className="col-12 gm-previews">
              {files.map((f) => (
                <img
                  key={f.name + f.size}
                  src={URL.createObjectURL(f)}
                  alt=""
                />
              ))}
            </div>
          )}

          <div className="col-12">
            <button className="btn ggi-btn-green" disabled={busy}>
              {busy ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Uploading...
                </>
              ) : (
                `Upload${files.length ? ` ${files.length} photo(s)` : ""}`
              )}
            </button>
          </div>
        </div>
      </form>

      <div className="card ggi-panel">
        <div className="card-header py-3">
          <i className="bi bi-images me-2" />
          All photos ({items.length})
        </div>
        <div className="card-body">
          {!items.length && (
            <p className="text-center text-muted mb-0 py-4">No photos yet</p>
          )}
          <div className="gm-grid">
            {items.map((it) => (
              <div className="gm-item" key={it.id}>
                <img
                  src={`/uploads/gallery/${it.image_path}`}
                  alt={it.caption || "Gallery photo"}
                  loading="lazy"
                />
                <div className="gm-caption">
                  {it.caption || <span className="text-muted">No caption</span>}
                </div>
                <div className="gm-actions">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => editCaption(it)}
                  >
                    Caption
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => remove(it)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
