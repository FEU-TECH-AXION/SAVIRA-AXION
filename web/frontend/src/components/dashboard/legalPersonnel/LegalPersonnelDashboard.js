"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/navbar/navbar";
import styles from "@/components/dashboard/admin/AdminDashboard.module.css";
import { useAuth } from "@/lib/AuthContext";
import DashboardEventsCard from "@/components/dashboard/complainant/DashboardEventsCard";
import DashboardHeatmapCard from "@/components/dashboard/complainant/DashboardHeatmapCard";
import DeadlineItem from "@/components/dashboard/DeadlineItem";
import {
  buildLegalCaseDeadlines,
  fetchLegalDeadlinesForCases,
  getActorName,
  samePerson,
} from "@/lib/dashboardDeadlines";

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
  const { user: authUser } = useAuth();
  const [cases, setCases] = useState([]);
  const [legalDeadlines, setLegalDeadlines] = useState([]);

  const user = authUser ? {
    role: authUser.role_name,
    firstName: authUser.first_name,
    lastName: authUser.last_name,
  } : { role: "legal personnel", firstName: "Legal", lastName: "User" };

  const actorName = getActorName(user);

  useEffect(() => {
    async function fetchCases() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${API_URL}/api/case_reports/all`, { credentials: 'include', cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json) ? json : json?.data || [];
          setCases(list);
          const assigned = list.filter(c => samePerson(c.assigned_legal_officer, actorName) || samePerson(c.assigned_paralegal, actorName));
          setLegalDeadlines(await fetchLegalDeadlinesForCases(API_URL, assigned));
        }
      } catch (err) {
        console.error("Failed to fetch cases for LegalPersonnelDashboard:", err);
      }
    }
    fetchCases();
  }, [actorName]);

  const assignedCases = useMemo(() => {
    return cases.filter(c => samePerson(c.assigned_legal_officer, actorName) || samePerson(c.assigned_paralegal, actorName));
  }, [cases, actorName]);

  const stats = useMemo(() => {
    // Verified - True (4) or Under Case Evaluation (6) are pending review
    const pendingReview = assignedCases.filter(c => c.case_status_id === 4 || c.case_status_id === 6).length;
    const totalAssigned = assignedCases.length;

    return [
      { num: pendingReview, label: "Pending Review",            hasNew: pendingReview > 0 },
      { num: totalAssigned,  label: "Total Assigned Cases",       hasNew: totalAssigned > 0 },
    ];
  }, [assignedCases]);

  const overviewCards = useMemo(() => {
    const pendingReview = assignedCases.filter(c => c.case_status_id === 4 || c.case_status_id === 6).length;
    const totalAssigned = assignedCases.length;

    return [
      { category: "Case",    label: "Pending Review",               count: pendingReview, showView: true },
      { category: "My Case", label: "Your total assigned cases are", count: totalAssigned,  showView: true },
    ];
  }, [assignedCases]);

  const deadlines = useMemo(() => buildLegalCaseDeadlines(legalDeadlines), [legalDeadlines]);
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
