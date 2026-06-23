"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiEdit3,
  FiLayers,
  FiList,
  FiMessageCircle,
  FiPaperclip,
  FiSend,
  FiX,
} from "react-icons/fi";
import { ConfirmDialog } from "@/components/ui/Dialog";
import Tooltip from "@/components/ui/Tooltip";
import FollowUpFieldEditor, {
  AMENDMENT_GROUPS,
  buildAmendmentValues,
  buildFieldChanges,
  FollowUpFieldChecklist,
  getFieldLabel,
  validateAmendmentFields,
} from "./FollowUpFieldEditor";
import styles from "./FollowUps.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const CLOSED_CASE_STATUSES = new Set([
  "Dismissed",
  "Perpetrator Convicted",
  "Resolved",
  "Withdrawn",
]);

const USER_REASON_OPTIONS = [
  {
    value: "Correction needed",
    label: "Correct existing information",
    description: "Choose this when information already recorded on the case is inaccurate.",
    groupIds: [
      "complainant_contact",
      "incident_datetime",
      "incident_location",
      "incident_description",
      "perpetrator",
      "witnesses",
      "prior_disclosure",
    ],
  },
  {
    value: "Additional info",
    label: "Add information or evidence",
    description: "Choose this when the existing information is correct, but the case team needs new details or files.",
    groupIds: [
      "incident_description",
      "perpetrator",
      "witnesses",
      "prior_disclosure",
      "evidence",
    ],
  },
  {
    value: "Other",
    label: "Other request",
    description: "Choose this for a request that does not change a case field, then explain it below.",
    groupIds: [],
  },
];

function selectedGroupLabels(fields, groups = AMENDMENT_GROUPS) {
  return groups
    .filter((group) => group.fields.some((field) => fields.includes(field)))
    .map((group) => group.label.toLowerCase());
}

function suggestedFollowUpMessage({ isStaff, reason, fields, groups }) {
  const labels = selectedGroupLabels(fields, groups);
  const subject = labels.length ? labels.join(", ") : "the case information";

  if (isStaff) {
    return fields.length
      ? `Please review and update ${subject}. Add any context that may help us verify the correction.`
      : "";
  }
  if (reason === "Correction needed") {
    return `I need to correct ${subject}. The updated information is provided above.`;
  }
  if (reason === "Additional info") {
    return fields.length
      ? `I would like to add more information about ${subject}. The new details are provided above.`
      : "I would like to add information that may help with my case.";
  }
  return "I have another request regarding my case:";
}

export function getFollowUpDisplay(summary) {
  if (!summary) return null;
  if (["resolved", "rejected"].includes(summary.status)) {
    const changedAt = new Date(summary.updated_at || summary.created_at).getTime();
    if (!Number.isNaN(changedAt) && Date.now() - changedAt < 3 * 86400000) {
      return {
        label: summary.status === "resolved" ? "Follow-up Resolved" : "Follow-up Closed",
        tone: "resolved",
      };
    }
    return null;
  }
  return summary.awaiting_role === "user"
    ? { label: "Action Needed", tone: "action" }
    : { label: "Follow-up Pending", tone: "pending" };
}

export function FollowUpBadge({ summary, always = false }) {
  const display = getFollowUpDisplay(summary) || (
    always && ["resolved", "rejected"].includes(summary?.status)
      ? {
          label: summary.status === "resolved" ? "Follow-up Resolved" : "Follow-up Rejected",
          tone: summary.status,
        }
      : null
  );
  if (!display) return null;
  return (
    <span className={`${styles.badge} ${styles[`badge_${display.tone}`]}`}>
      <span className={styles.badgeDot} aria-hidden="true" />
      {display.label}
    </span>
  );
}

