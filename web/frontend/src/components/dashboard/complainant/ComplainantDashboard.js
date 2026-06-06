"use client";

import { useState } from "react";
import Navbar from "@/components/navbar/navbar";
import styles from "./ComplainantDashboard.module.css";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

// ── Action Card (Submit Report / Apply as Volunteer) ─────────────────────────
function ActionCard({ icon, title, description, onView }) {
  return (
    <div className={styles.actionCard}>
      <div className={styles.actionIconWrap}>
        <span className={styles.actionIcon}>{icon}</span>
      </div>
      <div className={styles.actionBody}>
        <h3 className={styles.actionTitle}>{title}</h3>
        <p className={styles.actionDesc}>{description}</p>
      </div>
      <div className={styles.notifViewRow}>
      <button className={styles.viewBtn} onClick={onView}>
        View &rarr;
      </button>
      </div>
    </div>
  );
}

// ── Case status → 3-step display ─────────────────────────────────────────────
const STATUS_DISPLAY = {
  "For Verification":      { middle: "For Verification",      phase: 1 },
  "Undergoing Review":     { middle: "Undergoing Review",     phase: 1 },
  "Verified - True":       { middle: "Verified",              phase: 1 },
  "Verified - False":      { middle: "Verified",              phase: 1 },
  "Under Case Evaluation": { middle: "Under Case Evaluation", phase: 1 },
  "Case Filed":            { middle: "Case Filed",            phase: 1 },
  "Investigation Ongoing": { middle: "Investigation Ongoing", phase: 1 },
  "Hearing Ongoing":       { middle: "Hearing Ongoing",       phase: 1 },
  "Dismissed":             { middle: "Dismissed",             phase: 2 },
  "Perpetrator Convicted": { middle: "Perpetrator Convicted", phase: 2 },
  "Resolved":              { middle: "Resolved",              phase: 2 },
  "Withdrawn":             { middle: "Withdrawn",             phase: 2 },
};

