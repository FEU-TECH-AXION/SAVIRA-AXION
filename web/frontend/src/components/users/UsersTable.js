"use client";

import { useState, useMemo } from "react";
import styles from "./UsersTable.module.css";

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const isActive = status === "Active";
  return (
    <span className={isActive ? styles.badgeActive : styles.badgeInactive}>
      <span className={styles.badgeDot} />
      {status}
    </span>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────

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
      >‹</button>
      <div className={styles.pageNumbers}>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className={styles.ellipsis}>…</span>
          ) : (
            <button
              key={p}
              className={`${styles.pageBtn} ${p === current ? styles.pageBtnActive : ""}`}
              onClick={() => onChange(p)}
            >{p}</button>
          )
        )}
      </div>
      <button
        className={styles.pageArrow}
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        aria-label="Next page"
      >›</button>
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
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.3" />
      </svg>
    </button>
  );
}

// ─── Main UsersTable ─────────────────────────────────────────────────────────

/**
 * Props:
 *  paginated          — array of user objects for current page
 *  page               — current page number (1-based)
 *  totalPages         — total number of pages
 *  totalRecords       — total filtered records count
 *  pageSize           — records per page
 *  onPageChange(p)    — callback when page changes
 *  onEdit(user)       — callback to open Edit modal for selected user(s)
 *  onDeactivate(user) — callback to open Deactivate modal for selected user(s)
 *  sortField          — current sort field key
 *  sortDir            — "asc" | "desc"
 *  onSort(field)      — callback when a sortable header is clicked
 *  activeRoleFilter   — current role filter value (to show/hide Committee column)
 */
export default function UsersTable({
  paginated = [],
  page = 1,
  totalPages = 1,
  totalRecords = 0,
  pageSize = 8,
  onPageChange,
  onEdit,
  onDeactivate,
  sortField,
  sortDir,
  onSort,
  activeRoleFilter = "All",
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  const pageIds = useMemo(() => paginated.map(u => u.user_id), [paginated]);

  const allSelected  = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const someSelected = pageIds.some(id => selectedIds.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(prev => { const next = new Set(prev); pageIds.forEach(id => next.delete(id)); return next; });
    } else {
      setSelectedIds(prev => { const next = new Set(prev); pageIds.forEach(id => next.add(id)); return next; });
    }
  }

  function toggleRow(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedUsers   = paginated.filter(u => selectedIds.has(u.user_id));
  const selectionCount  = selectedUsers.length;

  // Show Committee column when filter is Staff or a selected user is Staff
  const showCommittee = activeRoleFilter === "Staff";

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
            <button
              className={styles.bulkBtn}
              onClick={() => {
                if (selectionCount === 1) onEdit && onEdit(selectedUsers[0]);
                else onEdit && onEdit(selectedUsers[0]); // Edit first selected; multi-edit opens sequentially
              }}
            >
              Edit
            </button>
            <button
              className={`${styles.bulkBtn} ${styles.bulkBtnDeactivate}`}
              onClick={() => onDeactivate && onDeactivate(selectedUsers[0])}
            >
              Deactivate
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
              <SortableTh field="user_id">User ID</SortableTh>
              <SortableTh field="name">Name</SortableTh>
              <SortableTh field="status">Status</SortableTh>
              <SortableTh field="role">Role</SortableTh>
              {showCommittee && <th className={styles.th}>Committee</th>}
              <SortableTh field="dateCreated">Date Created</SortableTh>
              <th className={`${styles.th} ${styles.columnsTh}`}>
                <ColumnsBtn />
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={showCommittee ? 8 : 7} className={styles.emptyState}>
                  No users found.
                </td>
              </tr>
            ) : (
              paginated.map((u, idx) => {
                const isSelected = selectedIds.has(u.user_id);
                const rowBg = isSelected ? "#e1f5f5" : idx % 2 === 1 ? "#f7f9fb" : "#ffffff";

                return (
                  <tr
                    key={u.user_id}
                    className={`${styles.row} ${isSelected ? styles.rowSelected : ""}`}
                    style={{ background: rowBg }}
                  >
                    <td
                      className={`${styles.td} ${styles.checkTd}`}
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isSelected}
                        onChange={() => toggleRow(u.user_id)}
                        aria-label={`Select user ${u.user_id}`}
                      />
                    </td>

                    {/* User ID */}
                    <td className={`${styles.td} ${styles.userIdTd}`}>
                      <span className={styles.userIdText}>{u.user_id}</span>
                    </td>

                    {/* Name */}
                    <td className={styles.td}>
                      <strong>{u.name}</strong>
                    </td>

                    {/* Status */}
                    <td className={styles.td}>
                      <StatusBadge status={u.status} />
                    </td>

                    {/* Role */}
                    <td className={styles.td}>{u.role}</td>

                    {/* Committee — only if showCommittee */}
                    {showCommittee && (
                      <td className={styles.td}>
                        {u.role === "Staff"
                          ? (u.committee ?? u.committee_name ?? <span className={styles.muted}>—</span>)
                          : <span className={styles.muted}>—</span>
                        }
                      </td>
                    )}

                    {/* Date Created */}
                    <td className={styles.td}>
                      <span className={styles.dateText}>{u.dateCreated}</span>
                    </td>

                    {/* Empty column under columns button */}
                    <td className={styles.td} />
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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