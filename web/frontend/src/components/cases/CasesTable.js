"use client";

import { useState } from "react";
import styles from "./CaseManagement.module.css";

const STATUS_COLORS = {
  "For Verification":      { bg: "#dbeafe", color: "#1e40af" },
  "Undergoing Review":     { bg: "#fef9c3", color: "#854d0e" },
  "Verified - True":       { bg: "#dcfce7", color: "#166534" },
  "Verified - False":      { bg: "#fee2e2", color: "#991b1b" },
  "Under Case Evaluation": { bg: "#f3e8ff", color: "#6b21a8" },
  "Case Filed":            { bg: "#ffedd5", color: "#9a3412" },
  "Investigation Ongoing": { bg: "#cffafe", color: "#155e75" },
  "Hearing Ongoing":       { bg: "#fce7f3", color: "#9d174d" },
  "Dismissed":             { bg: "#f1f5f9", color: "#475569" },
  "Perpetrator Convicted": { bg: "#d1fae5", color: "#065f46" },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.74rem", fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
      {status}
    </span>
  );
}

function PendingBadge() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.72rem", fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "#fef3c7", color: "#92400e", border: "1px dashed #f59e0b" }}>
      ⏱ Pending Approval
    </span>
  );
}

function Pagination({ current, total, onChange }) {
  return (
    <div className={styles.pagination}>
      <button className={styles.pageArrow} onClick={() => onChange(current - 1)} disabled={current === 1}>←</button>
      {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
        <button key={p} className={`${styles.pageBtn} ${p === current ? styles.pageBtnActive : ""}`} onClick={() => onChange(p)}>{p}</button>
      ))}
      <button className={styles.pageArrow} onClick={() => onChange(current + 1)} disabled={current === total}>→</button>
    </div>
  );
}

export default function CasesTable({
  paginated,
  page,
  totalPages,
  onPageChange,
  onView,
  onAssign,
  onUpdateStatus,
  onReview,
  isAdmin,
  getAvailableTransitions,
  router
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Case ID</th>
            <th>Reporter ID</th>
            <th>Region</th>
            <th>Status</th>
            <th>Officer</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginated.length === 0
            ? <tr><td colSpan={6} className={styles.emptyState}>No cases found.</td></tr>
            : paginated.map((c) => {
              const transitions = getAvailableTransitions(c);
              return (
                <tr key={c.id}>
                  <td>{c.caseId}</td>
                  <td>{c.reporterId}</td>
                  <td>{c.region}</td>
                  <td>
                    <StatusBadge status={c.status} />
                    {c.pendingApproval && <div style={{ marginTop: 3 }}><PendingBadge /></div>}
                  </td>
                  <td>{c.assignedOfficer || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Unassigned</span>}</td>
                  <td>
                    <div className={styles.actionBtns}>
                      <button className={styles.tblBtnView} onClick={() => onView(c)}>View</button>
                      {isAdmin && <button className={styles.tblBtnEdit} onClick={() => onAssign(c)}>Assign</button>}
                      {(transitions.length > 0 && !c.pendingApproval) && (
                        <button className={styles.tblBtnStatus} onClick={() => onUpdateStatus(c)}>
                          Update Status
                        </button>
                      )}
                      {isAdmin && c.pendingApproval && (
                        <button className={styles.tblBtnApprove} onClick={() => onReview(c)}>Review</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          }
        </tbody>
      </table>
      <Pagination current={page} total={totalPages} onChange={onPageChange} />
    </div>
  );
}
