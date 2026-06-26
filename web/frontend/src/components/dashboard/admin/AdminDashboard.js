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
  fetchLegalDeadlinesForCases,
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

const CASE_STATUS_BY_ID = {
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

function getCaseStatus(caseItem) {
  const statusId = Number(caseItem?.case_status_id);
  if (Number.isFinite(statusId) && CASE_STATUS_BY_ID[statusId]) {
    return CASE_STATUS_BY_ID[statusId];
  }

  return String(
    caseItem?.status ||
      caseItem?.status_name ||
      caseItem?.case_status_name ||
      caseItem?.caseStatus ||
      caseItem?.case_statuses?.case_status_name ||
      caseItem?.case_statuses?.status_name ||
      caseItem?.case_status?.status_name ||
      caseItem?.case_status?.case_status_name ||
      caseItem?.case_status?.name ||
      ""
  ).trim();
}

function hasAssignedOfficer(caseItem) {
  return Boolean(
    caseItem?.assigned_officer ||
      caseItem?.assignedOfficer ||
      caseItem?.assigned_case_officer ||
      caseItem?.assigned_officer_id ||
      caseItem?.case_officer_id ||
      caseItem?.caseOfficerId ||
      caseItem?.case_officer ||
      (Array.isArray(caseItem?.assignedOfficers) && caseItem.assignedOfficers.length > 0) ||
      (Array.isArray(caseItem?.assigned_officers) && caseItem.assigned_officers.length > 0) ||
      (Array.isArray(caseItem?.assignments) && caseItem.assignments.length > 0)
  );
}

function getVolunteerStatus(volunteer) {
  return String(
    volunteer?.application_status ||
      volunteer?.applicationStatus ||
      volunteer?.status ||
      volunteer?.volunteer_status ||
      ""
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function getCreatedAt(record) {
  return record?.created_at || record?.createdAt || record?.date_applied || record?.dateApplied || record?.submitted_at;
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
        const [projects, users, cases, volunteers, interviews, projectTasks] = await Promise.all([
          fetchList(`${API_URL}/api/projects`, "projects"),
          fetchList(`${API_URL}/api/users`, "users"),
          fetchList(`${API_URL}/api/case_reports/all`, "cases"),
          fetchList(`${API_URL}/api/volunteer_applications`, "volunteers"),
          fetchList(`${API_URL}/api/interviews?type=case_report`, "data"),
          fetchList(`${API_URL}/api/project-tasks`, "data"),
        ]);
        const legalDeadlines = await fetchLegalDeadlinesForCases(API_URL, cases);

        if (isMounted) {
          setStatsData({ projects, users, cases, volunteers, interviews, projectTasks, legalDeadlines });
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        if (isMounted) {
          setStatsData({ projects: [], users: [], cases: [], volunteers: [], interviews: [], projectTasks: [], legalDeadlines: [] });
        }
      }
    }

    const timer = window.setTimeout(fetchDashboardStats, 0);
    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [authLoading, authUser?.user_id]);

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
      { num: statsData.projects?.length || 0, label: "Total Projects", hasNew: false },
      { num: statsData.users?.length || 0, label: "Total Users",    hasNew: false },
      { num: statsData.cases?.length || 0, label: "Total Cases",    hasNew: false },
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

    const cases = statsData.cases || [];
    const volunteers = statsData.volunteers || [];

    const unassigned = cases.filter((caseItem) => !hasAssignedOfficer(caseItem)).length;
    const underVerification = cases.filter((caseItem) => {
      const status = getCaseStatus(caseItem).toLowerCase();
      return status === "for verification" || status.includes("verification");
    }).length;
    
    const todayStr = new Date().toDateString();
    const newAppsToday = volunteers.filter((volunteer) => {
      const createdAt = getCreatedAt(volunteer);
      return createdAt && new Date(createdAt).toDateString() === todayStr;
    }).length;
    
    const reviewApps = volunteers.filter((volunteer) => {
      const status = getVolunteerStatus(volunteer);
      return (
        status === "pending" ||
        status === "under_review" ||
        status === "reviewing" ||
        status === "for_review" ||
        status.includes("review")
      );
    }).length;

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
