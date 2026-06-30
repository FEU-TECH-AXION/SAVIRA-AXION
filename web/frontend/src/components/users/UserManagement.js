"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/navbar/navbar";
import styles from "./UserManagement.module.css";
import { FiSearch, FiX, FiAlertTriangle } from "react-icons/fi";
import { fetchUsers, fetchCommittees } from "@/lib/api";
import { authFetch } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import UsersTable from "./UsersTable";
import UserFilterMenu from "./UserFilterMenu";
import { IoIosWarning } from "react-icons/io";

const ROLES = [
  "All",
  "Admin",
  "Case Officer",
  "Legal Personnel",
  "Staff",
  "User",
];

const ROLES_MAP = {
  1: "User",
  2: "Staff",
  3: "Admin",
  4: "Legal Personnel",
  5: "Case Officer",
};

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

  const ROLE_NAME_TO_ID = {
  "User": 1, "Staff": 2, "Admin": 3, "Legal Personnel": 4, "Case Officer": 5,
};

  // Status driven by is_active column
  const status = raw.is_active === false ? "Inactive" : "Active";

  const dateCreated = formatDate(raw.created_at || raw.date_created);
  const staffRow = Array.isArray(raw.staff) ? raw.staff[0] : raw.staff;
  const committeeRow = staffRow?.committees || raw.committee;
  const legalPersonnelRow = Array.isArray(raw.legal_personnel)
    ? raw.legal_personnel[0]
    : raw.legal_personnel;

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
    birthday:       raw.birthday       ?? "",
    gender_identity: raw.gender_identity ?? "",
    city:           raw.city           ?? "",
    province:       raw.province       ?? "",
    role_id: raw.role_id ?? raw.roles?.id ?? ROLE_NAME_TO_ID[role] ?? null,
    is_active:      raw.is_active      ?? true,
    staff_id:       staffRow?.staff_id ?? raw.staff_id ?? null,
    committee_id:   staffRow?.committee_id ?? raw.committee_id ?? committeeRow?.committee_id ?? "",
    committee:      committeeRow?.committee_name ?? raw.committee_name ?? raw.committee ?? "",
    legal_personnel_id: legalPersonnelRow?.legal_personnel_id ?? raw.legal_personnel_id ?? null,
    legal_personnel_type: legalPersonnelRow?.legal_personnel_type ?? raw.legal_personnel_type ?? "",
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
// ── Validation helpers ────────────────────────────────────────────────────────

const PHONE_REGEX = /^(?:\+63|0)9\d{9}$/;



function normalisePhone(raw) {

  let digits = raw.replace(/[^\d]/g, "");

  if (digits.startsWith("63")) digits = digits.slice(2);

  if (digits.startsWith("0")) digits = digits.slice(1);

  digits = digits.slice(0, 10);

  return digits ? `+63${digits}` : "";

}

