"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";
import {
  FiPlus, FiTrash2, FiEdit2, FiCheck, FiX, FiChevronUp, FiChevronDown,
  FiAlertCircle, FiEye, FiEyeOff,
} from "react-icons/fi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
  return null;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ─── Constants ────────────────────────────────────────────────────────────────

const QUESTION_TYPES = ["yes_no", "in_favor"];

const TYPE_LABELS = {
  yes_no:   "Yes / No",
  in_favor: "In Favor / Not in Favor",
};

// Default options per type — matches apply/page.js RadioGroup values
const DEFAULT_OPTIONS = {
  yes_no:   ["Yes", "No"],
  in_favor: ["In Favor", "Not in Favor"],
};

// ─── Inline Toast ─────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  const bg = toast.type === "success" ? "#037F81" : "#dc2626";
  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 2000,
      padding: "0.75rem 1.25rem", borderRadius: 10, fontSize: "0.88rem",
      fontWeight: 600, background: bg, color: "#fff",
      boxShadow: "0 8px 24px rgba(0,0,0,0.15)", maxWidth: 380,
      animation: "toastIn 0.2s ease",
    }}>
      {toast.msg}
    </div>
  );
}

// ─── Question Form (add / edit) ───────────────────────────────────────────────

function QuestionForm({ initial, categories, onSave, onCancel, saving }) {
  const isEdit = !!initial;

  const [form, setForm] = useState({
    question_text:    initial?.question_text    ?? "",
    category:         initial?.category         ?? (categories[0] ?? ""),
    newCategory:      "",
    type:             initial?.type             ?? "yes_no",
    preferred_answer: initial?.preferred_answer ?? "Yes",
    auto_fail:        initial?.auto_fail        ?? false,
    is_active:        initial?.is_active        ?? true,
  });

  const [useNewCat, setUseNewCat] = useState(false);

  const options = DEFAULT_OPTIONS[form.type] ?? ["Yes", "No"];

  function set(key, val) {
    setForm(prev => {
      const next = { ...prev, [key]: val };
      // When type changes, reset preferred_answer to first option of new type
      if (key === "type") {
        next.preferred_answer = DEFAULT_OPTIONS[val]?.[0] ?? "";
      }
      return next;
    });
  }

  function handleSave() {
    const resolvedCategory = useNewCat
      ? form.newCategory.trim()
      : form.category;

    if (!form.question_text.trim()) return;
    if (!resolvedCategory) return;

    onSave({
      ...(isEdit ? { screening_question_id: initial.screening_question_id } : {}),
      question_text:    form.question_text.trim(),
      category:         resolvedCategory,
      type:             form.type,
      options:          DEFAULT_OPTIONS[form.type],
      preferred_answer: form.preferred_answer,
      auto_fail:        form.auto_fail,
      is_active:        form.is_active,
    });
  }

  const inputStyle = {
    width: "100%", padding: "0.5rem 0.85rem",
    border: "1px solid #e5e7eb", borderRadius: 8,
    fontSize: "0.875rem", color: "#292929", background: "#fff",
    fontFamily: "inherit", boxSizing: "border-box", outline: "none",
  };

  const labelStyle = {
    fontSize: "0.78rem", fontWeight: 700, color: "#6b7280",
    textTransform: "uppercase", letterSpacing: "0.04em",
    display: "block", marginBottom: 4,
  };

  return (
    <div style={{
      background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12,
      padding: "1.25rem 1.4rem", display: "flex", flexDirection: "column", gap: "1rem",
    }}>
      <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#037F81" }}>
        {isEdit ? "Edit Question" : "Add New Question"}
      </h3>

      {/* Question Text */}
      <div>
        <label style={labelStyle}>Question Text *</label>
        <textarea
          rows={2}
          placeholder="e.g. Do you believe survivors deserve to be treated with dignity?"
          value={form.question_text}
          onChange={e => set("question_text", e.target.value)}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {/* Category */}
      <div>
        <label style={labelStyle}>Category *</label>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
          {!useNewCat ? (
            <>
              <select
                value={form.category}
                onChange={e => set("category", e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                {categories.length === 0 && (
                  <option value="">No categories yet — create one</option>
                )}
              </select>
              <button
                onClick={() => setUseNewCat(true)}
                style={{ background: "#e1f5f5", color: "#037F81", border: "none", borderRadius: 8, padding: "0.5rem 0.85rem", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                + New Category
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="e.g. Values & Conduct"
                value={form.newCategory}
                onChange={e => set("newCategory", e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => setUseNewCat(false)}
                style={{ background: "#f3f4f6", color: "#6b7280", border: "none", borderRadius: 8, padding: "0.5rem 0.85rem", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Use Existing
              </button>
            </>
          )}
        </div>
      </div>

      {/* Type */}
      <div>
        <label style={labelStyle}>Answer Type *</label>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {QUESTION_TYPES.map(t => (
            <label key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", color: "#292929", cursor: "pointer" }}>
              <input
                type="radio"
                name={`type-${initial?.screening_question_id ?? "new"}`}
                value={t}
                checked={form.type === t}
                onChange={() => set("type", t)}
              />
              {TYPE_LABELS[t]}
            </label>
          ))}
        </div>
        <p style={{ margin: "4px 0 0", fontSize: "0.76rem", color: "#9ca3af" }}>
          Options shown to applicant: <strong>{DEFAULT_OPTIONS[form.type]?.join(" / ")}</strong>
        </p>
      </div>

      {/* Preferred Answer */}
      <div>
        <label style={labelStyle}>Preferred Answer (auto-score)</label>
        <select
          value={form.preferred_answer}
          onChange={e => set("preferred_answer", e.target.value)}
          style={{ ...inputStyle, maxWidth: 240 }}
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {/* Flags */}
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem", color: "#292929", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={form.auto_fail}
            onChange={e => set("auto_fail", e.target.checked)}
          />
          <span>
            <strong>Auto-fail</strong> — wrong answer immediately disqualifies the applicant
          </span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem", color: "#292929", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={e => set("is_active", e.target.checked)}
          />
          <span><strong>Active</strong> — shown to applicants</span>
        </label>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{ background: "#fff", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: 999, padding: "0.45rem 1.1rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !form.question_text.trim() || (!useNewCat ? !form.category : !form.newCategory.trim())}
          style={{
            background: "#037F81", color: "#fff", border: "none", borderRadius: 999,
            padding: "0.45rem 1.25rem", fontSize: "0.85rem", fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Question"}
        </button>
      </div>
    </div>
  );
}

// ─── Question Row ─────────────────────────────────────────────────────────────

function QuestionRow({ q, onEdit, onDelete, onToggleActive, onMoveUp, onMoveDown, isFirst, isLast }) {
  const typeLabel = TYPE_LABELS[q.type] ?? q.type;
  const options   = Array.isArray(q.options) ? q.options.join(" / ") : JSON.stringify(q.options);

  return (
    <div style={{
      background: q.is_active ? "#fff" : "#fafafa",
      border: `1px solid ${q.is_active ? "#e5e7eb" : "#e5e7eb"}`,
      borderRadius: 10, padding: "0.9rem 1rem",
      display: "flex", alignItems: "flex-start", gap: "0.75rem",
      opacity: q.is_active ? 1 : 0.65,
      transition: "opacity 0.15s",
    }}>
      {/* Order controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0, paddingTop: 2 }}>
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          style={{ background: "none", border: "none", cursor: isFirst ? "default" : "pointer", color: isFirst ? "#d1d5db" : "#6b7280", padding: 2, display: "flex", alignItems: "center" }}
          title="Move up"
        >
          <FiChevronUp size={14} />
        </button>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9ca3af", textAlign: "center", lineHeight: 1 }}>
          {q.order}
        </span>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          style={{ background: "none", border: "none", cursor: isLast ? "default" : "pointer", color: isLast ? "#d1d5db" : "#6b7280", padding: 2, display: "flex", alignItems: "center" }}
          title="Move down"
        >
          <FiChevronDown size={14} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 4px", fontSize: "0.875rem", fontWeight: 600, color: "#1f2937", lineHeight: 1.5 }}>
          {q.question_text}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#e1f5f5", color: "#037F81", padding: "2px 8px", borderRadius: 999 }}>
            {typeLabel}
          </span>
          <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>{options}</span>
          {q.preferred_answer && (
            <span style={{ fontSize: "0.72rem", fontWeight: 600, background: "#f0fdf4", color: "#16a34a", padding: "2px 8px", borderRadius: 999 }}>
              ✓ Preferred: {q.preferred_answer}
            </span>
          )}
          {q.auto_fail && (
            <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#fee2e2", color: "#dc2626", padding: "2px 8px", borderRadius: 999 }}>
              ⚠ Auto-fail
            </span>
          )}
          {!q.is_active && (
            <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#f3f4f6", color: "#6b7280", padding: "2px 8px", borderRadius: 999 }}>
              Hidden
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }}>
        <button
          onClick={onToggleActive}
          title={q.is_active ? "Hide from applicants" : "Show to applicants"}
          style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center" }}
        >
          {q.is_active ? <FiEye size={14} /> : <FiEyeOff size={14} />}
        </button>
        <button
          onClick={onEdit}
          title="Edit"
          style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "#037F81", display: "flex", alignItems: "center" }}
        >
          <FiEdit2 size={14} />
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          style={{ background: "#fff0f0", border: "1px solid #fecaca", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "#dc2626", display: "flex", alignItems: "center" }}
        >
          <FiTrash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({ open, question, onConfirm, onCancel }) {
  if (!open || !question) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={onCancel}
    >
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", maxWidth: 480, width: "100%", padding: "1.5rem", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", marginBottom: "1rem" }}>
          <FiAlertCircle size={22} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h3 style={{ margin: "0 0 6px", fontSize: "1rem", fontWeight: 800, color: "#1f2937" }}>Delete Question?</h3>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#4b5563", lineHeight: 1.6 }}>
              This will permanently delete:<br />
              <strong>"{question.question_text}"</strong>
            </p>
            <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "#9ca3af" }}>
              Existing applicant responses will not be deleted from the database.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <button onClick={onCancel} style={{ background: "#fff", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 999, padding: "0.45rem 1.1rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 999, padding: "0.45rem 1.25rem", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ScreeningQuestionsPage() {
  const router = useRouter();

  const [questions,    setQuestions]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [toast,        setToast]        = useState(null);
  const [saving,       setSaving]       = useState(false);

  // UI state
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // question obj

  // ── Helpers ───────────────────────────────────────────────────────────────

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Fetch questions ───────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch(`${API}/api/screening_questions`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${getCookie("token")}` },
        });
        if (!res.ok) throw new Error("Failed to load screening questions.");
        const data = await res.json();
        // Support both { questions: [...] } and plain array responses
        const list = Array.isArray(data) ? data : (data.questions ?? []);
        setQuestions(list.sort((a, b) => a.order - b.order));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchQuestions();
  }, []);

  // Derived: distinct categories in order of first appearance
  const categories = [...new Set(questions.map(q => q.category))];

  // ── Add question ──────────────────────────────────────────────────────────

  async function handleAdd(formData) {
    setSaving(true);
    try {
      // question_key: snake_case of question_text, truncated, suffixed with id
      const slug = formData.question_text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 40);

      const payload = {
        ...formData,
        question_key: slug + "_" + Date.now(),
        order: questions.length + 1,
        // screening_question_set_id: 1 — adjust if your app uses multiple sets
        screening_question_set_id: 1,
        options: formData.options ?? DEFAULT_OPTIONS[formData.type],
      };

      const res = await fetch(`${API}/api/screening_questions`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getCookie("token")}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add question.");
      }

      const created = await res.json();
      const newQ = created.question ?? created;
      setQuestions(prev => [...prev, newQ].sort((a, b) => a.order - b.order));
      setShowAddForm(false);
      showToast("Question added successfully.");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Edit question ─────────────────────────────────────────────────────────

  async function handleEdit(formData) {
    setSaving(true);
    try {
      const res = await fetch(
        `${API}/api/screening_questions/${formData.screening_question_id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getCookie("token")}`,
          },
          body: JSON.stringify({
            question_text:    formData.question_text,
            category:         formData.category,
            type:             formData.type,
            options:          formData.options ?? DEFAULT_OPTIONS[formData.type],
            preferred_answer: formData.preferred_answer,
            auto_fail:        formData.auto_fail,
            is_active:        formData.is_active,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update question.");
      }

      const updated = await res.json();
      const updQ = updated.question ?? updated;
      setQuestions(prev => prev.map(q =>
        q.screening_question_id === updQ.screening_question_id ? updQ : q
      ).sort((a, b) => a.order - b.order));
      setEditingId(null);
      showToast("Question updated.");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────

  async function handleToggleActive(q) {
    const next = !q.is_active;
    try {
      const res = await fetch(`${API}/api/screening_questions/${q.screening_question_id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getCookie("token")}`,
        },
        body: JSON.stringify({ is_active: next }),
      });
      if (!res.ok) throw new Error("Failed to update.");
      const updated = await res.json();
      const updQ = updated.question ?? updated;
      setQuestions(prev => prev.map(x =>
        x.screening_question_id === q.screening_question_id ? { ...x, is_active: updQ.is_active ?? next } : x
      ));
      showToast(next ? "Question is now visible to applicants." : "Question hidden from applicants.");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  // ── Reorder (move up / down) ──────────────────────────────────────────────

  async function handleReorder(qId, direction) {
    const idx = questions.findIndex(q => q.screening_question_id === qId);
    if (idx < 0) return;
    if (direction === "up"   && idx === 0) return;
    if (direction === "down" && idx === questions.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const reordered = [...questions];
    // Swap
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    // Reassign order values
    const withOrders = reordered.map((q, i) => ({ ...q, order: i + 1 }));
    setQuestions(withOrders); // Optimistic update

    try {
      await fetch(`${API}/api/screening_questions/reorder`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getCookie("token")}`,
        },
        body: JSON.stringify({
          order: withOrders.map(q => ({
            screening_question_id: q.screening_question_id,
            order: q.order,
          })),
        }),
      });
    } catch (err) {
      showToast("Reorder failed — refresh to re-sync.", "error");
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(
        `${API}/api/screening_questions/${deleteTarget.screening_question_id}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { Authorization: `Bearer ${getCookie("token")}` },
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete question.");
      }
      setQuestions(prev =>
        prev
          .filter(q => q.screening_question_id !== deleteTarget.screening_question_id)
          .map((q, i) => ({ ...q, order: i + 1 }))
      );
      showToast("Question deleted.");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Toast toast={toast} />
      <ConfirmDeleteModal
        open={!!deleteTarget}
        question={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div style={{ background: "#f7f8fa", minHeight: "100vh", padding: "2rem 1.5rem", marginTop: 64 }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>

          {/* Back + Header */}
          <div style={{ marginBottom: "1.5rem" }}>
            <button
              onClick={() => router.push("/volunteer")}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#037F81", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: "1rem" }}
            >
              <IoIosArrowBack /> Back to Volunteer Management
            </button>

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <h1 style={{ margin: "0 0 4px", fontSize: "1.6rem", fontWeight: 800, color: "#1f2937" }}>
                  Screening Questions
                </h1>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.5 }}>
                  These questions appear on the volunteer application form (<strong>Step 2 — Screening Questions</strong>).
                  Changes take effect for new applicants immediately.
                </p>
              </div>
              {!showAddForm && (
                <button
                  onClick={() => { setShowAddForm(true); setEditingId(null); }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#037F81", color: "#fff", border: "none", borderRadius: 999, padding: "0.5rem 1.3rem", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
                >
                  <FiPlus size={15} /> Add Question
                </button>
              )}
            </div>
          </div>

          {/* Info banner */}
          <div style={{ background: "#e1f5f5", border: "1px solid #a5d8d8", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1.5rem", fontSize: "0.82rem", color: "#037F81", lineHeight: 1.6 }}>
            <strong>How it works:</strong> Each question you add here will be fetched dynamically by the application form and ViewApplication. Use the <strong>In Favor / Not in Favor</strong> type for advocacy questions, and <strong>Yes / No</strong> for standard ones. Drag questions up/down to control the display order.
          </div>

          {/* Add form */}
          {showAddForm && (
            <div style={{ marginBottom: "1.25rem" }}>
              <QuestionForm
                initial={null}
                categories={categories}
                onSave={handleAdd}
                onCancel={() => setShowAddForm(false)}
                saving={saving}
              />
            </div>
          )}

          {/* Loading / error */}
          {loading && (
            <p style={{ color: "#6b7280", fontSize: "0.9rem", textAlign: "center", padding: "2rem 0" }}>
              Loading questions…
            </p>
          )}
          {error && (
            <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "0.75rem 1rem", color: "#991b1b", fontSize: "0.875rem", marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          {/* Questions grouped by category */}
          {!loading && !error && (
            categories.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af" }}>
                <p style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 6px" }}>No questions yet</p>
                <p style={{ fontSize: "0.875rem", margin: 0 }}>Click <strong>Add Question</strong> to create the first screening question.</p>
              </div>
            ) : (
              categories.map(cat => {
                const catQuestions = questions.filter(q => q.category === cat);
                return (
                  <div key={cat} style={{ marginBottom: "1.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <h2 style={{ margin: 0, fontSize: "0.82rem", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {cat}
                      </h2>
                      <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                      <span style={{ fontSize: "0.75rem", color: "#9ca3af", flexShrink: 0 }}>
                        {catQuestions.filter(q => q.is_active).length} of {catQuestions.length} active
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                      {catQuestions.map((q, i) => {
                        const globalIdx = questions.findIndex(x => x.screening_question_id === q.screening_question_id);
                        const isFirst = globalIdx === 0;
                        const isLast  = globalIdx === questions.length - 1;

                        if (editingId === q.screening_question_id) {
                          return (
                            <QuestionForm
                              key={q.screening_question_id}
                              initial={q}
                              categories={categories}
                              onSave={handleEdit}
                              onCancel={() => setEditingId(null)}
                              saving={saving}
                            />
                          );
                        }

                        return (
                          <QuestionRow
                            key={q.screening_question_id}
                            q={q}
                            onEdit={() => { setEditingId(q.screening_question_id); setShowAddForm(false); }}
                            onDelete={() => setDeleteTarget(q)}
                            onToggleActive={() => handleToggleActive(q)}
                            onMoveUp={() => handleReorder(q.screening_question_id, "up")}
                            onMoveDown={() => handleReorder(q.screening_question_id, "down")}
                            isFirst={isFirst}
                            isLast={isLast}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )
          )}

          {/* Summary footer */}
          {!loading && questions.length > 0 && (
            <div style={{ marginTop: "2rem", borderTop: "1px solid #e5e7eb", paddingTop: "1rem", display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#9ca3af" }}>
              <span>{questions.length} total questions · {questions.filter(q => q.is_active).length} active</span>
              <span>{categories.length} categories</span>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}