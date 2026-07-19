"use client";

import { useEffect, useMemo, useState } from "react";
import { FiAlertCircle, FiCheck, FiClock } from "react-icons/fi";
import AvailabilityBadge from "@/components/availability/AvailabilityBadge";
import { fetchAvailabilityFor, updateStaffAvailability } from "@/lib/api";
import {
  AVAILABILITY_REASONS,
  AVAILABILITY_STATUSES,
  REASON_REQUIRED_STATUSES,
} from "@/lib/availabilityOptions";
import styles from "./AvailabilityTab.module.css";

function Field({ label, error, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
      {error && <p className={styles.fieldError}>{error}</p>}
    </div>
  );
}

function formatWorkParts(summary = {}) {
  return [
    summary.cases > 0 ? `${summary.cases} active case${summary.cases === 1 ? "" : "s"}` : null,
    summary.legal > 0 ? `${summary.legal} legal assignment${summary.legal === 1 ? "" : "s"}` : null,
    summary.volunteer > 0 ? `${summary.volunteer} review${summary.volunteer === 1 ? "" : "s"}` : null,
    summary.projects > 0 ? `${summary.projects} project${summary.projects === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
}

function splitAvailabilityNote(note = "") {
  const text = String(note || "").trim();
  const [maybeReason, ...rest] = text.split(": ");
  if (AVAILABILITY_REASONS.includes(maybeReason)) {
    return {
      reason: maybeReason,
      detail: rest.join(": ").trim(),
    };
  }
  return {
    reason: text ? "Other" : "",
    detail: text,
  };
}

function buildAvailabilityNote(reason, detail) {
  const cleanDetail = String(detail || "").trim();
  if (!reason) return cleanDetail || null;
  if (reason === "Other") return cleanDetail || null;
  return cleanDetail ? `${reason}: ${cleanDetail}` : reason;
}

export default function AvailabilityTab({ user, setUser }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [current, setCurrent] = useState({
    availability_status: user?.availability_status || "Available",
    availability_note: "",
    active_work: { cases: 0, legal: 0, volunteer: 0, projects: 0, total: 0 },
  });
  const [form, setForm] = useState({
    status: user?.availability_status || "Available",
    reason: "",
    detail: "",
  });

  const needsReason = REASON_REQUIRED_STATUSES.includes(form.status);
  const needsDetail = needsReason && form.reason === "Other";
  const activeWorkParts = useMemo(() => formatWorkParts(current.active_work), [current.active_work]);

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      if (!user?.user_id) return;
      setLoading(true);
      setError("");
      try {
        const data = await fetchAvailabilityFor(user.user_id);
        if (cancelled) return;
        const next = {
          availability_status: data.availability_status || "Available",
          availability_note: data.availability_note || "",
          active_work: data.active_work || { cases: 0, legal: 0, volunteer: 0, projects: 0, total: 0 },
        };
        const noteParts = splitAvailabilityNote(next.availability_note);
        setCurrent(next);
        setForm({
          status: next.availability_status,
          reason: REASON_REQUIRED_STATUSES.includes(next.availability_status) ? noteParts.reason : "",
          detail: REASON_REQUIRED_STATUSES.includes(next.availability_status) ? noteParts.detail : "",
        });
        setUser?.((existing) => existing ? { ...existing, availability_status: next.availability_status } : existing);
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load availability.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAvailability();
    return () => { cancelled = true; };
  }, [setUser, user?.user_id]);

  function updateField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      return next;
    });
    setError("");
    setSuccess("");
  }

  function validate() {
    const next = {};
    if (needsReason && !form.reason) next.reason = "Choose a reason for this status.";
    if (needsDetail && !form.detail.trim()) next.detail = "Add details when the reason is Other.";
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    const payload = {
      availability_status: form.status,
      availability_note: needsReason ? buildAvailabilityNote(form.reason, form.detail) : null,
    };

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await updateStaffAvailability(user.user_id, payload);
      const refreshed = await fetchAvailabilityFor(user.user_id);
      const nextStatus = refreshed.availability_status || updated.availability_status || form.status;
      setCurrent({
        availability_status: nextStatus,
        availability_note: refreshed.availability_note || "",
        active_work: refreshed.active_work || current.active_work,
      });
      const noteParts = splitAvailabilityNote(refreshed.availability_note);
      setForm({
        status: nextStatus,
        reason: REASON_REQUIRED_STATUSES.includes(nextStatus) ? noteParts.reason : "",
        detail: REASON_REQUIRED_STATUSES.includes(nextStatus) ? noteParts.detail : "",
      });
      setUser?.((existing) => existing ? { ...existing, availability_status: nextStatus } : existing);
      setSuccess("Availability updated.");
    } catch (err) {
      setError(err.message || "Unable to update availability.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.wrap}>
      {success && <div className={styles.flashSuccess}><FiCheck size={16} /> {success}</div>}
      {error && <div className={styles.flashError}><FiAlertCircle size={16} /> {error}</div>}

      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.cardTitle}>Availability</div>
        <p className={styles.cardDesc}>
          Keep assignment teams informed when you are available for new work or temporarily away.
        </p>

        <div className={styles.contextPanel}>
          <div>
            <p className={styles.contextLabel}>Current status</p>
            <AvailabilityBadge status={current.availability_status} compact />
          </div>
          <div>
            <p className={styles.contextLabel}>Active work</p>
            {loading ? (
              <p className={styles.contextValue}>Loading...</p>
            ) : activeWorkParts.length ? (
              <p className={styles.contextValue}>You currently have {activeWorkParts.join(", ")}.</p>
            ) : (
              <p className={styles.contextValue}>You have no active work assigned.</p>
            )}
          </div>
        </div>

        <div className={styles.grid1}>
          <Field label="Availability status">
            <select
              value={form.status}
              onChange={(event) => updateField("status", event.target.value)}
              disabled={loading || saving}
            >
              {AVAILABILITY_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </Field>

          {needsReason && (
            <Field label="Reason" error={fieldErrors.reason}>
              <select
                value={form.reason}
                onChange={(event) => updateField("reason", event.target.value)}
                disabled={saving}
              >
                <option value="">Select reason...</option>
                {AVAILABILITY_REASONS.map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </Field>
          )}

          {needsReason && (
            <Field label={needsDetail ? "Details" : "Optional details"} error={fieldErrors.detail}>
              <textarea
                value={form.detail}
                onChange={(event) => updateField("detail", event.target.value)}
                placeholder={needsDetail ? "Please explain the reason." : "Optional context for schedulers"}
                disabled={saving}
              />
            </Field>
          )}
        </div>

        {needsReason && current.active_work?.total > 0 && (
          <div className={styles.warnNote}>
            <FiClock size={15} />
            This will not automatically reassign your current work. Please coordinate with an admin if reassignment is needed.
          </div>
        )}

        <div className={styles.formActions}>
          <button type="submit" className={styles.btnPrimary} disabled={loading || saving}>
            {saving ? "Saving..." : "Save availability"}
          </button>
        </div>
      </form>
    </div>
  );
}
