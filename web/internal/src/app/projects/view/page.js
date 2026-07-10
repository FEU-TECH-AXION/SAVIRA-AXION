"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { FiArrowLeft, FiEdit2, FiImage } from "react-icons/fi"
import CreateEditProject from "@/components/projects/CreateEditProject"
import TaskPanel from "@/components/projects/TaskPanel"
import Tooltip from "@/components/ui/Tooltip"
import { fetchProject, updateProject, uploadProjectImage } from "@/lib/api"
import styles from "@/components/projects/CreateEditProject.module.css"
import viewStyles from "./viewProject.module.css"

function SectionCard({ title, subtitle, children }) {
  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardHeader}>
        <h2 className={styles.sectionCardTitle}>{title}</h2>
        {subtitle && <p className={styles.sectionCardSub}>{subtitle}</p>}
      </div>
      <div className={styles.sectionCardBody}>{children}</div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div className={viewStyles.field}>
      <span className={styles.viewKey}>{label}</span>
      <strong>{value || "Not specified"}</strong>
    </div>
  )
}

function TextBlock({ value }) {
  return <p className={viewStyles.readText}>{value || "No details provided."}</p>
}

function formatDate(value) {
  if (!value) return ""
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" })
}

function formatTime(value) {
  if (!value) return ""
  const date = new Date(`1970-01-01T${value}`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })
}

function listPeople(values) {
  return values?.filter(Boolean).join(", ") || "Not assigned"
}

function ProjectView() {
  const params = useSearchParams()
  const router = useRouter()
  const id = params.get("projectId")
  const [project, setProject] = useState(null)
  const [mode, setMode] = useState("view")
  const [error, setError] = useState("")
  const [savingError, setSavingError] = useState("")

  useEffect(() => {
    let cancelled = false
    if (!id) return undefined
    fetchProject(id)
      .then((row) => {
        if (!cancelled) setProject(row)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Unable to load project.")
      })
    return () => { cancelled = true }
  }, [id])

  const statusLine = useMemo(() => {
    if (!project) return ""
    const dates = [formatDate(project.dateStart), formatDate(project.dateEnd)].filter(Boolean).join(" to ")
    return [project.status, project.visibility, dates || "No event dates"].filter(Boolean).join(" · ")
  }, [project])

  async function handleSave(data) {
    setSavingError("")
    try {
      const payload = { ...data }
      if (payload.image && typeof payload.image !== "string") {
        try {
          payload.image = await uploadProjectImage(payload.image)
        } catch {
          delete payload.image
        }
      }
      const updated = await updateProject(data.id, payload)
      setProject(updated)
      setMode("view")
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err) {
      setSavingError(err.message || "Unable to save project.")
    }
  }

  if (error) {
    return (
      <main className={styles.pageWrapper}>
        <div className={styles.heroWrap}>
          <button className={styles.backBtn} onClick={() => router.push("/projects")}>
            <FiArrowLeft /> Back to Projects
          </button>
          <div className={styles.errorBanner}>{error}</div>
        </div>
      </main>
    )
  }

  if (!id) {
    return (
      <main className={styles.pageWrapper}>
        <div className={styles.heroWrap}>
          <button className={styles.backBtn} onClick={() => router.push("/projects")}>
            <FiArrowLeft /> Back to Projects
          </button>
          <div className={styles.errorBanner}>No project ID was provided.</div>
        </div>
      </main>
    )
  }

  if (!project) {
    return <main className={styles.pageWrapper}><div className={styles.heroWrap}>Loading project...</div></main>
  }

  if (mode === "edit") {
    return (
      <>
        {savingError && <div className={styles.errorBanner}>{savingError}</div>}
        <CreateEditProject
          mode="edit"
          initial={project}
          onSave={handleSave}
          onCancel={() => setMode("view")}
        />
      </>
    )
  }

  return (
    <main className={styles.pageWrapper}>
      <div className={styles.heroWrap}>
        <button className={styles.backBtn} onClick={() => router.push("/projects")}>
          <FiArrowLeft /> Back to Projects
        </button>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Project and Event Management</p>
            <h1>{project.title}</h1>
            <p className={styles.heroDescription}>{statusLine}</p>
          </div>
          <div className={styles.heroActions}>
            <Tooltip text="Edit this project's details" position="bottom">
              <button className={styles.btnPrimary} onClick={() => setMode("edit")}>
                <FiEdit2 /> Edit
              </button>
            </Tooltip>
          </div>
        </section>
      </div>

      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <SectionCard title="Event Image" subtitle="Public banner or project artwork.">
            {project.image ? (
              <img className={viewStyles.imagePreview} src={project.image} alt={project.title} />
            ) : (
              <div className={viewStyles.imageEmpty}><FiImage /> No event image uploaded.</div>
            )}
          </SectionCard>

          <SectionCard title="Event Overview" subtitle="Public-facing name and summary of the project.">
            <div className={viewStyles.fieldGrid}>
              <Field label="Project / Event Title" value={project.title} />
              <Field label="Event Tagline" value={project.tagline} />
              <Field label="Category" value={project.category} />
            </div>
          </SectionCard>

          <SectionCard title="About this Event" subtitle="What participants can expect.">
            <TextBlock value={project.description} />
            <div className={viewStyles.fieldGrid}>
              <Field label="Target Participants" value={project.targetParticipants} />
              <Field label="Partner Organization/s" value={project.partnerOrganizations} />
            </div>
          </SectionCard>

          <SectionCard title="Date & Location">
            <div className={viewStyles.fieldGrid}>
              <Field label="Inclusive Start Date" value={formatDate(project.dateStart)} />
              <Field label="End Date" value={formatDate(project.dateEnd)} />
              <Field label="Start Time" value={formatTime(project.startTime)} />
              <Field label="End Time" value={formatTime(project.endTime)} />
              <Field label="Activity Conduct" value={project.activityMode} />
              <Field label="Venue" value={project.venue} />
              <Field label="Online Platform" value={project.onlinePlatform} />
              <Field label="Virtual Event Link" value={project.onlineLink} />
            </div>
          </SectionCard>

          <SectionCard title="Project Requirements" subtitle="Internal tracking visible to SASHA members only.">
            <div className={styles.internalBadge}>Internal use only</div>
            <Field label="Logistical Requirements" value={project.logisticalRequirements} />
            <Field label="Financial Requirements" value={project.financialRequirements} />
            <Field label="Operational Requirements" value={project.operationalRequirements} />
          </SectionCard>

          <SectionCard title="Project Team" subtitle="Internal assignment and accountability.">
            <div className={styles.internalBadge}>Internal use only</div>
            <div className={viewStyles.fieldGrid}>
              <Field label="Project Officers" value={listPeople(project.projectOfficers)} />
              <Field label="Project Committee Members" value={listPeople(project.projectCommitteeMembers)} />
            </div>
          </SectionCard>

          <TaskPanel projectId={id} readOnly />
        </div>

        <aside className={styles.sidebarCol}>
          <SectionCard title="Visibility & Publication">
            <Field label="Visibility" value={project.visibility} />
            <Field label="Approval Status" value={project.approvalStatus} />
          </SectionCard>
          <SectionCard title="Status & Schedule">
            <Field label="Project Status" value={project.status} />
            <Field label="Due Date" value={formatDate(project.dueDate)} />
          </SectionCard>
        </aside>
      </div>
    </main>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<main style={{ padding: "2rem" }}>Loading...</main>}>
      <ProjectView />
    </Suspense>
  )
}