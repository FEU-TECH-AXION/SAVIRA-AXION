"use client";

import { useMemo, useState } from "react";
import styles from "./ChapterTable.module.css";

const STATUS_COLORS = {
  "Formation in Progress": { bg: "#dbeafe", color: "#1e40af" },
  "COC Organizing": { bg: "#fef3c7", color: "#92400e" },
  "Ready for Recognition": { bg: "#d1fae5", color: "#065f46" },
  "Recognized": { bg: "#ccfbf1", color: "#0f766e" },
  "Needs Division": { bg: "#fee2e2", color: "#991b1b" },
};

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span className={styles.statusBadge} style={{ background: color.bg, color: color.color }}>
      {status || "Formation in Progress"}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "No target date set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid target date";
  return date.toLocaleDateString("en-PH", { day: "2-digit", month: "short", year: "numeric" });
}

function renderSortIcon(field, sortField, sortDir) {
  if (sortField !== field) return <span className={styles.sortNeutral}>{"\u2195"}</span>;
  return <span className={styles.sortActive}>{sortDir === "asc" ? "\u2191" : "\u2193"}</span>;
}

function renderSortableTh(field, label, sortField, sortDir, onSort) {
  return (
    <th className={`${styles.th} ${styles.sortableTh}`} onClick={() => onSort?.(field)}>
      {label} {renderSortIcon(field, sortField, sortDir)}
    </th>
  );
}

function Pagination({ current, total, totalRecords, pageSize, onChange }) {
  const start = totalRecords === 0 ? 0 : Math.min((current - 1) * pageSize + 1, totalRecords);
  const end = Math.min(current * pageSize, totalRecords);

  return (
    <div className={styles.paginationBar}>
      <button className={styles.pageArrow} onClick={() => onChange(current - 1)} disabled={current === 1}>
        {"<"}
      </button>
      <div className={styles.pageNumbers}>
        {Array.from({ length: total }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            className={`${styles.pageBtn} ${page === current ? styles.pageBtnActive : ""}`}
            onClick={() => onChange(page)}
          >
            {page}
          </button>
        ))}
      </div>
      <button className={styles.pageArrow} onClick={() => onChange(current + 1)} disabled={current === total}>
        {">"}
      </button>
      <div className={styles.recordCount}>
        {start}-{end} out of {totalRecords} chapters
      </div>
    </div>
  );
}

export default function ChapterTable({
  paginated = [],
  page = 1,
  totalPages = 1,
  totalRecords = 0,
  pageSize = 10,
  onPageChange,
  onRowClick,
  sortField,
  sortDir,
  onSort,
  onEditSelected,
  onDeleteSelected,
  extraColumns = [],
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const pageIds = useMemo(() => paginated.map((chapter) => chapter.id), [paginated]);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someSelected = pageIds.some((id) => selectedIds.has(id));
  const selectedChapters = useMemo(
    () => paginated.filter((chapter) => selectedIds.has(chapter.id)),
    [paginated, selectedIds]
  );

  function toggleAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  function toggleRow(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className={styles.tableWrap}>
      {selectedIds.size > 0 && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkCount}>{selectedIds.size} selected</span>
          <div className={styles.bulkActions}>
            <button
              type="button"
              className={styles.bulkBtn}
              disabled={selectedChapters.length !== 1}
              onClick={() => onEditSelected?.(selectedChapters[0])}
              title={selectedChapters.length === 1 ? "Edit selected chapter" : "Select one chapter to edit"}
            >
              Edit
            </button>
            <button
              type="button"
              className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`}
              onClick={() => {
                onDeleteSelected?.(selectedChapters);
                setSelectedIds(new Set());
              }}
            >
              Delete
            </button>
          </div>
          <button className={styles.bulkClear} onClick={() => setSelectedIds(new Set())}>
            Clear
          </button>
        </div>
      )}

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.headerRow}>
              <th className={`${styles.th} ${styles.checkTh}`}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="Select all chapters"
                />
              </th>
              {renderSortableTh("chapterName", "Chapter / Formation", sortField, sortDir, onSort)}
              {renderSortableTh("formationLevel", "Level", sortField, sortDir, onSort)}
              {renderSortableTh("status", "Status", sortField, sortDir, onSort)}
              {renderSortableTh("memberCount", "Members", sortField, sortDir, onSort)}
              <th className={styles.th}>COC / OG</th>
              <th className={styles.th}>Officers</th>
              {renderSortableTh("targetLaunchDate", "Target Launch", sortField, sortDir, onSort)}
              {extraColumns.includes("location") && <th className={styles.th}>Location</th>}
              {extraColumns.includes("contactPerson") && <th className={styles.th}>Contact Person</th>}
              {extraColumns.includes("mentor") && <th className={styles.th}>SASHA Guide</th>}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={11} className={styles.emptyState}>
                  No chapter records found.
                </td>
              </tr>
            ) : (
              paginated.map((chapter, idx) => {
                const isSelected = selectedIds.has(chapter.id);
                return (
                  <tr
                    key={chapter.id}
                    className={`${styles.row} ${isSelected ? styles.rowSelected : ""}`}
                    style={{ background: isSelected ? "#e1f5f5" : idx % 2 ? "#f7f9fb" : "#ffffff" }}
                    onClick={(event) => {
                      if (event.target.type === "checkbox") return;
                      onRowClick?.(chapter);
                    }}
                  >
                    <td className={`${styles.td} ${styles.checkTd}`} onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isSelected}
                        onChange={() => toggleRow(chapter.id)}
                        aria-label={`Select ${chapter.chapterName}`}
                      />
                    </td>
                    <td className={`${styles.td} ${styles.nameTd}`}>
                      <div className={styles.nameStack}>
                        <span className={styles.nameText}>{chapter.chapterName || "Untitled chapter"}</span>
                        <span className={styles.emailText}>{chapter.id}</span>
                      </div>
                    </td>
                    <td className={styles.td}>{chapter.formationLevel}</td>
                    <td className={styles.td}><StatusBadge status={chapter.status} /></td>
                    <td className={styles.td}>{chapter.memberCount}/40</td>
                    <td className={styles.td}>{chapter.cocCount} COC / {chapter.ogCount} OG</td>
                    <td className={styles.td}>{chapter.officersFilled}/6</td>
                    <td className={styles.td}>{formatDate(chapter.targetLaunchDate)}</td>
                    {extraColumns.includes("location") && (
                      <td className={styles.td}>{chapter.location || "No location set"}</td>
                    )}
                    {extraColumns.includes("contactPerson") && (
                      <td className={styles.td}>{chapter.contactPerson || "No contact assigned"}</td>
                    )}
                    {extraColumns.includes("mentor") && (
                      <td className={styles.td}>{chapter.higherStructureRepresentative || "No SASHA guide assigned"}</td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
