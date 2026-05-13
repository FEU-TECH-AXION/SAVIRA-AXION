"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/navbar/navbar";
import styles from "./ProjectManagement.module.css";
import { FiSearch, FiX, FiAlertTriangle } from "react-icons/fi";

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE INTEGRATION — uncomment when ready
// ─────────────────────────────────────────────────────────────────────────────

const PLACEHOLDER_PROJECTS = [
  { id: 1, title: "Safe Spaces Summit",          description: "A summit promoting safe spaces across communities.",        category: "Youth Leadership Programs", dateStart: "03/03/2026", dateEnd: "03/04/2026", status: "Active",   image: "/project-1.jpg" },
  { id: 2, title: "Youth Against Abuse Summit",  description: "Empowering youth to stand against abuse and harassment.",   category: "Legal & Policy Education",  dateStart: "03/03/2026", dateEnd: "03/04/2026", status: "Active",   image: "/project-2.jpg" },
  { id: 3, title: "SASHA Believes That…",        description: "A campaign building awareness of survivor experiences.",     category: "New Projects",              dateStart: "03/01/2025", dateEnd: "03/31/2025", status: "Completed", image: "/project-3.jpg" },
  { id: 4, title: "SASHA Awareness Drive",       description: "City-wide awareness initiative targeting key demographics.", category: "Happening Soon",            dateStart: "08/18/2026", dateEnd: "08/19/2026", status: "Upcoming", image: "/project-4.jpg" },
  { id: 5, title: "Youth Empowerment Assembly",  description: "Annual assembly for youth leaders across the country.",     category: "Youth Leadership Programs", dateStart: "04/01/2026", dateEnd: "04/02/2026", status: "Upcoming", image: "/project-5.jpg" },
  { id: 6, title: "Legal Literacy Workshop",     description: "Workshops on legal rights for abuse survivors.",            category: "Legal & Policy Education",  dateStart: "02/15/2026", dateEnd: "02/15/2026", status: "Completed", image: "/project-6.jpg" },
  { id: 7, title: "Community Outreach Program",  description: "Door-to-door outreach in underserved communities.",         category: "New Projects",              dateStart: "04/10/2026", dateEnd: "04/12/2026", status: "Active",   image: "/project-7.jpg" },
  { id: 8, title: "Policy Advocacy Summit",      description: "Bringing policymakers and advocates together.",             category: "Legal & Policy Education",  dateStart: "05/05/2026", dateEnd: "05/06/2026", status: "Upcoming", image: "/project-8.jpg" },
];

const CATEGORIES = ["New Projects", "Happening Soon", "Youth Leadership Programs", "Legal & Policy Education"];
const STATUS_OPTIONS = ["Active", "Upcoming", "Completed"];
const PAGE_SIZE = 4;

