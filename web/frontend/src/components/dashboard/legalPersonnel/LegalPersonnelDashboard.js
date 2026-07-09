"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/navbar/navbar";
import styles from "@/components/dashboard/admin/AdminDashboard.module.css";
import { authFetch, useAuth } from "@/lib/AuthContext";
import DashboardEventsCard from "@/components/dashboard/complainant/DashboardEventsCard";
import DashboardHeatmapCard from "@/components/dashboard/complainant/DashboardHeatmapCard";
import DeadlineItem from "@/components/dashboard/DeadlineItem";

// TODO: Nav links for Legal Personnel are temporary — update with correct pages later
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

export default function LegalPersonnelDashboard() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState(null);

  const user = authUser
    ? {
        role: authUser.role_name,
        firstName: authUser.first_name,
        lastName: authUser.last_name,
      }
    : { role: "", firstName: "", lastName: "" };

  useEffect(() => {
    if (authLoading || !authUser) return;
    async function fetchCases() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
        const summaryRes = await authFetch(`${API_URL}/api/dashboard/legal-summary`, { cache: 'no-store' });
        if (summaryRes.ok) {
          const json = await summaryRes.json().catch(() => ({}));
          setSummary(json.data || {});
        }
      } catch (err) {
        console.error("Failed to fetch cases for LegalPersonnelDashboard:", err);
      }
    }
    fetchCases();
  }, [authLoading, authUser]);

  const stats = useMemo(() => {
    const pendingReview = summary?.counts?.pendingReview || 0;
    const totalAssigned = summary?.counts?.totalAssignedCases || 0;

    return [
      { num: pendingReview, label: "Pending Review",            hasNew: pendingReview > 0 },
      { num: totalAssigned,  label: "Total Assigned Cases",       hasNew: totalAssigned > 0 },
    ];
  }, [summary]);

  const overviewCards = useMemo(() => {
    const pendingReview = summary?.counts?.pendingReview || 0;
    const totalAssigned = summary?.counts?.totalAssignedCases || 0;

    return [
      { category: "Case",    label: "Pending Review",               count: pendingReview, showView: true },
      { category: "My Case", label: "Your total assigned cases are", count: totalAssigned,  showView: true },
    ];
  }, [summary]);

  const deadlines = summary?.deadlines || [];
  if (authLoading) return <p>Loading...</p>;
  if (!authUser) return null;

  return (
    <>
      <Navbar user={user} />
      <main className={styles.pageWrapper}>

        <section className={styles.heroBanner}>
          <div className="container-xl">
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>Welcome, {user.firstName} {user.lastName}!</h1>
              <div className="row g-3 justify-content-center">
                {stats.map(({ num, label, hasNew }) => (
                  <div key={label} className="col-12 col-md-6">
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

        <div className="container-xl py-4">
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
    </>
  );
}
