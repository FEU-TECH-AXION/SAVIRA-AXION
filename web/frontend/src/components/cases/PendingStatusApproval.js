"use client";

import { useState } from "react";
import { FiCheck, FiClock, FiX } from "react-icons/fi";
import styles from "./PendingStatusApproval.module.css";

export default function PendingStatusApproval({
  caseData,
  setCaseData,
  isAdmin,
  approverId,
  showToast,
}) {
  const [open, setOpen] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);

  const pending = caseData?.pendingApproval;
  if (!pending) return null;

  function closeModal() {
    setOpen(false);
    setShowReject(false);
    setRejectReason("");
  }

  async function resolve(action) {
    if (!approverId) {
      showToast("Your user account could not be identified. Please sign in again.", "danger");
      return;
    }

    setSaving(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(
        `${API_URL}/api/case_status_history/${pending.historyId}/${action}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approved_by_id: approverId,
            ...(action === "reject" ? { rejection_reason: rejectReason.trim() } : {}),
          }),
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Failed to ${action} status change.`);
      }

      setCaseData((current) => ({
        ...current,
        status: action === "approve" ? pending.proposedStatus : current.status,
        pendingApproval: null,
        statusHistory: (current.statusHistory || []).map((entry) =>
          entry.historyId === pending.historyId
            ? {
                ...entry,
                approvalStatus: action === "approve" ? "approved" : "rejected",
                rejectionReason: action === "reject" ? rejectReason.trim() : entry.rejectionReason,
              }
            : entry
        ),
      }));
      showToast(payload.message || `Status change ${action === "approve" ? "approved" : "rejected"}.`, action === "reject" ? "danger" : "success");
      setSaving(false);
      closeModal();
    } catch (error) {
      showToast(error.message, "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className={styles.banner}>
        <FiClock aria-hidden="true" />
        <div className={styles.bannerText}>
          <strong>Pending Admin Approval:</strong>{" "}
          A status change to <strong>{pending.proposedStatus}</strong> was submitted by{" "}
          {pending.submittedBy || "a staff member"}.
        </div>
        {isAdmin && (
          <button type="button" className={styles.reviewButton} onClick={() => setOpen(true)}>
            Review
          </button>
        )}
      </div>

      {open && isAdmin && (
        <div className={styles.overlay} onMouseDown={(event) => {
          if (!saving && event.target === event.currentTarget) closeModal();
        }}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="pending-status-title">
            <div className={styles.header}>
              <h2 id="pending-status-title">Review Pending Status Change</h2>
              <button type="button" className={styles.closeButton} onClick={closeModal} aria-label="Close approval dialog" disabled={saving}>
                <FiX />
              </button>
            </div>

            <div className={styles.body}>
              <dl className={styles.reviewGrid}>
                <div><dt>Case ID</dt><dd>{caseData.caseId || caseData.id}</dd></div>
                <div><dt>Current Status</dt><dd>{caseData.status}</dd></div>
                <div><dt>Proposed Status</dt><dd>{pending.proposedStatus}</dd></div>
                <div><dt>Submitted By</dt><dd>{pending.submittedBy || "Unknown"}</dd></div>
                <div><dt>Date Submitted</dt><dd>{pending.date || "—"}</dd></div>
                <div className={styles.fullRow}><dt>Notes</dt><dd>{pending.notes || "No notes provided."}</dd></div>
              </dl>

              {showReject && (
                <label className={styles.rejectField}>
                  <span>Reason for rejection</span>
                  <textarea
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    placeholder="Explain why this status change is being rejected..."
                    rows={4}
                  />
                </label>
              )}
            </div>

            <div className={styles.footer}>
              {showReject ? (
                <>
                  <button type="button" className={styles.secondaryButton} onClick={() => setShowReject(false)} disabled={saving}>Back</button>
                  <button type="button" className={styles.dangerButton} onClick={() => resolve("reject")} disabled={saving || !rejectReason.trim()}>
                    {saving ? "Rejecting..." : "Confirm Rejection"}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className={styles.secondaryButton} onClick={closeModal} disabled={saving}>Cancel</button>
                  <button type="button" className={styles.dangerButton} onClick={() => setShowReject(true)} disabled={saving}>Reject</button>
                  <button type="button" className={styles.approveButton} onClick={() => resolve("approve")} disabled={saving}>
                    <FiCheck /> {saving ? "Approving..." : "Approve & Apply"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
