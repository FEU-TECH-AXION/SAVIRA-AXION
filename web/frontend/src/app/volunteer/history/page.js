"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
// ── Uses its own dedicated stylesheet ─────────────────────────────────────────
import styles from "./VolunteerHistory.module.css";
import { IoIosInformationCircle, IoIosWarning } from "react-icons/io";
import VolunteerApplicationStatusCard from "@/components/volunteer/VolunteerApplicationStatusCard";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { authFetch, useAuth } from "@/lib/AuthContext";

// ── Status badge colors ───────────────────────────────────────────────────────
const STATUS_COLORS = {
  "pending":   { bg: "#fef9c3", color: "#854d0e" },
  "reviewing": { bg: "#dbeafe", color: "#1e40af" },
  "approved":  { bg: "#d1fae5", color: "#065f46" },
  "rejected":  { bg: "#fee2e2", color: "#991b1b" },
  "withdrawn": { bg: "#f3f4f6", color: "#374151" },
  "Draft":     { bg: "#f3f4f6", color: "#374151" },
};

const REAPPLICATION_WAIT_DAYS = 15;
const REAPPLICATION_WAIT_MS = REAPPLICATION_WAIT_DAYS * 24 * 60 * 60 * 1000;
const VOLUNTEER_APPLICATION_DRAFT_KEY = "savira_volunteer_application_draft";
const REAPPLICATION_ALLOWED_STATUSES = new Set(["rejected", "withdrawn"]);

function getUserDraftKey(user) {
  return user?.id || user?.user_id || user?.email || "anonymous";
}

