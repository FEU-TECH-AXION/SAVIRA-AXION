"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/components/cases/CreateReport.module.css";

const STATUS_STEP = {
  1: "Submitted",
  2: "For Verification",
  3: "Undergoing Review",
  4: "Verified - True",
  5: "Verified - False",
  6: "Under Case Evaluation",
  7: "Case Filed",
  8: "Investigation Ongoing",
  9: "Hearing Ongoing",
  10: "Dismissed",
  11: "Perpetrator Convicted",
  12: "Resolved",
  13: "Withdrawn",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function HistoryCard({ title, status, date, description, action }) {
  return (
    <div className={styles.statusCard}>
      <div className={styles.statusCardHeader}>
        <div>
          <h3>{title}</h3>
          <p>{date}</p>
        </div>
        <span className={styles.statusBadge}>{status}</span>
      </div>
      <div className={styles.statusCardBody}>
        <p>{description}</p>
        {action}
      </div>
    </div>
  );
}

export default function ReportHistoryPage() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("savira_case_report_draft");
      setDraft(raw ? JSON.parse(raw) : null);
    } catch (_) {
      setDraft(null);
    }

    async function fetchReports() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_URL}/api/case_reports/my-reports`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load report history.");
        const json = await res.json();
        setReports(json.data || []);
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
          <section className={styles.hero}>
            <div className={styles.heroInner}>
              <div className={styles.heroContent}>
                <p className={styles.heroEyebrow}><span className={styles.heroLine} />Report History</p>
                <h1 className={styles.heroTitle}>Your Reports</h1>
                <p className={styles.heroDesc}>Track submitted reports and continue unfinished drafts.</p>
              </div>
            </div>
          </section>

          <div className="row g-3">
            {draft && (
              <div className="col-12">
                <HistoryCard
                  title="Draft Report"
                  status="Draft"
                  date={`Last saved: ${formatDate(draft.updatedAt)}`}
                  description={draft.incident?.description || "Unsubmitted report draft."}
                  action={<button className={styles.submitBtn} onClick={() => router.push("/cases")}>Continue Draft</button>}
                />
              </div>
            )}

            {loading && <p>Loading report history...</p>}
            {error && <div className={styles.errorAlert}>{error}</div>}
            {!loading && !error && reports.length === 0 && !draft && <p>No reports yet.</p>}

            {reports.map((report, index) => (
              <div className="col-12" key={report.case_report_id}>
                <HistoryCard
                  title={`Report #${index + 1}`}
                  status={STATUS_STEP[report.case_status_id] || "For Verification"}
                  date={`Submitted: ${formatDate(report.created_at)}`}
                  description={report.incident_description || "Submitted report."}
                  action={
                    <button className={styles.submitBtn} onClick={() => router.push(`/cases/view?caseId=${report.case_report_id}&from=cases`)}>
                      View Report
                    </button>
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
