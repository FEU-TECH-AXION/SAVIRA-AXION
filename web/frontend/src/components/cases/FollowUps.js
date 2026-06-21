"use client";

import { useEffect, useMemo, useState } from "react";
import { FiCheck, FiMessageCircle, FiPaperclip, FiSend, FiX } from "react-icons/fi";
import styles from "./FollowUps.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const CLOSED_CASE_STATUSES = new Set([
  "Dismissed",
  "Perpetrator Convicted",
  "Resolved",
  "Withdrawn",
]);

export function getFollowUpDisplay(summary) {
  if (!summary) return null;
  if (["resolved", "rejected"].includes(summary.status)) {
    const changedAt = new Date(summary.updated_at || summary.created_at).getTime();
    if (!Number.isNaN(changedAt) && Date.now() - changedAt < 3 * 86400000) {
      return { label: summary.status === "resolved" ? "Resolved" : "Closed", tone: "resolved" };
    }
    return null;
  }
  return summary.awaiting_role === "user"
    ? { label: "Action Needed", tone: "action" }
    : { label: "Follow-up Pending", tone: "pending" };
}

export function FollowUpBadge({ summary }) {
  const display = getFollowUpDisplay(summary);
  if (!display) return null;
  return (
    <span className={`${styles.badge} ${styles[`badge_${display.tone}`]}`}>
      {display.label}
    </span>
  );
}

export function FollowUpComposer({
  open,
  onClose,
  caseId,
  isStaff,
  activeFollowUp,
  onCreated,
}) {
  const [reason, setReason] = useState("Correction needed");
  const [message, setMessage] = useState("");
  const [blocksProcessing, setBlocksProcessing] = useState(true);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  if (!open) return null;

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const form = new FormData();
      form.append("type", isStaff ? "officer_clarification_request" : "user_change_request");
      if (!isStaff) form.append("reason_category", reason);
      form.append("message", message);
      if (isStaff) form.append("blocks_processing", String(blocksProcessing));
      if (file) form.append("file", file);

      const response = await fetch(`${API_URL}/api/case_reports/${caseId}/follow-ups`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Failed to create follow-up.");
      setMessage("");
      setFile(null);
      onCreated?.(body.data);
      onClose();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay} onMouseDown={() => !submitting && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2>{isStaff ? "Request Clarification" : "Follow Up"}</h2>
            <p>
              {isStaff
                ? "Ask the complainant for the information needed to continue."
                : "Tell the case team what you need to correct or add."}
            </p>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">
            <FiX />
          </button>
        </div>

        {activeFollowUp && (
          <div className={styles.warning}>
            A follow-up of this type is already in progress. Continue in the existing thread.
          </div>
        )}

        <form onSubmit={submit}>
          {!isStaff && (
            <label className={styles.field}>
              <span>Reason</span>
              <select value={reason} onChange={(e) => setReason(e.target.value)}>
                <option>Correction needed</option>
                <option>Additional info</option>
                <option>Other</option>
              </select>
            </label>
          )}
          <label className={styles.field}>
            <span>{isStaff ? "What needs clarification?" : "What would you like to change?"}</span>
            <textarea
              required
              maxLength={4000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isStaff ? "Be specific about the information needed…" : "Describe the correction or additional information…"}
            />
          </label>
          <label className={styles.fileField}>
            <FiPaperclip />
            <span>{file?.name || "Attach a file (optional, max 10 MB)"}</span>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept="image/*,video/*,.pdf,.doc,.docx"
            />
          </label>
          {isStaff && (
            <label className={styles.checkField}>
              <input
                type="checkbox"
                checked={blocksProcessing}
                onChange={(e) => setBlocksProcessing(e.target.checked)}
              />
              Pause case processing until this clarification is resolved
            </label>
          )}
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} disabled={submitting} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton} disabled={submitting || !message.trim() || activeFollowUp}>
              {submitting ? "Submitting…" : isStaff ? "Send Request" : "Submit Follow-up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PersonName({ user, fallback }) {
  const name = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  return name || fallback;
}

