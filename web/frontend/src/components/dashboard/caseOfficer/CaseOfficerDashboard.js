"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/navbar/navbar";
import styles from "@/components/dashboard/admin/AdminDashboard.module.css";
import { useAuth } from "@/lib/AuthContext";
import DashboardEventsCard from "@/components/dashboard/complainant/DashboardEventsCard";
import DashboardHeatmapCard from "@/components/dashboard/complainant/DashboardHeatmapCard";
import DeadlineItem from "@/components/dashboard/DeadlineItem";
import { buildConfirmedInterviewDeadlines, getActorName, samePerson } from "@/lib/dashboardDeadlines";

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
  const { user: authUser } = useAuth();
  const [cases, setCases] = useState([]);
  const [interviews, setInterviews] = useState([]);

  const user = authUser ? {
    role: authUser.role_name,
    firstName: authUser.first_name,
    lastName: authUser.last_name,
  } : { role: "case officer", firstName: "Case Officer", lastName: "User" };

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
        const interviewQuery = authUser?.user_id ? `&interviewer_user_id=${authUser.user_id}` : "";
        const [caseRes, interviewsRes] = await Promise.all([
          fetch(`${API_URL}/api/case_reports/all`, { credentials: 'include', cache: 'no-store' }),
          fetch(`${API_URL}/api/interviews?type=case_report${interviewQuery}`, { credentials: 'include', cache: 'no-store' }),
        ]);
        if (caseRes.ok) {
          const json = await caseRes.json();
          setCases(Array.isArray(json) ? json : json?.data || []);
        }
        if (interviewsRes.ok) {
          const json = await interviewsRes.json();
          setInterviews(Array.isArray(json) ? json : json?.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch CaseOfficerDashboard data:", err);
      }
    }
    fetchDashboardData();
  }, [authUser?.user_id]);

  const actorName = getActorName(user);

  const assignedCases = useMemo(() => {
    return cases.filter(c => samePerson(c.assigned_officer, actorName));
  }, [cases, actorName]);

  const stats = useMemo(() => {
    const forVerification = assignedCases.filter(c => c.case_status_id === 2).length;
    const totalAssigned = assignedCases.length;

    return [
      { num: forVerification, label: "For Verification",    hasNew: forVerification > 0 },
      { num: totalAssigned,    label: "Total Assigned Cases", hasNew: totalAssigned > 0 },
    ];
  }, [assignedCases]);

  const overviewCards = useMemo(() => {
    const forVerification = assignedCases.filter(c => c.case_status_id === 2).length;
    const totalAssigned = assignedCases.length;

    return [
      { category: "Case",    label: "For Verification",             count: forVerification, showView: true },
      { category: "Case",    label: "Your total assigned cases are", count: totalAssigned,    showView: true },
    ];
  }, [assignedCases]);

  const deadlines = useMemo(() => buildConfirmedInterviewDeadlines(interviews, {
    userId: authUser?.user_id,
    actorName,
  }), [actorName, authUser?.user_id, interviews]);
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

          <div className="row g-3">
            <div className="col-12 col-lg-8">
              <div className="row g-3">
                {overviewCards.map((card, i) => (
                  <div key={i} className="col-12 col-sm-6">
                    <OverviewCard {...card} />
                  </div>
                ))}
              </div>
            </div>
            <div className="col-12 col-lg-4">
              <DashboardEventsCard />
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-12 col-lg-8">
              <DashboardHeatmapCard />
            </div>
            <div className="col-12 col-lg-4">
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
