"use client";

import { useMemo, useState } from "react";
import { FiAlertTriangle, FiX } from "react-icons/fi";
import styles from "./Dialog.module.css";

export default function RemoveAssignedStaffDialog({
  open,
  title = "Remove Assigned Staff",
  description,
  detail,
  assignments = [],
  busy = false,
  onCancel,
  onConfirm,
}) {
  const validAssignments = useMemo(
    () => assignments.filter((assignment) => assignment?.key),
    [assignments]
  );

  const [selectedKeys, setSelectedKeys] = useState(() =>
    validAssignments.map((assignment) => assignment.key)
  );
  if (!open) return null;

  const selectedSet = new Set(selectedKeys);
  const allSelected =
    validAssignments.length > 0 && selectedKeys.length === validAssignments.length;

  function toggleAssignment(key) {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  }

  function toggleAll() {
    setSelectedKeys(allSelected ? [] : validAssignments.map((assignment) => assignment.key));
  }

  function submit() {
    onConfirm(validAssignments.filter((assignment) => selectedSet.has(assignment.key)));
  }

  return (
    <div className={styles.overlay} onMouseDown={busy ? undefined : onCancel}>
      <section
        className={`${styles.dialog} ${styles.wideDialog}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-assigned-staff-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {!busy && (
          <button className={styles.closeButton} type="button" onClick={onCancel}>
            <FiX />
            <span className={styles.srOnly}>Close</span>
          </button>
        )}
        <div className={`${styles.dialogIcon} ${styles.danger}`}>
          <FiAlertTriangle />
        </div>
        <h2 id="remove-assigned-staff-title">{title}</h2>
        <p>{description}</p>
        {detail && <div className={styles.detail}>{detail}</div>}

        <div className={styles.pickerPanel}>
          <label className={styles.pickerAll}>
            <input
              type="checkbox"
              checked={allSelected}
              disabled={busy || validAssignments.length === 0}
              onChange={toggleAll}
            />
            <span>All assigned staff</span>
          </label>

          <div className={styles.assignmentList}>
            {validAssignments.length === 0 ? (
              <div className={styles.emptyPicker}>No assigned staff found.</div>
            ) : (
              validAssignments.map((assignment) => (
                <label key={assignment.key} className={styles.assignmentItem}>
                  <input
                    type="checkbox"
                    checked={selectedSet.has(assignment.key)}
                    disabled={busy}
                    onChange={() => toggleAssignment(assignment.key)}
                  />
                  <span className={styles.assignmentText}>
                    <strong>{assignment.label}</strong>
                    {assignment.context && <small>{assignment.context}</small>}
                    {assignment.detail && <small>{assignment.detail}</small>}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.dangerButton}
            onClick={submit}
            disabled={busy || selectedKeys.length === 0}
          >
            {busy ? "Please wait..." : `Remove (${selectedKeys.length})`}
          </button>
        </div>
      </section>
    </div>
  );
}
