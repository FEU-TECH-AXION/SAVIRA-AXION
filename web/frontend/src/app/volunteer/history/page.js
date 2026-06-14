"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../apply/ApplyApplicationForm.module.css";

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

export default function ApplicationHistoryPage() {
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("savira_volunteer_application_draft");
      setDraft(raw ? JSON.parse(raw) : null);
    } catch (_) {
      setDraft(null);
    }

    async function fetchApplications() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_URL}/api/volunteer_applications/my_applications`, { credentials: "include" });
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

  return (
    <main className={styles.pageWrapper}>
      <div className={styles.pageInner}>
        <div className="container-xl py-5">
          <section className={styles.hero}>
            <div className={styles.heroInner}>
              <div className={styles.heroContent}>
                <p className={styles.heroEyebrow}><span className={styles.heroLine} />Application History</p>
                <h1 className={styles.heroTitle}>Your Volunteer Applications</h1>
                <p className={styles.heroDesc}>Track submitted applications and continue unfinished drafts.</p>
              </div>
            </div>
          </section>

          <div className="row g-3">
            {draft && (
              <div className="col-12">
                <HistoryCard
                  title="Draft Application"
                  status="Draft"
                  date={`Last saved: ${formatDate(draft.updatedAt)}`}
                  description={draft.essay?.description || "Unsubmitted volunteer application draft."}
                  action={<button className={styles.submitBtn} onClick={() => router.push("/volunteer/apply")}>Continue Draft</button>}
                />
              </div>
            )}

            {loading && <p>Loading application history...</p>}
            {error && <div className={styles.submitError}>{error}</div>}
            {!loading && !error && applications.length === 0 && !draft && <p>No applications yet.</p>}

            {applications.map((app, index) => (
              <div className="col-12" key={app.volunteer_application_id}>
                <HistoryCard
                  title={`Application #${index + 1}`}
                  status={app.application_status || "pending"}
                  date={`Submitted: ${formatDate(app.created_at)}`}
                  description={app.essay_response || "Submitted volunteer application."}
                  action={
                    <button className={styles.submitBtn} onClick={() => router.push(`/volunteer/view?id=${app.volunteer_application_id}`)}>
                      View Application
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
