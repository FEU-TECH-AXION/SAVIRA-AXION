"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/navbar/navbar";
import styles from "@/components/dashboard/admin/AdminDashboard.module.css";
import { useAuth } from "@/lib/AuthContext";
import DashboardEventsCard from "@/components/dashboard/complainant/DashboardEventsCard";
import DashboardHeatmapCard from "@/components/dashboard/complainant/DashboardHeatmapCard";

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

export default function StaffDashboard() {
  const { user: authUser } = useAuth();
  const [volunteers, setVolunteers] = useState([]);

  const user = authUser ? {
    role: authUser.role_name,
    firstName: authUser.first_name,
    lastName: authUser.last_name,
  } : { role: "staff", firstName: "Staff", lastName: "User" };

  useEffect(() => {
    async function fetchVolunteers() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${API_URL}/api/volunteer_applications`, { credentials: 'include', cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json) ? json : json?.data || [];
          setVolunteers(list);
        }
      } catch (err) {
        console.error("Failed to fetch volunteer applications:", err);
      }
    }
    fetchVolunteers();
  }, []);

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
                {deadlines.map((d, i) => <DeadlineItem key={i} {...d} />)}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
