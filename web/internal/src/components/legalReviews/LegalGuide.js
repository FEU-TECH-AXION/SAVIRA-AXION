"use client";

import { useEffect } from "react";
import { FiHelpCircle, FiX } from "react-icons/fi";
import styles from "../cases/StatusGuide.module.css";
import {
  PROCESS_MONITORING_SECTIONS,
  STATUS_GUIDE_GLOSSARY,
} from "../cases/caseStatusConstants";

const LEGAL_RECORD_SECTIONS = [
  {
    title: "Paralegal Record",
    summary: "Structured checklist for organizing evidence, incident notes, survivor explanation notes, and readiness for lawyer review.",
    items: [
      "Evidence items: sworn statement, incident timeline, screenshots / digital evidence, ID documents, medico-legal report, and witness statements.",
      "Each evidence item tracks status, notes, and an optional secure file link.",
      "Also records key incident details, additional notes, what was explained to the survivor, whether the survivor confirmed understanding, and whether the file is ready for lawyer review.",
    ],
  },
  {
    title: "Lawyer Record",
    summary: "Structured legal consultation record for lawyer assessment, legal pathway, evidence gaps, and recommendation.",
    items: [
      "Records consultation type, consultation date, and engagement status.",
      "Tracks applicable laws / provisions and possible courses of action.",
      "Includes evidence gaps identified, legal recommendation, additional notes, saved timestamp, and a consultation history list.",
    ],
  },
];

const LEGAL_GUIDE_GLOSSARY_EXTRA = [
  {
    term: "Court (with lawyer)",
    definition: "Court filing or court-related endorsement handled with lawyer involvement. This pathway is recorded through Legal Review endorsement, not by Case Officers through preliminary referral.",
  },
];

function LegalRecordCard({ section }) {
  return (
    <details className={styles.detailItem}>
      <summary>
        <span className={styles.statusBadge} style={{ backgroundColor: "#eef2ff", color: "#3730a3" }}>
          <span className={styles.statusDot} />
          {section.title}
        </span>
      </summary>
      <div className={styles.detailCopy}>
        <p>{section.summary}</p>
        {section.items.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </details>
  );
}

export default function LegalGuide({ open, onClose }) {
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
    <aside className={styles.shell} aria-label="Legal review guide">
      <section className={styles.panel} role="dialog" aria-modal="false" aria-labelledby="legal-guide-title">
        <header className={styles.header}>
          <div className={styles.titleWrap}>
            <span className={styles.iconWrap}>
              <FiHelpCircle />
            </span>
            <div>
              <h2 id="legal-guide-title">Legal Guide</h2>
              <p>Legal review, records, and endorsement tracking</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close legal guide">
            <FiX />
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <h3>How Legal Review Fits</h3>
            <div className={styles.monitoringItem}>
              <p>
                Legal review becomes relevant starting at Under Case Evaluation, the point where the case has been verified and the team determines the pathway: internal referral, CODI, DSWD, PNP, BSP/GSP, school, workplace, or court.
              </p>
              <p>
                Legal Personnel take over case monitoring from this stage through Case Filed, Investigation Ongoing, Hearing Ongoing, and resolution. Use the Case Management Status Guide for the full case status workflow.
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <h3>Lawyer Record vs. Paralegal Record</h3>
            <div className={styles.detailsList}>
              {LEGAL_RECORD_SECTIONS.map((section) => (
                <LegalRecordCard key={section.title} section={section} />
              ))}
            </div>
            <div className={styles.monitoringItem}>
              <p>
                Access restriction: lawyers can only save lawyer records, and paralegals cannot save lawyer records. This is enforced backend-side in legal review updates.
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <h3>Endorsement</h3>
            <div className={styles.monitoringItem}>
              <p>
                Endorsement can only be recorded once a case reaches Under Case Evaluation or later.
              </p>
              <p>
                Court referral specifically requires Legal Personnel with lawyer involvement and cannot be set by Case Officers.
              </p>
            </div>
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
              {LEGAL_GUIDE_GLOSSARY_EXTRA.map((item) => (
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
