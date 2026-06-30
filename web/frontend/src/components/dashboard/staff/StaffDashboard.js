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

const MEMBERSHIP_COMMITTEE_ID = 2;

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function isSamePerson(a, b) {
  return Boolean(normalizeText(a) && normalizeText(a) === normalizeText(b));
}

function isToday(value) {
  return Boolean(value && new Date(value).toDateString() === new Date().toDateString());
}

function isUpcomingDate(value) {
  if (!value) return false;
  const date = new Date(`${String(value).split("T")[0]}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !Number.isNaN(date.getTime()) && date >= today;
}

function isOpenTask(task) {
  const status = normalizeText(task?.status || task?.display_status);
  return status !== "completed" && status !== "cancelled" && status !== "canceled";
}

function listIncludesPerson(list, actorName) {
  const values = Array.isArray(list) ? list : (list ? [list] : []);
  return values.some((item) => isSamePerson(item, actorName));
}

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
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
        const interviewQuery = authUser?.user_id ? `&interviewer_user_id=${authUser.user_id}` : "";
        const [taskRows, projectRows, staffData] = await Promise.all([
          fetchAllProjectTasks(),
          fetchProjects(),
          fetchStaff(),
        ]);

        const staffList = Array.isArray(staffData) ? staffData : [];
        const staffRecord = staffList.find((person) => person.user_id === authUser.user_id);
        const committeeId = Number(authUser.committee_id ?? staffRecord?.committee_id ?? staffRecord?.committees?.committee_id);
        if (committeeId === MEMBERSHIP_COMMITTEE_ID) {
          const [volunteerRes, interviewsRes] = await Promise.all([
            authFetch(`${API_URL}/api/volunteer_applications`, { cache: "no-store" }),
            authFetch(`${API_URL}/api/interviews?type=case_report${interviewQuery}`, { cache: "no-store" }),
          ]);
          if (volunteerRes.ok) {
            const json = await volunteerRes.json();
            setVolunteers(Array.isArray(json) ? json : json?.data || []);
          }
          if (interviewsRes.ok) {
            const json = await interviewsRes.json();
            setInterviews(Array.isArray(json) ? json : json?.data || []);
          }
        } else {
          setVolunteers([]);
          setInterviews([]);
        }
        setProjectTasks(Array.isArray(taskRows) ? taskRows : []);
        setProjects(Array.isArray(projectRows) ? projectRows : projectRows?.data || []);
        setStaffRows(staffList);
      } catch (err) {
        console.error("Failed to fetch StaffDashboard data:", err);
      }
    }
    fetchDashboardData();
  }, [authLoading, authUser?.committee_id, authUser?.user_id]);

  const actorName = getActorName(user);
  const currentStaff = useMemo(() => {
    return staffRows.find((person) => person.user_id === authUser?.user_id);
  }, [authUser?.user_id, staffRows]);
  const committeeName = currentStaff?.committees?.committee_name || "";
  const isMembershipStaff = Number(authUser?.committee_id ?? currentStaff?.committee_id ?? currentStaff?.committees?.committee_id) === MEMBERSHIP_COMMITTEE_ID;

  const scopedProjectTasks = useMemo(() => {
    return projectTasks.filter((task) => {
      const assignee = task.assignee || {};
      const mine = assignee.user_id === authUser?.user_id || isSamePerson(assignee.name, actorName);
      const committeeMatch = committeeName && normalizeText(assignee.committee_name) === normalizeText(committeeName);
      return mine || committeeMatch;
    });
  }, [actorName, authUser?.user_id, committeeName, projectTasks]);

  const scopedProjects = useMemo(() => {
    return projects.filter((project) =>
      listIncludesPerson(project.projectOfficers, actorName) ||
      listIncludesPerson(project.projectCommitteeMembers, actorName)
    );
  }, [actorName, projects]);

  const stats = useMemo(() => {
    if (!isMembershipStaff) {
      const activeProjects = scopedProjects.filter((project) => project.status === "Active").length;
      const openTasks = scopedProjectTasks.filter(isOpenTask).length;

      return [
        { num: activeProjects, label: "Active Projects", hasNew: activeProjects > 0 },
        { num: openTasks, label: "Open Project Tasks", hasNew: openTasks > 0 },
      ];
    }

    const newToday = volunteers.filter(v => isToday(v.created_at)).length;
    const review = volunteers.filter(v => {
      const status = (v.application_status || "").toLowerCase();
      return status === "pending" || status === "under_review";
    }).length;

    return [
      { num: newToday, label: "New Applications Today", hasNew: newToday > 0 },
      { num: review, label: "Review Applications", hasNew: review > 0 },
    ];
  }, [isMembershipStaff, scopedProjectTasks, scopedProjects, volunteers]);

  const overviewCards = useMemo(() => {
    if (!isMembershipStaff) {
      const upcomingEvents = scopedProjects.filter((project) => {
        const status = normalizeText(project.status);
        return status !== "completed" && isUpcomingDate(project.dateStart || project.dueDate || project.dateEnd);
      }).length;
      const overdueTasks = scopedProjectTasks.filter((task) => task.display_status === "Overdue").length;

      return [
        { category: "Events", label: "Upcoming Events", count: upcomingEvents, showView: false },
        { category: "Projects", label: "Overdue Tasks", count: overdueTasks, showView: true },
      ];
    }

    const newToday = volunteers.filter(v => isToday(v.created_at)).length;
    const review = volunteers.filter(v => {
      const status = (v.application_status || "").toLowerCase();
      return status === "pending" || status === "under_review";
    }).length;

    return [
      { category: "New Applicants", label: "New Applications Today", count: newToday, showView: false },
      { category: "Volunteer", label: "Review Applications", count: review, showView: true },
    ];
  }, [isMembershipStaff, scopedProjectTasks, scopedProjects, volunteers]);

  const deadlines = useMemo(() => limitUpcomingDeadlines([
    ...buildProjectTaskDeadlines(projectTasks, {
      userId: authUser?.user_id,
      actorName,
      committeeName,
      includeCommittee: Boolean(committeeName),
      limit: Infinity,
    }),
    ...buildProjectDeadlines(projects, { actorName, limit: Infinity }),
    ...(isMembershipStaff ? buildConfirmedInterviewDeadlines(interviews, {
      userId: authUser?.user_id,
      actorName,
      limit: Infinity,
    }) : []),
  ]), [actorName, authUser?.user_id, committeeName, interviews, isMembershipStaff, projectTasks, projects]);

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
