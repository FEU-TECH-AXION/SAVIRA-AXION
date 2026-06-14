"use client";

import { useState, useMemo } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import styles from "./ProjectsTable.module.css";

// ─── Badge colors ─────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  "Active":    { bg: "#d1fae5", color: "#065f46" },
  "Upcoming":  { bg: "#dbeafe", color: "#1e40af" },
  "Completed": { bg: "#f3f4f6", color: "#374151" },
};

const APPROVAL_COLORS = {
  "approved": { bg: "#d1fae5", color: "#065f46" },
  "pending":  { bg: "#fef3c7", color: "#92400e" },
  "rejected": { bg: "#fee2e2", color: "#991b1b" },
};

const VISIBILITY_COLORS = {
  "public":  { bg: "#e1f5f5", color: "#037F81" },
  "private": { bg: "#f3f4f6", color: "#374151" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span className={styles.badge} style={{ background: s.bg, color: s.color }}>
      <span className={styles.badgeDot} />
      {status}
    </span>
  );
}

function ApprovalBadge({ approvalStatus }) {
  const s = APPROVAL_COLORS[approvalStatus] || { bg: "#f3f4f6", color: "#374151" };
  const label = approvalStatus
    ? approvalStatus.charAt(0).toUpperCase() + approvalStatus.slice(1)
    : "—";
  return (
    <span className={styles.badge} style={{ background: s.bg, color: s.color }}>
      {label}
    </span>
  );
}

function VisibilityBadge({ visibility }) {
  const s = VISIBILITY_COLORS[visibility] || { bg: "#f3f4f6", color: "#374151" };
  const icon = visibility === "public" ? "🌐" : "🔒";
  const label = visibility
    ? visibility.charAt(0).toUpperCase() + visibility.slice(1)
    : "—";
  return (
    <span className={styles.badge} style={{ background: s.bg, color: s.color }}>
      {icon} {label}
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

// ─── Main ProjectsTable ───────────────────────────────────────────────────────

/**
 * Props:
 *  paginated          — array of project objects for current page
 *  page               — current page number (1-based)
 *  totalPages         — total number of pages
 *  totalRecords       — total filtered records count
 *  pageSize           — records per page
 *  onPageChange(p)    — callback when page changes
 *  onRowDoubleClick(p)— callback when a row is double-clicked (opens CreateEditProject)
 *  onDeleteSelected   — bulk delete selected projects
 *  sortField          — current sort field key
 *  sortDir            — "asc" | "desc"
 *  onSort(field)      — callback when a sortable header is clicked
 */
export default function ProjectsTable({
  paginated = [],
  page = 1,
  totalPages = 1,
  totalRecords = 0,
  pageSize = 10,
  onPageChange,
  onRowDoubleClick,
  onDeleteSelected,
  onEdit,
  onDelete,
  sortField,
  sortDir,
  onSort,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  const pageIds = useMemo(() => paginated.map(p => p.id), [paginated]);
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

  const selectedProjects = paginated.filter(p => selectedIds.has(p.id));
  const selectionCount = selectedProjects.length;

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-PH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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
            {onDeleteSelected && (
              <button
                className={`${styles.bulkBtn} ${styles.bulkBtnDelete}`}
                onClick={() => {
                  onDeleteSelected(selectedProjects);
                  setSelectedIds(new Set());
                }}
              >
                Delete Selected
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
              <SortableTh field="id">Project ID</SortableTh>
              <SortableTh field="title">Project Title</SortableTh>
              <SortableTh field="status">Status</SortableTh>
              <th className={styles.th}>Visibility</th>
              <th className={styles.th}>Approval Status</th>
              <SortableTh field="dueDate">Due Date</SortableTh>
              <th className={`${styles.th} ${styles.columnsTh}`} />
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.emptyState}>
                  No projects found.
                </td>
              </tr>
            ) : (
              paginated.map((p, idx) => {
                const isSelected = selectedIds.has(p.id);
                const rowBg = isSelected
                  ? "#e1f5f5"
                  : idx % 2 === 1
                  ? "#f7f9fb"
                  : "#ffffff";

                return (
                  <tr
                    key={p.id}
                    className={`${styles.row} ${isSelected ? styles.rowSelected : ""}`}
                    style={{ background: rowBg }}
                    onDoubleClick={() => onRowDoubleClick && onRowDoubleClick(p)}
                    title="Double-click to edit"
                  >
                    <td
                      className={`${styles.td} ${styles.checkTd}`}
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isSelected}
                        onChange={() => toggleRow(p.id)}
                        aria-label={`Select project ${p.id}`}
                      />
                    </td>

                    <td className={`${styles.td} ${styles.idTd}`}>
                      <span className={styles.idText}>#{p.id}</span>
                    </td>

                    <td className={`${styles.td} ${styles.titleTd}`}>
                      <div className={styles.titleStack}>
                        <span className={styles.titleText}>{p.title}</span>
                        {p.tagline && (
                          <span className={styles.taglineText}>{p.tagline}</span>
                        )}
                      </div>
                    </td>

                    <td className={styles.td}>
                      <StatusBadge status={p.status} />
                    </td>

                    <td className={styles.td}>
                      <VisibilityBadge visibility={p.visibility} />
                    </td>

                    <td className={styles.td}>
                      <ApprovalBadge approvalStatus={p.approvalStatus} />
                    </td>

                    <td className={styles.td}>
                      <span className={styles.dateText}>{formatDate(p.dueDate)}</span>
                    </td>

                    <td className={`${styles.td} ${styles.actionsTd}`} onClick={e => e.stopPropagation()}>
                      <div className={styles.rowActions}>
                        {onEdit && (
                          <button
                            className={styles.rowBtn}
                            title="Edit project"
                            onClick={() => onEdit(p)}
                            aria-label={`Edit project ${p.id}`}
                          >
                            <FiEdit2 />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            className={`${styles.rowBtn} ${styles.rowBtnDelete}`}
                            title="Delete project"
                            onClick={() => onDelete(p)}
                            aria-label={`Delete project ${p.id}`}
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </td>
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