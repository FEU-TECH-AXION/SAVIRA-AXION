"use client";

import { useState } from "react";
import Navbar from "@/components/navbar/navbar";
import styles from "@/components/dashboard/admin/AdminDashboard.module.css";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useAuth } from "@/lib/AuthContext";

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

function HeatmapPreview() {
  // TODO: Replace with real Mapbox heatmap component
  return (
    <div style={{ height: "200px", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", color: "#666" }}>
      Heatmap Visualization (Coming Soon)
    </div>
  );
}

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

// ── Cookies ─────────────────────────────────────────────────────────────────────

export default function CaseOfficerDashboard() {
  const [calDate, setCalDate] = useState(new Date());
  const { user: authUser } = useAuth();

  const user = authUser ? {
    role: authUser.role_name,
    firstName: authUser.first_name,
    lastName: authUser.last_name,
  } : { role: "case officer", firstName: "Case Officer", lastName: "User" };

  const stats = [
    { num: 2,  label: "For Verification",          hasNew: true },
    { num: 11, label: "Total Assigned Cases",       hasNew: true },
  ];

  const overviewCards = [
    { category: "Case",    label: "For Verification",             count: 2,  showView: true },
    { category: "Case",    label: "Your total assigned cases are", count: 11, showView: true },
  ];

  const deadlines = [
    { emoji: "🌞", title: "SASHA believes that...",  date: "March 1, 2026"   },
    { emoji: "⭐", title: "SASHA Awareness an...",   date: "August 18, 2026" },
    { emoji: "🎄", title: "Youth Empowerment a...",  date: "April 1, 2026"   },
  ];

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
              <div className={styles.calendarCard}>
                <div className={styles.calendarCardHeader}><span>Your Events</span></div>
                <div className={styles.calendarBody}>
                  <Calendar onChange={setCalDate} value={calDate} locale="en-US" />
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-12 col-lg-8">
              <div className={styles.heatmapCard}>
                <h3 className={styles.heatmapTitle}>Heatmap Preview</h3>
                <div className={styles.heatmapPreview}><HeatmapPreview /></div>
              </div>
            </div>
            <div className="col-12 col-lg-4">
              <div className={styles.deadlinesCard}>
                <h3 className={styles.deadlinesTitle}>Upcoming Deadlines</h3>
                {deadlines.map((d, i) => <DeadlineItem key={i} {...d} />)}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}