export function FollowUpCaseHistory({ requests = [] }) {
  if (!requests.length) {
    return <p className={styles.caseHistoryEmpty}>No follow-up activity recorded.</p>;
  }

  return (
    <div className={styles.caseHistoryList}>
      {requests.map((request) => {
        const entries = request.follow_up_messages || [];
        const latestEntry = entries[entries.length - 1];
        const updatedAt = request.updated_at || latestEntry?.created_at || request.created_at;
        return (
          <article key={request.id} className={styles.caseHistoryItem}>
            <div className={styles.caseHistoryHeader}>
              <div>
                <strong>{getRequestTitle(request)}</strong>
                <span>{request.reason_category || "Follow-up request"}</span>
              </div>
              <FollowUpBadge summary={request} always />
            </div>
            <p className={styles.caseHistoryMessage}>
              {latestEntry?.message || request.message || "No message provided."}
            </p>
            <time dateTime={updatedAt}>
              Updated {new Date(updatedAt).toLocaleString("en-PH", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
          </article>
        );
      })}
    </div>
  );
}

export function FollowUpComposer({
  open,
  onClose,
  caseId,
  isStaff,
  activeFollowUp,
  reportData,
  onCreated,
}) {
  const [reason, setReason] = useState("Correction needed");
  const [message, setMessage] = useState(() =>
    suggestedFollowUpMessage({
      isStaff,
      reason: "Correction needed",
      fields: [],
      groups: AMENDMENT_GROUPS,
    })
  );
  const [messageCustomized, setMessageCustomized] = useState(false);
  const [blocksProcessing, setBlocksProcessing] = useState(true);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldsRequested, setFieldsRequested] = useState([]);
  const [editedValues, setEditedValues] = useState(() => buildAmendmentValues(reportData));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const evidenceSelected = fieldsRequested.includes("evidence.files");
  const selectedReason = USER_REASON_OPTIONS.find((option) => option.value === reason);
  const availableGroups = isStaff
    ? AMENDMENT_GROUPS
    : AMENDMENT_GROUPS.filter((group) => selectedReason?.groupIds.includes(group.id));
  const pendingChanges = buildFieldChanges(
    fieldsRequested,
    buildAmendmentValues(reportData),
    editedValues
  );
  const requiresStructuredUpdate =
    !isStaff && ["Correction needed", "Additional info"].includes(reason);
  const validationMessage = activeFollowUp
    ? "A follow-up is already active. Continue in the existing thread."
    : !message.trim()
      ? "Please add a short note explaining your request."
      : requiresStructuredUpdate && fieldsRequested.length === 0
        ? reason === "Correction needed"
          ? "Select at least one field that you want to correct."
          : "Select the information or evidence that you want to add."
        : !isStaff && evidenceSelected && !file
          ? "Attach an evidence file for the selected Evidence/attachments field."
          : requiresStructuredUpdate &&
              fieldsRequested.some((field) => field !== "evidence.files") &&
              pendingChanges.length === 0
            ? reason === "Correction needed"
              ? "The selected values still match the case. Edit at least one field before submitting."
              : "Enter new information in at least one selected field before submitting."
            : !isStaff && reason === "Other" && !messageCustomized
              ? "Please replace the suggested text with a description of your request."
            : "";
  const submitGuidance = activeFollowUp
    ? "Continue in the existing follow-up thread."
    : validationMessage;

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  if (!open) return null;

  function requestSubmit(event) {
    event.preventDefault();
    setError("");
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    const fieldErrors = validateAmendmentFields(fieldsRequested, editedValues);
    if (!isStaff && Object.keys(fieldErrors).length) {
      setError(Object.values(fieldErrors)[0]);
      return;
    }
    setConfirmOpen(true);
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const changes = !isStaff
        ? buildFieldChanges(
            fieldsRequested,
            buildAmendmentValues(reportData),
            editedValues
          )
        : [];
      const submittedFields = isStaff
        ? fieldsRequested
        : [
            ...new Set([
              ...changes.map((change) => change.field_key),
              ...(evidenceSelected ? ["evidence.files"] : []),
            ]),
          ];
      const form = new FormData();
      form.append("type", isStaff ? "officer_clarification_request" : "user_change_request");
      if (!isStaff) form.append("reason_category", reason);
      form.append("message", message);
      form.append("fields_requested", JSON.stringify(submittedFields));
      if (isStaff) form.append("blocks_processing", String(blocksProcessing));
      if (!isStaff && fieldsRequested.length > 0) {
        const validationErrors = validateAmendmentFields(fieldsRequested, editedValues);
        if (Object.keys(validationErrors).length) {
          throw new Error(Object.values(validationErrors)[0]);
        }
        if (!changes.length && !evidenceSelected) {
          throw new Error("Change at least one selected field before submitting.");
        }
        if (changes.length) form.append("field_changes", JSON.stringify(changes));
      }
      if (evidenceSelected && !isStaff && !file) {
        throw new Error("Attach at least one evidence file.");
      }
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
      setFieldsRequested([]);
      setConfirmOpen(false);
      onCreated?.(body.data);
      onClose();
    } catch (submitError) {
      setConfirmOpen(false);
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
    <div className={styles.overlay} onMouseDown={() => !submitting && !confirmOpen && onClose()}>
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
          <Tooltip text="Close follow-up form">
            <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close follow-up form">
              <FiX />
            </button>
          </Tooltip>
        </div>

        {activeFollowUp && (
          <div className={styles.warning}>
            A follow-up of this type is already in progress. Continue in the existing thread.
          </div>
        )}

        <form onSubmit={requestSubmit}>
          {!isStaff && (
            <label className={styles.field}>
              <span>Reason</span>
              <select
                value={reason}
                onChange={(e) => {
                  const nextReason = e.target.value;
                  setReason(nextReason);
                  setFieldsRequested([]);
                  setFile(null);
                  setEditedValues(buildAmendmentValues(reportData));
                  setError("");
                  setMessage(suggestedFollowUpMessage({
                    isStaff,
                    reason: nextReason,
                    fields: [],
                    groups: AMENDMENT_GROUPS,
                  }));
                  setMessageCustomized(false);
                }}
              >
                {USER_REASON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <small className={styles.fieldHelp}>{selectedReason?.description}</small>
            </label>
          )}
          {(isStaff || availableGroups.length > 0) && (
            <div className={styles.fieldSelection}>
              <span className={styles.selectionLabel}>
                {isStaff
                  ? "Which fields need correction? (optional)"
                  : reason === "Additional info"
                    ? "What information would you like to add?"
                    : "Which information would you like to correct?"}
                {!isStaff && <span className={styles.requiredMark} aria-hidden="true"> *</span>}
              </span>
              <FollowUpFieldChecklist
                groups={availableGroups}
                selectedFields={fieldsRequested}
              onChange={(nextFields) => {
                setFieldsRequested(nextFields);
                setError("");
                if (!nextFields.includes("evidence.files")) setFile(null);
                if (!messageCustomized) {
                  setMessage(suggestedFollowUpMessage({
                    isStaff,
                    reason,
                    fields: nextFields,
                    groups: availableGroups,
                  }));
                }
              }}
                disabled={submitting}
              />
            </div>
          )}
          {!isStaff && reason === "Other" && (
            <div className={styles.reasonNotice}>
              No case fields will be edited. Describe what you need from the case team below.
            </div>
          )}
          {!isStaff && fieldsRequested.some((field) => field !== "evidence.files") && (
            <div className={styles.inlineEditor}>
              <h3>Edit the selected information</h3>
              <p>The current case values are prefilled below.</p>
              <FollowUpFieldEditor
                fields={fieldsRequested.filter((field) => field !== "evidence.files")}
                reportData={reportData}
                values={editedValues}
                onChange={(nextValues) => {
                  setEditedValues(nextValues);
                  setError("");
                }}
                showActions={false}
              />
            </div>
          )}
          {evidenceSelected && (
            <label className={styles.fileField}>
              <FiPaperclip />
              <span>
                {file?.name || "Attach evidence"}
                {!isStaff && <span className={styles.requiredMark} aria-hidden="true"> *</span>}
                <span className={styles.fileLimit}> (max 10 MB)</span>
              </span>
              <input
                type="file"
                aria-required={!isStaff}
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setError("");
                }}
                accept="image/*,video/*,.pdf,.doc,.docx"
              />
            </label>
          )}
          <label className={styles.field}>
            <span>
              {isStaff
                ? "What needs clarification?"
                : "We're here to help. Please let us know what changed so we can support you."}
              <span className={styles.requiredMark} aria-hidden="true"> *</span>
            </span>
            <textarea
              required
              aria-required="true"
              maxLength={4000}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setMessageCustomized(true);
                setError("");
              }}
              placeholder={isStaff ? "Be specific about the information needed…" : "Describe the correction or additional information…"}
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
          {!error && submitGuidance && <div className={styles.submitGuidance}>{submitGuidance}</div>}
          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} disabled={submitting} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={submitting || Boolean(activeFollowUp)}
            >
              {submitting ? "Submitting…" : isStaff ? "Send Request" : "Submit Follow-up"}
            </button>
          </div>
        </form>
      </div>
    </div>
      <ConfirmDialog
        open={confirmOpen}
        title={isStaff ? "Send clarification request?" : "Submit this follow-up?"}
        description={
          isStaff
            ? "The complainant will be notified about the requested information."
            : reason === "Other"
              ? "Your request will be sent to the case team for review."
              : "Your changes will update the case record and be sent to the case team for review."
        }
        detail={
          fieldsRequested.length
            ? `Selected: ${selectedGroupLabels(fieldsRequested, availableGroups).join(", ")}${file ? ` · Attachment: ${file.name}` : ""}`
            : "Message-only request"
        }
        confirmLabel={isStaff ? "Send Request" : "Submit Follow-up"}
        busy={submitting}
        onConfirm={submit}
        onCancel={() => !submitting && setConfirmOpen(false)}
      />
    </>
  );
}

