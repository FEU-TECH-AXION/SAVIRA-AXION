"use client"

import styles from "./AvailabilityBadge.module.css"

const STATUS_CLASS = {
  Available: styles.available,
  Busy: styles.busy,
  "On Leave": styles.leave,
  "Out of Office": styles.out,
}

export default function AvailabilityBadge({
  status = "Available",
  currentLoad,
  maxLoad,
  loadLabel = "active",
  conflicts = [],
  compact = false,
}) {
  const effectiveStatus = status === "Available" &&
    Number.isFinite(Number(currentLoad)) &&
    Number.isFinite(Number(maxLoad)) &&
    Number(currentLoad) >= Number(maxLoad)
    ? "Busy"
    : status
  const upcoming = conflicts?.[0]
  const details = [
    currentLoad !== undefined && maxLoad !== undefined
      ? `${currentLoad}/${maxLoad} ${loadLabel}`
      : null,
    upcoming
      ? `Next conflict: ${upcoming.title} (${new Date(upcoming.starts_at).toLocaleString("en-PH")})`
      : null,
  ].filter(Boolean).join(" · ")

  return (
    <span
      className={`${styles.badge} ${STATUS_CLASS[effectiveStatus] || styles.available} ${compact ? styles.compact : ""}`}
      title={details || effectiveStatus}
    >
      <span className={styles.dot} />
      {effectiveStatus}
      {!compact && currentLoad !== undefined && maxLoad !== undefined && (
        <span className={styles.load}>{currentLoad}/{maxLoad}</span>
      )}
    </span>
  )
}
