"use client";

import { useEffect } from "react";
import { FiX } from "react-icons/fi";
import styles from "./PolicyModal.module.css";

const POLICY_CONTENT = {
  terms: {
    title: "Terms & Conditions",
    sections: [
      ["Using Savira", "Use Savira lawfully, provide accurate information, protect your account, and respect the confidentiality and safety of others."],
      ["Reports and interviews", "Submit only relevant information you are authorized to provide. Interview schedules remain subject to availability and confirmation."],
      ["Acceptable conduct", "Do not misuse accounts, submit malicious reports, access restricted records, disrupt the service, or disclose confidential information improperly."],
      ["Availability", "Savira may be updated, interrupted, restricted, or suspended when needed for maintenance, safety, security, or legal compliance."],
    ],
  },
  privacy: {
    title: "Privacy Policy",
    sections: [
      ["Information collected", "Savira may collect account details, reports, attachments, interview information, volunteer applications, preferences, and security logs."],
      ["How information is used", "Information supports case services, interviews, volunteering, communications, safeguarding, platform security, and legal obligations."],
      ["Sharing and protection", "Access is limited to authorized personnel and service providers with a legitimate purpose. Sensitive case information is not ordinary public content."],
      ["Your rights", "Subject to applicable law, you may request access, correction, deletion or blocking, object to processing, or withdraw consent."],
    ],
  },
};

export default function PolicyModal({ open, policy, onClose }) {
  const content = POLICY_CONTENT[policy];

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !content) return null;

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <p>Savira Policies</p>
            <h2 id="policy-modal-title">{content.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close policy">
            <FiX />
          </button>
        </header>
        <div className={styles.body}>
          <p className={styles.effective}>Effective June 22, 2026</p>
          {content.sections.map(([title, text]) => (
            <section key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </section>
          ))}
          <p>
            By creating an account, you acknowledge that you have read and agree to this policy.
          </p>
        </div>
        <footer className={styles.footer}>
          <button type="button" onClick={onClose}>Close</button>
        </footer>
      </section>
    </div>
  );
}
