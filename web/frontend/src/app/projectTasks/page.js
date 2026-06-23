"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchProjects } from "@/lib/api"
import styles from "./projectTasks.module.css"

export default function ProjectTasksPage() {
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    fetchProjects()
      .then((rows) => {
        if (!cancelled) setProjects(Array.isArray(rows) ? rows : [])
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const visibleProjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return projects
    return projects.filter((project) =>
      project.title?.toLowerCase().includes(query) ||
      project.category?.toLowerCase().includes(query) ||
      String(project.id).includes(query)
    )
  }, [projects, search])

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Project accountability</p>
        <h1>Project Tasks</h1>
        <p>Select a project to create assignments, monitor deadlines, and review progress history.</p>
      </section>

      <section className={styles.toolbar}>
        <input
          type="search"
          placeholder="Search by project title, category, or ID…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button onClick={() => router.push("/projects")}>Back to Project Management</button>
      </section>

      {error && <div className={styles.error}>{error}</div>}
      {loading ? (
        <div className={styles.state}>Loading projects…</div>
      ) : visibleProjects.length === 0 ? (
        <div className={styles.state}>No projects found.</div>
      ) : (
        <section className={styles.grid}>
          {visibleProjects.map((project) => (
            <article className={styles.card} key={project.id}>
              <div className={styles.cardTop}>
                <span>#{project.id}</span>
                <span className={styles.status}>{project.status || "Unspecified"}</span>
              </div>
              <h2>{project.title}</h2>
              <p>{project.description || "No project description provided."}</p>
              <div className={styles.meta}>
                <span>{project.category || "Uncategorized"}</span>
                <span>Due: {project.dueDate || "No deadline"}</span>
              </div>
              <button onClick={() => router.push(`/projects/view?projectId=${project.id}`)}>
                View & Manage Tasks →
              </button>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}
