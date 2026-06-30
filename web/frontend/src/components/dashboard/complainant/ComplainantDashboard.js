"use client";

import Navbar from "@/components/navbar/navbar";
import styles from "./ComplainantDashboard.module.css";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import ReportStatusCard from "@/components/cases/history/ReportStatusCard";
import { normalizeReport } from "@/components/cases/history/reportHistoryData";
import VolunteerApplicationStatusCard, {
  normalizeVolunteerApplication,
} from "@/components/volunteer/VolunteerApplicationStatusCard";
import DashboardHeatmapCard from "./DashboardHeatmapCard";
import DashboardEventsCard from "./DashboardEventsCard";
import { formatNotificationTime, useNotificationStore } from "@/lib/notificationStore";

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
// ── Status Stepper ───────────────────────────────────────────────────────────
// Always 3 dots: Submitted → <current status> → Resolved
// ── Relative time helper ────────────────────────────────────────────────────────────────────────────
// ── Report Status Card ────────────────────────────────────────────────────────────────────────────
// ── Volunteer Application Status Card ────────────────────────────────────────
// `applicationData` shape:
//   { email, contactNumber, dateApplied, currentStep }
//   currentStep: 0 = Pending, 1 = Reviewing, 2 = Approved
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
              <span className={styles.notifText}>{n.text || n.message || n.body || n.title}</span>
              {n.created_at && (
                <span className={styles.notifTime}>
                  {formatNotificationTime(n.created_at)}
                </span>
              )}
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
// ── Events item ──────────────────────────────────────────────────────────────
// ── Page ─────────────────────────────────────────────────────────────────────
function EmptyStatusCard({ title, message, buttonLabel, onAction }) {
  return (
    <div className={styles.emptyStatusCard}>
      <div className={styles.statusCardHeader}>
        <span>{title}</span>
      </div>
      <div className={styles.emptyStatusBody}>
        <p className={styles.emptyStatusText}>{message}</p>
        <button
          type="button"
          className={`${styles.viewBtn} ${styles.emptyStatusBtn}`}
          onClick={onAction}
        >
          <span>{buttonLabel}</span>
          <span aria-hidden="true">&rarr;</span>
        </button>
      </div>
    </div>
  );
}

export default function ComplainantDashboard({
  // These props will be populated by real data fetching in parent pages/layouts.
  // Passing null/undefined → cards show graceful placeholders.
  // userReports items can be raw API shape: { case_report_id, incident_description,
  //   incident_city, incident_date, case_status: { status_name } }
  // OR already-normalised: { id, description, location, dateApplied, statusName }
  userReports       = [],
  applicationData   = null,
  notifications     = [],
  totalNotifications = 0,
}) {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const {
    notifications: storedNotifications,
    importantNotifications,
    unreadCount,
  } = useNotificationStore({ enabled: Boolean(authUser) && !authLoading });

  const user = authUser
    ? {
        role: authUser.role_name,
        firstName: authUser.first_name,
        lastName: authUser.last_name,
      }
    : { role: "", firstName: "", lastName: "" };

  if (authLoading) return <p>Loading...</p>;
  if (!authUser) return null;

  // Normalise whatever shape the parent passes into what the card expects
  const normalisedReports = userReports.map(normalizeReport).filter(Boolean);

  const resolvedNotifications = notifications.length
    ? notifications
    : importantNotifications.slice(0, 5);

  const resolvedTotalNotif = totalNotifications || unreadCount || storedNotifications.length;

  const resolvedApplication = applicationData
    ? normalizeVolunteerApplication(applicationData)
    : null;

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
                onView={() => router.push("/volunteer/apply")}
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
                <div className="col-12">
                  {normalisedReports.length > 0 ? (
                    <ReportStatusCard
                      reportNumber="Latest"
                      report={normalisedReports[0]}
                      showManagementActions={false}
                      headerLabel="Latest Report"
                      viewFrom="dashboard"
                    />
                  ) : (
                    <EmptyStatusCard
                      title="Latest Report"
                      message="No reports submitted yet."
                      buttonLabel="Submit Report"
                      onAction={() => router.push("/cases")}
                    />
                  )}
                </div>
                <div className="col-12">
                  {resolvedApplication ? (
                    <VolunteerApplicationStatusCard
                      application={resolvedApplication}
                      title="Latest Volunteer Application"
                    />
                  ) : (
                    <EmptyStatusCard
                      title="Latest Volunteer Application"
                      message="No volunteer application submitted yet."
                      buttonLabel="Apply Now"
                      onAction={() => router.push("/volunteer/apply")}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Right col — notifications */}
            <div className="col-12 col-lg-4">
              <NotificationsCard
                notifications={resolvedNotifications}
                onView={() => router.push("/dashboard")}
              />
            </div>
          </div>

          {/* ── Bottom row ── */}
          <div className="row g-3 mt-1">
            {/* Heatmap */}
            <div className="col-12 col-lg-8">
              <DashboardHeatmapCard />
            </div>

            {/* Calendar + Upcoming Events */}
            <div className="col-12 col-lg-4">
              <DashboardEventsCard />
            </div>
          </div>

        </div>

      </main>
    </>
  );
}