function today() {
  return new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function nextId(list) {
  return list.length ? Math.max(...list.map((p) => p.id)) + 1 : 1;
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function ProjectBadge({ status }) {
  const map = {
    Active:    { bg: "#d1fae5", color: "#065f46" },
    Upcoming:  { bg: "#dbeafe", color: "#1e40af" },
    Completed: { bg: "#f3f4f6", color: "#374151" },
  };
  const style = map[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.78rem", fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: style.bg, color: style.color }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
      {status}
    </span>
  );
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

// ── Create Project Modal ──────────────────────────────────────────────────────
function CreateProjectModal({ open, onClose, onSave }) {
  const EMPTY = { title: "", description: "", category: CATEGORIES[0], dateStart: "", dateEnd: "", status: "Upcoming" };
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required.";
    if (!form.dateStart)    e.dateStart = "Start date is required.";
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ ...form });
    setForm(EMPTY); setErrors({}); onClose();
  }

  return (
    <Modal open={open} onClose={() => { setForm(EMPTY); setErrors({}); onClose(); }} title="Create a Project">
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Project Title *</label>
          <input className={`${styles.formInput} ${errors.title ? styles.inputError : ""}`} type="text" placeholder="e.g. Safe Spaces Summit" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          {errors.title && <span className={styles.errorMsg}>{errors.title}</span>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Description</label>
          <textarea className={styles.formInput} rows={3} placeholder="Brief description of the project…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ resize: "vertical" }} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Category</label>
          <select className={styles.formInput} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Start Date *</label>
          <input className={`${styles.formInput} ${errors.dateStart ? styles.inputError : ""}`} type="date" value={form.dateStart} onChange={(e) => setForm({ ...form, dateStart: e.target.value })} />
          {errors.dateStart && <span className={styles.errorMsg}>{errors.dateStart}</span>}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>End Date</label>
          <input className={styles.formInput} type="date" value={form.dateEnd} onChange={(e) => setForm({ ...form, dateEnd: e.target.value })} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Status</label>
          <div className={styles.radioGroup}>
            {STATUS_OPTIONS.map((s) => (
              <label key={s} className={styles.radioLabel}>
                <input type="radio" name="proj-status" value={s} checked={form.status === s} onChange={() => setForm({ ...form, status: s })} className={styles.radioInput} />
                {s}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSubmit}>Create Project</button>
      </div>
    </Modal>
  );
}

// ── View Project Modal ────────────────────────────────────────────────────────
function ViewProjectModal({ open, onClose, project }) {
  if (!project) return null;
  return (
    <Modal open={open} onClose={onClose} title="Project Details">
      <div className={styles.viewGrid}>
        {[
          ["Title", project.title],
          ["Description", project.description],
          ["Category", project.category],
          ["Start Date", project.dateStart],
          ["End Date", project.dateEnd || "—"],
          ["Status", <ProjectBadge status={project.status} />],
        ].map(([k, v]) => (
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

// ── Edit Project Modal ────────────────────────────────────────────────────────
function EditProjectModal({ open, onClose, project, onSave }) {
  const [form, setForm] = useState(null);
  useEffect(() => { if (project) setForm({ ...project }); }, [project]);
  if (!form) return null;

  function handleSubmit() {
    if (!form.title.trim()) return;
    onSave(form); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Update Project Information">
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Project Title *</label>
          <input className={styles.formInput} type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Description</label>
          <textarea className={styles.formInput} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ resize: "vertical" }} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Category</label>
          <select className={styles.formInput} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Start Date</label>
          <input className={styles.formInput} type="date" value={form.dateStart} onChange={(e) => setForm({ ...form, dateStart: e.target.value })} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>End Date</label>
          <input className={styles.formInput} type="date" value={form.dateEnd} onChange={(e) => setForm({ ...form, dateEnd: e.target.value })} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Status</label>
          <div className={styles.radioGroup}>
            {STATUS_OPTIONS.map((s) => (
              <label key={s} className={styles.radioLabel}>
                <input type="radio" name="edit-proj-status" value={s} checked={form.status === s} onChange={() => setForm({ ...form, status: s })} className={styles.radioInput} />
                {s}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSubmit}>Save Changes</button>
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
        <p className={styles.deleteMsg}>Are you sure you want to delete <strong>{project.title}</strong>? This action <strong>cannot be undone</strong>.</p>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnDanger} onClick={() => { onConfirm(project.id); onClose(); }}>Delete Project</button>
      </div>
    </Modal>
  );
}

// ── Select Project Modal (action card → modal chaining) ───────────────────────
function SelectProjectModal({ open, onClose, projects, title, actionLabel, actionBtnClass, onAction }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return projects;
    return projects.filter((p) => p.title.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase()));
  }, [projects, q]);
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className={styles.searchWrap} style={{ marginBottom: "1rem" }}>
        <input className={styles.searchInput} type="text" placeholder="Search projects…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className={styles.searchIcon}><FiSearch /></span>
      </div>
      <div className={styles.tableWrap} style={{ maxHeight: "55vh", overflowY: "auto" }}>
        <table className={styles.table}>
          <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className={styles.emptyState}>No projects found.</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td>{p.category}</td>
                  <td><ProjectBadge status={p.status} /></td>
                  <td><button className={actionBtnClass} onClick={() => { onAction(p); onClose(); }}>{actionLabel}</button></td>
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

// ── Cookies ─────────────────────────────────────────────────────────────────────

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
}
// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function ProjectManagement() {
  const [user, setUser] = useState({ role: "", firstName: "", lastName: "" });

  useEffect(() => {
  const userCookie = getCookie('user');
  if (userCookie) {
    const storedUser = JSON.parse(userCookie);
    setUser({
      role: storedUser.role_name,
      firstName: storedUser.first_name,
      lastName: storedUser.last_name,
    });
  }
}, []);

  const [projects, setProjects] = useState(PLACEHOLDER_PROJECTS);
  const [search, setSearch] = useState("");
  const [activeSort, setActiveSort] = useState(null);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);

  const [modal, setModal] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function closeModal() { setModal(null); }
  function openView(p)   { setSelectedProject(p); setModal("view"); }
  function openEdit(p)   { setSelectedProject(p); setModal("edit"); }
  function openDelete(p) { setSelectedProject(p); setModal("delete"); }

  function handleCreate(data) {
    setProjects((prev) => [{ id: nextId(prev), ...data }, ...prev]);
    showToast(`Project "${data.title}" created.`);
  }
  function handleUpdate(updated) {
    setProjects((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    showToast(`Project "${updated.title}" updated.`);
  }
  function handleDelete(id) {
    const title = projects.find((p) => p.id === id)?.title;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    showToast(`Project "${title}" deleted.`, "danger");
  }

  const stats = useMemo(() => [
    { num: projects.filter((p) => p.status === "Active").length, label: "Active Projects", hasNew: true },
  ], [projects]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchSearch = !search.trim() || p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (activeSort) return p.category === activeSort;
      return true;
    });
  }, [projects, search, activeSort]);

  useEffect(() => { setPage(1); }, [search, activeSort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <Navbar user={user} />
      {toast && <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}>{toast.msg}</div>}

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
                      {hasNew && <span className={styles.statDot} />}
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
              <ActionCard icon={<img src="ProjectIconCreate.png" alt="" className={styles.actionIconImg} />} title="Create a Project" description="Start a new SASHA project or campaign." onView={() => setModal("create")} />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard icon={<img src="ProjectIconDelete.png" alt="" className={styles.actionIconImg} />} title="Delete a Project" description="Permanently remove an existing project." onView={() => setModal("selectDelete")} />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard icon={<img src="ProjectIconEdit.png" alt="" className={styles.actionIconImg} />} title="Update Project Information" description="Edit details of an existing project." onView={() => setModal("selectEdit")} />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard icon={<img src="ProjectIconView.png" alt="" className={styles.actionIconImg} />} title="View All Projects" description="Browse all active, upcoming, and completed projects." onView={() => setModal("selectView")} />
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
                        <span style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{p.title}</span>
                        <button className={styles.viewBtn} onClick={() => openView(p)}>View →</button>
                      </div>
                      <div style={{ background: "#fff", padding: "1rem 1.25rem", display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
                        <div style={{ width: 120, height: 80, background: "#e1f5f5", borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>📁</div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: "0 0 0.5rem", fontSize: "0.88rem", color: "#6b7280" }}>{p.description}</p>
                          <p style={{ margin: 0, fontSize: "0.82rem", color: "#292929" }}>Date Start: {p.dateStart}</p>
                          <p style={{ margin: 0, fontSize: "0.82rem", color: "#292929" }}>Date End: {p.dateEnd || "Ongoing"}</p>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className={styles.tblBtnEdit}   onClick={() => openEdit(p)}>Edit</button>
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
                    <input className={styles.searchInput} type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                    <span className={styles.searchIcon}><FiSearch /></span>
                  </div>
                </div>
                <div className={styles.sidebarBlock}>
                  <h3 className={styles.sidebarLabel}>Sort By</h3>
                  <div className={styles.roleList}>
                    {CATEGORIES.map((cat) => (
                      <button key={cat} className={`${styles.roleBtn} ${activeSort === cat ? styles.roleBtnActive : ""}`} onClick={() => setActiveSort(activeSort === cat ? null : cat)}>{cat}</button>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      {/* ══ MODALS ══ */}
      <CreateProjectModal  open={modal === "create"}       onClose={closeModal} onSave={handleCreate} />
      <SelectProjectModal  open={modal === "selectView"}   onClose={closeModal} projects={projects} title="Select a Project to View"   actionLabel="View"   actionBtnClass={styles.tblBtnView}   onAction={(p) => { closeModal(); openView(p); }} />
      <SelectProjectModal  open={modal === "selectEdit"}   onClose={closeModal} projects={projects} title="Select a Project to Edit"   actionLabel="Edit"   actionBtnClass={styles.tblBtnEdit}   onAction={(p) => { closeModal(); openEdit(p); }} />
      <SelectProjectModal  open={modal === "selectDelete"} onClose={closeModal} projects={projects} title="Select a Project to Delete" actionLabel="Delete" actionBtnClass={styles.tblBtnDelete} onAction={(p) => { closeModal(); openDelete(p); }} />
      <ViewProjectModal    open={modal === "view"}         onClose={closeModal} project={selectedProject} />
      <EditProjectModal    open={modal === "edit"}         onClose={closeModal} project={selectedProject} onSave={handleUpdate} />
      <DeleteProjectModal  open={modal === "delete"}       onClose={closeModal} project={selectedProject} onConfirm={handleDelete} />
    </>
  );
}