"use client";

import { useState, useMemo } from "react";
import styles from "./InterviewsTable.module.css";

const INTERVIEW_STATUS_COLORS = {
  Invited: { bg: "#dbeafe", color: "#1e40af" },
  Scheduled: { bg: "#fef9c3", color: "#854d0e" },
  Confirmed: { bg: "#dcfce7", color: "#166534" },
  Completed: { bg: "#d1fae5", color: "#065f46" },
  Cancelled: { bg: "#fee2e2", color: "#991b1b" },
  Expired: { bg: "#f1f5f9", color: "#475569" },
  Rejected: { bg: "#fecdd3", color: "#be123c" },
};

const INTERVIEW_STATUS_ROW_COLOR = {
  Invited: "#fffbf0",
  Scheduled: "#fffdf0",
  Confirmed: "#f0fdf4",
  Completed: "#f0fdf4",
  Cancelled: "#fff0f0",
  Expired: "#f8fafc",
  Rejected: "#fff0f0",
};

function InterviewStatusBadge({ status }) {
  const s = INTERVIEW_STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      className={styles.statusBadge}
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

function Pagination({ current, total, totalRecords, pageSize, onChange }) {
  const start = Math.min((current - 1) * pageSize + 1, totalRecords);
  const end = Math.min(current * pageSize, totalRecords);

  const pages = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    const set = new Set([1, total, current, current - 1, current + 1].filter((p) => p >= 1 && p <= total));
    const sorted = [...set].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) pages.push("...");
      pages.push(sorted[i]);
    }
  }

  return (
    <div className={styles.paginationBar}>
      <button
        className={styles.pageArrow}
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        aria-label="Previous page"
      >
        ‹
      </button>
      <div className={styles.pageNumbers}>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className={styles.ellipsis}>
              …
            </span>
          ) : (
            <button
              key={p}
              className={`${styles.pageBtn} ${p === current ? styles.pageBtnActive : ""}`}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          )
        )}
      </div>
      <button
        className={styles.pageArrow}
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        aria-label="Next page"
      >
        ›
      </button>
      <span className={styles.paginationInfo}>
        {start}-{end} of {totalRecords}
      </span>
    </div>
  );
}

export default function InterviewsTable({
  interviews = [],
  selectedIds = [],
  onSelectionChange,
  onViewDetails,
  onMarkComplete,
  onAddMeetingLink,
  loading = false,
  pageSize = 10,
}) {
  const [currentPage, setCurrentPage] = useState(1);

  const groupedInterviews = useMemo(() => {
    const groups = {};
    interviews.forEach((interview) => {
      const status = interview.interviewStatus || "Invited";
      if (!groups[status]) groups[status] = [];
      groups[status].push(interview);
    });
    return groups;
  }, [interviews]);

  const statusOrder = ["Invited", "Scheduled", "Confirmed", "Completed", "Cancelled", "Expired", "Rejected"];

  const handleSelectAll = (status, checked) => {
    const statusInterviews = groupedInterviews[status] || [];
    const statusIds = statusInterviews.map((i) => i.id);
    let newSelected = [...selectedIds];
    if (checked) {
      newSelected = [...new Set([...selectedIds, ...statusIds])];
    } else {
      newSelected = newSelected.filter((id) => !statusIds.includes(id));
    }
    onSelectionChange(newSelected);
  };

  const handleSelectRow = (id, checked) => {
    let newSelected = [...selectedIds];
    if (checked) {
      newSelected.push(id);
    } else {
      newSelected = newSelected.filter((sid) => sid !== id);
    }
    onSelectionChange(newSelected);
  };

  if (loading) {
    return <div className={styles.loading}>Loading interviews...</div>;
  }

  if (Object.keys(groupedInterviews).length === 0) {
    return <div className={styles.empty}>No interviews found</div>;
  }

  return (
    <div className={styles.tableWrapper}>
      {statusOrder.map((status) => {
        const statusInterviews = groupedInterviews[status];
        if (!statusInterviews || statusInterviews.length === 0) return null;

        const statusChecked =
          statusInterviews.length > 0 &&
          statusInterviews.every((i) => selectedIds.includes(i.id));
        const statusIndeterminate =
          statusInterviews.some((i) => selectedIds.includes(i.id)) && !statusChecked;

        return (
          <div key={status} className={styles.statusGroup}>
            <div className={styles.statusGroupHeader}>
              <div className={styles.statusGroupTitle}>
                <input
                  type="checkbox"
                  checked={statusChecked}
                  indeterminate={statusIndeterminate}
                  onChange={(e) => handleSelectAll(status, e.target.checked)}
                  className={styles.checkbox}
                />
                <span className={styles.statusGroupName}>{status}</span>
                <span className={styles.statusGroupCount}>({statusInterviews.length})</span>
              </div>
            </div>

            <table className={styles.interviewTable}>
              <thead>
                <tr>
                  <th className={styles.colCheckbox}></th>
                  <th className={styles.colCaseId}>Case ID</th>
                  <th className={styles.colInterviewee}>Interviewee Name</th>
                  <th className={styles.colType}>Interview Type</th>
                  <th className={styles.colDateTime}>Date & Time</th>
                  <th className={styles.colStatus}>Status</th>
                </tr>
              </thead>
              <tbody>
                {statusInterviews.map((interview) => {
                  const isSelected = selectedIds.includes(interview.id);
                  return (
                    <tr
                      key={interview.id}
                      className={`${styles.tableRow} ${isSelected ? styles.tableRowSelected : ""}`}
                      style={{ backgroundColor: INTERVIEW_STATUS_ROW_COLOR[status] }}
                      onDoubleClick={() => onViewDetails(interview)}
                    >
                      <td className={styles.colCheckbox}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(interview.id, e.target.checked)}
                          className={styles.checkbox}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className={styles.colCaseId}>
                        <span className={styles.caseIdBadge}>{interview.caseId}</span>
                      </td>
                      <td className={styles.colInterviewee}>{interview.intervieweeName}</td>
                      <td className={styles.colType}>{interview.interviewType || "Initial"}</td>
                      <td className={styles.colDateTime}>
                        {interview.scheduledDate && interview.scheduledTime
                          ? `${new Date(interview.scheduledDate).toLocaleDateString()} ${interview.scheduledTime}`
                          : "—"}
                      </td>
                      <td className={styles.colStatus}>
                        <InterviewStatusBadge status={status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      {selectedIds.length > 0 && (
        <div className={styles.bulkActionsBar}>
          <span className={styles.bulkActionsCount}>
            {selectedIds.length} selected
          </span>
          <div className={styles.bulkActionsButtons}>
            <button
              className={styles.bulkActionBtn}
              onClick={() => onAddMeetingLink(selectedIds)}
            >
              + Add Meeting Link
            </button>
            <button
              className={styles.bulkActionBtn}
              onClick={() => onMarkComplete(selectedIds)}
            >
              ✓ Mark Complete
            </button>
            <button
              className={styles.bulkActionBtn}
              onClick={() => onViewDetails(selectedIds)}
            >
              👁 View Details
            </button>
          </div>
        </div>
      )}

      {interviews.length > pageSize && (
        <Pagination
          current={currentPage}
          total={Math.ceil(interviews.length / pageSize)}
          totalRecords={interviews.length}
          pageSize={pageSize}
          onChange={setCurrentPage}
        />
      )}
    </div>
  );
}