// ── Status Stepper ───────────────────────────────────────────────────────────
// Always 3 dots: Submitted → <current status> → Resolved
function StatusStepper({ statusName }) {
  const { middle, phase } = STATUS_DISPLAY[statusName] ?? { middle: "In Progress", phase: 1 };
  const steps = ["Submitted", middle, "Resolved"];
  return (
    <div className={styles.stepper}>
      {steps.map((label, i) => {
        const done   = i < phase;
        const active = i === phase;
        return (
          <div key={i} className={styles.stepItem}>
            {i > 0 && (
              <div className={`${styles.stepLine} ${done || active ? styles.stepLineDone : ""}`} />
            )}
            <div className={`${styles.stepDot} ${active ? styles.stepDotActive : ""} ${done ? styles.stepDotDone : ""}`} />
            <span className={`${styles.stepLabel} ${active ? styles.stepLabelActive : ""}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Relative time helper ────────────────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return null;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)   return "just now";
  if (mins  < 60)  return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  if (hours < 24)  return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days  < 30)  return `${days} day${days !== 1 ? "s" : ""} ago`;
  return new Date(dateStr).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

// ── Report Status Card ────────────────────────────────────────────────────────────────────────────
function ReportStatusCard({ reportData, onView }) {
  const [expanded, setExpanded] = useState(false);
  const {
    id                = "—",
    caseId            = null,
    dateSubmitted     = "—",
    assignedPersonnel = null,
    lastUpdated       = null,
    statusName        = "For Verification",
  } = reportData ?? {};

  const displayId      = caseId ?? `SASHA-${String(id).padStart(5, "0")}`;
  const personnelLabel = assignedPersonnel ?? "Unassigned";
  const updatedAgo     = timeAgo(lastUpdated);

  return (
    <div className={styles.statusCard}>
      <div className={styles.statusCardHeader}>
        <span>Your report&apos;s status</span>
        <button className={styles.headerViewBtn} onClick={onView}>
          View &rarr;
        </button>
      </div>
      <div className={styles.statusCardBody}>

        {/* ── Top row: Case ID + last updated ── */}
        <div className={styles.cardTopRow}>
          <span className={styles.cardCaseId}>{displayId}</span>
          {updatedAgo && (
            <span className={styles.cardUpdated}>Updated {updatedAgo}</span>
          )}
        </div>

        {/* ── Meta grid ── */}
        <div className={styles.cardMetaGrid}>
          <div className={styles.cardMetaItem}>
            <span className={styles.cardMetaLabel}>Date Submitted</span>
            <span className={styles.cardMetaValue}>{dateSubmitted}</span>
          </div>
          <div className={styles.cardMetaItem}>
            <span className={styles.cardMetaLabel}>Assigned Personnel</span>
            <span className={`${styles.cardMetaValue} ${!assignedPersonnel ? styles.cardMetaUnassigned : ""}`}>
              {personnelLabel}
            </span>
          </div>
        </div>

        <StatusStepper statusName={statusName} />
      </div>
    </div>
  );
}

// ── Volunteer Application Status Card ────────────────────────────────────────
// `applicationData` shape:
//   { email, contactNumber, dateApplied, currentStep }
//   currentStep: 0 = Pending, 1 = Reviewing, 2 = Approved
function VolunteerStatusCard({ applicationData, onView }) {
  const steps = ["Pending", "Reviewing", "Approved"];
  const {
    email         = "—",
    contactNumber = "—",
    dateApplied   = "—",
    currentStep   = 0,
  } = applicationData ?? {};

  return (
    <div className={styles.statusCard}>
      <div className={styles.statusCardHeader}>
        <span>Your Volunteer Application Status</span>
        <button className={styles.headerViewBtn} onClick={onView}>
          View &rarr;
        </button>
      </div>
      <div className={styles.statusCardBody}>
        <p className={styles.statusMeta}>Email: {email}</p>
        <p className={styles.statusMeta}>Contact Number: {contactNumber}</p>
        <p className={styles.statusMeta}>Date Applied: {dateApplied}</p>
        <StatusStepper steps={steps} current={currentStep} />
      </div>
    </div>
  );
}

// ── Important Notifications Card ─────────────────────────────────────────────
// `notifications` — array of { id, text } objects from API / context
function NotificationsCard({ notifications = [], onView }) {
  return (
    <div className={styles.notifCard}>
      <div className={styles.statusCardHeader}>
        <span>Important Notifications</span>
      </div>
      <div className={styles.notifBody}>
        {notifications.length === 0 ? (
          <p className={styles.notifEmpty}>No new notifications.</p>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={styles.notifItem}>
              <span className={styles.notifText}>{n.text}</span>
            </div>
          ))
        )}
        <div className={styles.notifViewRow}>
          <button className={styles.viewBtn} onClick={onView}>
            View &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Heatmap Placeholder ──────────────────────────────────────────────────────
function HeatmapPreview() {
  return (
    <div className={styles.heatmapPlaceholder}>
      <span>Heatmap Visualization (Coming Soon)</span>
    </div>
  );
}

// ── Events item ──────────────────────────────────────────────────────────────
function EventsItem({ image, emoji, title, date }) {
  return (
    <div className={styles.eventsItem}>
      <div className={styles.eventsThumb} aria-hidden="true">
        {image
          ? <img src={image} alt="" className={styles.eventsThumbImg} />
          : emoji ?? "📅"}
      </div>
      <div>
        <p className={styles.eventsItemTitle}>{title}</p>
        <p className={styles.eventsDate}>{date}</p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ComplainantDashboard({
  // These props will be populated by real data fetching in parent pages/layouts.
  // Passing null/undefined → cards show graceful placeholders.
  // userReports items can be raw API shape: { case_report_id, incident_description,
  //   incident_city, incident_date, case_status: { status_name } }
  // OR already-normalised: { id, description, location, dateApplied, statusName }
  userReports       = [],
  applicationData   = null,
  notifications     = [],
  events            = [],
  totalNotifications = 0,
}) {
  const [calDate, setCalDate] = useState(new Date());

  const router = useRouter();
  const { user: authUser } = useAuth();

  const user = authUser ? {
    role: authUser.role_name,
    firstName: authUser.first_name,
    lastName: authUser.last_name,
  } : { role: "complainant", firstName: "Complainant", lastName: "User" };

  // Normalise whatever shape the parent passes into what the card expects
  const normaliseReport = (r) => {
    if (!r) return null;
    // Already normalised
    if (r.statusName !== undefined) return r;
    // Raw API shape
    return {
      id:                r.case_report_id ?? r.id ?? "—",
      dateSubmitted:     r.created_at
        ? new Date(r.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
        : (r.dateSubmitted ?? "—"),
      assignedPersonnel: r.assigned_officer ?? r.assignedPersonnel ?? null,
      lastUpdated:       r.updated_at ?? r.created_at ?? r.lastUpdated ?? null,
      statusName:        r.case_status?.status_name ?? r.statusName ?? "For Verification",
    };
  };

  const normalisedReports = userReports.map(normaliseReport).filter(Boolean);

  // ── Fallback demo data (only used when props are absent) ───────────────────
  const resolvedNotifications = notifications.length
    ? notifications
    : [
        { id: 1, text: "Update on your submitted rep…" },
        { id: 2, text: "Update on your submitted app…" },
        { id: 3, text: "You have an ongoing project i…" },
      ];

  const resolvedEvents = events.length
    ? events
    : [
        { id: 1, emoji: "🌞", title: "SASHA believes that…",  date: "March 1, 2026"   },
        { id: 2, emoji: "⭐", title: "SASHA Awareness an…",   date: "August 18, 2026" },
        { id: 3, emoji: "🎄", title: "Youth Empowerment a…",  date: "April 1, 2026"   },
      ];

  const resolvedTotalNotif = totalNotifications || resolvedNotifications.length;

  const resolvedApplication = applicationData ?? {
    email: "example@email.com",
    contactNumber: "+63 9 1234 5678",
    dateApplied: "March 3, 2026",
    currentStep: 1,
  };

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

              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <div className={styles.statCard}>
                    {/* <span className={styles.statDot} /> */}
                    <p className={styles.statNum}>{resolvedTotalNotif}</p>
                    <p className={styles.statLabel}>Total Notifications</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container-xl py-5">

          {/* ── What would you like to do? ── */}
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>What would you like to do?</h2>
            <div className={styles.headingLine} />
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6">
              <ActionCard
                icon=<img src="FileAReportIcon.png" alt="" className={styles.actionIconImg} />
                title="Submit a Report"
                description="Report safely and securely."
                onView={() => router.push("/cases")}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon=<img src="VolunteerIcon.png" alt="" className={styles.actionIconImg} />
                title="Apply as Volunteer"
                description="Join our mission to support survivors."
                onView={() => router.push("/volunteer")}
              />
            </div>
          </div>

          {/* ── Overview ── */}
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>Overview</h2>
            <div className={styles.headingLine} />
          </div>

          <div className="row g-3">
            {/* Left col — status cards */}
            <div className="col-12 col-lg-8">
              <div className="row g-3">
                {normalisedReports.length > 0 && (
                  <div className="col-12">
                    <ReportStatusCard
                      reportData={normalisedReports[0]}
                      onView={() => router.push(`/cases/view?caseId=${normalisedReports[0].id}&from=dashboard`)}
                    />
                  </div>
                )}
                <div className="col-12">
                  <VolunteerStatusCard
                    applicationData={resolvedApplication}
                    onView={() => {/* navigate to /volunteer/application */}}
                  />
                </div>
              </div>
            </div>

            {/* Right col — notifications */}
            <div className="col-12 col-lg-4">
              <NotificationsCard
                notifications={resolvedNotifications}
                onView={() => {/* navigate to /notifications */}}
              />
            </div>
          </div>

          {/* ── Bottom row ── */}
          <div className="row g-3 mt-1">
            {/* Heatmap */}
            <div className="col-12 col-lg-8">
              <div className={styles.heatmapCard}>
                <h3 className={styles.heatmapTitle}>Heatmap Preview</h3>
                <div className={styles.heatmapPreview}>
                  <HeatmapPreview />
                </div>
              </div>
            </div>

            {/* Calendar + Upcoming Events */}
            <div className="col-12 col-lg-4">
              <div className={styles.eventsCard}>
                <div className={styles.statusCardHeader}>
                  <span>Your Events</span>
                </div>
                <div className={styles.calendarBody}>
                  <Calendar
                    onChange={setCalDate}
                    value={calDate}
                    locale="en-US"
                  />
                </div>
                <div className={styles.eventsListSection}>
                  <h3 className={styles.upcomingEventsTitle}>Upcoming Events</h3>
                  {resolvedEvents.map((d) => (
                    <EventsItem key={d.id} {...d} />
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

      </main>
    </>
  );
}