function Thread({ request, currentUserId, isStaff, onChanged }) {
  const [reply, setReply] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isOpen = ["open", "responded"].includes(request.status);

  async function sendReply(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("message", reply);
      if (file) form.append("file", file);
      const response = await fetch(`${API_URL}/api/follow-ups/${request.id}/messages`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Failed to send reply.");
      setReply("");
      setFile(null);
      onChanged();
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setBusy(false);
    }
  }

  async function closeThread(status) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/follow-ups/${request.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Failed to update follow-up.");
      onChanged();
    } catch (closeError) {
      setError(closeError.message);
    } finally {
      setBusy(false);
    }
  }

  const entries = [
    {
      id: `request-${request.id}`,
      sender_user_id: request.initiated_by_user_id,
      sender: request.initiator,
      message: request.message,
      attachment_url: request.attachment_url,
      attachment_name: request.attachment_name,
      created_at: request.created_at,
    },
    ...(request.follow_up_messages || []),
  ];

  return (
    <article className={styles.thread}>
      <div className={styles.threadHeader}>
        <div>
          <div className={styles.threadTitleRow}>
            <h3>{request.type === "officer_clarification_request" ? "Clarification Request" : "Change Request"}</h3>
            <FollowUpBadge summary={request} />
          </div>
          <p>
            {request.reason_category || (request.blocks_processing ? "Case processing paused" : "Case processing continues")}
          </p>
        </div>
        <time>{new Date(request.created_at).toLocaleDateString("en-PH", { dateStyle: "medium" })}</time>
      </div>

      <div className={styles.messages}>
        {entries.map((entry) => {
          const mine = entry.sender_user_id === currentUserId;
          return (
            <div key={entry.id} className={`${styles.message} ${mine ? styles.messageMine : ""}`}>
              <div className={styles.messageMeta}>
                <strong><PersonName user={entry.sender} fallback={mine ? "You" : "Case participant"} /></strong>
                <time>{new Date(entry.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</time>
              </div>
              <p>{entry.message}</p>
              {entry.attachment_url && (
                <a href={entry.attachment_url} target="_blank" rel="noreferrer" className={styles.attachment}>
                  <FiPaperclip /> {entry.attachment_name || "View attachment"}
                </a>
              )}
            </div>
          );
        })}
      </div>

      {isOpen && (
        <form className={styles.replyForm} onSubmit={sendReply}>
          <textarea
            required
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply…"
          />
          <div className={styles.replyActions}>
            <label className={styles.compactFile}>
              <FiPaperclip /> {file?.name || "Attach"}
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <button className={styles.primaryButton} disabled={busy || !reply.trim()}>
              <FiSend /> {busy ? "Sending…" : "Reply"}
            </button>
          </div>
        </form>
      )}
      {error && <div className={styles.error}>{error}</div>}
      {isStaff && isOpen && (
        <div className={styles.resolveActions}>
          <button type="button" disabled={busy} className={styles.rejectButton} onClick={() => closeThread("rejected")}>
            Reject
          </button>
          <button type="button" disabled={busy} className={styles.resolveButton} onClick={() => closeThread("resolved")}>
            <FiCheck /> Mark Resolved
          </button>
        </div>
      )}
    </article>
  );
}

export default function FollowUpsPanel({
  caseId,
  caseStatus,
  isStaff,
  canManage = isStaff,
  currentUserId,
  onSummaryChange,
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);

  const requestType = isStaff ? "officer_clarification_request" : "user_change_request";
  const activeFollowUp = useMemo(
    () => requests.find((item) => item.type === requestType && ["open", "responded"].includes(item.status)),
    [requests, requestType]
  );
  const allowed = !CLOSED_CASE_STATUSES.has(caseStatus);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/case_reports/${caseId}/follow-ups`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Failed to load follow-ups.");
      setRequests(body.data || []);
      const activeItems = (body.data || []).filter((item) =>
        ["open", "responded"].includes(item.status)
      );
      onSummaryChange?.(
        activeItems.find((item) => item.awaiting_role === (isStaff ? "officer" : "user")) ||
        activeItems[0] ||
        body.data?.[0] ||
        null
      );
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(load);
    // Loading is keyed by caseId; load intentionally reads the latest component state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2><FiMessageCircle /> Follow-up History</h2>
          <p>Questions, corrections, replies, and resolutions are kept here as part of the case audit trail.</p>
        </div>
        {(!isStaff || canManage) && (
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!allowed || Boolean(activeFollowUp)}
            title={!allowed ? "Follow-ups are unavailable for this case status" : activeFollowUp ? "A follow-up is already in progress" : ""}
            onClick={() => setComposerOpen(true)}
          >
            {isStaff ? "Request Clarification" : "Follow Up"}
          </button>
        )}
      </div>
      {loading && <p className={styles.empty}>Loading follow-ups…</p>}
      {error && <div className={styles.error}>{error}</div>}
      {!loading && !error && requests.length === 0 && (
        <p className={styles.empty}>No follow-up requests yet.</p>
      )}
      <div className={styles.threadList}>
        {requests.map((request) => (
          <Thread
            key={request.id}
            request={request}
            currentUserId={currentUserId}
            isStaff={canManage}
            onChanged={load}
          />
        ))}
      </div>
      <FollowUpComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        caseId={caseId}
        isStaff={isStaff}
        activeFollowUp={activeFollowUp}
        onCreated={load}
      />
    </section>
  );
}
