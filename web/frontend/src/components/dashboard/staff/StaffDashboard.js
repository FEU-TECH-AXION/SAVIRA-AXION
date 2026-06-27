"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/navbar/navbar";
import styles from "@/components/dashboard/admin/AdminDashboard.module.css";
import { authFetch, useAuth } from "@/lib/AuthContext";
import DashboardEventsCard from "@/components/dashboard/complainant/DashboardEventsCard";
import DashboardHeatmapCard from "@/components/dashboard/complainant/DashboardHeatmapCard";
import DeadlineItem from "@/components/dashboard/DeadlineItem";
import { fetchAllProjectTasks, fetchProjects, fetchStaff } from "@/lib/api";
import {
  buildConfirmedInterviewDeadlines,
  buildProjectDeadlines,
  buildProjectTaskDeadlines,
  getActorName,
  limitUpcomingDeadlines,
} from "@/lib/dashboardDeadlines";

// TODO: Nav links for Staff are temporary — update with correct pages later
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

export default function StaffDashboard() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [volunteers, setVolunteers] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [staffRows, setStaffRows] = useState([]);
  const [interviews, setInterviews] = useState([]);

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
        const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
        const interviewQuery = authUser?.user_id ? `&interviewer_user_id=${authUser.user_id}` : "";
        const [volunteerRes, taskRows, projectRows, staffData, interviewsRes] = await Promise.all([
          authFetch(`${API_URL}/api/volunteer_applications`, { cache: 'no-store' }),
          fetchAllProjectTasks(),
          fetchProjects(),
          fetchStaff(),
          authFetch(`${API_URL}/api/interviews?type=case_report${interviewQuery}`, { cache: 'no-store' }),
        ]);
        if (volunteerRes.ok) {
          const json = await volunteerRes.json();
          setVolunteers(Array.isArray(json) ? json : json?.data || []);
        }
        setProjectTasks(Array.isArray(taskRows) ? taskRows : []);
        setProjects(Array.isArray(projectRows) ? projectRows : projectRows?.data || []);
        setStaffRows(Array.isArray(staffData) ? staffData : []);
        if (interviewsRes.ok) {
          const json = await interviewsRes.json();
          setInterviews(Array.isArray(json) ? json : json?.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch StaffDashboard data:", err);
      }
    }
    fetchDashboardData();
  }, [authLoading, authUser?.user_id]);

  const actorName = getActorName(user);
  const currentStaff = useMemo(() => {
    return staffRows.find((person) => person.user_id === authUser?.user_id);
  }, [authUser?.user_id, staffRows]);
  const committeeName = currentStaff?.committees?.committee_name || "";

  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const newToday = volunteers.filter(v => v.created_at && new Date(v.created_at).toDateString() === todayStr).length;
    const review = volunteers.filter(v => {
      const status = (v.application_status || "").toLowerCase();
      return status === "pending" || status === "under_review";
    }).length;

    return [
      { num: newToday, label: "New Applications Today", hasNew: newToday > 0 },
      { num: review,   label: "Review Applications",     hasNew: review > 0 },
    ];
  }, [volunteers]);

  const overviewCards = useMemo(() => {
    const todayStr = new Date().toDateString();
    const newToday = volunteers.filter(v => v.created_at && new Date(v.created_at).toDateString() === todayStr).length;
    const review = volunteers.filter(v => {
      const status = (v.application_status || "").toLowerCase();
      return status === "pending" || status === "under_review";
    }).length;

    return [
      { category: "New Applicants", label: "New Applications Today", count: newToday, showView: false },
      { category: "Volunteer",      label: "Review Applications",    count: review,   showView: true  },
    ];
  }, [volunteers]);

  const deadlines = useMemo(() => limitUpcomingDeadlines([
    ...buildProjectTaskDeadlines(projectTasks, {
      userId: authUser?.user_id,
      actorName,
      committeeName,
      includeCommittee: Boolean(committeeName),
      limit: Infinity,
    }),
    ...buildProjectDeadlines(projects, { actorName, limit: Infinity }),
    ...(committeeName ? buildConfirmedInterviewDeadlines(interviews, {
      userId: authUser?.user_id,
      actorName,
      limit: Infinity,
    }) : []),
  ]), [actorName, authUser?.user_id, committeeName, interviews, projectTasks, projects]);
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
