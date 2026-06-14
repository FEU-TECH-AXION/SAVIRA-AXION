"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/navbar/navbar";
import CreateEditProject from "@/components/projects/CreateEditProject";
import ProjectsTable from "@/components/projects/ProjectsTable";
import ProjectFilterMenu from "@/components/projects/ProjectFilterMenu";
import styles from "./ProjectManagement.module.css";
import { FiAlertTriangle } from "react-icons/fi";
import { FiX } from "react-icons/fi";
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  deleteProjects,
} from "@/lib/api";
import { uploadProjectImage } from "@/lib/api";

const PAGE_SIZE = 10;

// ── Cookies ───────────────────────────────────────────────────────────────────
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
  return null;
}

// ── Date range helpers ────────────────────────────────────────────────────────
function getDateRangeFromFilter(filterVal) {
  if (!filterVal || filterVal === "") return null;
  const now = new Date();
  if (filterVal === "today") {
    const s = new Date(now); s.setHours(0, 0, 0, 0);
    const e = new Date(now); e.setHours(23, 59, 59, 999);
    return { startDate: s, endDate: e };
  }
  if (filterVal === "thisWeek") {
    const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0, 0, 0, 0);
    const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999);
    return { startDate: s, endDate: e };
  }
  if (filterVal === "thisMonth") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startDate: s, endDate: e };
  }
  if (filterVal === "thisYear") {
    const s = new Date(now.getFullYear(), 0, 1);
    const e = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { startDate: s, endDate: e };
  }
  if (filterVal.startsWith("custom|")) {
    const [, start, end] = filterVal.split("|");
    return { startDate: new Date(start), endDate: new Date(end + "T23:59:59") };
  }
  return null;
}

