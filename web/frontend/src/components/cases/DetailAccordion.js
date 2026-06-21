"use client";

import { useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import styles from "./DetailAccordion.module.css";

export default function DetailAccordion({
  title,
  summary,
  children,
  defaultOpen = false,
  className = "",
  style,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`${styles.accordion} ${className}`.trim()} style={style}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>
          <strong className={styles.title}>{title}</strong>
          {summary && <span className={styles.summary}>{summary}</span>}
        </span>
        {open ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}
      </button>
      {open && <div className={styles.content}>{children}</div>}
    </section>
  );
}
