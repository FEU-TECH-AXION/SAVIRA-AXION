"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/navbar/navbar";
import styles from "@/components/dashboard/admin/AdminDashboard.module.css";
import { authFetch, useAuth } from "@/lib/AuthContext";
import DashboardEventsCard from "@/components/dashboard/complainant/DashboardEventsCard";
import DashboardHeatmapCard from "@/components/dashboard/complainant/DashboardHeatmapCard";
import DeadlineItem from "@/components/dashboard/DeadlineItem";

const MEMBERSHIP_COMMITTEE_ID = 2;

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

export default function StaffDashboard() {
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
    if (authLoading || !authUser?.user_id) return;
    async function fetchDashboardData() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
        const summaryRes = await authFetch(`${API_URL}/api/dashboard/staff-summary`, { cache: "no-store" });
        if (summaryRes.ok) {
          const json = await summaryRes.json().catch(() => ({}));
          setSummary(json.data || {});
        }
      } catch (err) {
        console.error("Failed to fetch StaffDashboard data:", err);
      }
    }
    fetchDashboardData();
  }, [authLoading, authUser?.committee_id, authUser?.user_id]);

  const isMembershipStaff = summary?.staff?.isMembershipStaff ?? Number(authUser?.committee_id) === MEMBERSHIP_COMMITTEE_ID;

  const stats = useMemo(() => {
    if (!isMembershipStaff) {
      const activeProjects = summary?.counts?.activeProjects || 0;
      const openTasks = summary?.counts?.openProjectTasks || 0;

      return [
        { num: activeProjects, label: "Active Projects", hasNew: activeProjects > 0 },
        { num: openTasks, label: "Open Project Tasks", hasNew: openTasks > 0 },
      ];
    }

    const newToday = summary?.counts?.newApplicationsToday || 0;
    const review = summary?.counts?.reviewApplications || 0;

    return [
      { num: newToday, label: "New Applications Today", hasNew: newToday > 0 },
      { num: review, label: "Review Applications", hasNew: review > 0 },
    ];
  }, [isMembershipStaff, summary]);

  const overviewCards = useMemo(() => {
    if (!isMembershipStaff) {
      const upcomingEvents = summary?.counts?.upcomingEvents || 0;
      const overdueTasks = summary?.counts?.overdueTasks || 0;

      return [
        { category: "Events", label: "Upcoming Events", count: upcomingEvents, showView: false },
        { category: "Projects", label: "Overdue Tasks", count: overdueTasks, showView: true },
      ];
    }

    const newToday = summary?.counts?.newApplicationsToday || 0;
    const review = summary?.counts?.reviewApplications || 0;

    return [
      { category: "New Applicants", label: "New Applications Today", count: newToday, showView: false },
      { category: "Volunteer", label: "Review Applications", count: review, showView: true },
    ];
  }, [isMembershipStaff, summary]);

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
