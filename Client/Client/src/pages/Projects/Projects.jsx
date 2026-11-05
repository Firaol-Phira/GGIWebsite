import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import "./Projects.css";

const STATUS = {
  planned: { label: "Planned", cls: "pj-planned" },
  ongoing: { label: "Ongoing", cls: "pj-ongoing" },
  completed: { label: "Completed", cls: "pj-completed" },
};

export default function Projects() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api
      .get("/projects")
      .then(({ data }) => setItems(data.projects))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="projects-page">
      <div className="container py-5">
        <div className="text-center mb-5">
          <span className="ggi-pill">GOAL GATE INSTITUTION</span>
          <h1 className="projects-title mt-3">Our Projects</h1>
          <p className="text-muted mb-0">
            Micro businesses and initiatives we are building together.
          </p>
        </div>

        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border" />
          </div>
        )}
        {error && <div className="alert alert-danger">{error}</div>}
        {!loading && !error && !items.length && (
          <div className="projects-empty text-center py-5">
            <i className="bi bi-briefcase fs-1 text-muted" />
            <h2 className="h5 mt-2">No projects yet</h2>
            <p className="text-muted mb-0">Check back soon.</p>
          </div>
        )}

        <div className="row g-4">
          {items.map((p, i) => (
            <div className="col-12 col-md-6 col-lg-4" key={p.id}>
              <article
                className="project-card"
                style={{ animationDelay: `${Math.min(i, 9) * 70}ms` }}
              >
                <div className="project-img">
                  {p.image_path ? (
                    <img
                      src={`/uploads/projects/${p.image_path}`}
                      alt={p.title}
                      loading="lazy"
                    />
                  ) : (
                    <i className="bi bi-briefcase" />
                  )}
                  <span className={`project-status ${STATUS[p.status].cls}`}>
                    {STATUS[p.status].label}
                  </span>
                </div>
                <div className="project-body">
                  <h2>{p.title}</h2>
                  <p>{p.summary || "Details coming soon."}</p>
                  <button className="project-more" onClick={() => setOpen(p)}>
                    Learn more <i className="bi bi-arrow-right" />
                  </button>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>

      {open && (
        <div
          className="project-modal"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="project-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="project-close"
              onClick={() => setOpen(null)}
              aria-label="Close"
            >
              <i className="bi bi-x-lg" />
            </button>
            {open.image_path && (
              <img
                src={`/uploads/projects/${open.image_path}`}
                alt={open.title}
              />
            )}
            <div className="p-4">
              <span
                className={`project-status static ${STATUS[open.status].cls}`}
              >
                {STATUS[open.status].label}
              </span>
              <h2 className="h4 mt-2">{open.title}</h2>
              <p className="project-desc">{open.description || open.summary}</p>
              <Link
                to="/contact"
                className="btn ggi-btn-navy rounded-pill px-4"
              >
                Ask about this project
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
