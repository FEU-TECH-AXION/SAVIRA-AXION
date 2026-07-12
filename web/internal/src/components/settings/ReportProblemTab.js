"use client";

import { useState, useRef } from "react";
import { FiCheck, FiAlertCircle, FiPaperclip, FiX } from "react-icons/fi";
import styles from "./ReportProblemTab.module.css";

const ISSUE_TYPES = [
  { id: "bug", labelKey: "issueBug" },
  { id: "data", labelKey: "issueData" },
  { id: "access", labelKey: "issueAccess" },
  { id: "abuse", labelKey: "issueAbuse" },
  { id: "other", labelKey: "issueOther" },
];

export default function ReportProblemTab({ user, t }) {
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
      flash("error", t("describeProblemRequired"));
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
        <div className={styles.cardTitle}>{t("reportSubmitted")}</div>
        <h3 className={styles.successTitle}>{t("reportSubmittedTitle")}</h3>
        <p className={styles.successDesc}>
          {t("reportSubmittedDesc")}
        </p>
        <div className={styles.successNext}>
          <p>{t("whatHappensNext")}</p>
          <ul>
            <li>{t("reportNext1")}</li>
            <li>{t("reportNext2")}</li>
            <li>{t("reportNext3")}</li>
          </ul>
        </div>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => setSubmitted(false)}
        >
          {t("submitAnotherReport")}
        </button>
      </div>
    );
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <div className={styles.cardTitle}>{t("settingsReportProblem")}</div>
      <p className={styles.cardDesc}>
        {t("reportProblemDesc")}
      </p>

      {success && <div className={styles.flashSuccess}><FiCheck size={16} /> {success}</div>}
      {error && <div className={styles.flashError}><FiAlertCircle size={16} /> {error}</div>}

      <div className={styles.field}>
        <label className={styles.fieldLabel}>{t("problemKind")}</label>
        <div className={styles.issueGrid}>
          {ISSUE_TYPES.map(({ id, labelKey }) => (
            <button
              key={id}
              type="button"
              className={`${styles.issueChip} ${issueType === id ? styles.issueChipActive : ""}`}
              onClick={() => setIssueType(id)}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>{t("describeProblem")}<span className={styles.required}>*</span></label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("describeProblemPlaceholder")}
          rows={6}
          required
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>{t("pageOrScreen")} <span className={styles.badge}>{t("optional")}</span></label>
        <input
          type="text"
          value={pageUrl}
          onChange={(e) => setPageUrl(e.target.value)}
          placeholder={t("pageOrScreenPlaceholder")}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>{t("attachScreenshot")} <span className={styles.badge}>{t("optional")}</span></label>
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
            <FiPaperclip size={14} /> {t("chooseFile")}
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
          {submitting ? t("submitting") : t("submitReport")}
        </button>
      </div>
    </form>
  );
}
