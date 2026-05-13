"use client";

/**
 * ProjectManagement.js  (updated)
 *
 * Changes:
 *  - "Create a Project" and "Update Project Information" action cards now
 *    navigate to a full-page <CreateEditProject> component instead of a modal.
 *  - Project data now carries all new SASHA-specific fields.
 *  - Public-approved projects surface to page.js and events/page.js.
 *
 * SUPABASE integration points are left as TODO comments.
 */

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/navbar/navbar";
import CreateEditProject from "@/components/projects/CreateEditProject";
import styles from "./ProjectManagement.module.css";
import { FiSearch, FiAlertTriangle } from "react-icons/fi";

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder data — replace with Supabase fetch
// ─────────────────────────────────────────────────────────────────────────────

const PLACEHOLDER_PROJECTS = [
  {
    id: 1,
    title: "Safe Spaces Summit",
    tagline: "Creating sanctuaries for survivors.",
    description: "A summit promoting safe spaces across communities.",
    category: "Youth Leadership Programs",
    dateStart: "2026-03-03",
    dateEnd: "2026-03-04",
    startTime: "08:00",
    endTime: "17:00",
    activityMode: "Face-to-face",
    venue: "SASHA Community Hall, Quezon City",
    onlinePlatform: "",
    onlineLink: "",
    targetParticipants: "Youth scouts aged 15–25",
    partnerOrganizations: "BSP National Council",
    status: "Active",
    dueDate: "2026-03-01",
    logisticalRequirements: "Venue setup, AV equipment, catering",
    financialRequirements: "Estimated ₱120,000 from chapter funds",
    operationalRequirements: "DSWD coordination, event permits",
    projectOfficers: ["Maria Santos", "Jose Reyes"],
    projectCommitteeMembers: ["Ana Cruz", "Pedro Lim", "Lea Bautista"],
    visibility: "public",
    approvalStatus: "approved",
    image: "/project-1.jpg",
    imagePreview: null,
  },
  {
    id: 2,
    title: "Youth Against Abuse Summit",
    tagline: "Empowering voices, changing futures.",
    description: "Empowering youth to stand against abuse and harassment.",
    category: "Legal & Policy Education",
    dateStart: "2026-03-03",
    dateEnd: "2026-03-04",
    startTime: "09:00",
    endTime: "16:00",
    activityMode: "Hybrid",
    venue: "Manila City Hall Auditorium",
    onlinePlatform: "Zoom",
    onlineLink: "https://zoom.us/j/example",
    targetParticipants: "Youth advocates, school administrators",
    partnerOrganizations: "UN Women Philippines, DSWD",
    status: "Active",
    dueDate: "2026-03-01",
    logisticalRequirements: "Zoom license, venue permits, signage",
    financialRequirements: "₱85,000 from UN Women grant",
    operationalRequirements: "Legal team briefing, media clearances",
    projectOfficers: ["Carla Mendoza"],
    projectCommitteeMembers: ["Ramon Torres", "Grace Villanueva"],
    visibility: "public",
    approvalStatus: "approved",
    image: "/project-2.jpg",
    imagePreview: null,
  },
  {
    id: 3,
    title: "SASHA Believes That…",
    tagline: "Because your story matters.",
    description: "A campaign building awareness of survivor experiences.",
    category: "New Projects",
    dateStart: "2025-03-01",
    dateEnd: "2025-03-31",
    startTime: "",
    endTime: "",
    activityMode: "Virtual",
    venue: "",
    onlinePlatform: "Facebook Live",
    onlineLink: "https://facebook.com/sasha",
    targetParticipants: "General public, social media audiences",
    partnerOrganizations: "",
    status: "Completed",
    dueDate: "2025-02-25",
    logisticalRequirements: "Social media assets, video production",
    financialRequirements: "₱30,000 for digital ads",
    operationalRequirements: "Content moderation plan",
    projectOfficers: ["Riza Dizon"],
    projectCommitteeMembers: ["Ben Santos"],
    visibility: "public",
    approvalStatus: "approved",
    image: "/project-3.jpg",
    imagePreview: null,
  },
  {
    id: 4,
    title: "SASHA Awareness Drive",
    tagline: "Making noise for what matters.",
    description: "City-wide awareness initiative targeting key demographics.",
    category: "Awareness Campaign",
    dateStart: "2026-08-18",
    dateEnd: "2026-08-19",
    startTime: "08:00",
    endTime: "18:00",
    activityMode: "Face-to-face",
    venue: "Various barangays, Quezon City",
    onlinePlatform: "",
    onlineLink: "",
    targetParticipants: "Community members, LGUs",
    partnerOrganizations: "QC LGU, CHR Philippines",
    status: "Upcoming",
    dueDate: "2026-08-15",
    logisticalRequirements: "Mobile tarpaulins, booths, flyers, volunteers",
    financialRequirements: "₱200,000 from LGU partnership",
    operationalRequirements: "Barangay clearances, crowd management plan",
    projectOfficers: ["Lando Garcia", "Tina Cruz"],
    projectCommitteeMembers: ["Mia Soriano", "Dave Reyes", "Kris Lim"],
    visibility: "private",
    approvalStatus: "pending",
    image: "/project-4.jpg",
    imagePreview: null,
  },
];

