"use client";

import { useRouter } from "next/navigation";
import styles from "./VolunteerApplicationStatusCard.module.css";

// For terminal statuses the third dot shows the actual outcome and the middle
// dot shows the last in-progress status before that outcome.
const STATUS_DISPLAY = {
  pending:      { middle: "Pending Review", phase: 1, terminalLabel: null },
  reviewing:    { middle: "Under Review",   phase: 1, terminalLabel: null },
  under_review: { middle: "Under Review",   phase: 1, terminalLabel: null },
  approved:     { middle: "Under Review",   phase: 2, terminalLabel: "Approved" },
  rejected:     { middle: "Under Review",   phase: 2, terminalLabel: "Rejected" },
  withdrawn:    { middle: "Under Review",   phase: 2, terminalLabel: "Withdrawn" },
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function assignedPersonnel(application) {
  if (application.assignedPersonnel || application.assigned_evaluator) {
    return application.assignedPersonnel || application.assigned_evaluator;
  }

  const assignments = application.volunteer_application_assignments || application.assignments || [];
  const activeAssignments = assignments.filter((assignment) => assignment?.is_active !== false);
  const names = activeAssignments
    .map((assignment) => {
      const user = Array.isArray(assignment.users) ? assignment.users[0] : assignment.users;
      return [user?.first_name, user?.last_name].filter(Boolean).join(" ");
    })
    .filter(Boolean);

  return names.join(", ") || null;
}

export function normalizeVolunteerApplication(application = {}) {
  const id = application.volunteer_application_id || application.id;
  const createdAt =
    application.created_at ||
    application.submitted_at ||
    application.dateSubmitted ||
    application.dateApplied ||
    application.updated_at;

  return {
    ...application,
    id,
    applicationId: application.applicationId || `APP-${String(id).padStart(5, "0")}`,
    statusName: String(application.application_status || application.statusName || "pending").toLowerCase(),
    dateSubmitted: formatDate(createdAt),
    assignedPersonnel: assignedPersonnel(application),
  };
}

function ApplicationStepper({ statusName }) {
  const { middle, phase, terminalLabel } = STATUS_DISPLAY[statusName] || {
    middle: "In Progress",
    phase: 1,
    terminalLabel: null,
  };
  // Non-terminal: third dot = "Completed". Terminal: third dot = the actual outcome.
  const thirdLabel = terminalLabel ?? "Completed";
  const steps = ["Submitted", middle, thirdLabel];

  return (
    <div className={styles.stepper}>
      {steps.map((label, index) => {
        const done = index < phase;
        const active = index === phase;
        return (
          <div className={styles.stepItem} key={`${label}-${index}`}>
            {index > 0 && (
              <div className={`${styles.stepLine} ${done || active ? styles.stepLineDone : ""}`} />
            )}
            <div className={`${styles.stepDot} ${done ? styles.stepDotDone : ""} ${active ? styles.stepDotActive : ""}`} />
            <span className={`${styles.stepLabel} ${active ? styles.stepLabelActive : ""}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function VolunteerApplicationStatusCard({
  application,
  title = "Volunteer Application",
  headerActions = null,
}) {
  const router = useRouter();
  const item = normalizeVolunteerApplication(application);
  const personnel = item.assignedPersonnel || "Unassigned";

  return (
    <div className={styles.statusCard}>
      <div className={styles.statusCardHeader}>
        <span>{title}</span>
        <div className={styles.headerActions}>
          {headerActions}
          <button
            type="button"
            className={styles.headerViewBtn}
            onClick={() => router.push(`/volunteer/view?id=${item.id}`)}
          >
            View &rarr;
          </button>
        </div>
      </div>
      <div className={styles.statusCardBody}>
        <div className={styles.cardTopRow}>
          <span className={styles.cardApplicationId}>{item.applicationId}</span>
        </div>
        <div className={styles.cardMetaGrid}>
          <div className={styles.cardMetaItem}>
            <span className={styles.cardMetaLabel}>Date Submitted</span>
            <span className={styles.cardMetaValue}>{item.dateSubmitted}</span>
          </div>
          <div className={styles.cardMetaItem}>
            <span className={styles.cardMetaLabel}>Assigned Personnel</span>
            <span className={`${styles.cardMetaValue} ${item.assignedPersonnel ? "" : styles.cardMetaUnassigned}`}>
              {personnel}
            </span>
          </div>
        </div>
        <ApplicationStepper statusName={item.statusName} />
      </div>
    </div>
  );
}