function getScopedDraftKey(baseKey, user) {
  return `${baseKey}:${getUserDraftKey(user)}`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getApplicationDecisionDate(application = {}) {
  return (
    application.resolved_at ||
    application.updated_at ||
    application.created_at ||
    null
  );
}

function formatStatus(status) {
  return String(status || "application")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function HistoryCard({ title, status, date, description, action }) {
  const key = status?.toLowerCase();
  const badgeStyle =
    STATUS_COLORS[key] ?? STATUS_COLORS[status] ?? { bg: "#f3f4f6", color: "#374151" };

  return (
    <div className={styles.statusCard}>
      <div className={styles.statusCardHeader}>
        <div>
          <h3>{title}</h3>
          <p>{date}</p>
        </div>
        <span
          style={{
            background:   badgeStyle.bg,
            color:        badgeStyle.color,
            borderRadius: "999px",
            padding:      "3px 12px",
            fontSize:     "0.75rem",
            fontWeight:   700,
            whiteSpace:   "nowrap",
          }}
        >
          {status}
        </span>
      </div>
      <div className={styles.statusCardBody}>
        <p>{description}</p>
        {action}
      </div>
    </div>
  );
}

// ── Derive submission eligibility from the applicant's history ────────────────
/**
 * Returns one of:
 *   { allowed: true }
 *   { allowed: false, reason: "active", applicationId }
 *   { allowed: false, reason: "cooldown", unlocksAt: Date }
 */
function getSubmissionEligibility(applications) {
  if (!applications.length) return { allowed: true };

  const approvedApplication = applications.find(
    (app) => (app.application_status || "").toLowerCase() === "approved"
  );
  if (approvedApplication) {
    return {
      allowed: false,
      reason: "approved",
      applicationId: approvedApplication.volunteer_application_id,
    };
  }

  const blockingApplication = applications.find((app) => {
    const status = (app.application_status || "").toLowerCase();
    return !REAPPLICATION_ALLOWED_STATUSES.has(status);
  });
  if (blockingApplication) {
    return {
      allowed: false,
      reason: "active",
      applicationId: blockingApplication.volunteer_application_id,
      status: blockingApplication.application_status,
    };
  }

  const latestTerminalApplication = applications
    .filter((app) =>
      REAPPLICATION_ALLOWED_STATUSES.has((app.application_status || "").toLowerCase())
    )
    .sort(
      (a, b) =>
        new Date(getApplicationDecisionDate(b) || 0) -
        new Date(getApplicationDecisionDate(a) || 0)
    )[0];

  const decisionAt = new Date(getApplicationDecisionDate(latestTerminalApplication));
  if (!Number.isNaN(decisionAt.getTime())) {
    const unlocksAt = new Date(decisionAt.getTime() + REAPPLICATION_WAIT_MS);
    if (Date.now() < unlocksAt.getTime()) {
      return {
        allowed: false,
        reason: "cooldown",
        unlocksAt,
        status: latestTerminalApplication.application_status,
      };
    }
  }

  return { allowed: true };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ApplicationHistoryPage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState([]);
  const [draft,        setDraft]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [undoWithdrawModalOpen, setUndoWithdrawModalOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const draftStorageKey = getScopedDraftKey(VOLUNTEER_APPLICATION_DRAFT_KEY, authUser);

  useEffect(() => {
    if (authLoading) return undefined;

    const draftTimer = window.setTimeout(() => {
      try {
        localStorage.removeItem(VOLUNTEER_APPLICATION_DRAFT_KEY);
        const raw = localStorage.getItem(draftStorageKey);
        setDraft(raw ? JSON.parse(raw) : null);
      } catch (_) {
        setDraft(null);
      }
    }, 0);

    async function fetchApplications() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await authFetch(
          `${API_URL}/api/volunteer_applications/my_applications`
        );
        if (!res.ok) throw new Error("Failed to load application history.");
        const json = await res.json();
        setApplications(Array.isArray(json) ? json : json.data || []);
      } catch (err) {
        setError(err.message || "Failed to load application history.");
      } finally {
        setLoading(false);
      }
    }
    fetchApplications();
    return () => window.clearTimeout(draftTimer);
  }, [authLoading, draftStorageKey]);

  const handleWithdraw = async () => {
    if (!selectedAppId) return;
    setActionBusy(true);
    setActionError("");
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await authFetch(`${API_URL}/api/volunteer_applications/${selectedAppId}/withdraw`, {
        method: "POST"
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to withdraw application.");
      setApplications((current) =>
        current.map((app) =>
          app.volunteer_application_id === selectedAppId
            ? { ...app, application_status: "withdrawn" }
            : app
        )
      );
      setWithdrawModalOpen(false);
      setSelectedAppId(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleUndoWithdraw = async () => {
    if (!selectedAppId) return;
    setActionBusy(true);
    setActionError("");
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await authFetch(`${API_URL}/api/volunteer_applications/${selectedAppId}/undo_withdraw`, {
        method: "POST"
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to undo withdrawal.");
      const restoredStatus = body.data?.application_status || "pending";
      setApplications((current) =>
        current.map((app) =>
          app.volunteer_application_id === selectedAppId
            ? { ...app, application_status: restoredStatus }
            : app
        )
      );
      setUndoWithdrawModalOpen(false);
      setSelectedAppId(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  // Eligibility is derived from the fetched list (cheap, client-side)
  const eligibility = useMemo(
    () => (loading ? null : getSubmissionEligibility(applications)),
    [loading, applications]
  );

  useEffect(() => {
    if (loading || !eligibility || eligibility.allowed) return;
    const cleanupTimer = window.setTimeout(() => {
      localStorage.removeItem(draftStorageKey);
      localStorage.removeItem(VOLUNTEER_APPLICATION_DRAFT_KEY);
      setDraft(null);
    }, 0);
    return () => window.clearTimeout(cleanupTimer);
  }, [loading, eligibility, draftStorageKey]);

  return (
    <main className={styles.pageWrapper}>
      <div className={styles.pageInner}>
        <div className="container-xl py-5">

          {/* Hero */}
          <section className={styles.hero}>
            <div className={styles.heroInner}>
              <div className={styles.heroContent}>
                <p className={styles.heroEyebrow}>
                  <span className={styles.heroLine} />
                  Application History
                </p>
                <h1 className={styles.heroTitle}>Your Volunteer Applications</h1>
                <p className={styles.heroDesc}>
                  Track submitted applications and continue unfinished drafts.
                </p>
              </div>
            </div>
          </section>

          {/* ── Eligibility banners ── */}
          {!loading && eligibility && !eligibility.allowed && (
            eligibility.reason === "approved" ? (
              <div className={styles.infoBanner}>
                <span><IoIosInformationCircle /></span>
                <span>
                  Your volunteer application has already been approved. You can&apos;t submit another application.
                </span>
              </div>
            ) : eligibility.reason === "active" ? (
              <div className={styles.infoBanner}>
                <span><IoIosInformationCircle /></span>
                <span>
                  You already have an application marked{" "}
                  <strong>{formatStatus(eligibility.status)}</strong>. You can&apos;t submit another application while it is under review.
                </span>
              </div>
            ) : (
              <div className={styles.warningBanner}>
                <span><IoIosWarning /></span>
                <span>
                  Your previous application was {String(eligibility.status || "").toLowerCase()}. You may submit a new
                  application after{" "}
                  <strong>
                    {eligibility.unlocksAt.toLocaleDateString("en-PH", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </strong>{" "}
                  ({REAPPLICATION_WAIT_DAYS}-day waiting period).
                </span>
              </div>
            )
          )}

          <div className="row g-3">
            {/* Draft card */}
            {draft && (!eligibility || eligibility.allowed) && (
              <div className="col-12">
                <HistoryCard
                  title="Draft Application"
                  status="Draft"
                  date={`Last saved: ${formatDate(draft.updatedAt)}`}
                  description={draft.essay?.description || "Unsubmitted volunteer application draft."}
                  action={
                    <button
                      className={styles.submitBtn}
                      disabled={eligibility && !eligibility.allowed}
                      onClick={() => router.push("/volunteer/apply")}
                    >
                      Continue Draft
                    </button>
                  }
                />
              </div>
            )}

            {loading && <p>Loading application history…</p>}
            {error   && <div className={styles.submitError}>{error}</div>}
            {actionError && <div className={styles.submitError}>{actionError}</div>}
            {!loading && !error && applications.length === 0 && !draft && (
              <p>No applications yet.</p>
            )}

            {applications.map((app, index) => {
              const status = app.application_status || "pending";

              return (
                <div className="col-12" key={app.volunteer_application_id}>
                  <VolunteerApplicationStatusCard
                    application={app}
                    title={`Application ${index + 1}`}
                    headerActions={
                      <>
                        {(status.toLowerCase() === "pending" ||
                          status.toLowerCase() === "reviewing") && (
                          <button
                            type="button"
                            className={styles.headerActionBtn}
                            onClick={() => {
                              setSelectedAppId(app.volunteer_application_id);
                              setWithdrawModalOpen(true);
                            }}
                          >
                            Withdraw
                          </button>
                        )}
                        {status.toLowerCase() === "withdrawn" && (
                          <button
                            type="button"
                            className={styles.headerActionBtn}
                            onClick={() => {
                              setSelectedAppId(app.volunteer_application_id);
                              setUndoWithdrawModalOpen(true);
                            }}
                          >
                            Undo Withdraw
                          </button>
                        )}
                      </>
                    }
                  />
                </div>
              );
            })}
          </div>

          <ConfirmDialog
            open={withdrawModalOpen}
            title="Withdraw Application"
            description="Are you sure you want to withdraw this volunteer application?"
            detail="You can restore the application later from this history page."
            confirmLabel="Withdraw Application"
            cancelLabel="Keep Application"
            tone="danger"
            busy={actionBusy}
            dismissible={!actionBusy}
            onCancel={() => {
              if (!actionBusy) {
                setWithdrawModalOpen(false);
                setSelectedAppId(null);
              }
            }}
            onConfirm={handleWithdraw}
          />

          <ConfirmDialog
            open={undoWithdrawModalOpen}
            title="Restore Application"
            description="Do you want to undo the withdrawal and resume this application?"
            detail="Its status will return to pending or reviewing based on its existing assignments."
            confirmLabel="Restore Application"
            cancelLabel="Keep Withdrawn"
            busy={actionBusy}
            dismissible={!actionBusy}
            onCancel={() => {
              if (!actionBusy) {
                setUndoWithdrawModalOpen(false);
                setSelectedAppId(null);
              }
            }}
            onConfirm={handleUndoWithdraw}
          />

        </div>
      </div>
    </main>
  );
}
