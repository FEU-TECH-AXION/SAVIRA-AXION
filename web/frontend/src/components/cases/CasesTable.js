"use client";

import { useState, useMemo } from "react";
import styles from "./CasesTable.module.css";

// ─── Status badge colors ─────────────────────────────────────────────────────

const STATUS_COLORS = {
  "Submitted":             { bg: "#e0f2fe", color: "#0369a1" }, // Light Blue
  "For Verification":      { bg: "#dbeafe", color: "#1e40af" }, // Blue
  "Undergoing Review":     { bg: "#fef9c3", color: "#854d0e" }, // Yellow
  "Verified - True":       { bg: "#dcfce7", color: "#166534" }, // Green
  "Verified - False":      { bg: "#fee2e2", color: "#991b1b" }, // Red
  "Under Case Evaluation": { bg: "#f3e8ff", color: "#6b21a8" }, // Purple
  "Case Filed":            { bg: "#ffedd5", color: "#9a3412" }, // Orange
  "Investigation Ongoing": { bg: "#cffafe", color: "#155e75" }, // Cyan
  "Hearing Ongoing":       { bg: "#fce7f3", color: "#9d174d" }, // Pink
  "Dismissed":             { bg: "#f1f5f9", color: "#475569" }, // Slate/Gray
  "Perpetrator Convicted": { bg: "#d1fae5", color: "#065f46" }, // Emerald Green
  "Resolved":              { bg: "#ccfbf1", color: "#115e59" }, // Teal
  "Withdrawn":             { bg: "#fef3c7", color: "#92400e" }, // Amber/Muted Brown
};

// Open → warm peach; Closed → soft green (matching image)
const ROW_STATUS_ROW_COLOR = {
  "For Verification":      "#fff9f5",
  "Undergoing Review":     "#fffdf0",
  "Verified - True":       "#f0fdf4",
  "Verified - False":      "#fff0f0",
  "Under Case Evaluation": "#faf5ff",
  "Case Filed":            "#fff7ed",
  "Investigation Ongoing": "#f0fffe",
  "Hearing Ongoing":       "#fff0f8",
  "Dismissed":             "#f8fafc",
  "Perpetrator Convicted": "#f0fdf4",
};

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
    <button className={styles.columnsBtn} title="Toggle columns" aria-label="Manage columns">
      {/* 2×3 grid icon */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.3" />
      </svg>
    </button>
  );
}

// ─── Main CasesTable ─────────────────────────────────────────────────────────

/**
 * Props:
 *  paginated              — array of case objects for current page
 *  page                   — current page number (1-based)
 *  totalPages             — total number of pages
 *  totalRecords           — total filtered records count
 *  pageSize               — records per page (e.g. 10)
 *  onPageChange(p)        — callback when page changes
 *  onRowClick(c)          — callback when a row is clicked (navigate to case)
 *  onAssign(cases[])      — bulk assign selected cases
 *  onUpdateStatus(cases[])— bulk update status of selected cases
 *  isAdmin                — boolean
 *  getAvailableTransitions(c) — function returning string[]
 *  sortField              — current sort field key
 *  sortDir                — "asc" | "desc"
 *  onSort(field)          — callback when a sortable header is clicked
 */