function PersonName({ user, fallback }) {
  const name = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  return name || fallback;
}

function getPersonName(user, fallback) {
  const name = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  return name || fallback;
}

function getRequestTitle(request) {
  return request.type === "officer_clarification_request"
    ? "Clarification Request"
    : "Change Request";
}

function getRequestStatusLabel(status) {
  if (status === "resolved") return "Resolved";
  if (status === "rejected") return "Rejected";
  if (status === "responded") return "Responded";
  return "Open";
}

function relativeDate(value) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";
  const elapsed = Date.now() - timestamp;
  const future = elapsed < 0;
  const absolute = Math.abs(elapsed);
  const units = [
    ["year", 365 * 86400000],
    ["month", 30 * 86400000],
    ["week", 7 * 86400000],
    ["day", 86400000],
    ["hour", 3600000],
    ["minute", 60000],
  ];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, milliseconds] of units) {
    if (absolute >= milliseconds) {
      const amount = Math.max(1, Math.round(absolute / milliseconds));
      return formatter.format(future ? amount : -amount, unit);
    }
  }
  return "just now";
}

function Thread({ request, currentUserId, isStaff, onChanged }) {
  const [reply, setReply] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [closeStatus, setCloseStatus] = useState(null);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [editorError, setEditorError] = useState("");
  const isOpen = ["open", "responded"].includes(request.status);
  const requestedFields = Array.isArray(request.fields_requested) ? request.fields_requested : [];
  const canSubmitCorrection =
    !isStaff &&
    isOpen &&
    request.type === "officer_clarification_request" &&
    request.awaiting_role === "user" &&
    requestedFields.length > 0;
  const evidenceRequested = requestedFields.includes("evidence.files");
  const editableFields = requestedFields.filter((field) => field !== "evidence.files");
  const reportLocationType = buildAmendmentValues(request.report_data).incident.locationType;
  const submittedLocationType = (request.field_changes || []).reduce(
    (locationType, change) =>
      change.field_key === "incident.locationType" ? change.new_value : locationType,
    reportLocationType
  );
  const displayedFields = request.type === "user_change_request" && (request.field_changes || []).length
    ? [
        ...new Set([
          ...(request.field_changes || []).map((change) => change.field_key),
          ...(requestedFields.includes("evidence.files") ? ["evidence.files"] : []),
        ]),
      ]
    : requestedFields;

  async function submitCorrection(changes) {
    setBusy(true);
    setError("");
    setEditorError("");
    try {
      if (evidenceRequested && !evidenceFile) {
        throw new Error("Attach at least one evidence file.");
      }
      const form = new FormData();
      form.append("follow_up_request_id", String(request.id));
      form.append("changes", JSON.stringify(changes));
      if (evidenceFile) form.append("file", evidenceFile);
      const response = await fetch(`${API_URL}/api/case_reports/${request.case_id}/fields`, {
        method: "PATCH",
        credentials: "include",
        body: form,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Failed to save corrections.");
      setEditorOpen(false);
      setEvidenceFile(null);
      onChanged();
    } catch (submitError) {
      setEditorError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

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
      setCloseStatus(null);
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
  const latestEntry = entries[entries.length - 1];
  const closePreview = (request.field_changes || []).length > 0
    ? (
        <div className={styles.confirmPreview}>
          {(request.field_changes || []).map((change) => (
            <div key={change.id || `${change.field_key}-${change.changed_at}`}>
              <strong>{getFieldLabel(change.field_key, submittedLocationType)}</strong>
              <p>
                <span>{formatChangeValue(change.previous_value)}</span>
                <b aria-hidden="true">→</b>
                <span>{formatChangeValue(change.new_value)}</span>
              </p>
            </div>
          ))}
        </div>
      )
    : (
        <div className={styles.confirmPreview}>
          <div>
            <strong>Latest message</strong>
            <p className={styles.previewMessage}>{latestEntry?.message || "No message provided."}</p>
          </div>
        </div>
      );

  return (
    <article className={styles.thread}>
      <div className={styles.threadHeader}>
        <div className={styles.threadHeading}>
          <div className={styles.threadTitleRow}>
            <h3>{getRequestTitle(request)}</h3>
            <FollowUpBadge summary={request} always />
          </div>
          <p>
            {request.reason_category || (request.blocks_processing ? "Case processing paused" : "Case processing continues")}
          </p>
        </div>
        <div className={styles.threadHeaderAside}>
          <time>{new Date(request.created_at).toLocaleDateString("en-PH", { dateStyle: "medium" })}</time>
          {isStaff && isOpen && (
            <div className={styles.headerActions}>
              <Tooltip text="Close this follow-up because the requested action cannot be approved.">
                <button type="button" disabled={busy} className={styles.rejectButton} onClick={() => setCloseStatus("rejected")}>
                  Reject
                </button>
              </Tooltip>
              <Tooltip text="Confirm that the necessary follow-up action has been completed.">
                <button type="button" disabled={busy} className={styles.resolveButton} onClick={() => setCloseStatus("resolved")}>
                  <FiCheck /> Mark Resolved
                </button>
              </Tooltip>
            </div>
          )}
          {isStaff && !isOpen && (
            <div className={styles.headerActions}>
              <Tooltip text="Reopen this follow-up so staff can review it and update its final status again.">
                <button type="button" disabled={busy} className={styles.resolveButton} onClick={() => setCloseStatus("open")}>
                  Reopen
                </button>
              </Tooltip>
            </div>
          )}
        </div>
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

      {displayedFields.length > 0 && (
        <div className={styles.requestedFields}>
          <strong>{request.type === "user_change_request" ? "Fields changed" : "Fields requested"}</strong>
          <div>{displayedFields.map((field) => (
            <span key={field}>{getFieldLabel(field, submittedLocationType)}</span>
          ))}</div>
        </div>
      )}

      {(request.field_changes || []).length > 0 && (
        <div className={styles.changeList}>
          <h4>Submitted corrections</h4>
          {(request.field_changes || []).map((change) => (
            <div className={styles.changeCard} key={change.id || `${change.field_key}-${change.changed_at}`}>
              <strong>{getFieldLabel(change.field_key, submittedLocationType)}</strong>
              <div><span>Was</span><p>{formatChangeValue(change.previous_value)}</p></div>
              <div><span>Now</span><p>{formatChangeValue(change.new_value)}</p></div>
            </div>
          ))}
        </div>
      )}

      {canSubmitCorrection && (
        <div className={styles.amendmentAction}>
          <button type="button" className={styles.primaryButton} onClick={() => {
            setEditorError("");
            setEditorOpen(true);
          }}>
            <FiEdit3 /> Update requested fields
          </button>
        </div>
      )}

      {!canSubmitCorrection && (
        <form className={styles.replyForm} onSubmit={sendReply}>
          <textarea
            required
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply…"
          />
          <div className={styles.replyActions}>
            {evidenceRequested && (
              <label className={styles.compactFile}>
                <FiPaperclip /> {file?.name || "Attach evidence"}
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            )}
            {!reply.trim() && (
              <span className={styles.replyGuidance}>
                {isOpen
                  ? "Write a reply to enable sending."
                  : "This follow-up is closed, but your reply will remain in its audit trail."}
              </span>
            )}
            <button className={styles.primaryButton} disabled={busy || !reply.trim()}>
              <FiSend /> {busy ? "Sending…" : "Reply"}
            </button>
          </div>
        </form>
      )}
      {error && <div className={styles.error}>{error}</div>}
      <ConfirmDialog
        open={Boolean(closeStatus)}
        title={closeStatus === "open"
          ? "Reopen this follow-up?"
          : closeStatus === "resolved"
            ? "Resolve this follow-up?"
            : "Reject this follow-up?"}
        description={closeStatus === "open"
          ? "This will reopen the thread and notify the complainant that the case team is reviewing it again."
          : closeStatus === "resolved"
            ? "This will close the follow-up and send the complainant the default resolution message."
            : "This will close the follow-up and send the complainant the default rejection message."}
        detail={closeStatus === "open"
          ? "Staff can reply, reject, or mark the follow-up as resolved after reopening it."
          : closePreview}
        confirmLabel={closeStatus === "open"
          ? "Reopen Follow-up"
          : closeStatus === "resolved"
            ? "Mark Resolved"
            : "Reject Follow-up"}
        tone={closeStatus === "rejected" ? "danger" : "default"}
        busy={busy}
        onConfirm={() => closeThread(closeStatus)}
        onCancel={() => !busy && setCloseStatus(null)}
      />
      {editorOpen && (
        <div className={styles.overlay} onMouseDown={() => !busy && setEditorOpen(false)}>
          <div className={`${styles.modal} ${styles.editorModal}`} role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Update requested information</h2>
                <p>Only the fields tagged by the case officer are shown.</p>
              </div>
              <Tooltip text="Close correction form">
                <button type="button" className={styles.iconButton} onClick={() => setEditorOpen(false)} aria-label="Close correction form"><FiX /></button>
              </Tooltip>
            </div>
            {evidenceRequested && (
              <label className={styles.fileField}>
                <FiPaperclip />
                <span>
                  {evidenceFile?.name || "Attach evidence"}
                  <span className={styles.requiredMark} aria-hidden="true"> *</span>
                  <span className={styles.fileLimit}> (max 10 MB)</span>
                </span>
                <input
                  type="file"
                  required
                  aria-required="true"
                  onChange={(e) => {
                    setEvidenceFile(e.target.files?.[0] || null);
                    setEditorError("");
                  }}
                  accept="image/*,video/*,.pdf,.doc,.docx"
                />
              </label>
            )}
            {editorError && <div className={styles.error}>{editorError}</div>}
            {!editorError && evidenceRequested && !evidenceFile && (
              <div className={styles.submitGuidance}>Attach the requested evidence before submitting.</div>
            )}
            <FollowUpFieldEditor
              fields={editableFields}
              reportData={request.report_data}
              submitting={busy}
              onSubmit={submitCorrection}
              submitLabel={evidenceRequested ? "Submit correction and evidence" : "Save corrections"}
              allowEmpty={evidenceRequested}
            />
          </div>
        </div>
      )}
    </article>
  );
}

function formatChangeValue(value) {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.length ? parsed.join(", ") : "None";
    } catch (_) {}
  }
  return String(value);
}

function HistoryThreadRow({ request, expanded, onToggle, children }) {
  const initiator = getPersonName(
    request.initiator,
    request.type === "officer_clarification_request" ? "Case officer" : "Complainant"
  );
  const preview = String(request.message || "No message provided.").replace(/\s+/g, " ").trim();

  return (
    <div className={styles.historyItem}>
      <button
        type="button"
        className={styles.historyRow}
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className={styles.historyChevron}>
          {expanded ? <FiChevronDown /> : <FiChevronRight />}
        </span>
        <span className={styles.historyTypeIcon}>
          {request.type === "officer_clarification_request" ? <FiMessageCircle /> : <FiEdit3 />}
        </span>
        <span className={`${styles.statusDot} ${styles[`statusDot_${request.status}`]}`} />
        <span className={styles.historyMain}>
          <span className={styles.historyMeta}>
            <strong>{getRequestTitle(request)}</strong>
            <span>{initiator}</span>
            <span className={styles.historyStatus}>{getRequestStatusLabel(request.status)}</span>
          </span>
          <span className={styles.historyPreview}>{preview}</span>
        </span>
        <span className={styles.historyDate}>{relativeDate(request.updated_at || request.created_at)}</span>
      </button>
      {expanded && <div className={styles.expandedHistoryThread}>{children}</div>}
    </div>
  );
}

function FieldHistoryGroup({
  fieldKey,
  changes,
  requestsById,
  expandedRequestIds,
  onToggleRequest,
  currentUserId,
  canManage,
  onChanged,
}) {
  const [open, setOpen] = useState(false);
  const orderedChanges = [...changes].sort(
    (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
  );
  const values = orderedChanges.length
    ? [
        formatChangeValue(orderedChanges[0].previous_value),
        ...orderedChanges.map((change) => formatChangeValue(change.new_value)),
      ]
    : [];

  return (
    <div className={styles.fieldHistoryGroup}>
      <button
        type="button"
        className={styles.fieldHistoryHeader}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{open ? <FiChevronDown /> : <FiChevronRight />}</span>
        <span className={styles.fieldHistoryHeading}>
          <strong>{getFieldLabel(fieldKey)}</strong>
          <span className={styles.valueTrail}>
            {values.map((value, index) => (
              <span key={`${value}-${index}`}>
                {index > 0 && <b aria-hidden="true">→</b>}
                <span>{value}</span>
              </span>
            ))}
          </span>
        </span>
        <span className={styles.changeCount}>
          {orderedChanges.length} {orderedChanges.length === 1 ? "change" : "changes"}
        </span>
      </button>
      {open && (
        <div className={styles.fieldTimeline}>
          {orderedChanges.map((change) => {
            const request = requestsById.get(change.follow_up_request_id);
            if (!request) return null;
            const expanded = expandedRequestIds.has(request.id);
            return (
              <div className={styles.fieldTimelineItem} key={change.id || `${change.follow_up_request_id}-${change.changed_at}`}>
                <button type="button" onClick={() => onToggleRequest(request.id)}>
                  <span>
                    <strong>{formatChangeValue(change.new_value)}</strong>
                    <small>from {formatChangeValue(change.previous_value)}</small>
                  </span>
                  <span>
                    {getRequestStatusLabel(request.status)} · {relativeDate(change.changed_at || request.created_at)}
                    {expanded ? <FiChevronDown /> : <FiChevronRight />}
                  </span>
                </button>
                {expanded && (
                  <div className={styles.expandedHistoryThread}>
                    <Thread
                      request={request}
                      currentUserId={currentUserId}
                      isStaff={canManage}
                      onChanged={onChanged}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FollowUpsPanel({
  caseId,
  caseStatus,
  isStaff,
  canManage = isStaff,
  currentUserId,
  reportData,
  onSummaryChange,
  onCaseChanged,
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyMode, setHistoryMode] = useState("status");
  const [expandedRequestIds, setExpandedRequestIds] = useState(() => new Set());

  const requestType = isStaff ? "officer_clarification_request" : "user_change_request";
  const activeFollowUp = useMemo(
    () => requests.find((item) => item.type === requestType && ["open", "responded"].includes(item.status)),
    [requests, requestType]
  );
  const allowed = !CLOSED_CASE_STATUSES.has(caseStatus);
  const activeRequests = useMemo(
    () => requests.filter((item) => ["open", "responded"].includes(item.status)),
    [requests]
  );
  const historicalRequests = useMemo(
    () => requests.filter((item) => ["resolved", "rejected"].includes(item.status)),
    [requests]
  );
  const requestsById = useMemo(
    () => new Map(requests.map((request) => [request.id, request])),
    [requests]
  );
  const fieldHistory = useMemo(() => {
    const grouped = new Map();
    historicalRequests.forEach((request) => {
      (request.field_changes || []).forEach((change) => {
        const current = grouped.get(change.field_key) || [];
        current.push({ ...change, follow_up_request_id: request.id });
        grouped.set(change.field_key, current);
      });
    });
    return [...grouped.entries()].sort(([fieldA], [fieldB]) =>
      getFieldLabel(fieldA).localeCompare(getFieldLabel(fieldB))
    );
  }, [historicalRequests]);
  const messageOnlyHistory = useMemo(
    () => historicalRequests.filter((request) => !(request.field_changes || []).length),
    [historicalRequests]
  );

  function toggleRequest(requestId) {
    setExpandedRequestIds((current) => {
      const next = new Set(current);
      if (next.has(requestId)) next.delete(requestId);
      else next.add(requestId);
      return next;
    });
  }

  function refreshAfterChange() {
    load();
    onCaseChanged?.();
  }

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
      {!loading && !error && activeRequests.length > 0 && (
        <section className={styles.feedSection}>
          <div className={styles.sectionHeading}>
            <div>
              <h3>Needs attention</h3>
              <p>Open follow-ups are kept expanded so the next action is easy to find.</p>
            </div>
            <span>{activeRequests.length}</span>
          </div>
          <div className={styles.threadList}>
            {activeRequests.map((request) => (
              <Thread
                key={request.id}
                request={request}
                currentUserId={currentUserId}
                isStaff={canManage}
                onChanged={refreshAfterChange}
              />
            ))}
          </div>
        </section>
      )}
      {!loading && !error && historicalRequests.length > 0 && (
        <section className={styles.feedSection}>
          <button
            type="button"
            className={styles.historyToggle}
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((value) => !value)}
          >
            <span>{historyOpen ? <FiChevronDown /> : <FiChevronRight />}</span>
            <span>
              <strong>View past follow-ups ({historicalRequests.length})</strong>
              <small>Resolved and rejected requests</small>
            </span>
          </button>
          {historyOpen && (
            <div className={styles.historyContent}>
              <div className={styles.historyToolbar} aria-label="History view">
                <button
                  type="button"
                  className={historyMode === "status" ? styles.activeMode : ""}
                  onClick={() => setHistoryMode("status")}
                >
                  <FiList /> By follow-up
                </button>
                <button
                  type="button"
                  className={historyMode === "field" ? styles.activeMode : ""}
                  onClick={() => setHistoryMode("field")}
                >
                  <FiLayers /> Group by field
                </button>
              </div>
              {historyMode === "status" ? (
                <div className={styles.historyList}>
                  {historicalRequests.map((request) => (
                    <HistoryThreadRow
                      key={request.id}
                      request={request}
                      expanded={expandedRequestIds.has(request.id)}
                      onToggle={() => toggleRequest(request.id)}
                    >
                      <Thread
                        request={request}
                        currentUserId={currentUserId}
                        isStaff={canManage}
                        onChanged={refreshAfterChange}
                      />
                    </HistoryThreadRow>
                  ))}
                </div>
              ) : (
                <div className={styles.fieldHistory}>
                  {fieldHistory.length === 0 && (
                    <p className={styles.empty}>No field changes are recorded in past follow-ups.</p>
                  )}
                  {fieldHistory.map(([fieldKey, changes]) => (
                    <FieldHistoryGroup
                      key={fieldKey}
                      fieldKey={fieldKey}
                      changes={changes}
                      requestsById={requestsById}
                      expandedRequestIds={expandedRequestIds}
                      onToggleRequest={toggleRequest}
                      currentUserId={currentUserId}
                      canManage={canManage}
                      onChanged={refreshAfterChange}
                    />
                  ))}
                  {messageOnlyHistory.length > 0 && (
                    <div className={styles.messageOnlyHistory}>
                      <div className={styles.messageOnlyHeading}>
                        <FiClock />
                        <div>
                          <strong>Other follow-ups</strong>
                          <span>Requests without a recorded field change</span>
                        </div>
                      </div>
                      {messageOnlyHistory.map((request) => (
                        <HistoryThreadRow
                          key={request.id}
                          request={request}
                          expanded={expandedRequestIds.has(request.id)}
                          onToggle={() => toggleRequest(request.id)}
                        >
                          <Thread
                            request={request}
                            currentUserId={currentUserId}
                            isStaff={canManage}
                            onChanged={refreshAfterChange}
                          />
                        </HistoryThreadRow>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}
      {!loading && !error && requests.length > 0 && activeRequests.length === 0 && historicalRequests.length === 0 && (
        <div className={styles.threadList}>
          {requests.map((request) => (
          <Thread
            key={request.id}
            request={request}
            currentUserId={currentUserId}
            isStaff={canManage}
            onChanged={refreshAfterChange}
          />
          ))}
        </div>
      )}
      <FollowUpComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        caseId={caseId}
        isStaff={isStaff}
        activeFollowUp={activeFollowUp}
        reportData={reportData}
        onCreated={load}
      />
    </section>
  );
}
