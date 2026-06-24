"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { FiArrowLeft, FiExternalLink, FiSearch } from "react-icons/fi"
import { fetchAllProjectTasks, fetchStaff } from "@/lib/api"
import Tooltip from "@/components/ui/Tooltip"
import TaskStatusBadge from "./TaskStatusBadge"
import styles from "./ProjectTaskWorkspace.module.css"

const PAGE_SIZE = 10

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift())
  return null
}

function getUser() {
  try {
    const raw = getCookie("user")
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

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

export default function ProjectTaskWorkspace({ scope = "mine" }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [staff, setStaff] = useState([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState(scope === "all" ? "all" : "mine")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => setUser(getUser()), 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!user) return
    const role = normalizeRole(user?.role_name)
    if (scope === "all" && role && role !== "admin") router.replace("/projectTasks")
    if (scope === "mine" && role === "admin") router.replace("/projectTasks/admin")
  }, [router, scope, user])

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
    return scopedTasks.filter((task) => {
      const mine = task.assignee?.user_id === user?.user_id
      const committee = currentStaff?.committees?.committee_name || ""
      const committeeMatch = committee && task.assignee?.committee_name === committee && !mine
      const matchesFilter =
        filter === "all" ||
        (filter === "mine" && mine) ||
        (filter === "committee" && committeeMatch) ||
        (filter === "overdue" && task.display_status === "Overdue") ||
        (filter === "week" && isDueThisWeek(task.due_date)) ||
        task.status === filter
      const matchesSearch =
        !query ||
        task.title?.toLowerCase().includes(query) ||
        task.assignee?.name?.toLowerCase().includes(query) ||
        task.project?.title?.toLowerCase().includes(query) ||
        String(task.project_id || "").includes(query)
      return matchesFilter && matchesSearch
    })
  }, [currentStaff, filter, scopedTasks, search, user])

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE))
  const visibleTasks = filteredTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const summary = {
    total: scopedTasks.filter((task) => task.status !== "Cancelled").length,
    overdue: scopedTasks.filter((task) => task.display_status === "Overdue").length,
    week: scopedTasks.filter((task) => isDueThisWeek(task.due_date)).length,
  }
  const tabs = scope === "all"
    ? [["all", "All tasks"], ["overdue", "Overdue"], ["week", "Due this week"], ["Pending", "Pending"], ["In Progress", "In progress"], ["Completed", "Completed"]]
    : [["mine", "My tasks"], ["committee", "My committee"], ["overdue", "Overdue"], ["week", "Due this week"], ["all", "All scoped"]]

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
          <div className={styles.searchBox}>
            <FiSearch />
            <input
              type="search"
              placeholder="Search task, project, assignee, or project ID..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className={styles.tabs}>
            {tabs.map(([value, label]) => (
              <button
                key={value}
                className={filter === value ? styles.activeTab : ""}
                onClick={() => {
                  setFilter(value)
                  setPage(1)
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

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