function CreateUserModal({ open, onClose, onSave, committees }) {

  const EMPTY = {
    first_name:     "",
    last_name:      "",
    email:          "",
    contact_number: "",
    role_id:        "",
    is_active:      true,
    committee_id:   "",
    legal_personnel_type: "",
  };

  const ROLES = [
    { id: 1, name: "User" },
    { id: 2, name: "Staff" },
    { id: 3, name: "Admin" },
    { id: 4, name: "Legal Personnel" },
    { id: 5, name: "Case Officer" },
  ];

  const TEMP_PASSWORD = "Savira@2026";

  const [form, setForm]       = useState(EMPTY);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  function validate() {
    const e = {};
    if (!form.first_name.trim()) e.first_name = "First name is required.";
    if (!form.last_name.trim())  e.last_name  = "Last name is required.";
    if (!form.email.trim())      e.email      = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.role_id)           e.role_id    = "Role is required.";

    const selectedRole = ROLES.find((r) => String(r.id) === String(form.role_id));
    if (selectedRole?.name === "Staff" && !form.committee_id)
      e.committee_id = "Committee is required for Staff role.";
    if (selectedRole?.name === "Legal Personnel" && !form.legal_personnel_type)
      e.legal_personnel_type = "Select whether this user is a lawyer or paralegal.";

    return e;
  }

  function handleClose() {
    setForm(EMPTY);
    setErrors({});
    setApiError(null);
    onClose();
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setApiError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const username = `${form.email.split('@')[0]}${Math.floor(Math.random() * 10000)}`;

      // Step 1: Create the user (no committee_id here)
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          first_name:     form.first_name.trim(),
          last_name:      form.last_name.trim(),
          email:          form.email.trim().toLowerCase(),
          contact_number: form.contact_number.trim() || null,
          role_id:        parseInt(form.role_id),
          is_active:      form.is_active,
          user_name:      username,
          password:       TEMP_PASSWORD,
          committee_id:   form.committee_id || null,
          legal_personnel_type: form.legal_personnel_type || null,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Server error (${response.status})`);
      }

      const newUser = await response.json();

      onSave(newUser);
      handleClose();
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create New User">
      {/* Temp password notice */}
      <div style={{
        background: "#fef9c3",
        border: "1px solid #fde68a",
        borderRadius: 8,
        padding: "10px 14px",
        marginBottom: "1rem",
        fontSize: "0.82rem",
        color: "#92400e",
      }}>
        <IoIosWarning /> Temporary password <strong>{TEMP_PASSWORD}</strong> will be assigned.
        User should change it on first login.
      </div>

      <div className={styles.formGrid}>
        {/* First Name */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>First Name *</label>
          <input
            className={`${styles.formInput} ${errors.first_name ? styles.inputError : ""}`}
            type="text"
            placeholder="e.g. Juan"
            value={form.first_name}
            onChange={(e) => { setForm({ ...form, first_name: e.target.value }); setErrors((p) => { const n = {...p}; delete n.first_name; return n; }); }}
          />
          {errors.first_name && <span className={styles.errorMsg}>{errors.first_name}</span>}
        </div>

        {/* Last Name */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Last Name *</label>
          <input
            className={`${styles.formInput} ${errors.last_name ? styles.inputError : ""}`}
            type="text"
            placeholder="e.g. Dela Cruz"
            value={form.last_name}
            onChange={(e) => { setForm({ ...form, last_name: e.target.value }); setErrors((p) => { const n = {...p}; delete n.last_name; return n; }); }}
          />
          {errors.last_name && <span className={styles.errorMsg}>{errors.last_name}</span>}
        </div>

        {/* Email */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Email Address *</label>
          <input
            className={`${styles.formInput} ${errors.email ? styles.inputError : ""}`}
            type="email"
            placeholder="e.g. juan@sasha.org"
            value={form.email}
            onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors((p) => { const n = {...p}; delete n.email; return n; }); }}
          />
          {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
        </div>

        {/* Contact Number */}
<div className={styles.formGroup}>
  <label className={styles.formLabel}>Contact Number</label>
  <input
    className={`${styles.formInput} ${errors.contact_number ? styles.inputError : ""}`}
    type="tel"
    placeholder="e.g. 09171234567"
    value={form.contact_number}
    onChange={(e) => {
      // 1. Get raw input value
      const rawValue = e.target.value;
      
      // 2. Normalise the text format dynamically (or you can do this onBlur)
      const normalised = normalisePhone(rawValue);
      
      // 3. Update form state
      setForm({ ...form, contact_number: normalised || rawValue });
      
      // 4. Clear the error once they resume typing
      setErrors((p) => { 
        const n = {...p}; 
        delete n.contact_number; 
        return n; 
      });
    }}
    onBlur={(e) => {
      // Final normalization cleanup when user clicks away
      const finalVal = normalisePhone(e.target.value);
      setForm({ ...form, contact_number: finalVal });
    }}
  />
  {errors.contact_number && <span className={styles.errorMsg}>{errors.contact_number}</span>}
</div>

        {/* Role */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Role *</label>
          <select
            className={`${styles.formInput} ${errors.role_id ? styles.inputError : ""}`}
            value={form.role_id}
            onChange={(e) => {
              setForm({ ...form, role_id: e.target.value, committee_id: "", legal_personnel_type: "" });
              setErrors((p) => {
                const n = {...p};
                delete n.role_id;
                delete n.committee_id;
                delete n.legal_personnel_type;
                return n;
              });
            }}
          >
            <option value="">— Select Role —</option>
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          {errors.role_id && <span className={styles.errorMsg}>{errors.role_id}</span>}
        </div>

        {/* Committee — only shown when Staff is selected */}
        {ROLES.find((r) => String(r.id) === String(form.role_id))?.name === "Staff" && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Committee *</label>
            <select
              className={`${styles.formInput} ${errors.committee_id ? styles.inputError : ""}`}
              value={form.committee_id}
              onChange={(e) => {
                setForm({ ...form, committee_id: e.target.value });
                setErrors((p) => { const n = {...p}; delete n.committee_id; return n; });
              }}
            >
              <option value="">— Select Committee —</option>
              {committees.map((c) => (
                <option key={c.committee_id} value={c.committee_id}>{c.committee_name}</option>
              ))}
            </select>
            {errors.committee_id && <span className={styles.errorMsg}>{errors.committee_id}</span>}
          </div>
        )}

        {ROLES.find((r) => String(r.id) === String(form.role_id))?.name === "Legal Personnel" && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Legal Personnel Type *</label>
            <select
              className={`${styles.formInput} ${errors.legal_personnel_type ? styles.inputError : ""}`}
              value={form.legal_personnel_type}
              onChange={(e) => {
                setForm({ ...form, legal_personnel_type: e.target.value });
                setErrors((p) => { const n = {...p}; delete n.legal_personnel_type; return n; });
              }}
            >
              <option value="">— Select Type —</option>
              <option value="Lawyer">Lawyer</option>
              <option value="Paralegal">Paralegal</option>
            </select>
            {errors.legal_personnel_type && <span className={styles.errorMsg}>{errors.legal_personnel_type}</span>}
          </div>
        )}

        {/* Status */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Status</label>
          <div className={styles.radioGroup}>
            {["Active", "Inactive"].map((s) => (
              <label key={s} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="create-status"
                  checked={form.is_active === (s === "Active")}
                  onChange={() => setForm({ ...form, is_active: s === "Active" })}
                  className={styles.radioInput}
                />
                {s}
              </label>
            ))}
          </div>
        </div>
      </div>

      {apiError && (
        <div style={{
          background: "#fee2e2",
          border: "1px solid #fca5a5",
          borderRadius: 8,
          padding: "10px 14px",
          marginTop: "1rem",
          fontSize: "0.82rem",
          color: "#991b1b",
        }}>
          <strong>Error:</strong> {apiError}
        </div>
      )}

      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={handleClose}>Cancel</button>
        <button
          className={styles.btnPrimary}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Creating..." : "Create User"}
        </button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// VIEW USER MODAL
// ══════════════════════════════════════════════════════════════════
function ViewUserModal({ open, onClose, user }) {
  if (!user) return null;
  const displayValue = (value, fallback = "Not provided") =>
    value === null || value === undefined || String(value).trim() === "" || String(value).trim() === "—"
      ? fallback
      : value;

  return (
    <Modal open={open} onClose={onClose} title="User Details">
      <div className={styles.viewGrid}>
        <div className={styles.viewRow}>
          <span className={styles.viewKey}>Full Name</span>
          <span className={styles.viewVal}>{displayValue(user.name, "Unnamed user")}</span>
        </div>
        <div className={styles.viewRow}>
          <span className={styles.viewKey}>Email</span>
          <span className={styles.viewVal}>{displayValue(user.email, "No email provided")}</span>
        </div>
        <div className={styles.viewRow}>
          <span className={styles.viewKey}>Phone</span>
          <span className={styles.viewVal}>{displayValue(user.phone, "No phone number provided")}</span>
        </div>
        <div className={styles.viewRow}>
          <span className={styles.viewKey}>Username</span>
          <span className={styles.viewVal}>{displayValue(user.user_name, "No username provided")}</span>
        </div>
        <div className={styles.viewRow}>
          <span className={styles.viewKey}>Birthday</span>
          <span className={styles.viewVal}>{user.birthday ? formatDate(user.birthday) : "No birthday provided"}</span>
        </div>
        <div className={styles.viewRow}>
          <span className={styles.viewKey}>Gender Identity</span>
          <span className={styles.viewVal}>{displayValue(user.gender_identity, "No gender identity provided")}</span>
        </div>
        <div className={styles.viewRow}>
          <span className={styles.viewKey}>City</span>
          <span className={styles.viewVal}>{displayValue(user.city, "No city provided")}</span>
        </div>
        <div className={styles.viewRow}>
          <span className={styles.viewKey}>Province</span>
          <span className={styles.viewVal}>{displayValue(user.province, "No province provided")}</span>
        </div>
        <div className={styles.viewRow}>
          <span className={styles.viewKey}>Role</span>
          <span className={styles.viewVal}>{displayValue(user.role, "No role assigned")}</span>
        </div>
        {user.role === "Legal Personnel" && (
          <div className={styles.viewRow}>
            <span className={styles.viewKey}>Legal Personnel Type</span>
            <span className={styles.viewVal}>{user.legal_personnel_type || "Not classified"}</span>
          </div>
        )}
        <div className={styles.viewRow}>
          <span className={styles.viewKey}>Status</span>
          <span className={styles.viewVal}><StatusBadge status={user.status} /></span>
        </div>
        <div className={styles.viewRow}>
          <span className={styles.viewKey}>Date Created</span>
          <span className={styles.viewVal}>{displayValue(user.dateCreated, "No creation date available")}</span>
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
// const COMMITTEES = [
//   "Ways and Means",
//   "Membership",
//   "Publication",
//   "Education and Research",
// ];

// Pre-seeded from ROLES_MAP so the dropdown is never empty while Supabase loads
const LOCAL_ROLE_OPTIONS = Object.entries(ROLES_MAP).map(([id, name]) => ({
  role_id: Number(id),
  role_name: name,
}));

function EditUserModal({ open, onClose, user, onSave, committees }) {
  const EMPTY_FORM = {
    first_name: "", middle_name: "", last_name: "", extension_name: "",
    user_name: "", password: "", contact_number: "", profile_img: "",
    role_id: "", role: "", status: "Active", committee_id: "", legal_personnel_type: "",
  };

  const [form, setForm]               = useState(EMPTY_FORM);
  const [errors, setErrors]           = useState({});
  const [preview, setPreview]         = useState(null);
  const [roleOptions, setRoleOptions] = useState(LOCAL_ROLE_OPTIONS);

  useEffect(() => {
    async function loadRoles() {
      const { data, error } = await supabase
        .from("roles")
        .select("role_id, role_name");

      if (!error && data && data.length > 0) {
        setRoleOptions(data);
      }
    }

    loadRoles();
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const timer = window.setTimeout(() => {
      setForm({
        first_name:     user.first_name     ?? "",
        middle_name:    user.middle_name    ?? "",
        last_name:      user.last_name      ?? "",
        extension_name: user.extension_name ?? "",
        user_name:      user.user_name      ?? "",
        password:       "",
        contact_number: user.contact_number ?? "",
        profile_img:    user.profile_img    ?? "",
        role_id:        user.role_id != null ? String(user.role_id) : "",
        role:           user.role           ?? "",
        status:         user.status         ?? "Active",
        committee_id:   user.committee_id   ?? user.committee ?? "",
        legal_personnel_type: ["Lawyer", "Paralegal"].includes(user.legal_personnel_type)
          ? user.legal_personnel_type
          : "",
      });
      setPreview(user.profile_img || null);
      setErrors({});
    }, 0);

    return () => window.clearTimeout(timer);
  }, [user]);

  function validate() {
    const e = {};
    if (!form.first_name.trim()) e.first_name = "First name is required.";
    if (!form.last_name.trim())  e.last_name  = "Last name is required.";
    if (!form.user_name.trim())  e.user_name  = "Username is required.";
    if (form.password && form.password.length < 6)
      e.password = "Password must be at least 6 characters.";
    if (!form.role_id) e.role_id = "Role is required.";
    const matchedRole = roleOptions.find((r) => String(r.role_id) === String(form.role_id));
    if (matchedRole?.role_name === "Staff" && !form.committee_id)
      e.committee_id = "Committee is required for Staff role.";
    if (matchedRole?.role_name === "Legal Personnel" && !form.legal_personnel_type)
      e.legal_personnel_type = "Select whether this user is a lawyer or paralegal.";
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

    const matchedRole = roleOptions.find((r) => String(r.role_id) === String(form.role_id));

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
            onChange={(e) => setForm((prev) => ({
              ...prev,
              role_id: e.target.value,
              committee_id: "",
              legal_personnel_type: "",
            }))}
          >
            <option value="">Select a role</option>
            {roleOptions.map((r) => (
              <option key={r.role_id} value={String(r.role_id)}>{r.role_name}</option>
            ))}
          </select>
          {errors.role_id && <span className={styles.errorMsg}>{errors.role_id}</span>}
        </div>
        {/* Committee — required only when role is Staff */}
        {roleOptions.find((r) => String(r.role_id) === String(form.role_id))?.role_name === "Staff" && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Committee *</label>
            <select
              className={`${styles.formInput} ${errors.committee_id ? styles.inputError : ""}`}
              value={form.committee_id}
              onChange={(e) => setForm((prev) => ({ ...prev, committee_id: e.target.value }))}
            >
              <option value="">Select a committee</option>
              {committees.map((c) => (
                <option key={c.committee_id} value={c.committee_id}>{c.committee_name}</option>
              ))}
            </select>
            {errors.committee_id && <span className={styles.errorMsg}>{errors.committee_id}</span>}
          </div>
        )}
        {roleOptions.find((r) => String(r.role_id) === String(form.role_id))?.role_name === "Legal Personnel" && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Legal Personnel Type *</label>
            <select
              className={`${styles.formInput} ${errors.legal_personnel_type ? styles.inputError : ""}`}
              value={form.legal_personnel_type}
              onChange={(e) => setForm((prev) => ({ ...prev, legal_personnel_type: e.target.value }))}
            >
              <option value="">Select a type</option>
              <option value="Lawyer">Lawyer</option>
              <option value="Paralegal">Paralegal</option>
            </select>
            {errors.legal_personnel_type && <span className={styles.errorMsg}>{errors.legal_personnel_type}</span>}
          </div>
        )}
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
      <div className={styles.manageUserBody}>
        <div className={styles.deleteIcon}><FiAlertTriangle /></div>
        <div className={styles.manageUserIntro}>
          <p>Choose how to manage</p>
          <strong>{user.name || "this user"}</strong>
        </div>

        <div className={styles.manageOptions}>
          <section className={styles.manageOptionCard}>
            <div>
              <h3>{isInactive ? "Reactivate User" : "Deactivate User"}</h3>
              <p>
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
          </section>

          <section className={`${styles.manageOptionCard} ${styles.manageOptionDanger}`}>
            <div>
              <h3>Permanently Delete</h3>
              <p>Remove this user forever. This cannot be undone.</p>
            </div>
            <button className={styles.btnDanger} onClick={() => setConfirmHard(true)}>
              Delete
            </button>
          </section>
        </div>
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
                        <button className={styles.tblBtnView} onClick={() => onView(u)}>View</button>
                      )}
                      {(!defaultAction || defaultAction === "edit") && (
                        <button className={styles.tblBtnEdit} onClick={() => onEdit(u)}>Edit</button>
                      )}
                      {(!defaultAction || defaultAction === "delete") && (
                        <button className={styles.tblBtnDelete} onClick={() => onDelete(u)}>Manage</button>
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
  const [committees, setCommittees] = useState([]);

  // ── Fetch committees ──────────────────────────────────────────
  useEffect(() => {
    async function loadCommittees() {
      try {
        const data = await fetchCommittees();
        setCommittees(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load committees:", err);
      }
    }
    loadCommittees();
  }, []);

  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const [advancedFilters, setAdvancedFilters] = useState({});
  const [sortField, setSortField] = useState("dateCreated");
  const [sortDir, setSortDir]     = useState("desc");

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
  async function handleCreate(newUser) {
    // newUser comes directly from the API response
    const normalized = normalizeUser({
      ...newUser,
      roles: { role_name: ROLES_MAP[newUser.role_id] || "Unknown" }
    });
    setUsers((prev) => [normalized, ...prev]);
    showToast(`User "${normalized.name}" created successfully.`);
  }

  // ── Update ────────────────────────────────────────────────────
  async function handleUpdate(updated) {
    const roleId = updated.role_id ? parseInt(updated.role_id) : null;
    const roleName = ROLES_MAP[roleId] || updated.role;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
    const payload = {
      first_name:     updated.first_name,
      middle_name:    updated.middle_name,
      last_name:      updated.last_name,
      extension_name: updated.extension_name,
      user_name:      updated.user_name,
      contact_number: updated.contact_number,
      role_id:        roleId,
      is_active:      updated.status === "Active",
      committee_id:   roleName === "Staff" ? updated.committee_id || null : null,
      legal_personnel_type: roleName === "Legal Personnel" ? updated.legal_personnel_type : null,
    };

    if (updated.password) payload.password = updated.password;

    if (updated._imageFile) {
      const avatarForm = new FormData();
      avatarForm.append("profile_img", updated._imageFile);

      const avatarResponse = await authFetch(`${API_URL}/api/users/${updated.user_id}/avatar?bypass_avatar_cooldown=1`, {
        method: "POST",
        body: avatarForm,
      });
      const avatarBody = await avatarResponse.json().catch(() => ({}));
      if (!avatarResponse.ok) {
        showToast(`Error: ${avatarBody.error || `Avatar upload failed (${avatarResponse.status})`}`, "danger");
        return;
      }

      payload.profile_img = avatarBody.profile_img;
    }

    const response = await authFetch(`${API_URL}/api/users/${updated.user_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      showToast(`Error: ${body.error || `Server error (${response.status})`}`, "danger");
      return;
    }

    const committee = roleName === "Staff"
      ? committees.find((c) => String(c.committee_id) === String(updated.committee_id))
      : null;

    setUsers((prev) =>
      prev.map((u) => (u.user_id === updated.user_id ? {
        ...u,
        ...payload,
        ...body,
        name: updated.name,
        status: updated.status,
        role: roleName,
        staff: body.staff || null,
        legal_personnel: body.legal_personnel || null,
        legal_personnel_type: body.legal_personnel?.legal_personnel_type || "",
        committee_id: roleName === "Staff" ? body.staff?.committee_id || updated.committee_id : "",
        committee: roleName === "Staff" ? body.staff?.committees?.committee_name || committee?.committee_name || "" : "",
      } : u))
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
      // Search
      const matchSearch =
        !search.trim() ||
        (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        String(u.user_id ?? "").includes(search) ||
        (u.role ?? "").toLowerCase().includes(search.toLowerCase());

      // Role filter
      const matchRole = !advancedFilters.role || advancedFilters.role === "All" || u.role === advancedFilters.role;

      // Status filter
      const matchStatus = !advancedFilters.status || advancedFilters.status === "All" || u.status === advancedFilters.status;

      // Date Created filter
      const matchDate = (() => {
        const f = advancedFilters.dateCreated;
        if (!f || f === "" || f === "All") return true;
        const raw = u.created_at || u.date_created;
        if (!raw) return false;
        const d = new Date(raw);
        const now = new Date();
        if (f === "today") {
          return d.toDateString() === now.toDateString();
        } else if (f === "thisWeek") {
          const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
          return d >= start;
        } else if (f === "thisMonth") {
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        } else if (f === "thisYear") {
          return d.getFullYear() === now.getFullYear();
        } else if (f === "last30Days") {
          const start = new Date(now); start.setDate(now.getDate() - 30);
          return d >= start;
        } else if (f.startsWith("custom|")) {
          const [, s, e] = f.split("|");
          return d >= new Date(s + "T00:00:00") && d <= new Date(e + "T23:59:59");
        }
        return true;
      })();

      // Committee filter (only applicable when role = Staff)
      const matchCommittee = (() => {
        const f = advancedFilters.committee;
        if (!f || f === "All") return true;
        if (u.role !== "Staff") return false;
        return (u.committee ?? u.committee_name ?? "") === f;
      })();

      // City filter
      const matchCity = !advancedFilters.city || advancedFilters.city === "All" ||
        (u.city ?? "").toLowerCase().includes(advancedFilters.city.toLowerCase());

      // Verification Status filter
      const matchVerification = !advancedFilters.verificationStatus || advancedFilters.verificationStatus === "All" ||
        (u.verification_status ?? u.verificationStatus ?? "Unverified") === advancedFilters.verificationStatus;

      return matchSearch && matchRole && matchStatus && matchDate && matchCommittee && matchCity && matchVerification;
    });
  }, [users, search, advancedFilters]);

  // ── Sort ──────────────────────────────────────────────────────
  const sortedFiltered = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a, b) => {
      let av = a[sortField] ?? "";
      let bv = b[sortField] ?? "";
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(timer);
  }, [search, advancedFilters]);

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / PAGE_SIZE));
  const paginated  = sortedFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
              <div>
                <div className={styles.tableTopBar}>
                  <div className={styles.searchWrap} style={{ flex: 1 }}>
                    <input
                      className={styles.searchInput}
                      type="text"
                      placeholder="Search by User ID, Name, or Role…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <span className={styles.searchIcon}><FiSearch /></span>
                  </div>
                  <UserFilterMenu
                    activeFilters={advancedFilters}
                    onFilterChange={setAdvancedFilters}
                    onDone={() => {}}
                  />
                </div>
                {loading ? (
                  <div className={styles.loadingState}>Loading users…</div>
                ) : error ? (
                  <div className={styles.errorState}>Error loading users: {error}</div>
                ) : (
                  <UsersTable
                    paginated={paginated}
                    page={page}
                    totalPages={totalPages}
                    totalRecords={sortedFiltered.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                    onView={(u) => openView(u)}
                    onEdit={(u) => openEdit(u)}
                    onDeactivate={(u) => openDelete(u)}
                    sortField={sortField}
                    sortDir={sortDir}
                    onSort={(field) => {
                      if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
                      else { setSortField(field); setSortDir("asc"); }
                    }}
                    activeRoleFilter={advancedFilters.role || "All"}
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Modals */}
      <CreateUserModal open={modal === "create"} onClose={closeModal} onSave={handleCreate} committees={committees} />
      <ViewUserModal   open={modal === "view"}   onClose={closeModal} user={selectedUser} />
      <EditUserModal   open={modal === "edit"}   onClose={closeModal} user={selectedUser} onSave={handleUpdate} committees={committees} />
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
