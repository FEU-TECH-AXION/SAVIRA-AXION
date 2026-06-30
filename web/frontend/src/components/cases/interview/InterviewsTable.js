"use client";

import { useState, useMemo, useEffect } from "react";
import styles from "./InterviewsTable.module.css";

const INTERVIEW_STATUS_COLORS = {
  Invited: { bg: "#dbeafe", color: "#1e40af" },
  "Awaiting New Slots": { bg: "#fff7ed", color: "#9a3412" },
  Scheduled: { bg: "#fef9c3", color: "#854d0e" },
  Rescheduled: { bg: "#e0f2fe", color: "#0369a1" },
  Confirmed: { bg: "#dcfce7", color: "#166534" },
  Completed: { bg: "#d1fae5", color: "#065f46" },
  Cancelled: { bg: "#fee2e2", color: "#991b1b" },
  Expired: { bg: "#f1f5f9", color: "#475569" },
  Rejected: { bg: "#fecdd3", color: "#be123c" },
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
  onRemoveAssignedStaff,
  onOfferNewSlots,
  loading = false,
  pageSize = 10,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const paginatedInterviews = useMemo(() => {
  const start = (currentPage - 1) * pageSize;
  return interviews.slice(start, start + pageSize);
}, [interviews, currentPage, pageSize]);

useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(interviews.length / pageSize)
    );

    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [interviews.length, pageSize, currentPage]);

  const pageIds = useMemo(
    () => paginatedInterviews.map((i) => i.id),
    [paginatedInterviews]
  );

  const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
  const someSelected = pageIds.some(id => selectedIds.includes(id));

  const handleSelectAll = (checked) => {
    let newSelected = [...selectedIds];
    if (checked) {
      newSelected = [...new Set([...selectedIds, ...pageIds])];
    } else {
      newSelected = newSelected.filter((id) => !pageIds.includes(id));
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

  if (interviews.length === 0) {
    return <div className={styles.empty}>No interviews found</div>;
  }

  const selectedInterviews = interviews.filter((i) => selectedIds.includes(i.id));
  const canAddMeetingLink = selectedInterviews.every((i) => i.interviewStatus === "Scheduled");
  const canMarkComplete = selectedInterviews.every((i) => i.interviewStatus === "Confirmed"); 

  return (
    <div className={styles.tableWrapper}>
      
    {selectedIds.length > 0 && (
      <div className={styles.bulkActionsBar}>
        <span className={styles.bulkActionsCount}>
          {selectedIds.length} selected
        </span>
        <div className={styles.bulkActionsButtons}>
          <button
            className={styles.bulkActionBtn}
            onClick={() => onAddMeetingLink(selectedIds)}
            disabled={!canAddMeetingLink}
            title={!canAddMeetingLink ? "Only Scheduled interviews can have a meeting link added" : ""}
            style={{ opacity: !canAddMeetingLink ? 0.4 : 1, cursor: !canAddMeetingLink ? "not-allowed" : "pointer" }}
          >
            + Add Meeting Link
          </button>
          <button
            className={styles.bulkActionBtn}
            onClick={() => onMarkComplete(selectedIds)}
            disabled={!canMarkComplete}
            title={!canMarkComplete ? "Only Confirmed interviews can be marked complete" : ""}
            style={{ opacity: !canMarkComplete ? 0.4 : 1, cursor: !canMarkComplete ? "not-allowed" : "pointer" }}
          >
            Mark Complete
          </button>
          <button
            className={styles.bulkActionBtn}
            onClick={() => onViewDetails(selectedIds)}
          >
            View Details
          </button>
          {onRemoveAssignedStaff && (
            <button
              className={`${styles.bulkActionBtn} ${styles.bulkActionBtnDanger}`}
              onClick={() => onRemoveAssignedStaff(selectedIds)}
            >
              Remove Assigned Staff
            </button>
          )}
        </div>
      </div>
    )}

      <table className={styles.interviewTable}>
        <thead>
          <tr>
            <th className={styles.colCheckbox}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className={styles.checkbox}
                aria-label="Select all"
              />
            </th>
            <th className={styles.colCaseId}>Case ID</th>
            <th className={styles.colInterviewee}>Interviewee Name</th>
            <th className={styles.colType}>Interview Type</th>
            <th className={styles.colDateTime}>Date & Time</th>
            <th className={styles.colStatus}>Status</th>
          </tr>
        </thead>
        <tbody>
          {paginatedInterviews.map((interview, idx) => {
            const isSelected = selectedIds.includes(interview.id);
            const status = interview.interviewStatus || "Invited";
            const rowBg = isSelected
              ? "#e1f5f5"
              : idx % 2 === 1
              ? "#f7f9fb"
              : "#ffffff";

            return (
              <tr
                key={interview.id}
                className={`${styles.tableRow} ${isSelected ? styles.tableRowSelected : ""}`}
                style={{ backgroundColor: rowBg }}
                onDoubleClick={() => onViewDetails(interview)}
              >
                <td className={styles.colCheckbox}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleSelectRow(interview.id, e.target.checked)}
                    className={styles.checkbox}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select interview ${interview.id}`}
                  />
                </td>
                <td className={styles.colCaseId}>
                  <span className={styles.caseIdBadge}>{interview.caseId}</span>
                </td>
                <td className={styles.colInterviewee}>
                  {interview.intervieweeName}
                  {interview.availabilityRequest && (
                    <div style={{ marginTop: 4, color: "#92400e", fontSize: "0.72rem", lineHeight: 1.35, whiteSpace: "pre-line" }}>
                      <strong>New slots requested:</strong>{" "}
                      {interview.availabilityRequest}
                      <div>
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); onOfferNewSlots(interview); }}
                          style={{ marginTop: 5, padding: 0, border: 0, background: "transparent", color: "#037F81", fontWeight: 700, cursor: "pointer" }}
                        >
                          Offer new slots
                        </button>
                      </div>
                    </div>
                  )}
                </td>
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
