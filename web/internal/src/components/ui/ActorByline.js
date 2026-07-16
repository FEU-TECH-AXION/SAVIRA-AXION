"use client";

import styles from "./ActorByline.module.css";

function formatTimestamp(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

export default function ActorByline({
  actorName,
  actorRole,
  timestamp,
  fallbackName = "System",
  className = "",
  timestampFormatter = formatTimestamp,
  as: Component = "p",
}) {
  const displayTimestamp = timestamp ? timestampFormatter(timestamp) : "";
  const displayName = actorName || (displayTimestamp || actorRole ? fallbackName : "");
  const parts = [displayName, actorRole].filter(Boolean);

  if (!parts.length && !displayTimestamp) return null;

  return (
    <Component className={`${styles.byline} ${className}`.trim()}>
      {parts.length > 0 && <span>{parts.join(" \u00b7 ")}</span>}
      {parts.length > 0 && displayTimestamp && <span aria-hidden="true">{" \u00b7 "}</span>}
      {displayTimestamp && <time dateTime={timestamp}>{displayTimestamp}</time>}
    </Component>
  );
}
