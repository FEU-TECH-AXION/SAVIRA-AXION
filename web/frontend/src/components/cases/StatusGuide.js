"use client";

import { useEffect } from "react";
import { FiHelpCircle, FiX } from "react-icons/fi";
import styles from "./StatusGuide.module.css";
import {
  PROCESS_MONITORING_SECTIONS,
  STATUS_COLORS,
  STATUS_GUIDE_GLOSSARY,
  STATUS_GUIDE_STATUSES,
} from "./caseStatusConstants";

function GuideBadge({ status, title }) {
  const colors = STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      className={styles.statusBadge}
      style={{ backgroundColor: colors.bg, color: colors.color }}
    >
      <span className={styles.statusDot} />
      {title}
    </span>
  );
}

export default function StatusGuide({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <aside className={styles.shell} aria-label="Case status guide">
      <section className={styles.panel} role="dialog" aria-modal="false" aria-labelledby="status-guide-title">
        <header className={styles.header}>
          <div className={styles.titleWrap}>
            <span className={styles.iconWrap}>
              <FiHelpCircle />
            </span>
            <div>
              <h2 id="status-guide-title">Status Guide</h2>
              <p>Case Status</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close status guide">
            <FiX />
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <h3>Quick View</h3>
            <div className={styles.quickList}>
              {STATUS_GUIDE_STATUSES.map((item) => (
                <div key={item.status} className={styles.quickItem}>
                  <GuideBadge status={item.status} title={item.title} />
                  <p>{item.summary}</p>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h3>Status Details</h3>
            <div className={styles.detailsList}>
              {STATUS_GUIDE_STATUSES.map((item) => (
                <details key={item.status} className={styles.detailItem}>
                  <summary>
                    <GuideBadge status={item.status} title={item.title} />
                  </summary>
                  <div className={styles.detailCopy}>
                    {item.details.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h3>Process and Monitoring</h3>
            <div className={styles.monitoringList}>
              {PROCESS_MONITORING_SECTIONS.map((section) => (
                <div key={section.title} className={styles.monitoringItem}>
                  <h4>{section.title}</h4>
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h3>Glossary</h3>
            <dl className={styles.glossary}>
              {STATUS_GUIDE_GLOSSARY.map((item) => (
                <div key={item.term} className={styles.glossaryItem}>
                  <dt>{item.term}</dt>
                  <dd>{item.definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </section>
    </aside>
  );
}
