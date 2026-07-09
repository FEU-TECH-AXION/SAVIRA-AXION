"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/navbar/navbar";
import styles from "./AdminDashboard.module.css";
import { authFetch, useAuth } from "@/lib/AuthContext";
import DashboardEventsCard from "@/components/dashboard/complainant/DashboardEventsCard";
import DashboardHeatmapCard from "@/components/dashboard/complainant/DashboardHeatmapCard";
import DeadlineItem from "@/components/dashboard/DeadlineItem";

// ── Overview stat card ───────────────────────────────────────────────────────
function OverviewCard({ category, label, count, showView = false, viewHref = "#" }) {
  return (
    <div className={styles.overviewCard}>
      <div className={styles.overviewCardHeader}>
        <span>{category}</span>
      </div>
      <div className={styles.overviewCardBody}>
        <p className={styles.overviewLabel}>{label}</p>
        <p className={styles.overviewCount}>{count}</p>
        {showView && (
          <Link className={styles.viewBtn} href={viewHref} aria-label={`View ${label}`}>
            View &rarr;
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Heatmap Placeholder ──────────────────────────────────────────────────────
// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [statsData, setStatsData] = useState(null);

  const user = authUser
    ? {
        role: authUser.role_name,
        firstName: authUser.first_name,
        lastName: authUser.last_name,
      }
    : { role: "", firstName: "", lastName: "" };

  useEffect(() => {
    if (authLoading || !authUser) return;
    let isMounted = true;

    async function fetchDashboardStats() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
        const summaryRes = await authFetch(`${API_URL}/api/dashboard/admin-summary`, { cache: "no-store" });
        const summaryPayload = summaryRes.ok ? await summaryRes.json().catch(() => ({})) : {};
        const summary = summaryPayload.data || {};

        if (isMounted) {
          setStatsData(summary);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        if (isMounted) {
          setStatsData({});
        }
      }
    }

    const timer = window.setTimeout(fetchDashboardStats, 0);
    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [authLoading, authUser]);

  // hasNew drives the orange dot — set to false to hide it
  const stats = useMemo(() => {
    if (!statsData) {
      return [
        { num: 0, label: "Total Projects", hasNew: false },
        { num: 0, label: "Total Users",    hasNew: false },
        { num: 0, label: "Total Cases",    hasNew: false },
      ];
    }
    return [
      { num: statsData.counts?.totalProjects || 0, label: "Total Projects", hasNew: false },
      { num: statsData.counts?.totalUsers || 0, label: "Total Users",    hasNew: false },
      { num: statsData.counts?.totalCases || 0, label: "Total Cases",    hasNew: false },
    ];
  }, [statsData]);

  const overviewCards = useMemo(() => {
    if (!statsData) {
      return [
        { category: "Case",      label: "Unassigned Cases",       count: 0, showView: true,  viewHref: "/cases" },
        { category: "Case",      label: "Under Verification",     count: 0, showView: true,  viewHref: "/cases" },
        { category: "New Applicants", label: "New Applications Today", count: 0,  showView: false },
        { category: "Volunteer", label: "Review Applications",    count: 0, showView: true,  viewHref: "/volunteer" },
      ];
    }

    const unassigned = statsData.counts?.unassignedCases || 0;
    const underVerification = statsData.counts?.underVerification || 0;
    const newAppsToday = statsData.counts?.newApplicationsToday || 0;
    const reviewApps = statsData.counts?.reviewApplications || 0;

    return [
      { category: "Case",      label: "Unassigned Cases",       count: unassigned,        showView: true,  viewHref: "/cases" },
      { category: "Case",      label: "Under Verification",     count: underVerification, showView: true,  viewHref: "/cases" },
      { category: "New Applicants", label: "New Applications Today", count: newAppsToday,      showView: false },
      { category: "Volunteer", label: "Review Applications",    count: reviewApps,        showView: true,  viewHref: "/volunteer" },
    ];
  }, [statsData]);

  const deadlines = statsData?.deadlines || [];

  if (authLoading) return <p>Loading...</p>;
  if (!authUser) return null;

  return (
    <>
      <Navbar user={user} />

      <main className={styles.pageWrapper}>

        {/* ── Hero Banner ── */}
        <section className={styles.heroBanner}>
          <div className="container-xl">
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>
                Welcome, {user.firstName} {user.lastName}!
              </h1>

              <div className="row g-3 justify-content-center">
                {stats.map(({ num, label, hasNew }) => (
                  <div key={label} className="col-12 col-md-4">
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

        {/* ── Overview ── */}
        <div className="container-xl py-4">

          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>Overview</h2>
            <div className={styles.headingLine} />
          </div>

          <div className={styles.dashboardOverviewGrid}>
            {/* 2×2 overview cards */}
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

            {/* Calendar */}
            <div className={styles.dashboardSideColumn}>
              <DashboardEventsCard />
              <div className={styles.deadlinesCard}>
                <h3 className={styles.deadlinesTitle}>Upcoming Deadlines</h3>
                {deadlines.length === 0 ? (
                  <p className={styles.deadlineEmpty}>No upcoming deadlines.</p>
                ) : (
                  <div className={styles.deadlineList}>
                    {deadlines.map((d, i) => (
                      <DeadlineItem key={i} {...d} styles={styles} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
