"use client";

import { useState, useMemo } from "react";
import styles from "./LegalTable.module.css";
import Tooltip from "../ui/Tooltip";
import { formatCaseCategories, formatCaseTypes } from "./legalReviewCalendar";

// ─── Status badge colors ─────────────────────────────────────────────────────

const STATUS_COLORS = {
  "Under Case Evaluation": { bg: "#f3e8ff", color: "#6b21a8" },
  "Case Filed":            { bg: "#ffedd5", color: "#9a3412" },
  "Investigation Ongoing": { bg: "#cffafe", color: "#155e75" },
  "Hearing Ongoing":       { bg: "#fce7f3", color: "#9d174d" },
  "Dismissed":             { bg: "#f1f5f9", color: "#475569" },
  "Perpetrator Convicted": { bg: "#d1fae5", color: "#065f46" },
};

// Row background tints per legal status
const ROW_STATUS_ROW_COLOR = {
  "Under Case Evaluation": "#faf5ff",
  "Case Filed":            "#fff7ed",
  "Investigation Ongoing": "#f0fffe",
  "Hearing Ongoing":       "#fff0f8",
  "Dismissed":             "#f8fafc",
  "Perpetrator Convicted": "#f0fdf4",
};

function assignedLawyerNames(caseData) {
  return (caseData.assignedLegal || [])
    .filter((person) => ["lawyer", "legal_officer"].includes(person.assignment_role))
    .map((person) => person.name)
    .filter(Boolean)
    .join(", ");
}

function assignedParalegalNames(caseData) {
  return (caseData.assignedLegal || [])
    .filter((person) => person.assignment_role === "paralegal")
    .map((person) => person.name)
    .filter(Boolean)
    .join(", ");
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      className={styles.statusBadge}
      style={{ background: s.bg, color: s.color, border: s.border || "none" }}
    >
      {status}
    </span>
  );
}

function PendingBadge() {
  return (
    <span className={styles.pendingBadge}>
       Pending
    </span>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────

function Pagination({ current, total, totalRecords, pageSize, onChange }) {
  const start = Math.min((current - 1) * pageSize + 1, totalRecords);
  const end   = Math.min(current * pageSize, totalRecords);

  // Build visible page numbers: always show first, last, current ±1, with ellipsis
  const pages = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    const set = new Set([1, total, current, current - 1, current + 1].filter(p => p >= 1 && p <= total));
    const sorted = [...set].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) pages.push("...");
      pages.push(sorted[i]);
    }
  }

  return (
    <div className={styles.paginationBar}>
      {/* Left arrow */}
      <button
        className={styles.pageArrow}
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        aria-label="Previous page"
      >
        ‹
      </button>

      {/* Page buttons */}
      <div className={styles.pageNumbers}>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className={styles.ellipsis}>…</span>
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

      {/* Right arrow */}
      <button
        className={styles.pageArrow}
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        aria-label="Next page"
      >
        ›
      </button>

      {/* Record count — bottom right */}
      <div className={styles.recordCount}>
        {start}–{end} out of {totalRecords} records
        <span className={styles.recordCaret}>▾</span>
      </div>
    </div>
  );
}

// ─── Columns toggle button ────────────────────────────────────────────────────

