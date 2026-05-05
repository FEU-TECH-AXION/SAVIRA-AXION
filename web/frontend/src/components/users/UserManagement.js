"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/navbar/navbar";
import styles from "./UserManagement.module.css";
import { FiSearch, FiX, FiAlertTriangle } from "react-icons/fi";

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE INTEGRATION
// Uncomment and configure when ready:
//
// import { createClient } from "@supabase/supabase-js";
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// );
// ─────────────────────────────────────────────────────────────────────────────

const PLACEHOLDER_USERS = [
  { id: 1,  name: "Alexa Gagan",    role: "Case Officer",             status: "Active",   dateCreated: "02/26/2026", email: "alexa.gagan@sasha.org",    phone: "09171234567" },
  { id: 2,  name: "Marco Santos",   role: "Admin - Executive Officer", status: "Active",   dateCreated: "02/20/2026", email: "marco.santos@sasha.org",   phone: "09179876543" },
  { id: 3,  name: "Lena Cruz",      role: "Member",                   status: "Inactive", dateCreated: "01/15/2026", email: "lena.cruz@sasha.org",      phone: "09182345678" },
  { id: 4,  name: "Ryan Dela Paz",  role: "Legal",                    status: "Active",   dateCreated: "03/01/2026", email: "ryan.delapaz@sasha.org",   phone: "09193456789" },
  { id: 5,  name: "Sofia Reyes",    role: "Complainants",             status: "Active",   dateCreated: "02/10/2026", email: "sofia.reyes@sasha.org",    phone: "09204567890" },
  { id: 6,  name: "James Tan",      role: "Case Officer",             status: "Inactive", dateCreated: "01/28/2026", email: "james.tan@sasha.org",      phone: "09215678901" },
  { id: 7,  name: "Maria Bautista", role: "Member",                   status: "Active",   dateCreated: "03/05/2026", email: "maria.bautista@sasha.org", phone: "09226789012" },
  { id: 8,  name: "Carlo Navarro",  role: "Volunteers",               status: "Active",   dateCreated: "02/14/2026", email: "carlo.navarro@sasha.org",  phone: "09237890123" },
  { id: 9,  name: "Diana Flores",   role: "Complainants",             status: "Inactive", dateCreated: "01/09/2026", email: "diana.flores@sasha.org",   phone: "09248901234" },
  { id: 10, name: "Ben Mercado",    role: "Case Officer",             status: "Active",   dateCreated: "03/10/2026", email: "ben.mercado@sasha.org",    phone: "09259012345" },
  { id: 11, name: "Trisha Abad",    role: "Admin - Executive Officer", status: "Active",  dateCreated: "02/02/2026", email: "trisha.abad@sasha.org",    phone: "09260123456" },
  { id: 12, name: "Noel Ramos",     role: "Legal",                    status: "Inactive", dateCreated: "01/22/2026", email: "noel.ramos@sasha.org",     phone: "09271234567" },
  { id: 13, name: "Grace Ocampo",   role: "Volunteers",               status: "Active",   dateCreated: "03/08/2026", email: "grace.ocampo@sasha.org",   phone: "09282345678" },
  { id: 14, name: "Andrei Lim",     role: "Complainants",             status: "Active",   dateCreated: "02/27/2026", email: "andrei.lim@sasha.org",     phone: "09293456789" },
  { id: 15, name: "Camille Torres", role: "Case Officer",             status: "Active",   dateCreated: "01/30/2026", email: "camille.torres@sasha.org", phone: "09304567890" },
  { id: 16, name: "Hans Garcia",    role: "Member",                   status: "Inactive", dateCreated: "03/03/2026", email: "hans.garcia@sasha.org",    phone: "09315678901" },
  { id: 17, name: "Issa Valdez",    role: "Volunteers",               status: "Active",   dateCreated: "02/18/2026", email: "issa.valdez@sasha.org",    phone: "09326789012" },
  { id: 18, name: "Leo Aquino",     role: "Complainants",             status: "Active",   dateCreated: "01/11/2026", email: "leo.aquino@sasha.org",     phone: "09337890123" },
];

const ROLES = [
  "All",
  "Admin - Executive Officer",
  "Case Officer",
  "Legal",
  "Member",
  "Complainants",
  "Volunteers",
];

const ROLE_OPTIONS = ROLES.filter((r) => r !== "All");

const PAGE_SIZE = 8;

// ── Helpers ──────────────────────────────────────────────────────────────────
function today() {
  return new Date().toLocaleDateString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
  });
}

function nextId(users) {
  return users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;
}

// ── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const isActive = status === "Active";
  return (
    <span className={isActive ? styles.badgeActive : styles.badgeInactive}>
      <span className={styles.badgeDot} />
      {status}
    </span>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ current, total, onChange }) {
  const pages = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className={styles.pagination}>
      <button
        className={styles.pageArrow}
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        aria-label="Previous page"
      >
        ←
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={`${styles.pageBtn} ${p === current ? styles.pageBtnActive : ""}`}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        className={styles.pageArrow}
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        aria-label="Next page"
      >
        →
      </button>
    </div>
  );
}

// ── Action Card ───────────────────────────────────────────────────────────────
function ActionCard({ icon, title, description, onView }) {
  return (
    <div className={styles.actionCard}>
      <div className={styles.actionIconWrap}>
        <span className={styles.actionIcon}>{icon}</span>
      </div>
      <div className={styles.actionBody}>
        <h3 className={styles.actionTitle}>{title}</h3>
        <p className={styles.actionDesc}>{description}</p>
      </div>
      <div className={styles.ViewRow}>
        <button className={styles.viewBtn} onClick={onView}>
          View &rarr;
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MODAL SHELL
// ══════════════════════════════════════════════════════════════════
function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalBox}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">
            <FiX />
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CREATE USER MODAL
// ══════════════════════════════════════════════════════════════════
function CreateUserModal({ open, onClose, onSave }) {
  const EMPTY = { name: "", email: "", phone: "", role: ROLE_OPTIONS[0], status: "Active" };
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!form.name.trim())  e.name  = "Name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.role)         e.role  = "Role is required.";
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ ...form, dateCreated: today() });
    setForm(EMPTY);
    setErrors({});
    onClose();
  }

  function handleClose() {
    setForm(EMPTY);
    setErrors({});
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create New User">
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Full Name *</label>
          <input
            className={`${styles.formInput} ${errors.name ? styles.inputError : ""}`}
            type="text"
            placeholder="e.g. Juan dela Cruz"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          {errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Email Address *</label>
          <input
            className={`${styles.formInput} ${errors.email ? styles.inputError : ""}`}
            type="email"
            placeholder="e.g. juan@sasha.org"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Phone Number</label>
          <input
            className={styles.formInput}
            type="tel"
            placeholder="e.g. 09171234567"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Role *</label>
          <select
            className={`${styles.formInput} ${errors.role ? styles.inputError : ""}`}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {errors.role && <span className={styles.errorMsg}>{errors.role}</span>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Status</label>
          <div className={styles.radioGroup}>
            {["Active", "Inactive"].map((s) => (
              <label key={s} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="status"
                  value={s}
                  checked={form.status === s}
                  onChange={() => setForm({ ...form, status: s })}
                  className={styles.radioInput}
                />
                {s}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={handleClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSubmit}>Create User</button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// VIEW USER MODAL
// ══════════════════════════════════════════════════════════════════
function ViewUserModal({ open, onClose, user }) {
  if (!user) return null;
  return (
    <Modal open={open} onClose={onClose} title="User Details">
      <div className={styles.viewGrid}>
        <div className={styles.viewRow}>
          <span className={styles.viewKey}>Full Name</span>
          <span className={styles.viewVal}>{user.name}</span>
        </div>
        <div className={styles.viewRow}>
          <span className={styles.viewKey}>Email</span>
          <span className={styles.viewVal}>{user.email || "—"}</span>
        </div>
        <div className={styles.viewRow}>
          <span className={styles.viewKey}>Phone</span>
          <span className={styles.viewVal}>{user.phone || "—"}</span>
        </div>
        <div className={styles.viewRow}>
          <span className={styles.viewKey}>Role</span>
          <span className={styles.viewVal}>{user.role}</span>
        </div>
        <div className={styles.viewRow}>
          <span className={styles.viewKey}>Status</span>
          <span className={styles.viewVal}><StatusBadge status={user.status} /></span>
        </div>
        <div className={styles.viewRow}>
          <span className={styles.viewKey}>Date Created</span>
          <span className={styles.viewVal}>{user.dateCreated}</span>
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnPrimary} onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// EDIT USER MODAL
// ══════════════════════════════════════════════════════════════════
function EditUserModal({ open, onClose, user, onSave }) {
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) setForm({ ...user });
  }, [user]);

  function validate() {
    const e = {};
    if (!form.name.trim())  e.name  = "Name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.role)         e.role  = "Role is required.";
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave(form);
    setErrors({});
    onClose();
  }

  function handleClose() {
    setErrors({});
    onClose();
  }

  if (!form) return null;

  return (
    <Modal open={open} onClose={handleClose} title="Update User Information">
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Full Name *</label>
          <input
            className={`${styles.formInput} ${errors.name ? styles.inputError : ""}`}
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          {errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Email Address *</label>
          <input
            className={`${styles.formInput} ${errors.email ? styles.inputError : ""}`}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Phone Number</label>
          <input
            className={styles.formInput}
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Role *</label>
          <select
            className={`${styles.formInput} ${errors.role ? styles.inputError : ""}`}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {errors.role && <span className={styles.errorMsg}>{errors.role}</span>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Status</label>
          <div className={styles.radioGroup}>
            {["Active", "Inactive"].map((s) => (
              <label key={s} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="edit-status"
                  value={s}
                  checked={form.status === s}
                  onChange={() => setForm({ ...form, status: s })}
                  className={styles.radioInput}
                />
                {s}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={handleClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSubmit}>Save Changes</button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// DELETE CONFIRM MODAL
// ══════════════════════════════════════════════════════════════════
function DeleteUserModal({ open, onClose, user, onConfirm }) {
  if (!user) return null;
  return (
    <Modal open={open} onClose={onClose} title="Delete User">
      <div className={styles.deleteBody}>
        <div className={styles.deleteIcon}>
          <FiAlertTriangle />
        </div>
        <p className={styles.deleteMsg}>
          Are you sure you want to delete <strong>{user.name}</strong>?
          This action <strong>cannot be undone</strong>.
        </p>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnDanger} onClick={() => { onConfirm(user.id); onClose(); }}>
          Delete User
        </button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// VIEW ALL USERS MODAL (full searchable list)
// ══════════════════════════════════════════════════════════════════
// defaultAction: "view" | "edit" | "delete" | null
// When set, each row only shows the relevant action button and a label hint appears in the title.
function ViewAllModal({ open, onClose, users, onEdit, onDelete, onView, defaultAction }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q.toLowerCase()) ||
        u.role.toLowerCase().includes(q.toLowerCase())
    );
  }, [users, q]);

  const modalTitle =
    defaultAction === "delete" ? "Select a User to Delete"
    : defaultAction === "edit" ? "Select a User to Edit"
    : defaultAction === "view" ? "Select a User to View"
    : "All Users";

  return (
    <Modal open={open} onClose={onClose} title={modalTitle}>
      <div className={styles.searchWrap} style={{ marginBottom: "1rem" }}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search by name or role…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className={styles.searchIcon}><FiSearch /></span>
      </div>

      <div className={styles.tableWrap} style={{ maxHeight: "55vh", overflowY: "auto" }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className={styles.emptyState}>No users found.</td></tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.role}</td>
                  <td><StatusBadge status={u.status} /></td>
                  <td>
                    <div className={styles.actionBtns}>
                      {(!defaultAction || defaultAction === "view") && (
                        <button className={styles.tblBtnView} onClick={() => { onView(u); onClose(); }}>View</button>
                      )}
                      {(!defaultAction || defaultAction === "edit") && (
                        <button className={styles.tblBtnEdit} onClick={() => { onEdit(u); onClose(); }}>Edit</button>
                      )}
                      {(!defaultAction || defaultAction === "delete") && (
                        <button className={styles.tblBtnDelete} onClick={() => { onDelete(u); onClose(); }}>Delete</button>
                      )}
                    </div>
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
export default function AdminDashboard() {
  const user = { role: "admin", firstName: "Admin", lastName: "User" };

  const [users, setUsers]           = useState(PLACEHOLDER_USERS);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");
  const [activeRole, setActiveRole] = useState("All");
  const [page, setPage]             = useState(1);

  // Modal states
  const [modal, setModal]           = useState(null); // "create" | "view" | "edit" | "delete" | "viewAll"
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewAllAction, setViewAllAction] = useState(null); // "view" | "edit" | "delete" | null

  // Toast notification
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Derived stats
  const stats = useMemo(() => [
    { num: users.filter((u) => u.status === "Active").length,   label: "Active",       hasNew: false },
    { num: users.filter((u) => u.status === "Inactive").length, label: "Deactivated",  hasNew: false },
    { num: users.length,                                         label: "Total Users",  hasNew: false },
  ], [users]);

  // ── CRUD handlers ──────────────────────────────────────────────
  function handleCreate(data) {
    setUsers((prev) => [{ id: nextId(prev), ...data }, ...prev]);
    showToast(`User "${data.name}" created successfully.`);
  }

  function handleUpdate(updated) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    showToast(`User "${updated.name}" updated successfully.`);
  }

  function handleDelete(id) {
    const name = users.find((u) => u.id === id)?.name;
    setUsers((prev) => prev.filter((u) => u.id !== id));
    showToast(`User "${name}" deleted.`, "danger");
  }

  // ── Filter + search ───────────────────────────────────────────
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchRole   = activeRole === "All" || u.role === activeRole;
      const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                          u.role.toLowerCase().includes(search.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [users, activeRole, search]);

  useEffect(() => { setPage(1); }, [search, activeRole]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Open modals ────────────────────────────────────────────────
  function openView(u)   { setSelectedUser(u); setModal("view"); }
  function openEdit(u)   { setSelectedUser(u); setModal("edit"); }
  function openDelete(u) { setSelectedUser(u); setModal("delete"); }
  function closeModal()  { setModal(null); setViewAllAction(null); }
  function openViewAll(action = null) { setViewAllAction(action); setModal("viewAll"); }

  return (
    <>
      <Navbar user={user} />

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}>
          {toast.msg}
        </div>
      )}

      <main className={styles.pageWrapper}>
        {/* ── Hero Banner ── */}
        <section className={styles.heroBanner}>
          <div className="container-xl">
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>User Management</h1>
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
              <ActionCard
                icon={<img src="UserIconCreate.png" alt="" className={styles.actionIconImg} />}
                title="Create a User"
                description="Create an Admin, Member, Volunteer, or Client/Victim account."
                onView={() => setModal("create")}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="UserIconDelete.png" alt="" className={styles.actionIconImg} />}
                title="Delete a User"
                description="Permanently remove an Admin, Member, Volunteer, or Client/Victim."
                onView={() => openViewAll("delete")}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="UserIconUpdate.png" alt="" className={styles.actionIconImg} />}
                title="Update User Information"
                description="Edit details of any Admin, Member, Volunteer, or Client/Victim."
                onView={() => openViewAll("edit")}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="UserIconView.png" alt="" className={styles.actionIconImg} />}
                title="View All Users"
                description="Browse the complete list of all registered users."
                onView={() => openViewAll(null)}
              />
            </div>
          </div>
        </div>

        {/* ── All Users Table ── */}
        <section className={styles.allList}>
          <div className="container-xl">
            <div className={styles.sectionHeading}>
              <h2 className={styles.sectionTitle}>All the List of Users</h2>
              <div className={styles.headingLine} />
            </div>

            <div className={styles.layout}>
              {/* Table */}
              <div className={styles.tableWrap}>
                {loading ? (
                  <div className={styles.loadingState}>Loading users…</div>
                ) : (
                  <>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Date Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.length === 0 ? (
                          <tr>
                            <td colSpan={5} className={styles.emptyState}>
                              No users found.
                            </td>
                          </tr>
                        ) : (
                          paginated.map((u) => (
                            <tr key={u.id}>
                              <td>{u.name}</td>
                              <td>{u.role}</td>
                              <td><StatusBadge status={u.status} /></td>
                              <td>{u.dateCreated}</td>
                              <td>
                                <div className={styles.actionBtns}>
                                  <button className={styles.tblBtnView}   onClick={() => openView(u)}>View</button>
                                  <button className={styles.tblBtnEdit}   onClick={() => openEdit(u)}>Edit</button>
                                  <button className={styles.tblBtnDelete} onClick={() => openDelete(u)}>Delete</button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    <Pagination current={page} total={totalPages} onChange={setPage} />
                  </>
                )}
              </div>

              {/* Sidebar */}
              <aside className={styles.sidebar}>
                <div className={styles.sidebarBlock}>
                  <h3 className={styles.sidebarLabel}>Search</h3>
                  <div className={styles.searchWrap}>
                    <input
                      className={styles.searchInput}
                      type="text"
                      placeholder="Search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <span className={styles.searchIcon}><FiSearch /></span>
                  </div>
                </div>

                <div className={styles.sidebarBlock}>
                  <h3 className={styles.sidebarLabel}>Sort By</h3>
                  <div className={styles.roleList}>
                    {ROLES.filter((r) => r !== "All").map((role) => (
                      <button
                        key={role}
                        className={`${styles.roleBtn} ${activeRole === role ? styles.roleBtnActive : ""}`}
                        onClick={() => setActiveRole(activeRole === role ? "All" : role)}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      {/* ══════ MODALS ══════ */}
      <CreateUserModal
        open={modal === "create"}
        onClose={closeModal}
        onSave={handleCreate}
      />
      <ViewUserModal
        open={modal === "view"}
        onClose={closeModal}
        user={selectedUser}
      />
      <EditUserModal
        open={modal === "edit"}
        onClose={closeModal}
        user={selectedUser}
        onSave={handleUpdate}
      />
      <DeleteUserModal
        open={modal === "delete"}
        onClose={closeModal}
        user={selectedUser}
        onConfirm={handleDelete}
      />
      <ViewAllModal
        open={modal === "viewAll"}
        onClose={closeModal}
        users={users}
        onView={openView}
        onEdit={openEdit}
        onDelete={openDelete}
        defaultAction={viewAllAction}
      />
    </>
  );
}