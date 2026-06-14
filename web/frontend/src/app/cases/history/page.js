"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./ReportHistory.module.css";

// ── Status name map ───────────────────────────────────────────────────────────
const STATUS_NAME_MAP = {
  'Submitted':             'Submitted',
  'For Verification':      'For Verification',
  'Undergoing Review':     'Undergoing Review',
  'Verified - True':       'Verified - True',
  'Verified - False':      'Verified - False',
  'Under Case Evaluation': 'Under Case Evaluation',
  'Case Filed':            'Case Filed',
  'Investigation Ongoing': 'Investigation Ongoing',
  'Hearing Ongoing':       'Hearing Ongoing',
  'Dismissed':             'Dismissed',
  'Perpetrator Convicted': 'Perpetrator Convicted',
  'Resolved':              'Resolved',
  'Withdrawn':             'Withdrawn',
};

// ── Case status → 3-step display ─────────────────────────────────────────────
const STATUS_DISPLAY = {
  "For Verification":      { middle: "For Verification",      phase: 1 },
  "Undergoing Review":     { middle: "Undergoing Review",     phase: 1 },
  "Verified - True":       { middle: "Verified",              phase: 1 },
  "Verified - False":      { middle: "Verified",              phase: 1 },
  "Under Case Evaluation": { middle: "Under Case Evaluation", phase: 1 },
  "Case Filed":            { middle: "Case Filed",            phase: 1 },
  "Investigation Ongoing": { middle: "Investigation Ongoing", phase: 1 },
  "Hearing Ongoing":       { middle: "Hearing Ongoing",       phase: 1 },
  "Dismissed":             { middle: "Dismissed",             phase: 2 },
  "Perpetrator Convicted": { middle: "Perpetrator Convicted", phase: 2 },
};

// ── Status Stepper ────────────────────────────────────────────────────────────
function StatusStepper({ statusName }) {
  const { middle, phase } = STATUS_DISPLAY[statusName] ?? { middle: "In Progress", phase: 1 };
  const steps = ["Submitted", middle, "Resolved"];

  return (
    <div className={styles.stepper}>
      {steps.map((label, i) => {
        const done   = i < phase;
        const active = i === phase;
        return (
          <div key={i} className={styles.stepItem}>
            {i > 0 && (
              <div className={`${styles.stepLine} ${done || active ? styles.stepLineDone : ""}`} />
            )}
            <div
              className={`${styles.stepDot} ${active ? styles.stepDotActive : ""} ${done ? styles.stepDotDone : ""}`}
            />
            <span className={`${styles.stepLabel} ${active ? styles.stepLabelActive : ""}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Relative time helper ──────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return null;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days  < 30) return `${days} day${days !== 1 ? "s" : ""} ago`;
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });
}

// ── Report Status Card ────────────────────────────────────────────────────────
function ReportStatusCard({ reportData, reportNumber }) {
  const router = useRouter();
  const {
    id                = "—",
    caseId            = null,
    dateSubmitted     = "—",
    assignedPersonnel = null,
    lastUpdated       = null,
    statusName        = "For Verification",
  } = reportData ?? {};

  const displayId      = caseId ?? `CASE-${String(id).padStart(5, "0")}`;
  const personnelLabel = assignedPersonnel ?? "Unassigned";
  const updatedAgo     = timeAgo(lastUpdated);

  return (
    <div className={styles.statusCard}>
      <div className={styles.statusCardHeader}>
        <span>Report {reportNumber}</span>
        <button
          className={styles.headerViewBtn}
          onClick={() => router.push(`/cases/view?caseId=${id}&from=cases`)}
        >
          View →
        </button>
      </div>

      <div className={styles.statusCardBody}>
        {/* Case ID + last-updated */}
        <div className={styles.cardTopRow}>
          <span className={styles.cardCaseId}>{displayId}</span>
          {updatedAgo && (
            <span className={styles.cardUpdated}>Updated {updatedAgo}</span>
          )}
        </div>

        {/* Meta grid */}
        <div className={styles.cardMetaGrid}>
          <div className={styles.cardMetaItem}>
            <span className={styles.cardMetaLabel}>Date Submitted</span>
            <span className={styles.cardMetaValue}>{dateSubmitted}</span>
          </div>
          <div className={styles.cardMetaItem}>
            <span className={styles.cardMetaLabel}>Assigned Personnel</span>
            <span
              className={`${styles.cardMetaValue} ${
                !assignedPersonnel ? styles.cardMetaUnassigned : ""
              }`}
            >
              {personnelLabel}
            </span>
          </div>
        </div>

        <StatusStepper statusName={statusName} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReportHistoryPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    async function fetchReports() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_URL}/api/case_reports/my-reports`, {
          credentials: "include",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || `Server error (${res.status})`);
        }
        const json = await res.json();
        // Support both { data: [...] } and a bare array
        setReports(Array.isArray(json) ? json : json.data || []);
      } catch (err) {
        setError(err.message || "Failed to load report history.");
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

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
                  Report History
                </p>
                <h1 className={styles.heroTitle}>Your Reports</h1>
                <p className={styles.heroDesc}>
                  Track and view all of your submitted reports.
                </p>
              </div>
            </div>
          </section>

          {/* Cards */}
          <div className="row g-3">
            {loading && <p>Loading report history…</p>}

            {error && (
              <div className="col-12">
                <div className={styles.errorAlert}>{error}</div>
              </div>
            )}

            {!loading && !error && reports.length === 0 && (
              <p>No reports submitted yet.</p>
            )}

            {reports.map((report, i) => (
              <div className="col-12" key={report.case_report_id}>
                <ReportStatusCard
                  reportNumber={i + 1}
                  reportData={{
                    id:                report.case_report_id,
                    dateSubmitted:     report.created_at
                      ? new Date(report.created_at).toLocaleDateString("en-PH", {
                          year: "numeric", month: "long", day: "numeric",
                        })
                      : "—",
                    assignedPersonnel: report.assigned_officer ?? null,
                    lastUpdated:       report.updated_at ?? report.created_at ?? null,
                    statusName:
                      STATUS_NAME_MAP[report.case_status?.status_name] ??
                      "For Verification",
                  }}
                />
              </div>
            ))}
          </div>

        </div>
      </div>
    </main>
  );
}