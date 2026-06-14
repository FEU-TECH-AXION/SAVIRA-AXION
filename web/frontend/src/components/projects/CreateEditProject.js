"use client";

/**
 * CreateEditProject.js
 * Full-page form for creating or editing a SASHA project/event.
 * Inspired by the Paraverse "Create Event" page layout.
 *
 * Props:
 *   mode        – "create" | "edit"
 *   initial     – project object (for edit mode)
 *   onSave(data) – callback when form is submitted
 *   onCancel()  – callback to go back
 */

import { useState, useEffect } from "react";
import styles from "./CreateEditProject.module.css";
import { FiArrowLeft, FiUpload, FiPlus, FiTrash2, FiInfo } from "react-icons/fi";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "New Projects",
  "Happening Soon",
  "Youth Leadership Programs",
  "Legal & Policy Education",
  "Awareness Campaign",
  "Community Outreach",
];

const STATUS_OPTIONS = ["Upcoming", "Active", "Completed"];

const ACTIVITY_MODES = ["Face-to-face", "Virtual", "Hybrid"];

const VISIBILITY_OPTIONS = [
  {
    value: "private",
    label: "Private",
    desc: "Only visible to SASHA members and admins.",
    icon: "🔒",
  },
  {
    value: "public",
    label: "Public",
    desc: "Visible on the public Events page after admin approval.",
    icon: "🌐",
  },
];

const EMPTY_FORM = {
  // ── Public-facing fields ──────────────────────────────────────
  title: "",
  tagline: "",
  description: "",
  category: CATEGORIES[0],
  image: null,
  imagePreview: null,

  // ── Dates & time ──────────────────────────────────────────────
  dateStart: "",
  dateEnd: "",
  startTime: "",
  endTime: "",

  // ── Location ──────────────────────────────────────────────────
  activityMode: "Face-to-face",
  venue: "",
  onlinePlatform: "",
  onlineLink: "",

  // ── Participants & partners ───────────────────────────────────
  targetParticipants: "",
  partnerOrganizations: "",

  // ── SASHA internal tracking fields ───────────────────────────
  status: "Upcoming",
  dueDate: "",

  logisticalRequirements: "",
  financialRequirements: "",
  operationalRequirements: "",

  projectOfficers: [""],
  projectCommitteeMembers: [""],

  // ── Visibility / publication ──────────────────────────────────
  visibility: "private",      // "private" | "public"
  approvalStatus: "pending",  // "pending" | "approved" | "rejected"
};

function normalizeInitial(init) {
  if (!init) return {};
  const out = { ...init };
  for (const key of Object.keys(EMPTY_FORM)) {
    const def = EMPTY_FORM[key];
    let val = out[key];
    if (val === null || val === undefined) {
      out[key] = def;
      continue;
    }
    if (Array.isArray(def)) {
      if (!Array.isArray(val)) {
        out[key] = def.slice();
      } else {
        out[key] = val.map((x) => (x === null || x === undefined ? "" : x));
        if (out[key].length === 0) out[key] = def.slice();
      }
    } else if (typeof def === "string") {
      out[key] = val === null || val === undefined ? def : String(val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children }) {
  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardHeader}>
        <h2 className={styles.sectionCardTitle}>{title}</h2>
        {subtitle && <p className={styles.sectionCardSub}>{subtitle}</p>}
      </div>
      <div className={styles.sectionCardBody}>{children}</div>
    </div>
  );
}

function FormGroup({ label, required, hint, error, children }) {
  return (
    <div className={styles.formGroup}>
      <label className={styles.formLabel}>
        {label}
        {required && <span className={styles.requiredStar}>*</span>}
      </label>
      {children}
      {hint && <p className={styles.formHint}>{hint}</p>}
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  );
}

