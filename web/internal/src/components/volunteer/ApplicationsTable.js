"use client";

import { useState, useMemo } from "react";
import styles from "./ApplicationsTable.module.css";

// ─── Status badge colors ──────────────────────────────────────────────────────

const STATUS_COLORS = {
  "Pending":   { bg: "#fef9c3", color: "#854d0e" },
  "Reviewing": { bg: "#dbeafe", color: "#1e40af" },
  "Approved":  { bg: "#d1fae5", color: "#065f46" },
  "Rejected":  { bg: "#fee2e2", color: "#991b1b" },
  "Withdrawn": { bg: "#f3f4f6", color: "#374151" },
};

function formatAssignees(applicant) {
  const names = applicant.assignedEvaluators || applicant.assignedStaff || [];
  if (Array.isArray(names) && names.length > 0) return names.join(", ");
  if (typeof names === "string" && names.trim()) return names;
  return "—";
}

const EXTRA_COLUMN_DEFS = {
  city:                { label: "City",                    render: a => a.city || "—" },
  fieldsWithBackground:{ label: "Fields with Background",    render: a => Array.isArray(a.fieldsWithBackground) ? a.fieldsWithBackground.join(", ") || "—" : "—" },
  fieldsOfInterest:    { label: "Fields of Interest",      render: a => Array.isArray(a.fieldsOfInterest)     ? a.fieldsOfInterest.join(", ")     || "—" : "—" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      className={styles.statusBadge}
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ current, total, totalRecords, pageSize, onChange }) {
  const start = Math.min((current - 1) * pageSize + 1, totalRecords);
  const end   = Math.min(current * pageSize, totalRecords);

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
      <button
        className={styles.pageArrow}
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        aria-label="Next page"
      >
        ›
      </button>
      <div className={styles.recordCount}>
        {start}–{end} out of {totalRecords} records
        <span className={styles.recordCaret}>▾</span>
      </div>
    </div>
  );
}

// ─── Columns toggle icon ──────────────────────────────────────────────────────

function ColumnsBtn() {
  return (
    <button className={styles.columnsBtn} title="Toggle columns" aria-label="Manage columns">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.3" />
      </svg>
    </button>
  );
}

// ─── Main ApplicationsTable ───────────────────────────────────────────────────

/**
 * Props:
 *  paginated          — array of applicant objects for current page
 *  page               — current page number (1-based)
 *  totalPages         — total number of pages
 *  totalRecords       — total filtered records count
 *  pageSize           — records per page
 *  onPageChange(p)    — callback when page changes
 *  onRowClick(a)      — callback when a row is clicked (navigate to view)
 *  onUpdateStatus(as[])— bulk update status of selected applicants
 *  sortField          — current sort field key
 *  sortDir            — "asc" | "desc"
 *  onSort(field)      — callback when a sortable header is clicked
 */
export default function ApplicationsTable({
  paginated = [],
  page = 1,
  totalPages = 1,
  totalRecords = 0,
  pageSize = 10,
  onPageChange,
  onRowClick,
  onUpdateStatus,
  sortField,
  sortDir,
  onSort,
  onAssign,
  onRemoveAssignedStaff,
  isAdmin,
  isStaff,
  currentUserId,
  extraColumns,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  const pageIds = useMemo(() => paginated.map(a => a.id), [paginated]);
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

  const selectedApplicants = paginated.filter(a => selectedIds.has(a.id));
  const selectionCount = selectedApplicants.length;
  const canUpdateSelectedStatus =
    isAdmin ||
    (isStaff &&
      selectedApplicants.length > 0 &&
      selectedApplicants.every((a) =>
        (a.assignedEvaluatorIds || []).some((id) => String(id) === String(currentUserId))
      ));

  function hasExplicitTime(value) {
    if (value instanceof Date) return true;
    if (typeof value !== "string") return false;
    return /T\d{2}:\d{2}| \d{1,2}:\d{2}/.test(value);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
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
      {/* Bulk action bar */}
      {selectionCount > 0 && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkCount}>{selectionCount} selected</span>
          <div className={styles.bulkActions}>
            {isAdmin && (
              <button
                className={styles.bulkBtn}
                onClick={() => onAssign && onAssign(selectedApplicants)}
              >
                Assign
              </button>
            )}
            {isAdmin && (
              <button
                className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`}
                onClick={() => onRemoveAssignedStaff && onRemoveAssignedStaff(selectedApplicants)}
              >
                Remove Assigned Staff
              </button>
            )}
            {canUpdateSelectedStatus && (
              <button
                className={`${styles.bulkBtn} ${styles.bulkBtnStatus}`}
                onClick={() => onUpdateStatus && onUpdateStatus(selectedApplicants)}
              >
                Update Status
              </button>
            )}
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
              <SortableTh field="id">Application ID</SortableTh>
              <SortableTh field="name">Applicant Name</SortableTh>
              <SortableTh field="status">Status</SortableTh>
              <th className={styles.th}>Assigned Evaluators</th>
              <th className={styles.th}>Gender</th>
              <SortableTh field="dateApplied">Date Applied</SortableTh>
              {(extraColumns || []).map(key => (
                <th key={key} className={styles.th}>{EXTRA_COLUMN_DEFS[key]?.label}</th>
              ))}
              <th className={`${styles.th} ${styles.columnsTh}`}>
                <ColumnsBtn />
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyState}>
                  No applicants found.
                </td>
              </tr>
            ) : (
              paginated.map((a, idx) => {
                const isSelected = selectedIds.has(a.id);
                const rowBg = isSelected
                  ? "#e1f5f5"
                  : idx % 2 === 1
                  ? "#f7f9fb"
                  : "#ffffff";

                return (
                  <tr
                    key={a.id}
                    className={`${styles.row} ${isSelected ? styles.rowSelected : ""}`}
                    style={{ background: rowBg }}
                    onClick={(e) => {
                      if (e.target.type === "checkbox") return;
                      onRowClick && onRowClick(a);
                    }}
                  >
                    <td
                      className={`${styles.td} ${styles.checkTd}`}
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isSelected}
                        onChange={() => toggleRow(a.id)}
                        aria-label={`Select applicant ${a.id}`}
                      />
                    </td>

                    <td className={`${styles.td} ${styles.appIdTd}`}>
                      <span className={styles.appIdText}>{a.id}</span>
                    </td>

                    <td className={`${styles.td} ${styles.nameTd}`}>
                      <div className={styles.nameStack}>
                        <span className={styles.nameText}>{a.name}</span>
                        <span className={styles.emailText}>{a.email}</span>
                      </div>
                    </td>

                    <td className={styles.td}>
                      <StatusBadge status={a.status} />
                    </td>

                    <td className={styles.td}>
                      <span className={a.assignedEvaluators?.length ? styles.orgText : styles.muted}>
                        {formatAssignees(a)}
                      </span>
                    </td>

                    <td className={styles.td}>
                      {a.gender
                        ? <span className={styles.orgText}>{a.gender}</span>
                        : <span className={styles.muted}>—</span>
                      }
                    </td>

                    <td className={styles.td}>
                      <span className={styles.dateText}>{formatDate(a.dateApplied)}</span>
                    </td>

                    {(extraColumns || []).map(key => (
                      <td key={key} className={styles.td}>
                        {EXTRA_COLUMN_DEFS[key]?.render(a)}
                      </td>
                    ))}

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