function isDateInRange(dateStr, startDate, endDate) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= startDate && d <= endDate;
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

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function ProjectManagement() {
  const [user, setUser] = useState({ role: "", firstName: "", lastName: "" });

  // ── State ──────────────────────────────────────────────────────
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [search, setSearch]     = useState("");
  const [activeFilters, setActiveFilters] = useState({});
  const [page, setPage]         = useState(1);
  const [toast, setToast]       = useState(null);
  const [modal, setModal]       = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [sortField, setSortField] = useState("id");
  const [sortDir, setSortDir]     = useState("asc");

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

  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
      setFetchError(null);
      try {
        const data = await fetchProjects();
        setProjects(data);
      } catch (err) {
        setFetchError(err.message || 'Unable to load projects.');
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  // Full-page form mode: null | "create" | "edit"
  const [formMode, setFormMode] = useState(null);
  const [editingProject, setEditingProject] = useState(null);

  // ── Helpers ────────────────────────────────────────────────────
  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }
  function closeModal() { setModal(null); }
  function openDelete(p) { setSelectedProject(p); setModal("delete"); }

  // ── Sort handler ───────────────────────────────────────────────
  function handleSort(field) {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  // ── Full-page handlers ─────────────────────────────────────────
  function openCreate() {
    setEditingProject(null);
    setFormMode("create");
  }
  function openEdit(p) {
    setEditingProject(p);
    setFormMode("edit");
  }
  async function handleFormSave(data) {
    try {
      const payload = { ...data };
      // If image is a File, upload it first and replace with URL
      if (payload.image && typeof payload.image !== 'string') {
        try {
          const url = await uploadProjectImage(payload.image);
          payload.image = url;
        } catch (err) {
          console.error('Image upload failed:', err);
          delete payload.image;
        }
      }

      if (formMode === "create") {
        const created = await createProject(payload);
        setProjects((prev) => [created, ...prev]);
        showToast(`Project "${data.title}" created.`);
      } else {
        const updated = await updateProject(data.id, payload);
        setProjects((prev) => prev.map((p) => p.id === updated.id ? updated : p));
        showToast(`Project "${data.title}" updated.`);
      }
      setFormMode(null);
      setEditingProject(null);
    } catch (err) {
      showToast(err.message || 'Unable to save project.', 'danger');
    }
  }
  function handleFormCancel() {
    setFormMode(null);
    setEditingProject(null);
  }

  // ── Delete ─────────────────────────────────────────────────────
  async function handleDelete(id) {
    try {
      const title = (projects || []).find((p) => p.id === id)?.title || "";
      await deleteProject(id);
      setProjects((prev) => (Array.isArray(prev) ? prev.filter((p) => p.id !== id) : []));
      showToast(`Project "${title}" deleted.`, "danger");
    } catch (err) {
      showToast(err.message || 'Unable to delete project.', 'danger');
    }
  }

  // ── Bulk delete ────────────────────────────────────────────────────────
  async function handleBulkDelete(selected) {
    try {
      const list = Array.isArray(selected) ? selected : [];
      const ids = list.map(p => p.id);
      await deleteProjects(ids);
      setProjects(prev => (Array.isArray(prev) ? prev.filter(p => !ids.includes(p.id)) : []));
      showToast(`${list.length} project${list.length !== 1 ? "s" : ""} deleted.`, "danger");
    } catch (err) {
      showToast(err.message || 'Unable to delete selected projects.', 'danger');
    }
  }

  // ── Stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const list = projects || [];
    return [
      { num: list.filter((p) => p?.status === "Active").length, label: "Active Projects" },
      { num: list.filter((p) => p?.visibility === "public" && p?.approvalStatus === "approved").length, label: "Public Events" },
      { num: list.filter((p) => p?.visibility === "public" && p?.approvalStatus === "pending").length, label: "Pending Approval" },
    ];
  }, [projects]);

  // ── Filtered & sorted list ──────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...projects];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        String(p.id).includes(q)
      );
    }

    // Status filter
    if (activeFilters.status && activeFilters.status !== "All") {
      list = list.filter(p => p.status === activeFilters.status);
    }

    // Visibility filter
    if (activeFilters.visibility && activeFilters.visibility !== "All") {
      list = list.filter(p => p.visibility === activeFilters.visibility.toLowerCase());
    }

    // Approval status filter
    if (activeFilters.approvalStatus && activeFilters.approvalStatus !== "All") {
      list = list.filter(p => p.approvalStatus === activeFilters.approvalStatus.toLowerCase());
    }

    // Due Date filter
    if (activeFilters.dueDate) {
      const range = getDateRangeFromFilter(activeFilters.dueDate);
      if (range) list = list.filter(p => isDateInRange(p.dueDate, range.startDate, range.endDate));
    }

    // Date Created filter
    if (activeFilters.dateCreated) {
      const range = getDateRangeFromFilter(activeFilters.dateCreated);
      if (range) list = list.filter(p => isDateInRange(p.createdAt, range.startDate, range.endDate));
    }

    // Project Officer (additional filter)
    if (activeFilters.projectOfficer) {
      const q = activeFilters.projectOfficer.toLowerCase();
      list = list.filter(p =>
        (p.projectOfficers || []).some(o => o.toLowerCase().includes(q))
      );
    }

    // Project Member (additional filter)
    if (activeFilters.projectMember) {
      const q = activeFilters.projectMember.toLowerCase();
      list = list.filter(p =>
        (p.projectCommitteeMembers || []).some(m => m.toLowerCase().includes(q))
      );
    }

    // Activity Conduct (additional filter)
    if (activeFilters.activityConduct && activeFilters.activityConduct !== "All") {
      list = list.filter(p => p.activityMode === activeFilters.activityConduct);
    }

    // Venue (additional filter)
    if (activeFilters.venue) {
      const q = activeFilters.venue.toLowerCase();
      list = list.filter(p => (p.venue || "").toLowerCase().includes(q));
    }

    // Inclusive Start Date (additional filter)
    if (activeFilters.inclusiveStartDate) {
      const bound = new Date(activeFilters.inclusiveStartDate);
      list = list.filter(p => p.dateStart && new Date(p.dateStart) >= bound);
    }

    // Inclusive End Date (additional filter)
    if (activeFilters.inclusiveEndDate) {
      const bound = new Date(activeFilters.inclusiveEndDate + "T23:59:59");
      list = list.filter(p => p.dateEnd && new Date(p.dateEnd) <= bound);
    }

    // Sort
    list.sort((a, b) => {
      let av = a[sortField] ?? "";
      let bv = b[sortField] ?? "";
      if (sortField === "id") { av = Number(av); bv = Number(bv); }
      if (sortField === "dueDate" || sortField === "dateCreated") {
        av = new Date(av).getTime() || 0;
        bv = new Date(bv).getTime() || 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [projects, search, activeFilters, sortField, sortDir]);

  useEffect(() => { setPage(1); }, [search, activeFilters, sortField]);

  const totalPages = Math.max(1, Math.ceil((filtered?.length || 0) / PAGE_SIZE));
  const paginated  = (filtered || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActiveFilters = Object.values(activeFilters).some(v => v && v !== "All" && v !== "");

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
                {stats.map(({ num, label }) => (
                  <div key={label} className="col-12 col-md-4">
                    <div className={styles.statCard}>
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
                onView={() => {
                  if (projects.length > 0) openDelete(projects[0]);
                }}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="ProjectIconEdit.png" alt="" className={styles.actionIconImg} />}
                title="Update Project Information"
                description="Edit all details of an existing project or event."
                onView={() => {
                  if (projects.length > 0) openEdit(projects[0]);
                }}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="ProjectIconView.png" alt="" className={styles.actionIconImg} />}
                title="View All Projects"
                description="Browse active, upcoming, and completed projects."
                onView={() => {
                  setActiveFilters({});
                  setSearch("");
                  setPage(1);
                  document.getElementById("projects-table-section")?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            </div>
          </div>
        </div>

        {/* ── All Projects Table ── */}
        <section className={styles.allList} id="projects-table-section">
          <div className="container-xl">
            <div className={styles.sectionHeading}>
              <h2 className={styles.sectionTitle}>All the List of Projects</h2>
              <div className={styles.headingLine} />
            </div>

            <div className={styles.layout}>
              <div>
                {/* ── Top bar: filter + search ── */}
                <div className={styles.tableTopBar}>
                  <ProjectFilterMenu
                    activeFilters={activeFilters}
                    onFilterChange={(f) => { setActiveFilters(f); setPage(1); }}
                    onSearch={(v) => { setSearch(v); setPage(1); }}
                    searchValue={search}
                  />
                </div>

                {/* ── Table ── */}
                <ProjectsTable
                  paginated={paginated}
                  page={page}
                  totalPages={totalPages}
                  totalRecords={filtered.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                  onRowDoubleClick={openEdit}
                  onDeleteSelected={handleBulkDelete}
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ══ MODALS ══ */}
      <DeleteProjectModal
        open={modal === "delete"} onClose={closeModal}
        project={selectedProject} onConfirm={handleDelete} />
    </>
  );
}