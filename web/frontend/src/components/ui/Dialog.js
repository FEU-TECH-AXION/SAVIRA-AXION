"use client";

import { useEffect, useState } from "react";
import { FiAlertTriangle, FiInfo, FiX } from "react-icons/fi";
import styles from "./Dialog.module.css";

export function ConfirmDialog({
  open,
  title,
  description,
  detail,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onMouseDown={onCancel}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className={styles.closeButton} type="button" onClick={onCancel}>
          <FiX />
          <span className={styles.srOnly}>Close</span>
        </button>
        <div className={`${styles.dialogIcon} ${styles[tone]}`}>
          {tone === "danger" ? <FiAlertTriangle /> : <FiInfo />}
        </div>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{description}</p>
        {detail && <div className={styles.detail}>{detail}</div>}
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === "danger" ? styles.dangerButton : styles.primaryButton}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function TextInputDialog({
  open,
  title,
  description,
  label,
  placeholder,
  confirmLabel = "Add",
  initialValue = "",
  error = "",
  onConfirm,
  onCancel,
}) {
  const [value, setValue] = useState(initialValue);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setValue(initialValue);
      setLocalError("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialValue, open]);

  if (!open) return null;

  function submit(event) {
    event.preventDefault();
    const cleaned = value.trim();
    if (!cleaned) {
      setLocalError(`${label} is required.`);
      return;
    }
    onConfirm(cleaned);
  }

  const visibleError = localError || error;

  return (
    <div className={styles.overlay} onMouseDown={onCancel}>
      <form
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="text-dialog-title"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className={styles.closeButton} type="button" onClick={onCancel}>
          <FiX />
          <span className={styles.srOnly}>Close</span>
        </button>
        <div className={`${styles.dialogIcon} ${styles.default}`}><FiInfo /></div>
        <h2 id="text-dialog-title">{title}</h2>
        <p>{description}</p>
        <label className={styles.inputLabel}>
          {label}
          <input
            value={value}
            placeholder={placeholder}
            onChange={(event) => {
              setValue(event.target.value);
              setLocalError("");
            }}
            aria-invalid={Boolean(visibleError)}
            autoFocus
          />
        </label>
        {visibleError && <div className={styles.inputError}>{visibleError}</div>}
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className={styles.primaryButton}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
