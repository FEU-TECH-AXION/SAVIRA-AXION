"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { fetchProject } from "@/lib/api"
import TaskPanel from "@/components/projects/TaskPanel"
import styles from "./viewProject.module.css"

function ProjectView() {
  const params = useSearchParams()
  const router = useRouter()
  const id = params.get("projectId")
  const [project, setProject] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!id) return
    fetchProject(id).then(setProject).catch((err) => setError(err.message))
  }, [id])

  if (error) return <main className={styles.page}><button onClick={() => router.push("/projects")}>← Projects</button><p>{error}</p></main>
  if (!project) return <main className={styles.page}>Loading project…</main>

  return (
    <main className={styles.page}>
      <button className={styles.back} onClick={() => router.push("/projects")}>← Back to projects</button>
      <section className={styles.hero}>
        <div>
          <p>{project.category || "Project"}</p>
          <h1>{project.title}</h1>
          <span>{project.status} · {project.visibility}</span>
        </div>
        <div className={styles.dates}>
          <strong>{project.dateStart || "No start date"}</strong>
          <span>to {project.dateEnd || "open-ended"}</span>
        </div>
      </section>
      <section className={styles.details}>
        <h2>Project overview</h2>
        <p>{project.description || "No description provided."}</p>
        <div><strong>Venue</strong><span>{project.venue || project.onlineLink || "Not specified"}</span></div>
        <div><strong>Project officers</strong><span>{project.projectOfficers?.filter(Boolean).join(", ") || "Not assigned"}</span></div>
      </section>
      <TaskPanel projectId={id} />
    </main>
  )
}

export default function Page() {
  return <Suspense fallback={<main style={{ padding: "2rem" }}>Loading…</main>}><ProjectView /></Suspense>
}