export default function CasesTable({
  paginated = [],
  page = 1,
  totalPages = 1,
  totalRecords = 0,
  pageSize = 10,
  onPageChange,
  onRowClick,
  onAssign,
  onRemoveAssignedStaff,
  onUpdateStatus,
  isAdmin,
  getAvailableTransitions,
  sortField,
  sortDir,
  onSort,
  activeFilters = {},
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Derived: which extra columns to show based on active extra filters
  const showPrimaryCategory = !!(activeFilters.primaryCategory && activeFilters.primaryCategory !== "" && activeFilters.primaryCategory !== "All");
  const activeCityFilter = activeFilters.incident_city || activeFilters.city;
  const showCity = !!(activeCityFilter && activeCityFilter !== "" && activeCityFilter !== "All");

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

  function hasExplicitTime(value) {
    if (value instanceof Date) return true;
    if (typeof value !== "string") return false;
    return /T\d{2}:\d{2}| \d{1,2}:\d{2}/.test(value);
  }

  // Format submission date like image: "14-Aug-2024 10:10 AM" when a real time exists.
  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; // fallback if already formatted
    const options = {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...(hasExplicitTime(dateStr)
        ? { hour: "numeric", minute: "2-digit", hour12: true }
        : {}),
    };
    return d.toLocaleString("en-PH", options).replace(",", "");
  }

  function formatCaseType(caseType) {
    if (Array.isArray(caseType)) return caseType.filter(Boolean).join(", ");
    return caseType;
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
            {isAdmin && (
              <button
                className={styles.bulkBtn}
                onClick={() => onAssign && onAssign(selectedCases)}
              >
                Assign
              </button>
            )}
            {isAdmin && (
              <button
                className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`}
                onClick={() => onRemoveAssignedStaff && onRemoveAssignedStaff(selectedCases)}
              >
                Remove Assigned Staff
              </button>
            )}
            <button
              className={`${styles.bulkBtn} ${styles.bulkBtnStatus}`}
              onClick={() => onUpdateStatus && onUpdateStatus(selectedCases)}
            >
              Update Case Status
            </button>
          </div>
          <button
            className={styles.bulkClear}
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </button>
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
              <SortableTh field="caseId">Case ID</SortableTh>
              <SortableTh field="status">Case Status</SortableTh>
              <th className={styles.th}>Duplicate Check</th>
              <th className={styles.th}>Case Type</th>
              <SortableTh field="reporterId">Reporter ID</SortableTh>
              <th className={styles.th}>Case Officer</th>
              <SortableTh field="dateSubmitted">
                Submission Date
              </SortableTh>
              {showPrimaryCategory && <th className={styles.th}>Primary Category</th>}
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
                <td colSpan={9 + (showPrimaryCategory ? 1 : 0) + (showCity ? 1 : 0)} className={styles.emptyState}>
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
                    onClick={(e) => {
                      // Don't navigate if clicking checkbox
                      if (e.target.type === "checkbox") return;
                      onRowClick && onRowClick(c);
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
                        aria-label={`Select case ${c.caseId}`}
                      />
                    </td>

                    {/* Case ID */}
                    <td className={`${styles.td} ${styles.caseIdTd}`}>
                      <span className={styles.caseIdText}>{c.caseId}</span>
                    </td>

                    {/* Case Status */}
                    <td className={styles.td}>
                      <StatusBadge status={c.status} />
                      {c.pendingApproval && (
                        <div style={{ marginTop: 3 }}>
                          <PendingBadge />
                        </div>
                      )}
                    </td>

                    <td className={styles.td}>
                      {c.possibleDuplicates?.length ? (
                        <span
                          className={styles.duplicateCheckBadge}
                          title={`${c.possibleDuplicates.length} possible duplicate match(es)`}
                        >
                          <span className={styles.duplicateCheckDot} />
                          Review matches
                          <strong>{Math.max(...c.possibleDuplicates.map((item) => Number(item.similarity_score) || 0))}%</strong>
                        </span>
                      ) : (
                        <span className={styles.muted}>No match</span>
                      )}
                    </td>

                    {/* Case Type */}
                    <td className={styles.td}>
                      {formatCaseType(c.caseType) || <span className={styles.muted}>Unassigned</span>}
                    </td>

                    {/* Reporter ID */}
                    <td className={`${styles.td} ${styles.reporterIdTd}`}>
                      <strong>{c.reporterId}</strong>
                    </td>

                    {/* Case Officer */}
                    <td className={styles.td}>
                      {c.assignedOfficer || (
                        <span className={styles.muted}>Unassigned</span>
                      )}
                    </td>

                    {/* Submission Date */}
                    <td className={styles.td}>
                      <span className={styles.dateText}>
                        {formatDate(c.dateSubmitted)}
                      </span>
                    </td>

                    {/* Extra: Primary Category */}
                    {showPrimaryCategory && (
                      <td className={styles.td}>
                        {c.primaryCategory || <span className={styles.muted}>—</span>}
                      </td>
                    )}

                    {/* Extra: City */}
                    {showCity && (
                      <td className={styles.td}>
                        {c.incident_city || c.city || <span className={styles.muted}>—</span>}
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
