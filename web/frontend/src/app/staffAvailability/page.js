"use client"

import { useEffect, useMemo, useState } from "react"
import { fetchStaffAvailability, updateStaffAvailability } from "@/lib/api"
import Tooltip from "@/components/ui/Tooltip"
import StaffAvailabilityFilterMenu from "./StaffAvailabilityFilterMenu"
import StaffAvailabilityTable from "./StaffAvailabilityTable"
import styles from "./staffAvailability.module.css"

const STATUSES = ["Available", "Busy", "On Leave", "Out of Office"]
const PAGE_SIZE = 10

function getModuleMetrics(person, module) {
  if (module === "Case management" || person.role === "Case Officer") {
    return { current: person.active_cases || 0, max: person.limits?.cases, label: "active cases" }
  }
  if (module === "Legal review" || person.role === "Legal Personnel") {
    return { current: person.active_legal_assignments || 0, max: person.limits?.legal, label: "legal assignments" }
  }
  if (module === "Volunteer applications") {
    return { current: person.active_reviews || 0, max: person.limits?.volunteer, label: "review assignments" }
  }
  return { current: person.active_projects || 0, max: person.limits?.projects, label: "active projects" }
}

function isAtCapacity(person, module) {
  const metrics = getModuleMetrics(person, module)
  return Number.isFinite(Number(metrics.max)) && Number(metrics.current) >= Number(metrics.max)
}

function isNearCapacity(person, module) {
  const metrics = getModuleMetrics(person, module)
  return Number.isFinite(Number(metrics.max)) &&
    Number(metrics.max) > 0 &&
    Number(metrics.current) / Number(metrics.max) >= 0.75
}

function matchesModule(person, module) {
  if (!module || module === "All") return true
  if (module === "Case management") return person.role === "Case Officer"
  if (module === "Legal review") return person.role === "Legal Personnel"
  if (module === "Volunteer applications") return person.role === "Staff" && Number(person.committee_id) === 2
  if (module === "Project tracker") return person.role === "Staff"
  return true
}

function AvailabilityDialog({
  dialog,
  saving,
  onCancel,
  onSubmit,
}) {
  if (!dialog) return null

  const people = dialog.people || (dialog.person ? [dialog.person] : [])
  return (
    <AvailabilityDialogForm
      key={`${dialog.type}-${people.map((person) => person.user_id).join("-")}`}
      dialog={dialog}
      people={people}
      saving={saving}
      onCancel={onCancel}
      onSubmit={onSubmit}
    />
  )
}

function AvailabilityDialogForm({
  dialog,
  people,
  saving,
  onCancel,
  onSubmit,
}) {
  const singlePerson = people.length === 1 ? people[0] : null
  const [status, setStatus] = useState(singlePerson?.availability_status || "Available")
  const [note, setNote] = useState(singlePerson?.availability_note || "")

  const isStatus = dialog.type === "status"
  const targetLabel = singlePerson?.name || `${people.length} staff members`

  function submit(event) {
    event.preventDefault()
    onSubmit(people, isStatus
      ? { availability_status: status }
      : { availability_note: note.trim() || null }
    )
  }

  return (
    <div className={styles.dialogOverlay} onMouseDown={onCancel}>
      <form
        className={styles.dialog}
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2>{isStatus ? "Update Availability Status" : "Edit Scheduler Note"}</h2>
        <p>
          {isStatus
            ? `Choose the explicit status shown to assignment teams for ${targetLabel}.`
            : `Notes are kept out of the table and should only include scheduler context for ${targetLabel}.`}
        </p>

        {isStatus ? (
          <label className={styles.dialogLabel}>
            Availability status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUSES.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
        ) : (
          <label className={styles.dialogLabel}>
            Availability note
            <textarea
              value={note}
              placeholder="Optional context for schedulers"
              onChange={(event) => setNote(event.target.value)}
              autoFocus
            />
          </label>
        )}

        <div className={styles.dialogActions}>
          <button type="button" className={styles.dialogSecondary} onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={styles.dialogPrimary} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  )
}

