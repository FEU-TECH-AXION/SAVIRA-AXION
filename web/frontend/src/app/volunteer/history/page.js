"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// ── Uses its own dedicated stylesheet ─────────────────────────────────────────
import styles from "./VolunteerHistory.module.css";

// ── Status badge colors ───────────────────────────────────────────────────────
const STATUS_COLORS = {
  "pending":   { bg: "#fef9c3", color: "#854d0e" },
  "reviewing": { bg: "#dbeafe", color: "#1e40af" },
  "approved":  { bg: "#d1fae5", color: "#065f46" },
  "rejected":  { bg: "#fee2e2", color: "#991b1b" },
  "withdrawn": { bg: "#f3f4f6", color: "#374151" },
  "Draft":     { bg: "#f3f4f6", color: "#374151" },
};

// 3 months in milliseconds
const THREE_MONTHS_MS = 3 * 30 * 24 * 60 * 60 * 1000;

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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
  // Active statuses that block a new submission
  const ACTIVE_STATUSES = new Set(["pending", "reviewing"]);

  for (const app of applications) {
    const status = (app.application_status || "").toLowerCase();

    // Has an active (pending/reviewing) application → must withdraw first
    if (ACTIVE_STATUSES.has(status)) {
      return {
        allowed:       false,
        reason:        "active",
        applicationId: app.volunteer_application_id,
      };
    }

    // Was rejected — check if 3-month cooldown has elapsed
    if (status === "rejected") {
      const rejectedAt = new Date(app.updated_at || app.created_at).getTime();
      const unlocksAt  = new Date(rejectedAt + THREE_MONTHS_MS);
      if (Date.now() < unlocksAt) {
        return { allowed: false, reason: "cooldown", unlocksAt };
      }
    }
  }

  return { allowed: true };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ApplicationHistoryPage() {
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [draft,        setDraft]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");

  useEffect(() => {
    // Load any saved draft from localStorage
    try {
      const raw = localStorage.getItem("savira_volunteer_application_draft");
      setDraft(raw ? JSON.parse(raw) : null);
    } catch (_) {
      setDraft(null);
    }

    async function fetchApplications() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(
          `${API_URL}/api/volunteer_applications/my_applications`,
          { credentials: "include" }
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
  }, []);

  // Eligibility is derived from the fetched list (cheap, client-side)
  const eligibility = loading ? null : getSubmissionEligibility(applications);

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
            eligibility.reason === "active" ? (
              <div className={styles.infoBanner}>
                <span>ℹ️</span>
                <span>
                  You already have an active application under review. You must{" "}
                  <strong>withdraw your current application</strong> before submitting
                  a new one.
                </span>
              </div>
            ) : (
              <div className={styles.warningBanner}>
                <span>⏳</span>
                <span>
                  Your previous application was rejected. You may submit a new
                  application after{" "}
                  <strong>
                    {eligibility.unlocksAt.toLocaleDateString("en-PH", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </strong>{" "}
                  (3-month waiting period).
                </span>
              </div>
            )
          )}

          <div className="row g-3">
            {/* Draft card */}
            {draft && (
              <div className="col-12">
                <HistoryCard
                  title="Draft Application"
                  status="Draft"
                  date={`Last saved: ${formatDate(draft.updatedAt)}`}
                  description={draft.essay?.description || "Unsubmitted volunteer application draft."}
                  action={
                    <button
                      className={styles.submitBtn}
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
            {!loading && !error && applications.length === 0 && !draft && (
              <p>No applications yet.</p>
            )}

            {applications.map((app, index) => {
              const status = app.application_status || "pending";

              return (
                <div className="col-12" key={app.volunteer_application_id}>
                  <HistoryCard
                    title={`Application #${index + 1}`}
                    status={status}
                    date={`Submitted: ${formatDate(app.created_at)}`}
                    description={app.essay_response || "Submitted volunteer application."}
                    action={
                      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <button
                          className={styles.submitBtn}
                          onClick={() =>
                            router.push(
                              `/volunteer/view?id=${app.volunteer_application_id}`
                            )
                          }
                        >
                          View Application
                        </button>

                        {/* Show Withdraw only for active applications */}
                        {(status.toLowerCase() === "pending" ||
                          status.toLowerCase() === "reviewing") && (
                          <button
                            className={styles.submitBtn}
                            style={{ background: "#6b7280" }}
                            onClick={() =>
                              router.push(
                                `/volunteer/withdraw?id=${app.volunteer_application_id}`
                              )
                            }
                          >
                            Withdraw
                          </button>
                        )}
                      </div>
                    }
                  />
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </main>
  );
}