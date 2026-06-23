"use client";

import { useMemo, useState } from "react";
import { FiAlertCircle, FiInfo, FiX } from "react-icons/fi";
import styles from "./VolunteerStatusDialog.module.css";

const APPLICATION_STATUSES = ["Pending", "Reviewing", "Approved", "Rejected"];
const REJECTION_REASONS = [
  "Screening requirements were not met.",
  "The application did not demonstrate sufficient alignment with SASHA's mission.",
  "Required evaluation or interview criteria were not met.",
  "Required applicant information could not be verified.",
];

export default function VolunteerStatusDialog({ open, applicants, onCancel, onSave }) {
  const applicationList = useMemo(
    () => (Array.isArray(applicants) ? applicants : applicants ? [applicants] : []),
    [applicants]
  );
  const firstApplicant = applicationList[0];
  const sharedStatus =
    firstApplicant &&
    applicationList.every((item) => item.status === firstApplicant.status);
  const [status, setStatus] = useState(
    sharedStatus ? firstApplicant?.status || "Pending" : "Pending"
  );
  const [notes, setNotes] = useState(
    applicationList.length === 1 ? firstApplicant?.notes || "" : ""
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open || applicationList.length === 0) return null;

  const isRejected = status === "Rejected";

  async function submit(event) {
    event.preventDefault();
    const cleanedNotes = notes.trim();
    if (isRejected && !cleanedNotes) {
      setError("A rejection reason is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ applicants: applicationList, status, notes: cleanedNotes });
    } catch (saveError) {
      setError(saveError.message || "Failed to update application status.");
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay} onMouseDown={saving ? undefined : onCancel}>
      <form
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="volunteer-status-dialog-title"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className={styles.closeButton} type="button" onClick={onCancel} disabled={saving}>
          <FiX />
          <span className={styles.srOnly}>Close</span>
        </button>
        <div className={`${styles.dialogIcon} ${isRejected ? styles.danger : ""}`}>
          {isRejected ? <FiAlertCircle /> : <FiInfo />}
        </div>
        <h2 id="volunteer-status-dialog-title">
          {applicationList.length > 1
            ? `Update ${applicationList.length} Application Statuses`
            : "Update Application Status"}
        </h2>
        <p>Choose the new status and add evaluator notes for the application record.</p>

        <div className={styles.applicantSummary}>
          {applicationList.length === 1 ? (
            <>
              <strong>{applicationList[0].name}</strong>
              <span>APP-{String(applicationList[0].id).padStart(4, "0")}</span>
            </>
          ) : (
            <strong>{applicationList.length} selected applicants</strong>
          )}
        </div>

        <fieldset className={styles.statusGroup}>
          <legend>New status</legend>
          <div className={styles.statusOptions}>
            {APPLICATION_STATUSES.map((option) => (
              <label key={option} className={styles.statusOption}>
                <input
                  type="radio"
                  name="application-status"
                  checked={status === option}
                  onChange={() => {
                    setStatus(option);
                    setError("");
                  }}
                  disabled={saving}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {isRejected && (
          <div className={styles.suggestions}>
            <span>Suggested rejection reasons</span>
            <div className={styles.suggestionList}>
              {REJECTION_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    setNotes(reason);
                    setError("");
                  }}
                  disabled={saving}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className={styles.notesLabel}>
          {isRejected ? "Rejection reason" : "Evaluator notes"}
          <span>{isRejected ? "Required" : "Optional"}</span>
          <textarea
            rows={4}
            value={notes}
            placeholder={
              isRejected
                ? "Explain why the application is being rejected..."
                : "Add notes about this status change..."
            }
            onChange={(event) => {
              setNotes(event.target.value);
              setError("");
            }}
            aria-invalid={Boolean(error)}
            disabled={saving}
          />
        </label>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button
            type="submit"
            className={isRejected ? styles.dangerButton : styles.primaryButton}
            disabled={saving}
          >
            {saving ? "Updating..." : "Update Status"}
          </button>
        </div>
      </form>
    </div>
  );
}
