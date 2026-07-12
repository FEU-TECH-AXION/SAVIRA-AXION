"use client";

import {
  FiBriefcase,
  FiCalendar,
  FiCheckSquare,
  FiClock,
  FiFileText,
  FiFolder,
  FiMail,
  FiSearch,
} from "react-icons/fi";

const ICONS = {
  task: FiCheckSquare,
  project: FiFolder,
  interview: FiCalendar,
  filing: FiFileText,
  hearing: FiBriefcase,
  investigation: FiSearch,
  referral: FiMail,
  legal: FiBriefcase,
};

export default function DeadlineItem({ icon, title, date, styles }) {
  const Icon = ICONS[icon] || FiClock;

  return (
    <div className={styles.deadlineItem}>
      <div className={styles.deadlineThumb} aria-hidden="true">
        <Icon size={18} strokeWidth={2.2} />
      </div>
      <div className={styles.deadlineContent}>
        <p className={styles.deadlineTitle}>{title}</p>
        <p className={styles.deadlineDate}>{date}</p>
      </div>
    </div>
  );
}
