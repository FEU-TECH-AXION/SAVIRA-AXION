"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/navbar/navbar";
import styles from "./UserManagement.module.css";
import { FiSearch, FiX, FiAlertTriangle } from "react-icons/fi";
import { fetchUsers } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const ROLES = [
  "All",
  "Admin",
  "Case Officer",
  "Legal",
  "Member",
  "Complainants",
  "Volunteers",
];

const ROLE_OPTIONS = ROLES.filter((r) => r !== "All");
const PAGE_SIZE = 8;

// ── Helpers ───────────────────────────────────────────────────────────────────
function today() {
  return new Date().toLocaleDateString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
  });
}

function nextId(users) {
  return users.length ? Math.max(...users.map((u) => u.user_id || 0)) + 1 : 1;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleDateString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
  });
}

function normalizeUser(raw) {
  const name = [raw.first_name, raw.middle_name, raw.last_name]
    .filter(Boolean).join(" ") || raw.email || "Unnamed";

  const role = raw.roles?.role_name || raw.role_name || raw.role || "Unknown";

  // Status driven by is_active column
  const status = raw.is_active === false ? "Inactive" : "Active";

  const dateCreated = formatDate(raw.created_at || raw.date_created);

  return {
    ...raw,
    user_id:        raw.user_id,
    name,
    role,
    status,
    dateCreated,
    email:          raw.email          ?? "—",
    phone:          raw.contact_number ?? raw.phone ?? "—",
    first_name:     raw.first_name     ?? "",
    middle_name:    raw.middle_name    ?? "",
    last_name:      raw.last_name      ?? "",
    extension_name: raw.extension_name ?? "",
    user_name:      raw.user_name      ?? "",
    contact_number: raw.contact_number ?? "",
    profile_img:    raw.profile_img    ?? "",
    role_id:        raw.role_id        ?? null,
    is_active:      raw.is_active      ?? true,
  };
}

