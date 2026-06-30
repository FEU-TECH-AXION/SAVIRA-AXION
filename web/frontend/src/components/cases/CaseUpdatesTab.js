"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/AuthContext";
import { API_URL } from "@/lib/config";
import { STATUS_EXPLANATIONS } from "./CaseDetailsPage";
import styles from "./ViewCase.module.css";

function formatUpdateDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value || "";
  return parsed.toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" });
}

export default function CaseUpdatesTab({ caseId }) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchUpdates() {
      setLoading(true);
      setError("");
      try {
        const res = await authFetch(`${API_URL}/api/case_reports/${caseId}/public-updates`, { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Failed to load case updates.");
        if (!cancelled) setUpdates(body.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load case updates.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (caseId) fetchUpdates();
    return () => { cancelled = true; };
  }, [caseId]);

  if (loading) {
    return <div className={styles.loadingCard}>Loading case details...</div>;
  }

  if (error) {
    return <div className={styles.errorBox}>{error}</div>;
  }

  if (updates.length === 0) {
    return (
      <section className={styles.section}>
        <p className={styles.emptyState}>No updates yet. You&apos;ll see progress on your case here as your case officer or legal team adds updates.</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.historyList}>
        {updates.map((entry, index) => {
          const statusCopy = entry.type === "status" ? STATUS_EXPLANATIONS[entry.title] : null;
          const title = statusCopy?.title || entry.title || "Case Update";
          const description = statusCopy?.description || entry.description;

          return (
            <div key={entry.id} className={styles.historyItem}>
              <div style={{ textAlign: "center" }}>
                <div className={styles.historyDot} />
                {index < updates.length - 1 && (
                  <div style={{ width: 2, height: 44, background: "#e5e7eb", margin: "0 auto" }} />
                )}
              </div>
              <div className={styles.caseUpdateContent}>
                <h3 className={styles.caseUpdateTitle}>{title}</h3>
                <p className={styles.historyMeta}>{formatUpdateDate(entry.date)}</p>
                {description && <p className={styles.historyNotes}>{description}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
