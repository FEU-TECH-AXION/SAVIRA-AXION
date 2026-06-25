"use client";

import { useEffect } from "react";
import { FiX } from "react-icons/fi";
import PolicyMarkdown from "./PolicyMarkdown";
import { POLICIES } from "./policyContent";
import styles from "./PolicyModal.module.css";

export default function PolicyModal({ open, policy, onClose }) {
  const content = POLICIES[policy];

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
          <PolicyMarkdown markdown={content.markdown} className={styles.markdown} />
        </div>
        <footer className={styles.footer}>
          <button type="button" onClick={onClose}>Close</button>
        </footer>
      </section>
    </div>
  );
}
