"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/navbar/navbar";
import styles from "./AdminDashboard.module.css";
import { useAuth } from "@/lib/AuthContext";
import DashboardEventsCard from "@/components/dashboard/complainant/DashboardEventsCard";
import DashboardHeatmapCard from "@/components/dashboard/complainant/DashboardHeatmapCard";

// ── Overview stat card ───────────────────────────────────────────────────────
function OverviewCard({ category, label, count, showView = false }) {
  return (
    <div className={styles.overviewCard}>
      <div className={styles.overviewCardHeader}>
        <span>{category}</span>
      </div>
      <div className={styles.overviewCardBody}>
        <p className={styles.overviewLabel}>{label}</p>
        <p className={styles.overviewCount}>{count}</p>
        {showView && (
          <button className={styles.viewBtn}>View &rarr;</button>
        )}
      </div>
    </div>
  );
}

// ── Heatmap Placeholder ──────────────────────────────────────────────────────
// ── Deadline item ────────────────────────────────────────────────────────────
function DeadlineItem({ emoji, title, date }) {
  return (
    <div className={styles.deadlineItem}>
      <div className={styles.deadlineThumb} aria-hidden="true">{emoji}</div>
      <div>
        <p className={styles.deadlineTitle}>{title}</p>
        <p className={styles.deadlineDate}>{date}</p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user: authUser } = useAuth();
  const [statsData, setStatsData] = useState(null);

  const user = authUser ? {
    role: authUser.role_name,
    firstName: authUser.first_name,
    lastName: authUser.last_name,
  } : { role: "admin", firstName: "Admin", lastName: "User" };

  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const [projRes, userRes, caseRes, volRes] = await Promise.all([
          fetch(`${API_URL}/api/projects`, { credentials: 'include', cache: 'no-store' }),
          fetch(`${API_URL}/api/users`, { credentials: 'include', cache: 'no-store' }),
          fetch(`${API_URL}/api/case_reports/all`, { credentials: 'include', cache: 'no-store' }),
          fetch(`${API_URL}/api/volunteer_applications`, { credentials: 'include', cache: 'no-store' }),
        ]);

        const projects = projRes.ok ? await projRes.json() : [];
        const users = userRes.ok ? await userRes.json() : [];
        
        const caseJson = caseRes.ok ? await caseRes.json() : null;
        const cases = Array.isArray(caseJson) ? caseJson : caseJson?.data || [];
        
        const volJson = volRes.ok ? await volRes.json() : null;
        const volunteers = Array.isArray(volJson) ? volJson : volJson?.data || [];

        setStatsData({ projects, users, cases, volunteers });
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
      }
    }
    fetchDashboardStats();
  }, []);

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
        { category: "Case",      label: "Unassigned Cases",       count: 0,  showView: true  },
        { category: "Case",      label: "Under Verification",     count: 0, showView: true  },
        { category: "New Applicants", label: "New Applications Today", count: 0,  showView: false },
        { category: "Volunteer", label: "Review Applications",    count: 0, showView: true  },
      ];
    }

    const cases = statsData.cases || [];
    const volunteers = statsData.volunteers || [];

    const unassigned = cases.filter(c => !c.assigned_officer).length;
    const underVerification = cases.filter(c => c.status === "For Verification" || c.status === "Undergoing Review").length;
    
    const todayStr = new Date().toDateString();
    const newAppsToday = volunteers.filter(v => v.created_at && new Date(v.created_at).toDateString() === todayStr).length;
    
    const reviewApps = volunteers.filter(v => {
      const status = (v.application_status || "").toLowerCase();
      return status === "pending" || status === "under_review";
    }).length;

    return [
      { category: "Case",      label: "Unassigned Cases",       count: unassigned,        showView: true  },
      { category: "Case",      label: "Under Verification",     count: underVerification, showView: true  },
      { category: "New Applicants", label: "New Applications Today", count: newAppsToday,      showView: false },
      { category: "Volunteer", label: "Review Applications",    count: reviewApps,        showView: true  },
    ];
  }, [statsData]);

  const deadlines = [
    { emoji: "🌞", title: "SASHA believes that...",  date: "March 1, 2026"   },
    { emoji: "⭐", title: "SASHA Awareness an...",   date: "August 18, 2026" },
    { emoji: "🎄", title: "Youth Empowerment a...",  date: "April 1, 2026"   },
  ];

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

          <div className="row g-3">
            {/* 2×2 overview cards */}
            <div className="col-12 col-lg-8">
              <div className="row g-3">
                {overviewCards.map((card, i) => (
                  <div key={i} className="col-12 col-sm-6">
                    <OverviewCard {...card} />
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar */}
            <div className="col-12 col-lg-4">
              <DashboardEventsCard />
            </div>
          </div>

          {/* ── Bottom row ── */}
          <div className="row g-3 mt-1">
            <div className="col-12 col-lg-8">
              <DashboardHeatmapCard />
            </div>

            <div className="col-12 col-lg-4">
              <div className={styles.deadlinesCard}>
                <h3 className={styles.deadlinesTitle}>Upcoming Deadlines</h3>
                {deadlines.map((d, i) => (
                  <DeadlineItem key={i} {...d} />
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
