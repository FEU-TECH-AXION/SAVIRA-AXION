"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { FiArrowLeft, FiExternalLink } from "react-icons/fi"
import { fetchAllProjectTasks, fetchStaff } from "@/lib/api"
import Tooltip from "@/components/ui/Tooltip"
import TaskStatusBadge from "./TaskStatusBadge"
import TaskFilterMenu from "./TaskFilterMenu"
import styles from "./ProjectTaskWorkspace.module.css"
import { useAuth } from "@/lib/AuthContext"

const PAGE_SIZE = 10

function normalizeRole(role) {
  return String(role || "").toLowerCase().replaceAll(" ", "_")
}

function formatDate(value) {
  if (!value) return "No due date"
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" })
}

function isDueThisWeek(value) {
  if (!value) return false
  const due = new Date(`${value}T00:00:00`)
  if (Number.isNaN(due.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setDate(today.getDate() + 7)
  return due >= today && due <= end
}

function isDueThisMonth(value) {
  if (!value) return false
  const due = new Date(`${value}T00:00:00`)
  if (Number.isNaN(due.getTime())) return false
  const today = new Date()
  return due.getMonth() === today.getMonth() && due.getFullYear() === today.getFullYear()
}

function isDueToday(value) {
  if (!value) return false
  const due = new Date(`${value}T00:00:00`)
  if (Number.isNaN(due.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  return due >= today && due < tomorrow
}

function isInDateRange(value, rangeValue) {
  if (!rangeValue || rangeValue === "") return true
  if (rangeValue === "today") return isDueToday(value)
  if (rangeValue === "thisWeek") return isDueThisWeek(value)
  if (rangeValue === "thisMonth") return isDueThisMonth(value)
  if (rangeValue === "overdue") return false // overdue is handled via display_status
  if (rangeValue.startsWith("custom|")) {
    const [, start, end] = rangeValue.split("|")
    if (!value) return false
    const due = new Date(`${value}T00:00:00`)
    return due >= new Date(`${start}T00:00:00`) && due <= new Date(`${end}T00:00:00`)
  }
  return true
}

function Pagination({ current, total, totalRecords, onChange }) {
  const start = totalRecords === 0 ? 0 : (current - 1) * PAGE_SIZE + 1
  const end = Math.min(current * PAGE_SIZE, totalRecords)
  return (
    <div className={styles.pagination}>
      <button disabled={current === 1} onClick={() => onChange(current - 1)}>‹</button>
      <span>{start}-{end} of {totalRecords}</span>
      <button disabled={current === total} onClick={() => onChange(current + 1)}>›</button>
    </div>
  )
}

const EMPTY_FILTERS = { status: "", priority: "", dueDate: "", scope: "", createdAt: "" }

export default function ProjectTaskWorkspace({ scope = "mine" }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [tasks, setTasks] = useState([])
  const [staff, setStaff] = useState([])
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState(EMPTY_FILTERS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (authLoading || !user) return
    const role = normalizeRole(user?.role_name)
    if (scope === "all" && role && role !== "admin") router.replace("/projectTasks")
    if (scope === "mine" && role === "admin") router.replace("/projectTasks/admin")
  }, [authLoading, router, scope, user])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      try {
        const [taskRows, staffRows] = await Promise.all([fetchAllProjectTasks(), fetchStaff()])
        if (!cancelled) {
          setTasks(Array.isArray(taskRows) ? taskRows : [])
          setStaff(Array.isArray(staffRows) ? staffRows : [])
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load project tasks.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const currentStaff = useMemo(() => {
    if (!user) return null
    return staff.find((person) => person.user_id === user.user_id)
  }, [staff, user])

  const scopedTasks = useMemo(() => {
    if (scope === "all") return tasks
    const committee = currentStaff?.committees?.committee_name || ""
    return tasks.filter((task) => {
      const mine = task.assignee?.user_id === user?.user_id
      const committeeMatch = committee && task.assignee?.committee_name === committee
      return mine || committeeMatch
    })
  }, [currentStaff, scope, tasks, user])

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    const { status, priority, dueDate, scope: scopeFilter } = activeFilters

    return scopedTasks.filter((task) => {
      const mine = task.assignee?.user_id === user?.user_id
      const committee = currentStaff?.committees?.committee_name || ""
      const committeeMatch = committee && task.assignee?.committee_name === committee && !mine

      // Scope filter
      if (scopeFilter === "Mine" && !mine) return false
      if (scopeFilter === "My Committee" && !committeeMatch) return false

      // Status filter
      if (status && status !== "All") {
        if (status === "Overdue") {
          if (task.display_status !== "Overdue") return false
        } else {
          if (task.status !== status) return false
        }
      }

      // Priority filter
      if (priority && priority !== "All") {
        if ((task.priority || "Medium") !== priority) return false
      }

      // Due date filter
      if (dueDate && dueDate !== "") {
        if (dueDate === "overdue") {
          if (task.display_status !== "Overdue") return false
        } else if (!isInDateRange(task.due_date, dueDate)) {
          return false
        }
      }

      // Search
      const matchesSearch =
        !query ||
        task.title?.toLowerCase().includes(query) ||
        task.assignee?.name?.toLowerCase().includes(query) ||
        task.project?.title?.toLowerCase().includes(query) ||
        String(task.project_id || "").includes(query)

      return matchesSearch
    })
  }, [activeFilters, currentStaff, scopedTasks, search, user])

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE))
  const visibleTasks = filteredTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const summary = {
    total: scopedTasks.filter((task) => task.status !== "Cancelled").length,
    overdue: scopedTasks.filter((task) => task.display_status === "Overdue").length,
    week: scopedTasks.filter((task) => isDueThisWeek(task.due_date)).length,
  }

  const hasActiveFilters = Object.values(activeFilters).some(v => v && v !== "All" && v !== "")

  function handleFilterChange(newFilters) {
    setActiveFilters(prev => ({ ...prev, ...newFilters }))
    setPage(1)
  }

  function handleSearch(value) {
    setSearch(value)
    setPage(1)
  }

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <button className={styles.backBtn} onClick={() => router.push("/projects")}>
          <FiArrowLeft /> Back to Project Management
        </button>

        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Project accountability</p>
            <h1>{scope === "all" ? "Project Task Board" : "My Project Tasks"}</h1>
            <p>
              {scope === "all"
                ? "Track assignments, deadlines, progress, and overdue work across every project."
                : "Track assignments owned by you or assigned to your committee."}
            </p>
          </div>
          <div className={styles.summary}>
            <div><strong>{summary.total}</strong><span>Active tasks</span></div>
            <div><strong>{summary.overdue}</strong><span>Overdue</span></div>
            <div><strong>{summary.week}</strong><span>Due this week</span></div>
          </div>
        </section>

        <section className={styles.toolbar}>
          <TaskFilterMenu
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            searchValue={search}
          />
        </section>

        {hasActiveFilters && (
          <p className={styles.recordLabel}>
            {filteredTasks.length} result{filteredTasks.length !== 1 ? "s" : ""}
            <button
              className={styles.clearFiltersBtn}
              onClick={() => { setActiveFilters(EMPTY_FILTERS); setSearch(""); setPage(1) }}
            >
              Clear filters
            </button>
          </p>
        )}

        {error && <div className={styles.error}>{error}</div>}
        {loading ? (
          <div className={styles.state}>Loading project tasks...</div>
        ) : visibleTasks.length === 0 ? (
          <div className={styles.state}>No tasks match this view.</div>
        ) : (
          <section className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Assignee</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleTasks.map((task) => (
                  <tr key={task.task_id}>
                    <td>
                      <strong>{task.title}</strong>
                      {task.description && <span>{task.description}</span>}
                    </td>
                    <td>{task.project?.title || `Project #${task.project_id}`}</td>
                    <td>
                      <strong>{task.assignee?.name || "Unassigned"}</strong>
                      {task.assignee?.committee_name && <span>{task.assignee.committee_name}</span>}
                    </td>
                    <td><TaskStatusBadge status={task.display_status} /></td>
                    <td>{task.priority || "Medium"}</td>
                    <td>{formatDate(task.due_date)}</td>
                    <td>
                      <Tooltip text="Open the parent project and manage its tasks" position="left">
                        <button
                          className={styles.iconBtn}
                          onClick={() => router.push(`/projects/view?projectId=${task.project_id}`)}
                          aria-label={`Open project ${task.project_id}`}
                        >
                          <FiExternalLink />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination current={page} total={totalPages} totalRecords={filteredTasks.length} onChange={setPage} />
          </section>
        )}
      </div>
    </main>
  )
}
