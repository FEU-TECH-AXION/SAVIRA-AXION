"use client";

import { useRouter } from "next/navigation";
import Tooltip from "@/components/ui/Tooltip";
import { FollowUpBadge } from "@/components/cases/FollowUps";
import { STATUS_DISPLAY } from "./reportHistoryData";
import styles from "./ReportStatusCard.module.css";

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(diff)) return null;

  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days < 30) return `${days} day${days !== 1 ? "s" : ""} ago`;

  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusStepper({ statusName }) {
  const { middle, phase } = STATUS_DISPLAY[statusName] ?? {
    middle: "In Progress",
    phase: 1,
  };
  const steps = ["Submitted", middle, "Resolved"];

  return (
    <div className={styles.stepper}>
      {steps.map((label, index) => {
        const done = index < phase;
        const active = index === phase;

        return (
          <div key={`${label}-${index}`} className={styles.stepItem}>
            {index > 0 && (
              <div
                className={`${styles.stepLine} ${
                  done || active ? styles.stepLineDone : ""
                }`}
              />
            )}
            <div
              className={`${styles.stepDot} ${
                active ? styles.stepDotActive : ""
              } ${done ? styles.stepDotDone : ""}`}
            />
            <span
              className={`${styles.stepLabel} ${
                active ? styles.stepLabelActive : ""
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ReportStatusCard({ report, reportNumber, onWithdraw, onFollowUp }) {
  const router = useRouter();
  const assigned = report.assignedPersonnel || "Unassigned";
  const updatedAgo = timeAgo(report.updatedAt);
  const canWithdraw =
    report.statusName === "For Verification" ||
    report.statusName === "Undergoing Review";
  const withdrawTooltip = canWithdraw
    ? "Withdraw this report and stop its current progress"
    : report.statusName === "Withdrawn"
      ? "This report has already been withdrawn"
      : "Reports can only be withdrawn during verification or review";
  const followUpAllowed = !["Dismissed", "Perpetrator Convicted", "Resolved", "Withdrawn"]
    .includes(report.statusName);
  const followUpActive =
    report.followUpSummary?.type === "user_change_request" &&
    ["open", "responded"].includes(report.followUpSummary?.status);
  const followUpTooltip = !followUpAllowed
    ? "Follow-ups are unavailable for this case status"
    : followUpActive
      ? "A follow-up is already in progress"
      : "Request a correction or add information";

  return (
    <div className={styles.statusCard}>
      <div className={styles.statusCardHeader}>
        <span>Report {reportNumber}</span>
        <div className={styles.headerActions}>
          <Tooltip text={followUpTooltip}>
            <button
              type="button"
              className={styles.headerFollowUpBtn}
              disabled={!followUpAllowed || followUpActive}
              onClick={onFollowUp}
            >
              Follow Up
            </button>
          </Tooltip>
          <Tooltip text={withdrawTooltip}>
            <button
              type="button"
              className={styles.headerWithdrawBtn}
              disabled={!canWithdraw}
              aria-label={`Withdraw ${report.caseId}`}
              onClick={onWithdraw}
            >
              Withdraw
            </button>
          </Tooltip>
          <Tooltip text={`View details for ${report.caseId}`}>
            <button
              type="button"
              className={styles.headerViewBtn}
              onClick={() => router.push(`/cases/view?caseId=${report.id}&from=history`)}
            >
              View &rarr;
            </button>
          </Tooltip>
        </div>
      </div>

      <div className={styles.statusCardBody}>
        <div className={styles.cardTopRow}>
          <div className={styles.caseIdentity}>
            <span className={styles.cardCaseId}>{report.caseId}</span>
            <FollowUpBadge summary={report.followUpSummary} />
          </div>
          {updatedAgo && <span className={styles.cardUpdated}>Updated {updatedAgo}</span>}
        </div>

        <div className={styles.cardMetaGrid}>
          <div className={styles.cardMetaItem}>
            <span className={styles.cardMetaLabel}>Date Submitted</span>
            <span className={styles.cardMetaValue}>{report.dateSubmitted}</span>
          </div>
          <div className={styles.cardMetaItem}>
            <span className={styles.cardMetaLabel}>Assigned Personnel</span>
            <span
              className={`${styles.cardMetaValue} ${
                report.assignedPersonnel ? "" : styles.cardMetaUnassigned
              }`}
            >
              {assigned}
            </span>
          </div>
        </div>

        <StatusStepper statusName={report.statusName} />
      </div>
    </div>
  );
}
