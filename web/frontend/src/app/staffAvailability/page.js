"use client"

import { useEffect, useMemo, useState } from "react"
import AvailabilityBadge from "@/components/availability/AvailabilityBadge"
import { fetchStaffAvailability, updateStaffAvailability } from "@/lib/api"
import styles from "./staffAvailability.module.css"

const STATUSES = ["Available", "Busy", "On Leave", "Out of Office"]
const MODULES = {
  All: null,
  "Case management": "Case Officer",
  "Legal review": "Legal Personnel",
  "Volunteer applications": "Volunteer",
  "Project tracker": "Project",
}

function getModuleMetrics(person, module) {
  if (module === "Case management" || person.role === "Case Officer") {
    return { current: person.active_cases, max: person.limits?.cases, label: "active cases" }
  }
  if (module === "Legal review" || person.role === "Legal Personnel") {
    return { current: person.active_legal_assignments, max: person.limits?.legal, label: "legal assignments" }
  }
  if (module === "Volunteer applications") {
    return { current: person.active_reviews, max: person.limits?.volunteer, label: "review assignments" }
  }
  return { current: person.active_projects, max: person.limits?.projects, label: "active projects" }
}

export default function StaffAvailabilityPage() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState("")
  const [module, setModule] = useState("All")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    fetchStaffAvailability().then(setRows).catch((err) => setError(err.message))
  }, [])

  const visible = useMemo(() => rows.filter((person) => {
    const matchesQuery = !query || `${person.name} ${person.email}`.toLowerCase().includes(query.toLowerCase())
    if (!matchesQuery) return false
    if (module === "Case management") return person.role === "Case Officer"
    if (module === "Legal review") return person.role === "Legal Personnel"
    if (module === "Volunteer applications") return person.role === "Staff" && Number(person.committee_id) === 2
    if (module === "Project tracker") return person.role === "Staff"
    return true
  }), [rows, query, module])

  async function save(person, patch) {
    setError("")
    setSaving(person.user_id)
    try {
      const updated = await updateStaffAvailability(person.user_id, patch)
      setRows((current) => current.map((row) =>
        row.user_id === person.user_id ? { ...row, ...updated } : row
      ))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p>Admin scheduling</p>
        <h1>Staff Availability</h1>
        <span>Compare workload, explicit status, and upcoming conflicts before assigning work.</span>
      </section>

      <section className={styles.toolbar}>
        <input placeholder="Search staff..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <select value={module} onChange={(event) => setModule(event.target.value)}>
          {Object.keys(MODULES).map((value) => <option key={value}>{value}</option>)}
        </select>
      </section>

      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.grid}>
        {visible.map((person) => {
          const metrics = getModuleMetrics(person, module)
          return (
            <article className={styles.card} key={person.user_id}>
              <div className={styles.person}>
                <div className={styles.avatar}>
                  {person.name?.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <h2>{person.name}</h2>
                  <p>{person.role}{person.committee ? ` · ${person.committee}` : ""}</p>
                  <small>{person.email}</small>
                </div>
              </div>

              <AvailabilityBadge
                status={person.availability_status}
                currentLoad={metrics.current}
                maxLoad={metrics.max}
                loadLabel={metrics.label}
                conflicts={person.upcoming_conflicts}
              />

              <div className={styles.metrics}>
                <div><strong>{person.active_cases || 0}</strong><span>Cases</span></div>
                <div><strong>{person.active_legal_assignments || 0}</strong><span>Legal</span></div>
                <div><strong>{person.active_reviews || 0}</strong><span>Reviews</span></div>
                <div><strong>{person.active_projects || 0}</strong><span>Projects</span></div>
              </div>

              <label>Status
                <select
                  value={person.availability_status || "Available"}
                  disabled={saving === person.user_id}
                  onChange={(event) => save(person, { availability_status: event.target.value })}
                >
                  {STATUSES.map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>

              <label>Availability note
                <textarea
                  rows={2}
                  defaultValue={person.availability_note || ""}
                  placeholder="Optional context for schedulers"
                  onBlur={(event) => {
                    if (event.target.value !== (person.availability_note || "")) {
                      save(person, { availability_note: event.target.value || null })
                    }
                  }}
                />
              </label>

              <div className={styles.conflicts}>
                <strong>Upcoming conflicts</strong>
                {person.upcoming_conflicts?.length ? person.upcoming_conflicts.slice(0, 3).map((event) => (
                  <span key={event.availability_event_id}>
                    {event.title} · {new Date(event.starts_at).toLocaleString("en-PH")}
                  </span>
                )) : <span>No recorded conflicts.</span>}
              </div>
            </article>
          )
        })}
      </section>
      {!error && visible.length === 0 && <div className={styles.empty}>No personnel match this view.</div>}
    </main>
  )
}
