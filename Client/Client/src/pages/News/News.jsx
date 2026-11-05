import { useEffect, useState } from "react";
import api, { errorMessage } from "../../services/api";
import "./News.css";

const CATEGORIES = {
  general: "General news",
  monthly_rate: "Monthly payment rate",
  yearly_rate: "Yearly payment rate",
  committee_meeting: "Committee meeting",
  general_meeting: "General assembly",
};

const badgeClass = (c = "") =>
  c.includes("rate")
    ? "news-badge-green"
    : c.includes("meeting")
      ? "news-badge-navy"
      : "news-badge-grey";

export default function News() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/announcements", { params: { limit: 50 } })
      .then(({ data }) => setItems(data.announcements || []))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="news-page">
      <div className="container py-5">
        <div className="text-center mb-5">
          <span className="ggi-pill">GOAL GATE INSTITUTION</span>
          <h1 className="news-title mt-3">
            News, Payment Rates &amp; Meetings
          </h1>
          <p className="text-muted mb-0">
            Official notices from the committee.
          </p>
        </div>

        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border" />
          </div>
        )}
        {error && <div className="alert alert-danger">{error}</div>}

        {!loading && !error && !items.length && (
          <div className="news-empty text-center py-5">
            <i className="bi bi-newspaper fs-1 text-muted" />
            <h2 className="h5 mt-2">No announcements yet</h2>
            <p className="text-muted mb-0">Check back later.</p>
          </div>
        )}

        <div className="row g-4">
          {items.map((a, i) => (
            <div key={a.id} className="col-12 col-lg-6">
              <article
                className={`news-card ${a.is_pinned ? "pinned" : ""}`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="news-tags">
                  <span className={`news-badge ${badgeClass(a.category)}`}>
                    {CATEGORIES[a.category] || "General news"}
                  </span>
                  {!!a.is_pinned && (
                    <span className="news-badge news-badge-gold">
                      <i className="bi bi-pin-angle-fill me-1" />
                      Pinned
                    </span>
                  )}
                </div>

                <h2 className="news-card-title">{a.title}</h2>
                <p className="news-body">{a.content}</p>

                <div className="news-footer">
                  <small className="text-muted">
                    Posted by{" "}
                    <strong>{a.author || "Executive Committee"}</strong>
                    {a.published_at && (
                      <> on {new Date(a.published_at).toLocaleDateString()}</>
                    )}
                  </small>
                  {a.meeting_link && (
                    <a
                      href={a.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="news-join"
                    >
                      <i className="bi bi-camera-video-fill me-1" />
                      Join meeting
                    </a>
                  )}
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