function ErrorDialog({ message, onClose }) {
  if (!message) return null

  return (
    <div className={`${styles.dialogOverlay} ${styles.errorDialogOverlay}`} onMouseDown={onClose}>
      <section
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="staff-availability-error-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="staff-availability-error-title">Unable to Complete Action</h2>
        <p>{message}</p>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.dialogPrimary} onClick={onClose}>
            Got it
          </button>
        </div>
      </section>
    </div>
  )
}

export default function StaffAvailabilityPage() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState({ status: "", role: "", module: "", load: "" })
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchStaffAvailability()
      .then(setRows)
      .catch((err) => setError(err.message))
  }, [])

  const roleOptions = useMemo(() => [
    "All",
    ...Array.from(new Set(rows.map((person) => person.role).filter(Boolean))).sort(),
  ], [rows])

  const filteredRows = useMemo(() => rows.filter((person) => {
    const searchable = `${person.name || ""} ${person.email || ""} ${person.role || ""} ${person.committee || ""}`.toLowerCase()
    if (query && !searchable.includes(query.toLowerCase())) return false
    if (filters.status && person.availability_status !== filters.status) return false
    if (filters.role && person.role !== filters.role) return false
    if (!matchesModule(person, filters.module)) return false
    if (filters.load === "At capacity" && !isAtCapacity(person, filters.module)) return false
    if (filters.load === "Near capacity" && !isNearCapacity(person, filters.module)) return false
    if (filters.load === "Has conflicts" && !(person.upcoming_conflicts || []).length) return false
    return true
  }), [filters, query, rows])

  const stats = useMemo(() => STATUSES.map((status) => ({
    num: rows.filter((person) => person.availability_status === status).length,
    label: status,
  })), [rows])

  async function save(target, patch) {
    const people = Array.isArray(target) ? target : [target]
    setError("")
    setSaving(people.length === 1 ? people[0].user_id : "bulk")
    try {
      const updatedRows = await Promise.all(
        people.map((person) => updateStaffAvailability(person.user_id, patch))
      )
      const updatedById = new Map(updatedRows.map((person) => [person.user_id, person]))
      setRows((current) => current.map((row) => (
        updatedById.has(row.user_id) ? { ...row, ...updatedById.get(row.user_id) } : row
      )))
      setDialog(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  function handleFilterChange(nextFilters) {
    setFilters(nextFilters)
    setPage(1)
  }

  function handleSearch(nextQuery) {
    setQuery(nextQuery)
    setPage(1)
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.heroBanner}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Staff Availability</h1>
            <div className={styles.statGrid}>
              {stats.map(({ num, label }) => (
                <Tooltip key={label} text={`Current ${label.toLowerCase()} count`} position="bottom">
                  <div className={styles.statCard}>
                    <p className={styles.statNum}>{num}</p>
                    <p className={styles.statLabel}>{label}</p>
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        </section>

        <div className={styles.sectionHeading}>
          <h2 className={styles.sectionTitle}>Availability Board</h2>
          <div className={styles.headingLine} />
        </div>

        <section className={styles.toolbar}>
          <StaffAvailabilityFilterMenu
            activeFilters={filters}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            searchValue={query}
            roleOptions={roleOptions}
          />
        </section>

        <StaffAvailabilityTable
          rows={filteredRows}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          getModuleMetrics={getModuleMetrics}
          module={filters.module}
          savingId={saving}
          onEditStatus={(target) => setDialog({
            type: "status",
            ...(Array.isArray(target) ? { people: target } : { person: target }),
          })}
          onEditNote={(target) => setDialog({
            type: "note",
            ...(Array.isArray(target) ? { people: target } : { person: target }),
          })}
        />
      </div>

      <AvailabilityDialog
        dialog={dialog}
        saving={Boolean(saving)}
        onCancel={() => {
          if (!saving) setDialog(null)
        }}
        onSubmit={save}
      />
      <ErrorDialog message={error} onClose={() => setError("")} />
    </main>
  )
}
