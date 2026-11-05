import { useEffect, useState } from "react";
import api, { errorMessage } from "../../services/api";
import "./Message.css";

const TABS = [
  ["new", "New"],
  ["all", "All"],
  ["replied", "Replied"],
];

// Opens the admin's own mail program with the reply already prepared
const quote = (m) =>
  `\n\n--- Your message to Goal Gate Institution (${new Date(m.created_at).toLocaleDateString()}) ---\n${m.message}`;
const mailto = (m) =>
  `mailto:${m.email}?subject=${encodeURIComponent("Re: " + m.subject)}&body=${encodeURIComponent(`Dear ${m.name},\n\nThank you for contacting Goal Gate Institution.\n` + quote(m))}`;
const gmail = (m) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(m.email)}&su=${encodeURIComponent("Re: " + m.subject)}&body=${encodeURIComponent(`Dear ${m.name},\n\nThank you for contacting Goal Gate Institution.\n` + quote(m))}`;

export default function Messages() {
  const [tab, setTab] = useState("new");
  const [rows, setRows] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/contact", { params: { status: tab } });
      setRows(data.messages);
      setUnread(data.unread);
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  useEffect(() => {
    setOpen(null);
    load();
  }, [tab]);

  const toggle = async (m) => {
    const opening = open !== m.id;
    setOpen(opening ? m.id : null);
    if (opening && !m.is_read) {
      try {
        await api.patch(`/contact/${m.id}/read`);
        setRows((r) =>
          r.map((x) => (x.id === m.id ? { ...x, is_read: 1 } : x)),
        );
        setUnread((n) => Math.max(0, n - 1));
      } catch (err) {
        setError(errorMessage(err));
      }
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
  const markReplied = (m) =>
    act(() => api.patch(`/contact/${m.id}/replied`), "Marked as replied");
  const remove = (m) =>
    window.confirm(`Delete the message from ${m.name}?`) &&
    act(() => api.delete(`/contact/${m.id}`), "Deleted");

  return (
    <div className="msg-page">
      <h1 className="h3 ggi-page-title mb-3">
        Contact messages{" "}
        {unread > 0 && (
          <span className="badge rounded-pill text-bg-danger fs-6">
            {unread} new
          </span>
        )}
      </h1>
      {error && <div className="alert alert-danger">{error}</div>}
      {ok && <div className="alert alert-success">{ok}</div>}

      <ul className="nav nav-tabs mb-3">
        {TABS.map(([k, l]) => (
          <li className="nav-item" key={k}>
            <button
              className={`nav-link ${tab === k ? "active" : ""}`}
              onClick={() => setTab(k)}
            >
              {l}
            </button>
          </li>
        ))}
      </ul>

      {!rows.length && (
        <div className="card ggi-panel text-center text-muted py-5">
          {tab === "new" ? "No new messages" : "No messages"}
        </div>
      )}

      {rows.map((m) => (
        <div
          key={m.id}
          className={`card ggi-panel msg-item ${m.is_read ? "" : "unread"}`}
        >
          <div className="msg-head" role="button" onClick={() => toggle(m)}>
            <div className="flex-grow-1">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <strong>{m.name}</strong>
                <span className="badge text-bg-light">
                  {m.user_type || "Visitor"}
                </span>
                {!m.is_read && (
                  <span className="badge text-bg-danger">New</span>
                )}
                {m.replied_at && (
                  <span className="badge text-bg-success">Replied</span>
                )}
              </div>
              <div className="msg-subject">{m.subject}</div>
            </div>
            <small className="text-muted text-nowrap">
              {new Date(m.created_at).toLocaleString()}
            </small>
          </div>

          {open === m.id && (
            <div className="msg-body">
              <div className="small text-muted mb-2">
                From <strong>{m.name}</strong> &lt;{m.email}&gt;
              </div>
              <p className="msg-text">{m.message}</p>

              <div className="d-flex flex-wrap gap-2">
                <a className="btn ggi-btn-green" href={mailto(m)}>
                  <i className="bi bi-reply-fill me-1" />
                  Reply by email
                </a>
                <a
                  className="btn btn-outline-secondary"
                  href={gmail(m)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="bi bi-google me-1" />
                  Reply with Gmail
                </a>
                {!m.replied_at && (
                  <button
                    className="btn btn-outline-success"
                    onClick={() => markReplied(m)}
                  >
                    <i className="bi bi-check2-circle me-1" />
                    Mark as replied
                  </button>
                )}
                <button
                  className="btn btn-outline-danger ms-auto"
                  onClick={() => remove(m)}
                >
                  <i className="bi bi-trash me-1" />
                  Delete
                </button>
              </div>
              {m.replied_at && (
                <div className="small text-muted mt-2">
                  Replied by {m.replied_by_name || "admin"} on{" "}
                  {new Date(m.replied_at).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
