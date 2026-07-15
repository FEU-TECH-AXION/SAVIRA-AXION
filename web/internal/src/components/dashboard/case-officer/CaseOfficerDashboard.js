"use client";

import { useState, useEffect, useMemo } from "react";
import styles from "./CaseOfficerDashboard.module.css";
import { useAuth } from "@/lib/AuthContext";
import { useI18n } from "@/lib/i18n";
import { internalApiFetch } from "@/lib/internalApiFetch";
import DashboardEventsCard from "@/components/dashboard/shared/DashboardEventsCard";
import DashboardHeatmapCard from "@/components/dashboard/shared/DashboardHeatmapCard";
import DeadlineItem from "@/components/dashboard/DeadlineItem";

// TODO: Nav links for Case Officer are temporary — update with correct pages later
// TODO: Overview counts are placeholder — connect to real API when ready

function OverviewCard({ category, label, count, showView = false }) {
  return (
    <div className={styles.overviewCard}>
      <div className={styles.overviewCardHeader}><span>{category}</span></div>
      <div className={styles.overviewCardBody}>
        <p className={styles.overviewLabel}>{label}</p>
        <p className={styles.overviewCount}>{count}</p>
        {showView && <button className={styles.viewBtn}>View &rarr;</button>}
      </div>
    </div>
  );
}

// ── Cookies ─────────────────────────────────────────────────────────────────────

export default function CaseOfficerDashboard() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [summary, setSummary] = useState(null);

  const user = authUser
    ? {
        role: authUser.role_name,
        firstName: authUser.first_name,
        lastName: authUser.last_name,
      }
    : { role: "", firstName: "", lastName: "" };

  useEffect(() => {
    if (authLoading || !authUser?.user_id) return;
    async function fetchDashboardData() {
      try {
        const summaryRes = await internalApiFetch("/api/dashboard/case-officer-summary", { cache: "no-store" });
        if (summaryRes.ok) {
          const json = await summaryRes.json().catch(() => ({}));
          setSummary(json.data || {});
        }
      } catch (err) {
        console.error("Failed to fetch CaseOfficerDashboard data:", err);
      }
    }
    fetchDashboardData();
  }, [authLoading, authUser?.user_id]);

  const stats = useMemo(() => {
    const forVerification = summary?.counts?.forVerification || 0;
    const totalAssigned = summary?.counts?.totalAssignedCases || 0;

    return [
      { num: forVerification, label: "For Verification",    hasNew: forVerification > 0 },
      { num: totalAssigned,    label: "Total Assigned Cases", hasNew: totalAssigned > 0 },
    ];
  }, [summary]);

  const overviewCards = useMemo(() => {
    const forVerification = summary?.counts?.forVerification || 0;
    const totalAssigned = summary?.counts?.totalAssignedCases || 0;

    return [
      { category: "Case",    label: "For Verification",             count: forVerification, showView: true },
      { category: "Case",    label: "Your total assigned cases are", count: totalAssigned,    showView: true },
    ];
  }, [summary]);

  const deadlines = summary?.deadlines || [];
  if (authLoading) return <p>Loading...</p>;
  if (!authUser) return null;

  return (
    <main className={styles.pageWrapper}>

        <section className={styles.heroBanner}>
          <div className={styles.dashboardContainer}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>{t("dashboardWelcome")}, {user.firstName} {user.lastName}!</h1>
              <div className={styles.statGrid}>
                {stats.map(({ num, label, hasNew }) => (
                  <div key={label} className={styles.statGridItem}>
                    <div className={styles.statCard}>
                      {/* {hasNew && <span className={styles.statDot} />} */}
                      <p className={styles.statNum}>{num}</p>
                      <p className={styles.statLabel}>{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className={styles.dashboardContainer}>
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>Overview</h2>
            <div className={styles.headingLine} />
          </div>

          <div className={styles.dashboardOverviewGrid}>
            <div className={styles.dashboardMainColumn}>
              <div className={styles.moduleOverviewGrid}>
                {overviewCards.map((card, i) => (
                  <div key={i} className={styles.moduleOverviewItem}>
                    <OverviewCard {...card} />
                  </div>
                ))}
              </div>
              <DashboardHeatmapCard />
            </div>
            <div className={styles.dashboardSideColumn}>
              <DashboardEventsCard />
              <div className={styles.deadlinesCard}>
                <h3 className={styles.deadlinesTitle}>Upcoming Deadlines</h3>
                {deadlines.length === 0 ? (
                  <p className={styles.deadlineEmpty}>No upcoming deadlines.</p>
                ) : deadlines.map((d, i) => <DeadlineItem key={i} {...d} styles={styles} />)}
              </div>
            </div>
          </div>

        </div>
      </main>
  );
}