const CATEGORIES = [
  "New Projects",
  "Happening Soon",
  "Youth Leadership Programs",
  "Legal & Policy Education",
  "Awareness Campaign",
  "Community Outreach",
];

const PAGE_SIZE = 4;

function nextId(list) {
  return list.length ? Math.max(...list.map((p) => p.id)) + 1 : 1;
}

// ── Cookies ───────────────────────────────────────────────────────────────────
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
  return null;
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function ProjectBadge({ status }) {
  const map = {
    Active:    { bg: "#d1fae5", color: "#065f46" },
    Upcoming:  { bg: "#dbeafe", color: "#1e40af" },
    Completed: { bg: "#f3f4f6", color: "#374151" },
  };
  const s = map[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.78rem", fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: s.bg, color: s.color }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
      {status}
    </span>
  );
}

// ── Visibility Badge ───────────────────────────────────────────────────────────
function VisibilityBadge({ visibility, approvalStatus }) {
  if (visibility === "public" && approvalStatus === "approved")
    return <span style={{ fontSize: "0.72rem", fontWeight: 600, background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: 999 }}>🌐 Public</span>;
  if (visibility === "public" && approvalStatus === "pending")
    return <span style={{ fontSize: "0.72rem", fontWeight: 600, background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 999 }}>⏳ Pending Approval</span>;
  return <span style={{ fontSize: "0.72rem", fontWeight: 600, background: "#f3f4f6", color: "#374151", padding: "2px 8px", borderRadius: 999 }}>🔒 Private</span>;
}

// ── Pagination ─────────────────────────────────────────────────────────────────
function Pagination({ current, total, onChange }) {
  const pages = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className={styles.pagination}>
      <button className={styles.pageArrow} onClick={() => onChange(current - 1)} disabled={current === 1}>←</button>
      {pages.map((p) => (
        <button key={p} className={`${styles.pageBtn} ${p === current ? styles.pageBtnActive : ""}`} onClick={() => onChange(p)}>{p}</button>
      ))}
      <button className={styles.pageArrow} onClick={() => onChange(current + 1)} disabled={current === total}>→</button>
    </div>
  );
}

// ── Action Card ───────────────────────────────────────────────────────────────
function ActionCard({ icon, title, description, onView }) {
  return (
    <div className={styles.actionCard}>
      <div className={styles.actionIconWrap}><span className={styles.actionIcon}>{icon}</span></div>
      <div className={styles.actionBody}>
        <h3 className={styles.actionTitle}>{title}</h3>
        <p className={styles.actionDesc}>{description}</p>
      </div>
      <div className={styles.ViewRow}>
        <button className={styles.viewBtn} onClick={onView}>View &rarr;</button>
      </div>
    </div>
  );
}

