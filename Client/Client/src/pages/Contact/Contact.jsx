import { useState } from "react";
import "./Contact.css";
import api, { errorMessage } from "../../services/api";

const EMPTY = {
  fullName: "",
  email: "",
  subject: "",
  userType: "Visitor",
  message: "",
  website: "",
};

function Contact() {
  const [formData, setFormData] = useState(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/contact", formData);
      setSubmitted(true);
      setFormData(EMPTY);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="contact-page">
      <section className="contact-hero text-white text-center py-5">
        <div className="container py-3">
          <span className="contact-subtitle-badge d-inline-block mb-3">
            Get In Touch
          </span>
          <h1 className="display-5 fw-bold text-gold mb-3">Contact GGI</h1>
          <p className="lead text-light opacity-90 mx-auto max-w-700 mb-0">
            Have questions about GGI membership, contribution audits, or
            upcoming assemblies? Send us a message or reach out through our
            official channels.
          </p>
        </div>
      </section>

      <section className="py-5 bg-offwhite">
        <div className="container py-3">
          <div className="row g-4 g-lg-5 align-items-stretch">
            {/* Contact information */}
            <div className="col-lg-5">
              <div className="contact-info-card p-4 p-md-5 rounded-4 shadow-sm h-100 d-flex flex-column justify-content-between">
                <div>
                  <span className="text-uppercase fw-bold text-emerald mb-2 d-block letter-spacing-1 fs-7">
                    Official Communication
                  </span>
                  <h2 className="fw-bold text-navy mb-4 fs-3">
                    Reach Out To Our Leadership Team
                  </h2>
                  <p className="text-muted mb-4 fs-6">
                    Goal Gate Institution operates collaboratively across Burka
                    Sebeta and university student chapters nationwide.
                  </p>

                  <ul className="list-unstyled d-flex flex-column gap-4 mb-4">
                    <li className="d-flex align-items-start gap-3">
                      <div className="info-icon-box rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
                        <i className="bi bi-geo-alt-fill fs-5 text-emerald"></i>
                      </div>
                      <div>
                        <strong className="d-block text-navy">
                          HQ Location
                        </strong>
                        <span className="text-muted fs-6">
                          Shegger, Ethiopia
                        </span>
                      </div>
                    </li>
                    <li className="d-flex align-items-start gap-3">
                      <div className="info-icon-box rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
                        <i className="bi bi-envelope-check-fill fs-5 text-emerald"></i>
                      </div>
                      <div>
                        <strong className="d-block text-navy">
                          Email Support
                        </strong>
                        <span className="text-muted fs-6">
                          info@goalgate.org / audit@goalgate.org
                        </span>
                      </div>
                    </li>
                    <li className="d-flex align-items-start gap-3">
                      <div className="info-icon-box rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
                        <i className="bi bi-clock-history fs-5 text-emerald"></i>
                      </div>
                      <div>
                        <strong className="d-block text-navy">
                          Audit &amp; Committee Hours
                        </strong>
                        <span className="text-muted fs-6">
                          Audit Window: 1st - 5th of every month
                        </span>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="p-3 rounded-3 bg-navy text-white mt-3">
                  <a
                    href="https://t.me/c/2250006026/1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="Telink d-flex align-items-center gap-3"
                  >
                    <i className="bi bi-telegram fs-2 text-gold"></i>
                    <div>
                      <strong className="d-block text-gold">
                        Member Telegram Channel
                      </strong>
                      <span className="text-light opacity-80 fs-7">
                        Real-time updates &amp; Google Meet assembly links
                      </span>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            {/* Message form */}
            <div className="col-lg-7">
              <div className="send-message-card p-4 p-md-5 rounded-4 shadow-sm bg-white h-100 border-0">
                <div className="mb-4">
                  <span className="text-uppercase fw-bold text-gold mb-2 d-block letter-spacing-1 fs-7">
                    Direct Inquiry
                  </span>
                  <h2 className="fw-bold text-navy mb-2 fs-3">
                    Send Us A Message
                  </h2>
                  <p className="text-muted">
                    Fill out the form below and our Executive Committee will
                    reply to your email.
                  </p>
                </div>

                {submitted ? (
                  <div className="alert alert-success-custom p-4 rounded-4 text-center my-4">
                    <i className="bi bi-check-circle-fill fs-1 text-emerald d-block mb-3"></i>
                    <h4 className="fw-bold text-navy">
                      Message Sent Successfully!
                    </h4>
                    <p className="text-muted mb-3">
                      Thank you for contacting Goal Gate Institution. We will
                      reply to the email address you gave us.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="btn btn-emerald-action rounded-pill px-4 py-2 text-white fw-bold"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="d-flex flex-column gap-3"
                  >
                    {error && (
                      <div className="alert alert-danger py-2 mb-0">
                        {error}
                      </div>
                    )}

                    {/* Honeypot: hidden from people, bots fill it in */}
                    <input
                      type="text"
                      name="hp_check"
                      value={formData.hp_check}
                      onChange={handleChange}
                      tabIndex="-1"
                      autoComplete="new-password"
                      aria-hidden="true"
                      style={{ position: "absolute", left: "-9999px" }}
                    />
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold text-navy fs-7 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          className="form-control custom-input py-2 px-3"
                          placeholder="Enter Name"
                          required
                          maxLength={120}
                          value={formData.fullName}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold text-navy fs-7 mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          name="email"
                          className="form-control custom-input py-2 px-3"
                          placeholder="Enter your email address"
                          required
                          maxLength={120}
                          value={formData.email}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold text-navy fs-7 mb-1">
                          I am a...
                        </label>
                        <select
                          name="userType"
                          className="form-select custom-input py-2 px-3"
                          value={formData.userType}
                          onChange={handleChange}
                        >
                          <option value="Visitor">Visitor</option>
                          <option value="Active Member">Member</option>
                          <option value="Committee Member">
                            Executive Committee
                          </option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold text-navy fs-7 mb-1">
                          Subject
                        </label>
                        <input
                          type="text"
                          name="subject"
                          className="form-control custom-input py-2 px-3"
                          placeholder="e.g Contribution Inquiry"
                          required
                          maxLength={200}
                          value={formData.subject}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="form-label fw-semibold text-navy fs-7 mb-1">
                        Your Message
                      </label>
                      <textarea
                        name="message"
                        rows="5"
                        className="form-control custom-input p-3"
                        placeholder="Write your message or inquiry here..."
                        required
                        minLength={5}
                        maxLength={3000}
                        value={formData.message}
                        onChange={handleChange}
                      ></textarea>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={busy}
                        className="btn btn-navy-gold w-100 py-3 rounded-pill fw-bold shadow-sm"
                      >
                        {busy ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-send-fill me-2"></i> Submit
                            Message
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Contact;
