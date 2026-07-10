"use client"

import { useMemo, useState } from "react"
import { FiClock, FiEdit2, FiFileText } from "react-icons/fi"
import AvailabilityBadge from "@/components/availability/AvailabilityBadge"
import Tooltip from "@/components/ui/Tooltip"
import styles from "./StaffAvailabilityTable.module.css"

function initials(name) {
  return String(name || "?")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function formatDateTime(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function renderSortIcon(field, sortField, sortDir) {
  if (sortField !== field) return <span className={styles.sortNeutral}>&#8597;</span>
  return <span className={styles.sortActive}>{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
}

function WorkloadCell({ person }) {
  const items = [
    ["Cases", person.active_cases || 0, person.limits?.cases],
    ["Legal", person.active_legal_assignments || 0, person.limits?.legal],
    ["Reviews", person.active_reviews || 0, person.limits?.volunteer],
    ["Projects", person.active_projects || 0, person.limits?.projects],
  ]

  return (
    <div className={styles.workloadGrid}>
      {items.map(([label, current, max]) => (
        <span key={label}>
          <strong>{current}</strong>
          <small>{label}{max ? ` / ${max}` : ""}</small>
        </span>
      ))}
    </div>
  )
}

function Pagination({ current, total, totalRecords, pageSize, onChange }) {
  const start = totalRecords === 0 ? 0 : Math.min((current - 1) * pageSize + 1, totalRecords)
  const end = Math.min(current * pageSize, totalRecords)
  const pages = Array.from({ length: total }, (_, index) => index + 1).filter((pageNumber) => {
    if (total <= 7) return true
    return pageNumber === 1 || pageNumber === total || Math.abs(pageNumber - current) <= 1
  })

  return (
    <div className={styles.paginationBar}>
      <button
        type="button"
        className={styles.pageArrow}
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
        aria-label="Previous page"
      >
        &lt;
      </button>
      <div className={styles.pageNumbers}>
        {pages.map((pageNumber, index) => {
          const previous = pages[index - 1]
          const showGap = previous && pageNumber - previous > 1
          return (
            <span key={pageNumber} className={styles.pageNumberGroup}>
              {showGap && <span className={styles.ellipsis}>...</span>}
              <button
                type="button"
                className={`${styles.pageBtn} ${pageNumber === current ? styles.pageBtnActive : ""}`}
                onClick={() => onChange(pageNumber)}
                aria-current={pageNumber === current ? "page" : undefined}
              >
                {pageNumber}
              </button>
            </span>
          )
        })}
      </div>
      <span className={styles.recordCount}>{start}-{end} out of {totalRecords} records</span>
      <button
        type="button"
        className={styles.pageArrow}
        disabled={current === total}
        onClick={() => onChange(current + 1)}
        aria-label="Next page"
      >
        &gt;
      </button>
    </div>
  )
}

export default function StaffAvailabilityTable({
  rows = [],
  page = 1,
  pageSize = 10,
  onPageChange,
  getModuleMetrics,
  module,
  savingId,
  onEditStatus,
  onEditNote,
}) {
  const [sortField, setSortField] = useState("name")
  const [sortDir, setSortDir] = useState("asc")
  const [selectedIds, setSelectedIds] = useState(new Set())

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = sortField === "status" ? a.availability_status : a[sortField]
      const bv = sortField === "status" ? b.availability_status : b[sortField]
      return String(av || "").localeCompare(String(bv || "")) * (sortDir === "asc" ? 1 : -1)
    })
    return copy
  }, [rows, sortDir, sortField])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)
  const pageIds = useMemo(() => paginated.map((person) => person.user_id), [paginated])
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const someSelected = pageIds.some((id) => selectedIds.has(id))
  const selectedPeople = sorted.filter((person) => selectedIds.has(person.user_id))
  const selectionCount = selectedPeople.length

  function sort(field) {
    if (sortField === field) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"))
      return
    }
    setSortField(field)
    setSortDir("asc")
  }

  function toggleAll() {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allSelected) pageIds.forEach((id) => next.delete(id))
      else pageIds.forEach((id) => next.add(id))
      return next
    })
  }

  function toggleRow(id) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className={styles.tableWrap}>
      {selectionCount > 0 && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkCount}>{selectionCount} selected</span>
          <div className={styles.bulkActions}>
            <button
              type="button"
              className={`${styles.bulkBtn} ${styles.bulkBtnStatus}`}
              onClick={() => onEditStatus(selectedPeople)}
            >
              Update Status
            </button>
            <button
              type="button"
              className={styles.bulkBtn}
              onClick={() => onEditNote(selectedPeople)}
            >
              Edit Note
            </button>
          </div>
          <button
            type="button"
            className={styles.bulkClear}
            onClick={() => setSelectedIds(new Set())}
          >
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
                  ref={(element) => {
                    if (element) element.indeterminate = someSelected && !allSelected
                  }}
                  onChange={toggleAll}
                  aria-label="Select all staff on this page"
                />
              </th>
              <th className={`${styles.th} ${styles.sortableTh}`} onClick={() => sort("name")}>
                Staff {renderSortIcon("name", sortField, sortDir)}
              </th>
              <th className={`${styles.th} ${styles.sortableTh}`} onClick={() => sort("role")}>
                Role {renderSortIcon("role", sortField, sortDir)}
              </th>
              <th className={`${styles.th} ${styles.sortableTh}`} onClick={() => sort("status")}>
                Availability {renderSortIcon("status", sortField, sortDir)}
              </th>
              <th className={styles.th}>Workload</th>
              <th className={styles.th}>Conflicts</th>
              <th className={styles.th}>Note</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyState}>No personnel match this view.</td>
              </tr>
            ) : (
              paginated.map((person, index) => {
                const metrics = getModuleMetrics(person, module)
                const conflicts = person.upcoming_conflicts || []
                const isSelected = selectedIds.has(person.user_id)
                return (
                  <tr
                    key={person.user_id}
                    className={`${styles.row} ${isSelected ? styles.rowSelected : ""}`}
                    style={{ background: isSelected ? "#e1f5f5" : index % 2 === 1 ? "#f7f9fb" : "#ffffff" }}
                  >
                    <td className={`${styles.td} ${styles.checkTd}`}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isSelected}
                        onChange={() => toggleRow(person.user_id)}
                        aria-label={`Select ${person.name}`}
                      />
                    </td>
                    <td className={`${styles.td} ${styles.nameTd}`}>
                      <div className={styles.personCell}>
                        <div className={styles.avatar}>{initials(person.name)}</div>
                        <div className={styles.nameStack}>
                          <span className={styles.nameText}>{person.name}</span>
                          <span className={styles.emailText}>{person.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.roleText}>{person.role || "Staff"}</span>
                      {person.committee && <span className={styles.committeeText}>{person.committee}</span>}
                    </td>
                    <td className={styles.td}>
                      <AvailabilityBadge
                        status={person.availability_status}
                        currentLoad={metrics.current}
                        maxLoad={metrics.max}
                        loadLabel={metrics.label}
                        conflicts={conflicts}
                        compact
                      />
                    </td>
                    <td className={styles.td}><WorkloadCell person={person} /></td>
                    <td className={styles.td}>
                      {conflicts.length ? (
                        <Tooltip
                          text={conflicts.slice(0, 3).map((event) => `${event.title} - ${formatDateTime(event.starts_at)}`).join(" | ")}
                          position="left"
                        >
                          <span className={styles.conflictBadge}><FiClock /> {conflicts.length} conflict{conflicts.length === 1 ? "" : "s"}</span>
                        </Tooltip>
                      ) : (
                        <span className={styles.muted}>None</span>
                      )}
                    </td>
                    <td className={styles.td}>
                      {person.availability_note ? (
                        <Tooltip text="A private scheduler note is saved. Use Edit note to view or change it." position="left">
                          <span className={styles.noteBadge}><FiFileText /> Has note</span>
                        </Tooltip>
                      ) : (
                        <span className={styles.muted}>No note</span>
                      )}
                      <div className={styles.rowActions}>
                        <Tooltip text="Open a dialog before changing this staff member's status" position="left">
                          <button
                            type="button"
                            className={styles.actionBtn}
                            disabled={savingId === person.user_id}
                            onClick={() => onEditStatus(person)}
                          >
                            <FiEdit2 /> Status
                          </button>
                        </Tooltip>
                        <Tooltip text="Open scheduler notes in a dialog" position="left">
                          <button
                            type="button"
                            className={styles.actionBtnSecondary}
                            disabled={savingId === person.user_id}
                            onClick={() => onEditNote(person)}
                          >
                            <FiFileText /> Note
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        current={safePage}
        total={totalPages}
        totalRecords={sorted.length}
        pageSize={pageSize}
        onChange={onPageChange}
      />
    </div>
  )
}