function PeopleList({ label, hint, values, onChange, placeholder }) {
  function update(index, val) {
    const next = [...values];
    next[index] = val;
    onChange(next);
  }
  function add() { onChange([...values, ""]); }
  function remove(index) { onChange(values.filter((_, i) => i !== index)); }

  return (
    <div className={styles.peopleList}>
      <label className={styles.formLabel}>{label}</label>
      {hint && <p className={styles.formHint}>{hint}</p>}
      {values.map((v, i) => (
        <div key={i} className={styles.peopleRow}>
          <input
            className={styles.formInput}
            type="text"
            placeholder={placeholder || "Full name"}
            value={v ?? ""}
            onChange={(e) => update(i, e.target.value)}
          />
          {values.length > 1 && (
            <button type="button" className={styles.removeBtn} onClick={() => remove(i)}>
              <FiTrash2 size={15} />
            </button>
          )}
        </div>
      ))}
      <button type="button" className={styles.addPersonBtn} onClick={add}>
        <FiPlus size={14} /> Add another
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CreateEditProject({ mode = "create", initial = null, onSave, onCancel }) {
  const [form, setForm] = useState(() => {
    return mode === "edit" && initial ? { ...EMPTY_FORM, ...normalizeInitial(initial) } : EMPTY_FORM;
  });
  const [errors, setErrors] = useState({});

  // Sync if initial prop changes (e.g. navigating between projects)
  useEffect(() => {
    if (mode === "edit" && initial) setForm({ ...EMPTY_FORM, ...normalizeInitial(initial) });
  }, [initial, mode]);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, image: file, imagePreview: url }));
  }

  function validate() {
    const e = {};
    if (!form.title.trim())     e.title = "Project title is required.";
    if (!form.dateStart)        e.dateStart = "Start date is required.";
    if (!form.description.trim()) e.description = "Description is required.";
    if (form.activityMode !== "Virtual" && !form.venue.trim())
      e.venue = "Venue is required for face-to-face / hybrid events.";
    if (form.activityMode !== "Face-to-face" && !form.onlineLink.trim())
      e.onlineLink = "Online link is required for virtual / hybrid events.";
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    onSave({ ...form, id: initial?.id, createdAt: initial?.createdAt || new Date().toISOString() });
  }

  const isPublicRequest = form.visibility === "public";

  return (
    <div className={styles.pageWrapper}>
      {/* ── Header bar ── */}
      <header className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={onCancel}>
          <FiArrowLeft /> Back
        </button>
        <h1 className={styles.pageTitle}>
          {mode === "create" ? "Create a New Project / Event" : "Update Project Information"}
        </h1>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={onCancel}>Discard</button>
          <button className={styles.btnPrimary} onClick={handleSubmit}>
            {mode === "create" ? "Create Project" : "Save Changes"}
          </button>
        </div>
      </header>

      {Object.keys(errors).length > 0 && (
        <div className={styles.errorBanner}>
          <FiInfo /> Please fill in all required fields before submitting.
        </div>
      )}

      {/* ── Two-column layout (left: main, right: sidebar) ── */}
      <div className={styles.layout}>

        {/* ══ LEFT COLUMN ══════════════════════════════════════════════════ */}
        <div className={styles.mainCol}>

          {/* ── Event Image ── */}
          <SectionCard
            title="Event Image"
            subtitle="Upload a banner that gives people a feel for the event."
          >
            <div className={styles.imageUploadArea} onClick={() => document.getElementById("img-input").click()}>
              {form.imagePreview ? (
                <img src={form.imagePreview} alt="Preview" className={styles.imagePreview} />
              ) : (
                <div className={styles.imageUploadPlaceholder}>
                  <FiUpload size={32} />
                  <p>Drop image here or <strong>click to upload</strong></p>
                  <ul>
                    <li>Recommended: 2160 × 1080 px</li>
                    <li>Max file size: 10 MB</li>
                    <li>JPEG or PNG</li>
                  </ul>
                </div>
              )}
              <input id="img-input" type="file" accept="image/jpeg,image/png" style={{ display: "none" }} onChange={handleImageChange} />
            </div>
          </SectionCard>

          {/* ── Event Overview ── */}
          <SectionCard title="Event Overview" subtitle="Public-facing name and summary of the project.">
            <FormGroup label="Project / Event Title" required error={errors.title}
              hint="Be clear and descriptive. This appears on the public Events page.">
              <input className={`${styles.formInput} ${errors.title ? styles.inputError : ""}`}
                type="text" placeholder="e.g. Safe Spaces Summit"
                value={form.title} onChange={(e) => set("title", e.target.value)} />
            </FormGroup>

            <FormGroup label="Event Tagline"
              hint="A short, catchy hook shown below the title on public listings.">
              <input className={styles.formInput} type="text"
                placeholder="e.g. Stand Together. Speak Up."
                value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
            </FormGroup>

            <FormGroup label="Category">
              <select className={styles.formInput} value={form.category}
                onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormGroup>
          </SectionCard>

          {/* ── About this event ── */}
          <SectionCard title="About this Event"
            subtitle="Describe what people can expect if they attend.">
            <FormGroup label="Description" required error={errors.description}>
              <textarea
                className={`${styles.formInput} ${styles.textArea} ${errors.description ? styles.inputError : ""}`}
                rows={6}
                placeholder="Provide full details about the event — its purpose, agenda, audience, and any special activities."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </FormGroup>

            <FormGroup label="Target Participants"
              hint="Who is this event for? e.g. Youth scouts, community members, professionals.">
              <input className={styles.formInput} type="text"
                placeholder="e.g. Youth scouts aged 15–25, school administrators"
                value={form.targetParticipants} onChange={(e) => set("targetParticipants", e.target.value)} />
            </FormGroup>

            <FormGroup label="Partner Organization/s"
              hint="List any co-organizing or partner groups.">
              <input className={styles.formInput} type="text"
                placeholder="e.g. BSP National Council, DSWD, UN Women"
                value={form.partnerOrganizations} onChange={(e) => set("partnerOrganizations", e.target.value)} />
            </FormGroup>
          </SectionCard>

          {/* ── Date & Location ── */}
          <SectionCard title="Date & Location">
            <div className={styles.row2}>
              <FormGroup label="Inclusive Start Date" required error={errors.dateStart}>
                <input className={`${styles.formInput} ${errors.dateStart ? styles.inputError : ""}`}
                  type="date" value={form.dateStart}
                  onChange={(e) => set("dateStart", e.target.value)} />
              </FormGroup>
              <FormGroup label="End Date">
                <input className={styles.formInput} type="date" value={form.dateEnd}
                  onChange={(e) => set("dateEnd", e.target.value)} />
              </FormGroup>
            </div>

            <div className={styles.row2}>
              <FormGroup label="Start Time">
                <input className={styles.formInput} type="time" value={form.startTime}
                  onChange={(e) => set("startTime", e.target.value)} />
              </FormGroup>
              <FormGroup label="End Time">
                <input className={styles.formInput} type="time" value={form.endTime}
                  onChange={(e) => set("endTime", e.target.value)} />
              </FormGroup>
            </div>

            {/* Activity mode tabs */}
            <FormGroup label="Activity Conduct">
              <div className={styles.modeTabs}>
                {ACTIVITY_MODES.map((m) => (
                  <button key={m} type="button"
                    className={`${styles.modeTab} ${form.activityMode === m ? styles.modeTabActive : ""}`}
                    onClick={() => set("activityMode", m)}>
                    {m === "Face-to-face" ? "🏛️" : m === "Virtual" ? "💻" : "🔀"} {m}
                  </button>
                ))}
              </div>
            </FormGroup>

            {/* Venue */}
            {(form.activityMode === "Face-to-face" || form.activityMode === "Hybrid") && (
              <FormGroup label="Venue" required={form.activityMode !== "Virtual"} error={errors.venue}
                hint="Exact location (building name, address).">
                <input className={`${styles.formInput} ${errors.venue ? styles.inputError : ""}`}
                  type="text" placeholder="e.g. SASHA Community Hall, Quezon City"
                  value={form.venue} onChange={(e) => set("venue", e.target.value)} />
              </FormGroup>
            )}

            {/* Online details */}
            {(form.activityMode === "Virtual" || form.activityMode === "Hybrid") && (
              <>
                <FormGroup label="Online Platform">
                  <select className={styles.formInput} value={form.onlinePlatform}
                    onChange={(e) => set("onlinePlatform", e.target.value)}>
                    <option value="">Select platform…</option>
                    {["Zoom", "Google Meet", "Microsoft Teams", "YouTube Live", "Facebook Live", "Cisco Webex", "Discord"].map((p) =>
                      <option key={p} value={p}>{p}</option>)}
                  </select>
                </FormGroup>
                <FormGroup label="Virtual Event Link" required={form.activityMode !== "Face-to-face"} error={errors.onlineLink}>
                  <input className={`${styles.formInput} ${errors.onlineLink ? styles.inputError : ""}`}
                    type="url" placeholder="https://…"
                    value={form.onlineLink} onChange={(e) => set("onlineLink", e.target.value)} />
                </FormGroup>
              </>
            )}
          </SectionCard>

          {/* ── SASHA Requirements (internal only) ── */}
          <SectionCard
            title="Project Requirements"
            subtitle="Internal tracking. These details are visible to SASHA members only, regardless of visibility setting."
          >
            <div className={styles.internalBadge}>🔒 Internal use only</div>

            <FormGroup label="Logistical Requirements"
              hint="Equipment, transportation, materials, manpower, setup needs, etc.">
              <textarea className={`${styles.formInput} ${styles.textArea}`} rows={4}
                placeholder="Describe all logistical needs for this project…"
                value={form.logisticalRequirements}
                onChange={(e) => set("logisticalRequirements", e.target.value)} />
            </FormGroup>

            <FormGroup label="Financial Requirements"
              hint="Estimated budget, funding sources, expenses breakdown.">
              <textarea className={`${styles.formInput} ${styles.textArea}`} rows={4}
                placeholder="Outline the financial plan and requirements…"
                value={form.financialRequirements}
                onChange={(e) => set("financialRequirements", e.target.value)} />
            </FormGroup>

            <FormGroup label="Operational Requirements"
              hint="Permits, legal considerations, approvals, security, health & safety.">
              <textarea className={`${styles.formInput} ${styles.textArea}`} rows={4}
                placeholder="List operational requirements and compliance needs…"
                value={form.operationalRequirements}
                onChange={(e) => set("operationalRequirements", e.target.value)} />
            </FormGroup>
          </SectionCard>

          {/* ── People ── */}
          <SectionCard title="Project Team" subtitle="Internal use only.">
            <div className={styles.internalBadge}>🔒 Internal use only</div>

            <PeopleList
              label="Project Officers"
              hint="Officers responsible for leading the project."
              placeholder="Full name"
              values={form.projectOfficers}
              onChange={(v) => set("projectOfficers", v)}
            />

            <div style={{ marginTop: "1.5rem" }}>
              <PeopleList
                label="Project Committee Members"
                hint="All committee members involved."
                placeholder="Full name"
                values={form.projectCommitteeMembers}
                onChange={(v) => set("projectCommitteeMembers", v)}
              />
            </div>
          </SectionCard>

        </div>

        {/* ══ RIGHT SIDEBAR ════════════════════════════════════════════════ */}
        <aside className={styles.sidebarCol}>

          {/* Visibility */}
          <SectionCard title="Visibility & Publication">
            <p className={styles.visibilityNote}>
              Only <strong>Public</strong> events that have been <strong>approved by an admin</strong> will appear on the public landing page and Events directory.
            </p>
            <div className={styles.visibilityOptions}>
              {VISIBILITY_OPTIONS.map((opt) => (
                <label key={opt.value}
                  className={`${styles.visibilityCard} ${form.visibility === opt.value ? styles.visibilityCardActive : ""}`}>
                  <input type="radio" name="visibility" value={opt.value}
                    checked={form.visibility === opt.value}
                    onChange={() => set("visibility", opt.value)}
                    className={styles.visuallyHidden} />
                  <span className={styles.visibilityIcon}>{opt.icon}</span>
                  <div>
                    <strong>{opt.label}</strong>
                    <p className={styles.visibilityDesc}>{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {isPublicRequest && (
              <div className={styles.approvalNote}>
                <FiInfo size={14} />
                <span>This project will be submitted for admin review. It will appear publicly only after approval.</span>
              </div>
            )}

            {/* Admin approval status (read-only display) */}
            {mode === "edit" && (
              <div className={styles.approvalRow}>
                <span className={styles.viewKey}>Approval Status</span>
                <span className={`${styles.approvalBadge} ${styles[`approval--${form.approvalStatus}`]}`}>
                  {form.approvalStatus === "pending" ? "⏳ Pending" :
                   form.approvalStatus === "approved" ? "✅ Approved" :
                   "❌ Rejected"}
                </span>
              </div>
            )}
          </SectionCard>

          {/* Status & Due Date */}
          <SectionCard title="Status & Schedule">
            <FormGroup label="Project Status">
              <div className={styles.radioGroup}>
                {STATUS_OPTIONS.map((s) => (
                  <label key={s} className={styles.radioLabel}>
                    <input type="radio" name="proj-status" value={s}
                      checked={form.status === s}
                      onChange={() => set("status", s)}
                      className={styles.radioInput} />
                    {s}
                  </label>
                ))}
              </div>
            </FormGroup>

            <FormGroup label="Due Date" hint="Internal deadline for project completion.">
              <input className={styles.formInput} type="date" value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)} />
            </FormGroup>
          </SectionCard>

          {/* Save actions (repeated for convenience) */}
          <div className={styles.sidebarActions}>
            <button className={styles.btnPrimary} style={{ width: "100%" }} onClick={handleSubmit}>
              {mode === "create" ? "✔ Create Project" : "✔ Save Changes"}
            </button>
            <button className={styles.btnSecondary} style={{ width: "100%", marginTop: "0.5rem" }} onClick={onCancel}>
              Cancel
            </button>
          </div>

        </aside>
      </div>
    </div>
  );
}