function ColumnsBtn() {
  return (
    <Tooltip text="Columns appear automatically when their filters are active">
    <button className={styles.columnsBtn} aria-label="Manage columns">
      {/* 2×3 grid icon */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.3" />
      </svg>
    </button>
    </Tooltip>
  );
}

// ─── Main CasesTable ─────────────────────────────────────────────────────────

/**
 * Props:
 *  paginated              — array of legal case objects for current page
 *  page                   — current page number (1-based)
 *  totalPages             — total number of pages
 *  totalRecords           — total filtered records count
 *  pageSize               — records per page (e.g. 10)
 *  onPageChange(p)        — callback when page changes
 *  onRowDoubleClick(c)    — callback when a row is double-clicked (opens ViewLegalCase)
 *  onParalegal(cases[])   — bulk paralegal action for selected cases
 *  onEndorse(cases[])     — bulk endorse action for selected cases
 *  onMonitor(cases[])     — bulk monitor action for selected cases
 *  onStatus(cases[])      — bulk status update for selected cases
 *  isAdmin                — boolean
 *  sortField              — current sort field key
 *  sortDir                — "asc" | "desc"
 *  onSort(field)          — callback when a sortable header is clicked
 */
export default function LegalTable({
  paginated = [],
  page = 1,
  totalPages = 1,
  totalRecords = 0,
  pageSize = 10,
  onPageChange,
  onRowDoubleClick,
  onParalegal,
  onConsult,
  onEndorse,
  onMonitor,
  onCalendar,
  onStatus,
  onAssignLegal,
  onRemoveAssignedStaff,
  isAdmin,
  sortField,
  sortDir,
  onSort,
  activeFilters = {},
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Derived: which extra columns to show based on active extra filters
  const showEndorsedTo = !!(activeFilters.endorsedTo && activeFilters.endorsedTo !== "" && activeFilters.endorsedTo !== "All");
  const showCity = !!(activeFilters.city && activeFilters.city !== "" && activeFilters.city !== "All");
  const showParalegal = !!(activeFilters.assignedParalegal && activeFilters.assignedParalegal !== "" && activeFilters.assignedParalegal !== "All");
  const showCaseCategories = !!(activeFilters.caseCategory && activeFilters.caseCategory !== "" && activeFilters.caseCategory !== "All");

  // Sync selection: clear if paginated changes (page turn)
  const pageIds = useMemo(() => paginated.map(c => c.id), [paginated]);

  const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const someSelected = pageIds.some(id => selectedIds.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pageIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pageIds.forEach(id => next.add(id));
        return next;
      });
    }
  }

  function toggleRow(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedCases = paginated.filter(c => selectedIds.has(c.id));
  const selectionCount = selectedCases.length;

  // Format submission date like image: "14-Aug-2024 10:10 AM"
  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; // fallback if already formatted
    return d.toLocaleString("en-PH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).replace(",", "");
  }

  // Sort indicator
  function SortIcon({ field }) {
    if (sortField !== field) return <span className={styles.sortNeutral}>↕</span>;
    return <span className={styles.sortActive}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  function SortableTh({ field, children }) {
    return (
      <th
        className={`${styles.th} ${styles.sortableTh}`}
        onClick={() => onSort && onSort(field)}
      >
        {children} <SortIcon field={field} />
      </th>
    );
  }

  return (
    <div className={styles.tableWrap}>
      {/* Bulk action bar — appears when rows are selected */}
      {selectionCount > 0 && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkCount}>{selectionCount} selected</span>
          <div className={styles.bulkActions}>
            <Tooltip text="Assign lawyers or paralegals"><button className={`${styles.bulkBtn} ${styles.bulkBtnAssign}`} onClick={() => onAssignLegal?.(selectedCases)}>Assign</button></Tooltip>
            <Tooltip text="Update the paralegal evidence checklist"><button className={styles.bulkBtn} onClick={() => onParalegal?.(selectedCases)}>Paralegal</button></Tooltip>
            <Tooltip text="Record a lawyer consultation"><button className={styles.bulkBtn} onClick={() => onConsult?.(selectedCases)}>Consult</button></Tooltip>
            <Tooltip text="Record or update an endorsement"><button className={styles.bulkBtn} onClick={() => onEndorse?.(selectedCases)}>Endorse</button></Tooltip>
            <Tooltip text="Add a referral monitoring update"><button className={styles.bulkBtn} onClick={() => onMonitor?.(selectedCases)}>Monitor</button></Tooltip>
            <Tooltip text="View hearings and follow-up deadlines"><button className={styles.bulkBtn} onClick={() => onCalendar?.(selectedCases)}>Calendar</button></Tooltip>
            <Tooltip text="Update case status"><button className={`${styles.bulkBtn} ${styles.bulkBtnStatus}`} onClick={() => onStatus?.(selectedCases)}>Status</button></Tooltip>
            {isAdmin && (
              <Tooltip text="Remove assigned lawyers and paralegals">
                <button className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`} onClick={() => onRemoveAssignedStaff?.(selectedCases)}>Remove Assigned Staff</button>
              </Tooltip>
            )}
          </div>
          <div className={styles.bulkClearWrap}>
            <Tooltip text="Clear selected rows">
              <button className={styles.bulkClear} onClick={() => setSelectedIds(new Set())}>Clear</button>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Table */}
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.headerRow}>
              {/* Master checkbox */}
              <th className={`${styles.th} ${styles.checkTh}`}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <SortableTh field="id">Case ID</SortableTh>
              <SortableTh field="status">Status</SortableTh>
              <th className={styles.th}>Case Type</th>
              {showCaseCategories && <th className={styles.th}>Case Categories</th>}
              <SortableTh field="reporterId">Reporter ID</SortableTh>
              <th className={styles.th}>Lawyer(s)</th>
              {showParalegal && <th className={styles.th}>Paralegal(s)</th>}
              <SortableTh field="dateReported">
                Submission Date
              </SortableTh>
              {showEndorsedTo && <th className={styles.th}>Endorsed To</th>}
              {showCity && <th className={styles.th}>City</th>}
              {/* Columns toggle button */}
              <th className={`${styles.th} ${styles.columnsTh}`}>
                <ColumnsBtn />
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8 + (showCaseCategories ? 1 : 0) + (showParalegal ? 1 : 0) + (showEndorsedTo ? 1 : 0) + (showCity ? 1 : 0)} className={styles.emptyState}>
                  No cases found.
                </td>
              </tr>
            ) : (
              paginated.map((c, idx) => {
                const isSelected = selectedIds.has(c.id);
                const rowBg = isSelected
                  ? "#e1f5f5"
                  : idx % 2 === 1
                  ? "#f7f9fb"
                  : "#ffffff";

                return (
                  <tr
                    key={c.id}
                    className={`${styles.row} ${isSelected ? styles.rowSelected : ""}`}
                    style={{ background: rowBg }}
                    onDoubleClick={() => onRowDoubleClick && onRowDoubleClick(c)}
                    onClick={(e) => {
                      // Single click only selects via checkbox; don't navigate
                      if (e.target.type === "checkbox") return;
                    }}
                  >
                    {/* Checkbox — stop propagation so click doesn't also navigate */}
                    <td
                      className={`${styles.td} ${styles.checkTd}`}
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isSelected}
                        onChange={() => toggleRow(c.id)}
                        aria-label={`Select case ${c.id}`}
                      />
                    </td>

                    {/* Case ID */}
                    <td className={`${styles.td} ${styles.caseIdTd}`}>
                      <span className={styles.caseIdText}>{c.id}</span>
                    </td>

                    {/* Status */}
                    <td className={styles.td}>
                      <StatusBadge status={c.status} />
                      {c.pendingApproval && (
                        <div style={{ marginTop: 3 }}>
                          <PendingBadge />
                        </div>
                      )}
                    </td>

                    {/* Case Type */}
                    <td className={styles.td}>
                      {formatCaseTypes(c) || <span className={styles.muted}>Unassigned</span>}
                    </td>

                    {showCaseCategories && (
                      <td className={styles.td}>
                        {formatCaseCategories(c) || <span className={styles.muted}>Unassigned</span>}
                      </td>
                    )}

                    {/* Reporter ID */}
                    <td className={`${styles.td} ${styles.reporterIdTd}`}>
                      <strong>{c.reporterId}</strong>
                    </td>

                    {/* Assigned lawyers */}
                    <td className={styles.td}>
                      {assignedLawyerNames(c) || (
                        <span className={styles.muted}>Unassigned</span>
                      )}
                    </td>

                    {showParalegal && (
                      <td className={styles.td}>
                        {assignedParalegalNames(c) || <span className={styles.muted}>Unassigned</span>}
                      </td>
                    )}

                    {/* Submission Date */}
                    <td className={styles.td}>
                      <span className={styles.dateText}>
                        {formatDate(c.dateReported)}
                      </span>
                    </td>

                    {/* Extra: Endorsed To */}
                    {showEndorsedTo && (
                      <td className={styles.td}>
                        {c.endorsedTo || <span className={styles.muted}>Unassigned</span>}
                      </td>
                    )}

                    {/* Extra: City */}
                    {showCity && (
                      <td className={styles.td}>
                        {c.city || c.region || <span className={styles.muted}>Not specified</span>}
                      </td>
                    )}

                    {/* Empty column under the columns button */}
                    <td className={styles.td} />
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination bar */}
      <Pagination
        current={page}
        total={totalPages}
        totalRecords={totalRecords}
        pageSize={pageSize}
        onChange={onPageChange}
      />
    </div>
  );
}