// ── Modal Shell ───────────────────────────────────────────────────────────────
import { FiX } from "react-icons/fi";
function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button className={styles.modalClose} onClick={onClose}><FiX /></button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ── View Project Modal (now expanded with all fields) ────────────────────────
function ViewProjectModal({ open, onClose, project }) {
  if (!project) return null;
  const rows = [
    ["Title", project.title],
    ["Tagline", project.tagline || "—"],
    ["Category", project.category],
    ["Status", <ProjectBadge status={project.status} />],
    ["Visibility", <VisibilityBadge visibility={project.visibility} approvalStatus={project.approvalStatus} />],
    ["Start Date", project.dateStart],
    ["End Date", project.dateEnd || "—"],
    ["Activity Mode", project.activityMode],
    ["Venue", project.venue || "—"],
    ["Online Link", project.onlineLink || "—"],
    ["Target Participants", project.targetParticipants || "—"],
    ["Partner Organizations", project.partnerOrganizations || "—"],
    ["Due Date", project.dueDate || "—"],
    // Internal
    ["Project Officers", (project.projectOfficers || []).filter(Boolean).join(", ") || "—"],
    ["Committee Members", (project.projectCommitteeMembers || []).filter(Boolean).join(", ") || "—"],
    ["Logistical Requirements", project.logisticalRequirements || "—"],
    ["Financial Requirements", project.financialRequirements || "—"],
    ["Operational Requirements", project.operationalRequirements || "—"],
  ];
  return (
    <Modal open={open} onClose={onClose} title="Project Details">
      <div className={styles.viewGrid}>
        {rows.map(([k, v]) => (
          <div key={k} className={styles.viewRow}>
            <span className={styles.viewKey}>{k}</span>
            <span className={styles.viewVal}>{v}</span>
          </div>
        ))}
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnPrimary} onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

// ── Delete Project Modal ──────────────────────────────────────────────────────
function DeleteProjectModal({ open, onClose, project, onConfirm }) {
  if (!project) return null;
  return (
    <Modal open={open} onClose={onClose} title="Delete Project">
      <div className={styles.deleteBody}>
        <div className={styles.deleteIcon}><FiAlertTriangle /></div>
        <p className={styles.deleteMsg}>
          Are you sure you want to delete <strong>{project.title}</strong>?
          This action <strong>cannot be undone</strong>.
        </p>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnDanger} onClick={() => { onConfirm(project.id); onClose(); }}>Delete Project</button>
      </div>
    </Modal>
  );
}

