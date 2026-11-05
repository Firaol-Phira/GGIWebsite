import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../../services/api";
import "./Gallery.css";

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null); // index of the photo in the viewer

  useEffect(() => {
    api
      .get("/gallery")
      .then(({ data }) => setItems(data.items))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const move = useCallback(
    (d) =>
      setOpen((i) =>
        i === null ? null : (i + d + items.length) % items.length,
      ),
    [items.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, move]);

  const current = open !== null ? items[open] : null;

  return (
    <div className="gallery-page">
      <div className="container py-5">
        <div className="text-center mb-5">
          <span className="ggi-pill">GOAL GATE INSTITUTION</span>
          <h1 className="gallery-title mt-3">Our Gallery</h1>
          <p className="text-muted mb-0">
            Moments from our meetings, events and activities.
          </p>
        </div>

        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border" />
          </div>
        )}
        {error && <div className="alert alert-danger">{error}</div>}
        {!loading && !error && !items.length && (
          <div className="gallery-empty text-center py-5">
            <i className="bi bi-images fs-1 text-muted" />
            <h2 className="h5 mt-2">No photos yet</h2>
            <p className="text-muted mb-0">Check back soon.</p>
          </div>
        )}

        <div className="gallery-grid">
          {items.map((it, i) => (
            <button
              key={it.id}
              className="gallery-tile"
              onClick={() => setOpen(i)}
              style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}
              aria-label={it.caption || "Open photo"}
            >
              <img
                src={`/uploads/gallery/${it.image_path}`}
                alt={it.caption || "Gallery photo"}
                loading="lazy"
              />
              {it.caption && <span className="gallery-cap">{it.caption}</span>}
            </button>
          ))}
        </div>
      </div>

      {current && (
        <div
          className="gallery-viewer"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            className="gv-btn gv-close"
            onClick={() => setOpen(null)}
            aria-label="Close"
          >
            <i className="bi bi-x-lg" />
          </button>
          {items.length > 1 && (
            <>
              <button
                className="gv-btn gv-prev"
                onClick={(e) => {
                  e.stopPropagation();
                  move(-1);
                }}
                aria-label="Previous"
              >
                <i className="bi bi-chevron-left" />
              </button>
              <button
                className="gv-btn gv-next"
                onClick={(e) => {
                  e.stopPropagation();
                  move(1);
                }}
                aria-label="Next"
              >
                <i className="bi bi-chevron-right" />
              </button>
            </>
          )}
          <figure onClick={(e) => e.stopPropagation()}>
            <img
              src={`/uploads/gallery/${current.image_path}`}
              alt={current.caption || "Gallery photo"}
            />
            <figcaption>
              {current.caption && <div>{current.caption}</div>}
              <small>
                {open + 1} / {items.length}
              </small>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
