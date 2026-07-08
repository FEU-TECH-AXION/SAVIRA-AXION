"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/navbar/navbar";
import styles from "./AdminDashboard.module.css";
import { authFetch, useAuth } from "@/lib/AuthContext";
import DashboardEventsCard from "@/components/dashboard/complainant/DashboardEventsCard";
import DashboardHeatmapCard from "@/components/dashboard/complainant/DashboardHeatmapCard";
import DeadlineItem from "@/components/dashboard/DeadlineItem";
import {
  buildConfirmedInterviewDeadlines,
  buildLegalCaseDeadlines,
  buildProjectDeadlines,
  buildProjectTaskDeadlines,
  limitUpcomingDeadlines,
} from "@/lib/dashboardDeadlines";

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
function unwrapList(payload, preferredKey) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  if (preferredKey && Array.isArray(payload[preferredKey])) {
    return payload[preferredKey];
  }

  const commonKeys = ["data", "items", "records", "results", "projects", "users", "cases", "volunteers"];
  const listKey = commonKeys.find((key) => Array.isArray(payload[key]));
  return listKey ? payload[listKey] : [];
}

async function fetchList(url, preferredKey) {
  const response = await authFetch(url, { cache: "no-store" });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    console.error(`[AdminDashboard] Failed to fetch ${url}: ${response.status}`, message);
    return [];
  }

  const payload = await response.json().catch(() => null);
  return unwrapList(payload, preferredKey);
}

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
        const [projects, summaryRes, interviews, projectTasks, legalDeadlines] = await Promise.all([
          fetchList(`${API_URL}/api/projects`, "projects"),
          authFetch(`${API_URL}/api/dashboard/summary-counts`, { cache: "no-store" }),
          fetchList(`${API_URL}/api/interviews?type=case_report`, "data"),
          fetchList(`${API_URL}/api/project-tasks`, "data"),
          fetchList(`${API_URL}/api/legal_reviews/deadlines?limit=100`, "data"),
        ]);
        const summaryPayload = summaryRes.ok ? await summaryRes.json().catch(() => ({})) : {};
        const summary = summaryPayload.data || {};

        if (isMounted) {
          setStatsData({ projects, summary, interviews, projectTasks, legalDeadlines });
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        if (isMounted) {
          setStatsData({ projects: [], summary: {}, interviews: [], projectTasks: [], legalDeadlines: [] });
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
    const summary = statsData.summary || {};
    return [
      { num: summary.projects?.total || 0, label: "Total Projects", hasNew: false },
      { num: summary.users?.total || 0, label: "Total Users",    hasNew: false },
      { num: summary.cases?.total || 0, label: "Total Cases",    hasNew: false },
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

    const summary = statsData.summary || {};
    const unassigned = summary.cases?.unassigned || 0;
    const underVerification = summary.cases?.forVerification || 0;
    const newAppsToday = summary.volunteers?.newToday || 0;
    const reviewApps = summary.volunteers?.reviewApplications || 0;

    return [
      { category: "Case",      label: "Unassigned Cases",       count: unassigned,        showView: true,  viewHref: "/cases" },
      { category: "Case",      label: "Under Verification",     count: underVerification, showView: true,  viewHref: "/cases" },
      { category: "New Applicants", label: "New Applications Today", count: newAppsToday,      showView: false },
      { category: "Volunteer", label: "Review Applications",    count: reviewApps,        showView: true,  viewHref: "/volunteer" },
    ];
  }, [statsData]);

  const deadlines = useMemo(() => {
    if (!statsData) return [];
    return limitUpcomingDeadlines([
      ...buildConfirmedInterviewDeadlines(statsData.interviews, { limit: Infinity }),
      ...buildProjectTaskDeadlines(statsData.projectTasks, { limit: Infinity }),
      ...buildProjectDeadlines(statsData.projects, { limit: Infinity }),
      ...buildLegalCaseDeadlines(statsData.legalDeadlines, { limit: Infinity }),
    ], Infinity);
  }, [statsData]);

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
