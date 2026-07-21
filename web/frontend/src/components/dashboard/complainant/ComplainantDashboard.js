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
import { useI18n } from "@/lib/i18n";

// ── Action Card (Submit Report / Apply as Volunteer) ─────────────────────────
function ActionCard({ icon, title, description, onView, viewLabel }) {
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
        {viewLabel} &rarr;
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
function NotificationsCard({ notifications = [], onView, t }) {
  return (
    <div className={styles.notifCard}>
      <div className={styles.statusCardHeader}>
        <span>{t("dashboardImportantNotifications")}</span>
      </div>
      <div className={styles.notifBody}>
        {notifications.length === 0 ? (
          <p className={styles.notifEmpty}>{t("dashboardNoNotifications")}</p>
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
            {t("dashboardView")} &rarr;
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
}) {
  const router = useRouter();
  const { t } = useI18n();
  const { user: authUser, loading: authLoading } = useAuth();
  const {
    importantNotifications,
  } = useNotificationStore({ enabled: Boolean(authUser) && !authLoading });

  const user = authUser
    ? {
        role: authUser.role_name,
        firstName: authUser.first_name,
        lastName: authUser.last_name,
      }
    : { role: "", firstName: "", lastName: "" };

  if (authLoading) return <p>{t("loading")}</p>;
  if (!authUser) return null;

  // Normalise whatever shape the parent passes into what the card expects
  const normalisedReports = userReports.map(normalizeReport).filter(Boolean);

  const resolvedNotifications = notifications.length
    ? notifications
    : importantNotifications.slice(0, 5);

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
                {t("dashboardWelcome")}, {user.firstName} {user.lastName}!
              </h1>
            </div>
          </div>
        </section>

        <div className="container-xl py-3">

          {/* ── What would you like to do? ── */}
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>{t("dashboardWhatToDo")}</h2>
            <div className={styles.headingLine} />
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6">
              <ActionCard
                icon=<img src="FileAReportIcon.png" alt="" className={styles.actionIconImg} />
                title={t("dashboardSubmitReportTitle")}
                description={t("dashboardSubmitReportDesc")}
                viewLabel={t("dashboardView")}
                onView={() => router.push("/report")}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon=<img src="VolunteerIcon.png" alt="" className={styles.actionIconImg} />
                title={t("dashboardApplyVolunteerTitle")}
                description={t("dashboardApplyVolunteerDesc")}
                viewLabel={t("dashboardView")}
                onView={() => router.push("/volunteer/apply")}
              />
            </div>
          </div>

          {/* ── Overview ── */}
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>{t("dashboardOverview")}</h2>
            <div className={styles.headingLine} />
          </div>

          <div className="row g-3">
            {/* Left col — status cards */}
            <div className="col-12 col-lg-8">
              <div className="row g-3">
                <div className="col-12">
                  {normalisedReports.length > 0 ? (
                    <ReportStatusCard
                      reportNumber={t("dashboardLatest")}
                      report={normalisedReports[0]}
                      showManagementActions={false}
                      headerLabel={t("dashboardLatestReport")}
                      viewFrom="dashboard"
                    />
                  ) : (
                    <EmptyStatusCard
                      title={t("dashboardLatestReport")}
                      message={t("dashboardNoReports")}
                      buttonLabel={t("dashboardSubmitReportTitle")}
                      onAction={() => router.push("/report")}
                    />
                  )}
                </div>
                <div className="col-12">
                  {resolvedApplication ? (
                    <VolunteerApplicationStatusCard
                      application={resolvedApplication}
                      title={t("dashboardLatestVolunteerApplication")}
                    />
                  ) : (
                    <EmptyStatusCard
                      title={t("dashboardLatestVolunteerApplication")}
                      message={t("dashboardNoVolunteerApplication")}
                      buttonLabel={t("dashboardApplyNow")}
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
                t={t}
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
