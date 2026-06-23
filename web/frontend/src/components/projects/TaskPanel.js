"use client"

import { useEffect, useMemo, useState } from "react"
import {
  cancelProjectTask,
  createProjectTask,
  fetchProjectTasks,
  fetchStaffAvailability,
  fetchTaskActivity,
  updateProjectTask,
} from "@/lib/api"
import TaskStatusBadge from "./TaskStatusBadge"
import styles from "./TaskPanel.module.css"

const EMPTY = {
  title: "", description: "", assigned_to: "", priority: "Medium",
  due_date: "", status: "Pending",
}

export default function TaskPanel({ projectId }) {
  const [tasks, setTasks] = useState([])
  const [staff, setStaff] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState("All")
  const [activity, setActivity] = useState({})

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      setLoading(true)
      setError("")
      try {
        const [taskRows, staffRows] = await Promise.all([
          fetchProjectTasks(projectId),
          fetchStaffAvailability(),
        ])
        if (!cancelled) {
          setTasks(taskRows)
          setStaff(staffRows.filter((person) =>
            person.role === "Staff" &&
            person.staff_id &&
            !["On Leave", "Out of Office"].includes(person.availability_status)
          ))
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [projectId])

  const summary = useMemo(() => ({
    total: tasks.filter((task) => task.status !== "Cancelled").length,
    completed: tasks.filter((task) => task.status === "Completed").length,
    overdue: tasks.filter((task) => task.display_status === "Overdue").length,
  }), [tasks])

  const visible = useMemo(() => tasks.filter((task) =>
    filter === "All" || task.display_status === filter
  ), [tasks, filter])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setShowForm(true)
  }

  function openEdit(task) {
    setEditing(task)
    setForm({
      title: task.title || "",
      description: task.description || "",
      assigned_to: task.assigned_to || "",
      priority: task.priority || "Medium",
      due_date: task.due_date || "",
      status: task.status || "Pending",
    })
    setShowForm(true)
  }

  async function save(event) {
    event.preventDefault()
    if (!form.title.trim()) return
    setError("")
    try {
      const payload = {
        ...form,
        assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
        due_date: form.due_date || null,
      }
      const saved = editing
        ? await updateProjectTask(editing.task_id, payload)
        : await createProjectTask(projectId, payload)
      setTasks((current) => editing
        ? current.map((task) => task.task_id === saved.task_id ? saved : task)
        : [saved, ...current])
      setShowForm(false)
      setEditing(null)
      setForm(EMPTY)
    } catch (err) {
      setError(err.message)
    }
  }

  async function changeStatus(task, status) {
    try {
      const saved = await updateProjectTask(task.task_id, { status })
      setTasks((current) => current.map((item) => item.task_id === saved.task_id ? saved : item))
    } catch (err) {
      setError(err.message)
    }
  }

  async function cancel(task) {
    try {
      const saved = await cancelProjectTask(task.task_id)
      setTasks((current) => current.map((item) => item.task_id === saved.task_id ? saved : item))
    } catch (err) {
      setError(err.message)
    }
  }

  async function toggleActivity(taskId) {
    if (activity[taskId]) {
      setActivity((current) => ({ ...current, [taskId]: null }))
      return
    }
    try {
      const rows = await fetchTaskActivity(taskId)
      setActivity((current) => ({ ...current, [taskId]: rows }))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Accountability</p>
          <h2>Project Tasks</h2>
          <p>{summary.completed} of {summary.total} completed · {summary.overdue} overdue</p>
        </div>
        <button className={styles.primary} onClick={openCreate}>+ Add task</button>
      </div>

      <div className={styles.summary}>
        <div><strong>{summary.total}</strong><span>Active tasks</span></div>
        <div><strong>{summary.completed}</strong><span>Completed</span></div>
        <div className={styles.overdue}><strong>{summary.overdue}</strong><span>Overdue</span></div>
      </div>

      <div className={styles.filters}>
        {["All", "Pending", "In Progress", "Completed", "Overdue", "Cancelled"].map((value) => (
          <button key={value} className={filter === value ? styles.activeFilter : ""} onClick={() => setFilter(value)}>
            {value}
          </button>
        ))}
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {loading ? <p>Loading tasks…</p> : visible.length === 0 ? (
        <div className={styles.empty}>No tasks in this view yet.</div>
      ) : (
        <div className={styles.taskList}>
          {visible.map((task) => (
            <article key={task.task_id} className={`${styles.task} ${task.display_status === "Overdue" ? styles.taskOverdue : ""}`}>
              <div className={styles.taskMain}>
                <div className={styles.taskTitleRow}>
                  <h3>{task.title}</h3>
                  <TaskStatusBadge status={task.display_status} />
                  <span className={styles.priority}>{task.priority}</span>
                </div>
                {task.description && <p>{task.description}</p>}
                <div className={styles.meta}>
                  <span>Assigned: {task.assignee?.name || "Unassigned"}</span>
                  <span>Due: {task.due_date ? new Date(`${task.due_date}T00:00:00`).toLocaleDateString("en-PH") : "No due date"}</span>
                </div>
                {activity[task.task_id] && (
                  <div className={styles.activity}>
                    {activity[task.task_id].length === 0 ? <span>No activity recorded.</span> : activity[task.task_id].map((item) => (
                      <span key={item.activity_id}>
                        {item.action.replaceAll("_", " ")} · {new Date(item.created_at).toLocaleString("en-PH")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.actions}>
                {task.status === "Pending" && <button onClick={() => changeStatus(task, "In Progress")}>Start</button>}
                {task.status === "In Progress" && <button onClick={() => changeStatus(task, "Completed")}>Complete</button>}
                <button onClick={() => openEdit(task)}>Edit</button>
                <button onClick={() => toggleActivity(task.task_id)}>History</button>
                {!["Completed", "Cancelled"].includes(task.status) && <button className={styles.danger} onClick={() => cancel(task)}>Cancel</button>}
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <div className={styles.overlay} onClick={() => setShowForm(false)}>
          <form className={styles.modal} onSubmit={save} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editing ? "Edit task" : "Create task"}</h2>
              <button type="button" onClick={() => setShowForm(false)}>×</button>
            </div>
            <label>Title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label>Description<textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <div className={styles.formGrid}>
              <label>Assignee<select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
                <option value="">Unassigned</option>
                {staff.map((person) => (
                  <option key={person.staff_id} value={person.staff_id}>
                    {person.name} · {person.effective_status || person.availability_status} · {person.active_projects}/{person.limits?.projects || 5} projects
                  </option>
                ))}
              </select></label>
              <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {["Low", "Medium", "High", "Urgent"].map((value) => <option key={value}>{value}</option>)}
              </select></label>
              <label>Due date<input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></label>
              {editing && <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {["Pending", "In Progress", "Completed", "Cancelled"].map((value) => <option key={value}>{value}</option>)}
              </select></label>}
            </div>
            <div className={styles.modalActions}>
              <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
              <button className={styles.primary} type="submit">{editing ? "Save changes" : "Create task"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
