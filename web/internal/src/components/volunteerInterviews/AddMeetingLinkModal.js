"use client";

import { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";
import styles from "./AddMeetingLinkModal.module.css";

export default function AddMeetingLinkModal({
  open,
  onClose,
  interviewIds,
  onSave,
  loading = false,
}) {
  const [meetingLink, setMeetingLink] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setMeetingLink("");
      setError("");
    }
  }, [open]);

  const handleSave = () => {
    if (!meetingLink.trim()) {
      setError("Please enter a meeting link");
      return;
    }

    const urlRegex = /^https?:\/\/.+/i;
    if (!urlRegex.test(meetingLink)) {
      setError("Please enter a valid URL (e.g., https://...)");
      return;
    }

    onSave(interviewIds, meetingLink);
  };

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalBox}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Add Meeting Link</h2>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close modal"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Meeting Link <span className={styles.required}>*</span>
            </label>
            <input
              type="url"
              className={`${styles.formInput} ${error ? styles.inputError : ""}`}
              placeholder="https://meet.google.com/... or https://zoom.us/..."
              value={meetingLink}
              onChange={(e) => {
                setMeetingLink(e.target.value);
                setError("");
              }}
              disabled={loading}
            />
            {error && <span className={styles.errorMsg}>{error}</span>}
            <span className={styles.formHint}>
              Paste the meeting link from Zoom, Google Meet, Microsoft Teams, or other video conferencing platform
            </span>
          </div>

          <div className={styles.previewBox}>
            {meetingLink && (
              <>
                <span className={styles.previewLabel}>Preview:</span>
                <a
                  href={meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.previewLink}
                >
                  {meetingLink}
                </a>
              </>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={loading || !meetingLink.trim()}
          >
            {loading ? "Saving..." : "Save & Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