// ── Status Badge ──────────────────────────────────────────────────────────────
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
      >←</button>
      {pages.map((p) => (
        <button
          key={p}
          className={`${styles.pageBtn} ${p === current ? styles.pageBtnActive : ""}`}
          onClick={() => onChange(p)}
        >{p}</button>
      ))}
      <button
        className={styles.pageArrow}
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        aria-label="Next page"
      >→</button>
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
        <button className={styles.viewBtn} onClick={onView}>View &rarr;</button>
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
    if (!form.role) e.role = "Role is required.";
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
  const EMPTY_FORM = {
    first_name: "", middle_name: "", last_name: "", extension_name: "",
    user_name: "", password: "", contact_number: "", profile_img: "",
    role_id: "", role: "", status: "Active",
  };

  const [form, setForm]               = useState(EMPTY_FORM);
  const [errors, setErrors]           = useState({});
  const [preview, setPreview]         = useState(null);
  const [roleOptions, setRoleOptions] = useState([]);

  useEffect(() => {
    async function loadRoles() {
      const { data, error } = await supabase.from("roles").select("id, role_name");
      if (!error && data) setRoleOptions(data);
    }
    loadRoles();
  }, []);

  useEffect(() => {
    if (user) {
      setForm({
        first_name:     user.first_name     ?? "",
        middle_name:    user.middle_name    ?? "",
        last_name:      user.last_name      ?? "",
        extension_name: user.extension_name ?? "",
        user_name:      user.user_name      ?? "",
        password:       "",
        contact_number: user.contact_number ?? "",
        profile_img:    user.profile_img    ?? "",
        role_id:        user.role_id        ?? "",
        role:           user.role           ?? "",
        status:         user.status         ?? "Active",
      });
      setPreview(user.profile_img || null);
      setErrors({});
    }
  }, [user]);

  function validate() {
    const e = {};
    if (!form.first_name.trim()) e.first_name = "First name is required.";
    if (!form.last_name.trim())  e.last_name  = "Last name is required.";
    if (!form.user_name.trim())  e.user_name  = "Username is required.";
    if (form.password && form.password.length < 6)
      e.password = "Password must be at least 6 characters.";
    if (!form.role_id) e.role_id = "Role is required.";
    return e;
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setForm((prev) => ({ ...prev, _imageFile: file }));
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const updatedName = [form.first_name, form.middle_name, form.last_name, form.extension_name]
      .filter(Boolean).join(" ");

    const matchedRole = roleOptions.find((r) => String(r.id) === String(form.role_id));

    onSave({
      ...user,
      ...form,
      name: updatedName,
      role: matchedRole?.role_name ?? user.role,
    });

    setErrors({});
    onClose();
  }

  function handleClose() {
    setErrors({});
    onClose();
  }

  if (!user) return null;

  const field = (key, label, type = "text", required = false, placeholder = "") => (
    <div className={styles.formGroup}>
      <label className={styles.formLabel}>{label}{required ? " *" : ""}</label>
      <input
        className={`${styles.formInput} ${errors[key] ? styles.inputError : ""}`}
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
      />
      {errors[key] && <span className={styles.errorMsg}>{errors[key]}</span>}
    </div>
  );

  return (
    <Modal open={open} onClose={handleClose} title="Update User Information">
      <div className={styles.formGrid}>
        <div className={styles.formGroup} style={{ gridColumn: "1 / -1", textAlign: "center" }}>
          <label className={styles.formLabel}>Profile Image</label>
          {preview && (
            <img
              src={preview}
              alt="Profile preview"
              style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", display: "block", margin: "0 auto 8px" }}
            />
          )}
          <input type="file" accept="image/*" className={styles.formInput} onChange={handleImageChange} />
        </div>
        {field("first_name",     "First Name",     "text",     true,  "e.g. Juan")}
        {field("middle_name",    "Middle Name",    "text",     false, "e.g. Santos")}
        {field("last_name",      "Last Name",      "text",     true,  "e.g. dela Cruz")}
        {field("extension_name", "Extension Name", "text",     false, "e.g. Jr., Sr., III")}
        {field("user_name",      "Username",       "text",     true,  "e.g. juandc")}
        {field("password",       "New Password",   "password", false, "Leave blank to keep current")}
        {field("contact_number", "Contact Number", "tel",      false, "e.g. 09171234567")}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Role *</label>
          <select
            className={`${styles.formInput} ${errors.role_id ? styles.inputError : ""}`}
            value={form.role_id}
            onChange={(e) => setForm((prev) => ({ ...prev, role_id: e.target.value }))}
          >
            <option value="">Select a role…</option>
            {roleOptions.map((r) => (
              <option key={r.id} value={r.id}>{r.role_name}</option>
            ))}
          </select>
          {errors.role_id && <span className={styles.errorMsg}>{errors.role_id}</span>}
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
                  onChange={() => setForm((prev) => ({ ...prev, status: s }))}
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
// DELETE / DEACTIVATE MODAL
// Two options: Deactivate (soft) | Hard Delete (permanent)
// If already inactive: shows Reactivate instead of Deactivate
// ══════════════════════════════════════════════════════════════════
function DeleteUserModal({ open, onClose, user, onDeactivate, onReactivate, onHardDelete }) {
  const [confirmHard, setConfirmHard] = useState(false);

  function handleClose() {
    setConfirmHard(false);
    onClose();
  }

  if (!user) return null;

  const isInactive = user.status === "Inactive";

  // ── Hard delete confirmation screen ──────────────────────────
  if (confirmHard) {
    return (
      <Modal open={open} onClose={handleClose} title="Permanently Delete User">
        <div className={styles.deleteBody}>
          <div className={styles.deleteIcon}><FiAlertTriangle /></div>
          <p className={styles.deleteMsg}>
            You are about to <strong>permanently delete</strong> <strong>{user.name}</strong>.
            This action <strong>cannot be undone</strong> and all data will be lost forever.
          </p>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={() => setConfirmHard(false)}>
            Go Back
          </button>
          <button
            className={styles.btnDanger}
            onClick={() => { onHardDelete(user.user_id); handleClose(); }}
          >
            Yes, Permanently Delete
          </button>
        </div>
      </Modal>
    );
  }

  // ── Default screen ────────────────────────────────────────────
  return (
    <Modal open={open} onClose={handleClose} title="Manage User">
      <div className={styles.deleteBody}>
        <div className={styles.deleteIcon}><FiAlertTriangle /></div>
        <p className={styles.deleteMsg}>
          What would you like to do with <strong>{user.name}</strong>?
        </p>
      </div>

      {/* Soft option */}
      <div className={styles.deleteOption}>
        <div>
          <strong>{isInactive ? "Reactivate User" : "Deactivate User"}</strong>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-muted, #666)" }}>
            {isInactive
              ? "Restore this user's access. They will be able to log in again."
              : "Disable this user's access. Their data is kept and this can be undone."}
          </p>
        </div>
        <button
          className={isInactive ? styles.btnPrimary : styles.btnSecondary}
          onClick={() => {
            isInactive ? onReactivate(user.user_id) : onDeactivate(user.user_id);
            handleClose();
          }}
        >
          {isInactive ? "Reactivate" : "Deactivate"}
        </button>
      </div>

      {/* Hard delete option */}
      <div className={styles.deleteOption}>
        <div>
          <strong>Permanently Delete</strong>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-muted, #666)" }}>
            Remove this user forever. This cannot be undone.
          </p>
        </div>
        <button className={styles.btnDanger} onClick={() => setConfirmHard(true)}>
          Delete
        </button>
      </div>

      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={handleClose}>Cancel</button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// VIEW ALL USERS MODAL
// ══════════════════════════════════════════════════════════════════
function ViewAllModal({ open, onClose, users, onEdit, onDelete, onView, defaultAction }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return users;
    return users.filter(
      (u) =>
        (u.name ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (u.role ?? "").toLowerCase().includes(q.toLowerCase())
    );
  }, [users, q]);

  const modalTitle =
    defaultAction === "delete" ? "Select a User to Manage"
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
              <th>Name</th><th>Role</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className={styles.emptyState}>No users found.</td></tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.user_id}>
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
                        <button className={styles.tblBtnDelete} onClick={() => { onDelete(u); onClose(); }}>Manage</button>
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

  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState("");
  const [activeRole, setActiveRole] = useState("All");
  const [page, setPage]           = useState(1);

  const [modal, setModal]                 = useState(null);
  const [selectedUser, setSelectedUser]   = useState(null);
  const [viewAllAction, setViewAllAction] = useState(null);
  const [toast, setToast]                 = useState(null);

  // ── Fetch users ───────────────────────────────────────────────
  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchUsers();
        setUsers(Array.isArray(data) ? data.map(normalizeUser) : []);
      } catch (err) {
        setError(err.message || "Unable to load users.");
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Derived stats ─────────────────────────────────────────────
  const stats = useMemo(() => [
    { num: users.filter((u) => u.status === "Active").length,   label: "Active",      hasNew: false },
    { num: users.filter((u) => u.status === "Inactive").length, label: "Deactivated", hasNew: false },
    { num: users.length,                                         label: "Total Users", hasNew: false },
  ], [users]);

  // ── Create ────────────────────────────────────────────────────
  function handleCreate(data) {
    setUsers((prev) => [{ user_id: nextId(prev), ...data }, ...prev]);
    showToast(`User "${data.name}" created successfully.`);
  }

  // ── Update ────────────────────────────────────────────────────
  async function handleUpdate(updated) {
    const payload = {
      first_name:     updated.first_name,
      middle_name:    updated.middle_name,
      last_name:      updated.last_name,
      extension_name: updated.extension_name,
      user_name:      updated.user_name,
      contact_number: updated.contact_number,
      role_id:        updated.role_id,
      is_active:      updated.status === "Active",
    };

    if (updated.password) payload.password = updated.password;

    if (updated._imageFile) {
      const file = updated._imageFile;
      const path = `profiles/${updated.user_id}-${Date.now()}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars").upload(path, file, { upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        payload.profile_img = urlData.publicUrl;
      }
    }

    const { data, error } = await supabase
      .from("users")
      .update(payload)
      .eq("user_id", updated.user_id)
      .select();

    if (error) { showToast(`Error: ${error.message}`, "danger"); return; }
    if (!data || data.length === 0) {
      showToast(`No rows updated. ID used: ${updated.user_id}`, "danger");
      return;
    }

    setUsers((prev) =>
      prev.map((u) => (u.user_id === updated.user_id ? { ...u, ...updated, ...payload } : u))
    );
    showToast(`User "${updated.name}" updated successfully.`);
  }

  // ── Soft delete: deactivate ───────────────────────────────────
  async function handleDeactivate(user_id) {
    const { error } = await supabase
      .from("users")
      .update({ is_active: false, deactivated_at: new Date().toISOString() })
      .eq("user_id", user_id);

    if (error) { showToast(`Error: ${error.message}`, "danger"); return; }

    const name = users.find((u) => u.user_id === user_id)?.name;
    setUsers((prev) =>
      prev.map((u) =>
        u.user_id === user_id
          ? { ...u, is_active: false, status: "Inactive", deactivated_at: new Date().toISOString() }
          : u
      )
    );
    showToast(`"${name}" has been deactivated.`);
  }

  // ── Reactivate ────────────────────────────────────────────────
  async function handleReactivate(user_id) {
    const { error } = await supabase
      .from("users")
      .update({ is_active: true, deactivated_at: null })
      .eq("user_id", user_id);

    if (error) { showToast(`Error: ${error.message}`, "danger"); return; }

    const name = users.find((u) => u.user_id === user_id)?.name;
    setUsers((prev) =>
      prev.map((u) =>
        u.user_id === user_id
          ? { ...u, is_active: true, status: "Active", deactivated_at: null }
          : u
      )
    );
    showToast(`"${name}" has been reactivated.`);
  }

  // ── Hard delete ───────────────────────────────────────────────
  async function handleHardDelete(user_id) {
    const name = users.find((u) => u.user_id === user_id)?.name;

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("user_id", user_id);

    if (error) { showToast(`Error: ${error.message}`, "danger"); return; }

    setUsers((prev) => prev.filter((u) => u.user_id !== user_id));
    showToast(`"${name}" permanently deleted.`, "danger");
  }

  // ── Filter + search ───────────────────────────────────────────
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchRole   = activeRole === "All" || u.role === activeRole;
      const matchSearch =
        (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (u.role ?? "").toLowerCase().includes(search.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [users, activeRole, search]);

  useEffect(() => { setPage(1); }, [search, activeRole]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Modal helpers ─────────────────────────────────────────────
  function openView(u)   { setSelectedUser(u); setModal("view"); }
  function openEdit(u)   { setSelectedUser(u); setModal("edit"); }
  function openDelete(u) { setSelectedUser(u); setModal("delete"); }
  function closeModal()  { setModal(null); setViewAllAction(null); }
  function openViewAll(action = null) { setViewAllAction(action); setModal("viewAll"); }

  return (
    <>
      <Navbar user={user} />

      {toast && (
        <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}>
          {toast.msg}
        </div>
      )}

      <main className={styles.pageWrapper}>
        {/* Hero Banner */}
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

        {/* Action Cards */}
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
                title="Manage User Access"
                description="Deactivate, reactivate, or permanently remove a user."
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

        {/* All Users Table */}
        <section className={styles.allList}>
          <div className="container-xl">
            <div className={styles.sectionHeading}>
              <h2 className={styles.sectionTitle}>All the List of Users</h2>
              <div className={styles.headingLine} />
            </div>
            <div className={styles.layout}>
              <div className={styles.tableWrap}>
                {loading ? (
                  <div className={styles.loadingState}>Loading users…</div>
                ) : error ? (
                  <div className={styles.errorState}>Error loading users: {error}</div>
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
                            <td colSpan={5} className={styles.emptyState}>No users found.</td>
                          </tr>
                        ) : (
                          paginated.map((u) => (
                            <tr key={u.user_id}>
                              <td>{u.name}</td>
                              <td>{u.role}</td>
                              <td><StatusBadge status={u.status} /></td>
                              <td>{u.dateCreated}</td>
                              <td>
                                <div className={styles.actionBtns}>
                                  <button className={styles.tblBtnView} onClick={() => openView(u)}>View</button>
                                  <button className={styles.tblBtnEdit} onClick={() => openEdit(u)}>Edit</button>
                                  <button className={styles.tblBtnDelete} onClick={() => openDelete(u)}>
                                    {u.status === "Inactive" ? "Manage" : "Deactivate"}
                                  </button>
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

      {/* Modals */}
      <CreateUserModal open={modal === "create"} onClose={closeModal} onSave={handleCreate} />
      <ViewUserModal   open={modal === "view"}   onClose={closeModal} user={selectedUser} />
      <EditUserModal   open={modal === "edit"}   onClose={closeModal} user={selectedUser} onSave={handleUpdate} />
      <DeleteUserModal
        open={modal === "delete"}
        onClose={closeModal}
        user={selectedUser}
        onDeactivate={handleDeactivate}
        onReactivate={handleReactivate}
        onHardDelete={handleHardDelete}
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