"use client";

import { useState, useRef } from "react";
import { FiCheck, FiAlertCircle, FiPaperclip, FiX } from "react-icons/fi";
import styles from "./ReportProblemTab.module.css";

const ISSUE_TYPES = [
  { id: "bug", label: "Something isn't working" },
  { id: "data", label: "Incorrect information" },
  { id: "access", label: "Can't access a feature" },
  { id: "abuse", label: "Inappropriate content or behavior" },
  { id: "other", label: "Something else" },
];

export default function ReportProblemTab({ user }) {
  const fileRef = useRef(null);
  const [issueType, setIssueType] = useState("bug");
  const [description, setDescription] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const flash = (type, msg) => {
    if (type === "success") { setSuccess(msg); setError(""); }
    else { setError(msg); setSuccess(""); }
    setTimeout(() => { setSuccess(""); setError(""); }, 5000);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setAttachment(file);
    e.target.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      flash("error", "Please describe the problem before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("user_id", user?.user_id || "");
      formData.append("issue_type", issueType);
      formData.append("description", description);
      formData.append("page_url", pageUrl || (typeof window !== "undefined" ? window.location.href : ""));
      if (attachment) formData.append("attachment", attachment);

      const res = await fetch("/api/support/report", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not submit your report.");

      setDescription("");
      setAttachment(null);
      setPageUrl("");
      setIssueType("bug");
      setSubmitted(true);
      setSuccess("");
      setError("");
    } catch (err) {
      flash("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={`${styles.card} ${styles.successCard}`}>
        <div className={styles.successIcon}><FiCheck size={28} /></div>
        <div className={styles.cardTitle}>Report Submitted</div>
        <h3 className={styles.successTitle}>Thank you. Your support report was sent successfully.</h3>
        <p className={styles.successDesc}>
          Our team will review what you shared and use your contact details if we need to follow up.
        </p>
        <div className={styles.successNext}>
          <p>What happens next?</p>
          <ul>
            <li>We will check the details and any attachment you included.</li>
            <li>Critical access or safety issues are prioritized first.</li>
            <li>You can submit another report if you notice a separate issue.</li>
          </ul>
        </div>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => setSubmitted(false)}
        >
          Submit Another Report
        </button>
      </div>
    );
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <div className={styles.cardTitle}>Report a Problem</div>
      <p className={styles.cardDesc}>
        Let us know what went wrong. The more detail you give, the faster we can fix it.
      </p>

      {success && <div className={styles.flashSuccess}><FiCheck size={16} /> {success}</div>}
      {error && <div className={styles.flashError}><FiAlertCircle size={16} /> {error}</div>}

      <div className={styles.field}>
        <label className={styles.fieldLabel}>What kind of problem is this?</label>
        <div className={styles.issueGrid}>
          {ISSUE_TYPES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`${styles.issueChip} ${issueType === id ? styles.issueChipActive : ""}`}
              onClick={() => setIssueType(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>Describe the problem<span className={styles.required}>*</span></label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happened? What did you expect to happen instead?"
          rows={6}
          required
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>Page or screen <span className={styles.badge}>Optional</span></label>
        <input
          type="text"
          value={pageUrl}
          onChange={(e) => setPageUrl(e.target.value)}
          placeholder="e.g. /cases/history or 'Profile page'"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>Attach a screenshot <span className={styles.badge}>Optional</span></label>
        {attachment ? (
          <div className={styles.attachmentRow}>
            <FiPaperclip size={14} />
            <span className={styles.attachmentName}>{attachment.name}</span>
            <button type="button" className={styles.removeBtn} onClick={() => setAttachment(null)}>
              <FiX size={14} />
            </button>
          </div>
        ) : (
          <button type="button" className={styles.attachBtn} onClick={() => fileRef.current?.click()}>
            <FiPaperclip size={14} /> Choose a file
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          hidden
          onChange={handleFileSelect}
        />
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={styles.btnPrimary} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit Report"}
        </button>
      </div>
    </form>
  );
}