// ── Select Project Modal ──────────────────────────────────────────────────────
function SelectProjectModal({ open, onClose, projects, title, actionLabel, actionBtnClass, onAction }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return projects;
    return projects.filter((p) => p.title.toLowerCase().includes(q.toLowerCase()));
  }, [projects, q]);
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className={styles.searchWrap} style={{ marginBottom: "1rem" }}>
        <input className={styles.searchInput} type="text" placeholder="Search projects…"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <span className={styles.searchIcon}><FiSearch /></span>
      </div>
      <div className={styles.tableWrap} style={{ maxHeight: "55vh", overflowY: "auto" }}>
        <table className={styles.table}>
          <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Visibility</th><th>Action</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className={styles.emptyState}>No projects found.</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td>{p.category}</td>
                  <td><ProjectBadge status={p.status} /></td>
                  <td><VisibilityBadge visibility={p.visibility} approvalStatus={p.approvalStatus} /></td>
                  <td>
                    <button className={actionBtnClass} onClick={() => { onAction(p); onClose(); }}>
                      {actionLabel}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnPrimary} onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function ProjectManagement() {
  const [user, setUser] = useState({ role: "", firstName: "", lastName: "" });

  useEffect(() => {
    const userCookie = getCookie("user");
    if (userCookie) {
      const storedUser = JSON.parse(userCookie);
      setUser({
        role: storedUser.role_name,
        firstName: storedUser.first_name,
        lastName: storedUser.last_name,
      });
    }
  }, []);

  // ── State ──────────────────────────────────────────────────────
  const [projects, setProjects] = useState(PLACEHOLDER_PROJECTS);
  const [search, setSearch]     = useState("");
  const [activeSort, setActiveSort] = useState(null);
  const [page, setPage]         = useState(1);
  const [toast, setToast]       = useState(null);
  const [modal, setModal]       = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  // Full-page form mode: null | "create" | "edit"
  const [formMode, setFormMode] = useState(null);
  const [editingProject, setEditingProject] = useState(null);

  // ── Helpers ────────────────────────────────────────────────────
  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }
  function closeModal() { setModal(null); }
  function openView(p)   { setSelectedProject(p); setModal("view"); }
  function openDelete(p) { setSelectedProject(p); setModal("delete"); }

  // ── Full-page handlers ─────────────────────────────────────────
  function openCreate() {
    setEditingProject(null);
    setFormMode("create");
  }
  function openEdit(p) {
    setEditingProject(p);
    setFormMode("edit");
  }
  function handleFormSave(data) {
    if (formMode === "create") {
      const newProject = { ...data, id: nextId(projects) };
      setProjects((prev) => [newProject, ...prev]);
      showToast(`Project "${data.title}" created. ${data.visibility === "public" ? "Submitted for admin approval." : ""}`);
    } else {
      setProjects((prev) => prev.map((p) => p.id === data.id ? data : p));
      showToast(`Project "${data.title}" updated.`);
    }
    setFormMode(null);
    setEditingProject(null);
  }
  function handleFormCancel() {
    setFormMode(null);
    setEditingProject(null);
  }

  // ── Delete ─────────────────────────────────────────────────────
  function handleDelete(id) {
    const title = projects.find((p) => p.id === id)?.title;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    showToast(`Project "${title}" deleted.`, "danger");
  }

  // ── Stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => [
    { num: projects.filter((p) => p.status === "Active").length, label: "Active Projects", hasNew: true },
    { num: projects.filter((p) => p.visibility === "public" && p.approvalStatus === "approved").length, label: "Public Events", hasNew: false },
    { num: projects.filter((p) => p.visibility === "public" && p.approvalStatus === "pending").length, label: "Pending Approval", hasNew: false },
  ], [projects]);

  // ── Filtered & paginated list ──────────────────────────────────
  const filtered = useMemo(() => projects.filter((p) => {
    const matchSearch = !search.trim()
      || p.title.toLowerCase().includes(search.toLowerCase())
      || p.category.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (activeSort) return p.category === activeSort;
    return true;
  }), [projects, search, activeSort]);

  useEffect(() => { setPage(1); }, [search, activeSort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── If in full-page form mode, render the form instead ─────────
  if (formMode) {
    return (
      <CreateEditProject
        mode={formMode}
        initial={editingProject}
        onSave={handleFormSave}
        onCancel={handleFormCancel}
      />
    );
  }

  // ── Main list view ─────────────────────────────────────────────
  return (
    <>
      <Navbar user={user} />
      {toast && (
        <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}>{toast.msg}</div>
      )}

      <main className={styles.pageWrapper}>
        {/* ── Hero Banner ── */}
        <section className={styles.heroBanner}>
          <div className="container-xl">
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>Project Management</h1>
              <div className="row g-3 justify-content-center">
                {stats.map(({ num, label, hasNew }) => (
                  <div key={label} className="col-12 col-md-4">
                    <div className={styles.statCard}>
                      {/* {hasNew && <span className={styles.statDot} />} */}
                      <p className={styles.statNum}>{num}</p>
                      <p className={styles.statLabel}>{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Action Cards ── */}
        <div className="container-xl py-4">
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>What would you like to do?</h2>
            <div className={styles.headingLine} />
          </div>
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="ProjectIconCreate.png" alt="" className={styles.actionIconImg} />}
                title="Create a Project"
                description="Start a new SASHA project or campaign with full details."
                onView={openCreate}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="ProjectIconDelete.png" alt="" className={styles.actionIconImg} />}
                title="Delete a Project"
                description="Permanently remove an existing project."
                onView={() => setModal("selectDelete")}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="ProjectIconEdit.png" alt="" className={styles.actionIconImg} />}
                title="Update Project Information"
                description="Edit all details of an existing project or event."
                onView={() => setModal("selectEdit")}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="ProjectIconView.png" alt="" className={styles.actionIconImg} />}
                title="View All Projects"
                description="Browse active, upcoming, and completed projects."
                onView={() => setModal("selectView")}
              />
            </div>
          </div>
        </div>

        {/* ── All Projects List ── */}
        <section className={styles.allList}>
          <div className="container-xl">
            <div className={styles.sectionHeading}>
              <h2 className={styles.sectionTitle}>All the List of Projects</h2>
              <div className={styles.headingLine} />
            </div>
            <div className={styles.layout}>
              <div>
                {paginated.length === 0 ? (
                  <div className={styles.emptyState}>No projects found.</div>
                ) : (
                  paginated.map((p) => (
                    <div key={p.id} style={{ background: "#037F81", borderRadius: 14, marginBottom: "1rem", overflow: "hidden" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <span style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{p.title}</span>
                          <VisibilityBadge visibility={p.visibility} approvalStatus={p.approvalStatus} />
                        </div>
                        <button className={styles.viewBtn} onClick={() => openView(p)}>View →</button>
                      </div>
                      <div style={{ background: "#fff", padding: "1rem 1.25rem", display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
                        <div style={{ width: 120, height: 80, background: "#e1f5f5", borderRadius: 8, flexShrink: 0, overflow: "hidden" }}>
                          {p.image ? (
                            <img src={p.image} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>📁</div>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          {p.tagline && <p style={{ margin: "0 0 0.25rem", fontSize: "0.82rem", color: "#037F81", fontStyle: "italic" }}>{p.tagline}</p>}
                          <p style={{ margin: "0 0 0.5rem", fontSize: "0.88rem", color: "#6b7280" }}>{p.description}</p>
                          <p style={{ margin: 0, fontSize: "0.82rem", color: "#292929" }}>
                            📅 {p.dateStart}{p.dateEnd ? ` – ${p.dateEnd}` : ""} &nbsp;|&nbsp; {p.activityMode}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button className={styles.tblBtnEdit} onClick={() => openEdit(p)}>Edit</button>
                          <button className={styles.tblBtnDelete} onClick={() => openDelete(p)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <Pagination current={page} total={totalPages} onChange={setPage} />
              </div>

              <aside className={styles.sidebar}>
                <div className={styles.sidebarBlock}>
                  <h3 className={styles.sidebarLabel}>Search</h3>
                  <div className={styles.searchWrap}>
                    <input className={styles.searchInput} type="text" placeholder="Search"
                      value={search} onChange={(e) => setSearch(e.target.value)} />
                    <span className={styles.searchIcon}><FiSearch /></span>
                  </div>
                </div>
                <div className={styles.sidebarBlock}>
                  <h3 className={styles.sidebarLabel}>Sort By Category</h3>
                  <div className={styles.roleList}>
                    {CATEGORIES.map((cat) => (
                      <button key={cat}
                        className={`${styles.roleBtn} ${activeSort === cat ? styles.roleBtnActive : ""}`}
                        onClick={() => setActiveSort(activeSort === cat ? null : cat)}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      {/* ══ MODALS ══ */}
      <SelectProjectModal
        open={modal === "selectView"} onClose={closeModal} projects={projects}
        title="Select a Project to View" actionLabel="View"
        actionBtnClass={styles.tblBtnView}
        onAction={(p) => { closeModal(); openView(p); }} />
      <SelectProjectModal
        open={modal === "selectEdit"} onClose={closeModal} projects={projects}
        title="Select a Project to Edit" actionLabel="Edit"
        actionBtnClass={styles.tblBtnEdit}
        onAction={(p) => { closeModal(); openEdit(p); }} />
      <SelectProjectModal
        open={modal === "selectDelete"} onClose={closeModal} projects={projects}
        title="Select a Project to Delete" actionLabel="Delete"
        actionBtnClass={styles.tblBtnDelete}
        onAction={(p) => { closeModal(); openDelete(p); }} />
      <ViewProjectModal
        open={modal === "view"} onClose={closeModal} project={selectedProject} />
      <DeleteProjectModal
        open={modal === "delete"} onClose={closeModal}
        project={selectedProject} onConfirm={handleDelete} />
    </>
  );
}