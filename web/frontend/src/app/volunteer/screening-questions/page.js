"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiAlertCircle,
  FiArrowDown,
  FiArrowLeft,
  FiArrowUp,
  FiCheck,
  FiClock,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiHelpCircle,
  FiPlus,
  FiRefreshCw,
  FiRotateCcw,
  FiSave,
  FiShield,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { ConfirmDialog, TextInputDialog } from "@/components/ui/Dialog";
import Tooltip from "@/components/ui/Tooltip";
import styles from "./ScreeningQuestions.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const ANSWER_PRESETS = {
  yes_no: ["Yes", "No"],
  in_favor: ["In Favor", "Not in Favor"],
};

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const parts = `; ${document.cookie}`.split(`; ${name}=`);
  return parts.length === 2
    ? decodeURIComponent(parts.pop().split(";").shift())
    : null;
}

function headers(extra = {}) {
  const token = getCookie("token");
  return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function readResponse(response, fallback) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || fallback);
  return body;
}

function humanizeCategory(value) {
  return String(value || "Uncategorized")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return "Unknown date";
  return new Date(value).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function newQuestionKey(text) {
  const slug =
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "question";
  return `${slug}_${Date.now()}`;
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className={`${styles.toast} ${
        toast.type === "error" ? styles.toastError : styles.toastSuccess
      }`}
      role="status"
    >
      {toast.type === "error" ? <FiAlertCircle /> : <FiCheck />}
      {toast.message}
    </div>
  );
}

function SectionCard({ title, subtitle, action, children }) {
  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionCardHeader}>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className={styles.sectionCardBody}>{children}</div>
    </section>
  );
}

function QuestionForm({
  initial,
  categories,
  defaultCategory,
  onSectionCreated,
  onSave,
  onCancel,
}) {
  const initialOptions =
    Array.isArray(initial?.options) && initial.options.length >= 2
      ? initial.options.slice(0, 2)
      : ANSWER_PRESETS.yes_no;
  const [form, setForm] = useState({
    question_text: initial?.question_text || "",
    category: initial?.category || defaultCategory || categories[0] || "",
    type: initial?.type || "negotiable",
    answerPreset:
      initialOptions[0] === "In Favor" ? "in_favor" : "yes_no",
    options: initialOptions,
    preferred_answer: initial?.preferred_answer || initialOptions[0],
    is_active: initial?.is_active ?? true,
  });
  const [errors, setErrors] = useState({});
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [sectionDialogError, setSectionDialogError] = useState("");

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function chooseAnswers(preset) {
    const options = ANSWER_PRESETS[preset];
    setForm((current) => ({
      ...current,
      answerPreset: preset,
      options,
      preferred_answer: options[0],
    }));
  }

  function createSection(sectionName) {
    const cleaned = humanizeCategory(sectionName);
    const duplicate = categories.some(
      (category) => humanizeCategory(category).toLowerCase() === cleaned.toLowerCase()
    );
    if (duplicate) {
      setSectionDialogError("A section with this name already exists.");
      return;
    }

    onSectionCreated(cleaned);
    set("category", cleaned);
    setSectionDialogError("");
    setShowSectionDialog(false);
  }

  function submit(event) {
    event.preventDefault();
    const questionText = form.question_text.trim();
    const category = form.category.trim();
    const nextErrors = {};
    if (!questionText) {
      nextErrors.question_text =
        "Write the exact question applicants should answer.";
    } else if (questionText.length < 10) {
      nextErrors.question_text =
        "Add a little more detail so applicants can understand the question.";
    }
    if (!category) {
      nextErrors.category =
        "Choose a section first. You can add one from Question Sections.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave({
      ...initial,
      question_key: initial?.question_key || newQuestionKey(questionText),
      question_text: questionText,
      category,
      type: form.type,
      options: form.options,
      preferred_answer: form.preferred_answer,
      auto_fail: form.type === "non_negotiable",
      is_active: form.is_active,
    });
  }

  return (
    <>
      <TextInputDialog
        open={showSectionDialog}
        title="Add a Question Section"
        description="Create a clear group for related screening questions."
        label="Section name"
        placeholder="Example: Values & Conduct"
        confirmLabel="Add and select section"
        error={sectionDialogError}
        onConfirm={createSection}
        onCancel={() => {
          setShowSectionDialog(false);
          setSectionDialogError("");
        }}
      />
      <form className={styles.questionForm} onSubmit={submit}>
      <div className={styles.questionFormHeader}>
        <div>
          <h3>{initial ? "Edit Question" : "Add Question"}</h3>
          <p>This change will be included when you save the next version.</p>
        </div>
        <Tooltip text="Close without adding this question">
          <button type="button" className={styles.iconButton} onClick={onCancel}>
            <FiX />
          </button>
        </Tooltip>
      </div>

      <div
        className={`${styles.formGroup} ${
          errors.question_text ? styles.formGroupInvalid : ""
        }`}
      >
        <label>
          Question shown to applicants
          <Tooltip text="This wording appears exactly as written on the volunteer application.">
            <span className={styles.helpIcon}><FiHelpCircle /></span>
          </Tooltip>
        </label>
        <textarea
          rows={3}
          value={form.question_text}
          onChange={(event) => set("question_text", event.target.value)}
          placeholder="Write one clear question."
          autoFocus
          aria-invalid={Boolean(errors.question_text)}
        />
        <p className={styles.formHint}>Ask one clear thing at a time.</p>
        {errors.question_text && (
          <p className={styles.fieldError}>
            <FiAlertCircle /> {errors.question_text}
          </p>
        )}
      </div>

      <div className={styles.sectionChoicePanel}>
        <div
          className={`${styles.formGroup} ${
            errors.category ? styles.formGroupInvalid : ""
          }`}
        >
          <label>
            Question section
            <Tooltip text="Sections group related questions together on the application.">
              <span className={styles.helpIcon}><FiHelpCircle /></span>
            </Tooltip>
          </label>
          <div className={styles.sectionSelectRow}>
            <select
              value={form.category}
              onChange={(event) => set("category", event.target.value)}
              aria-invalid={Boolean(errors.category)}
            >
              <option value="">Select a section</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {humanizeCategory(category)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.addSectionInline}
              onClick={() => setShowSectionDialog(true)}
            >
              <FiPlus /> Add Section
            </button>
          </div>
          <p className={styles.formHint}>
            Choose where this question belongs, or create a new section now.
          </p>
          {errors.category && (
            <p className={styles.fieldError}>
              <FiAlertCircle /> {errors.category}
            </p>
          )}
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label>
            Answer choices
            <Tooltip text="Choose the labels applicants will select from.">
              <span className={styles.helpIcon}><FiHelpCircle /></span>
            </Tooltip>
          </label>
          <div className={styles.modeTabs}>
            <button
              type="button"
              className={form.answerPreset === "yes_no" ? styles.modeTabActive : ""}
              onClick={() => chooseAnswers("yes_no")}
            >
              Yes / No
            </button>
            <button
              type="button"
              className={form.answerPreset === "in_favor" ? styles.modeTabActive : ""}
              onClick={() => chooseAnswers("in_favor")}
            >
              In Favor
            </button>
          </div>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label>
            Screening rule
            <Tooltip text="Required answers can disqualify an application. Score answers only affect ranking.">
              <span className={styles.helpIcon}><FiHelpCircle /></span>
            </Tooltip>
          </label>
          <select value={form.type} onChange={(event) => set("type", event.target.value)}>
            <option value="non_negotiable">Required answer</option>
            <option value="negotiable">Adds to screening score</option>
          </select>
          <p className={styles.formHint}>
            Required answers should only be used for essential volunteer expectations.
          </p>
        </div>
        <div className={styles.formGroup}>
          <label>
            Expected answer
            <Tooltip text="This is the answer SASHA considers aligned with its expectations.">
              <span className={styles.helpIcon}><FiHelpCircle /></span>
            </Tooltip>
          </label>
          <select
            value={form.preferred_answer}
            onChange={(event) => set("preferred_answer", event.target.value)}
          >
            {form.options.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(event) => set("is_active", event.target.checked)}
        />
        Show this question to applicants
      </label>

      <div className={styles.formActions}>
        <button type="button" className={styles.btnSecondary} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={styles.btnPrimary}>
          <FiCheck /> {initial ? "Save to draft" : "Add to draft"}
        </button>
      </div>
      </form>
    </>
  );
}

function CategoryManager({ categories, questions, onRename, onRemove }) {
  return (
    <div className={styles.categoryList}>
      {categories.map((category) => (
        <CategoryRow
          key={category}
          category={category}
          count={questions.filter((question) => question.category === category).length}
          onRename={onRename}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function CategoryRow({ category, count, onRename, onRemove }) {
  const [name, setName] = useState(humanizeCategory(category));

  function commitName() {
    const nextName = name.trim();
    if (!nextName) {
      setName(humanizeCategory(category));
      return;
    }
    onRename(category, nextName);
  }

  return (
    <div className={styles.categoryRow}>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={commitName}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        aria-label={`Rename ${humanizeCategory(category)}`}
      />
      <span>{count} questions</span>
      <Tooltip text="Remove this section and all questions inside it" position="left">
        <button
          type="button"
          className={styles.removeButton}
          onClick={() => onRemove(category)}
          aria-label={`Remove ${humanizeCategory(category)}`}
        >
          <FiTrash2 />
        </button>
      </Tooltip>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  total,
  editMode,
  onMove,
  onToggle,
  onEdit,
  onRemove,
}) {
  const required = question.type === "non_negotiable" || question.auto_fail;
  return (
    <article
      className={`${styles.questionCard} ${
        !question.is_active ? styles.questionCardHidden : ""
      } ${editMode ? styles.questionCardEditing : ""}`}
    >
      {editMode && (
        <div className={styles.orderColumn}>
          <Tooltip text="Move earlier in this section" position="left">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMove("up")}
              aria-label="Move question up"
            >
              <FiArrowUp />
            </button>
          </Tooltip>
          <span>{index + 1}</span>
          <Tooltip text="Move later in this section" position="left">
            <button
              type="button"
              disabled={index === total - 1}
              onClick={() => onMove("down")}
              aria-label="Move question down"
            >
              <FiArrowDown />
            </button>
          </Tooltip>
        </div>
      )}

      <div className={styles.questionContent}>
        <div className={styles.badges}>
          <span className={styles.categoryBadge}>
            {humanizeCategory(question.category)}
          </span>
          <span className={required ? styles.requiredBadge : styles.scoreBadge}>
            {required ? <FiShield /> : <FiCheck />}
            {required ? "Required answer" : "Adds to score"}
          </span>
          {!question.is_active && (
            <span className={styles.hiddenBadge}><FiEyeOff /> Hidden</span>
          )}
        </div>
        <h3>{question.question_text}</h3>
        <div className={styles.answers}>
          {(question.options || []).map((option) => (
            <span
              key={option}
              className={
                option === question.preferred_answer ? styles.expectedAnswer : ""
              }
            >
              {option === question.preferred_answer && <FiCheck />} {option}
            </span>
          ))}
        </div>
      </div>

      {editMode && (
        <div className={styles.questionActions}>
          <Tooltip
            text={
              question.is_active
                ? "Hide from new applicants"
                : "Show to new applicants"
            }
          >
            <button type="button" onClick={onToggle}>
              {question.is_active ? <FiEyeOff /> : <FiEye />}
              {question.is_active ? "Hide" : "Show"}
            </button>
          </Tooltip>
          <Tooltip text="Change the wording, section, answers, or scoring rule">
            <button type="button" onClick={onEdit}><FiEdit2 /> Edit</button>
          </Tooltip>
          <Tooltip text="Remove from this draft; published history is preserved">
            <button type="button" className={styles.dangerText} onClick={onRemove}>
              <FiTrash2 /> Remove
            </button>
          </Tooltip>
        </div>
      )}
    </article>
  );
}

function VersionHistory() {
  return null;
}

export default function ScreeningQuestionsPage() {
  const router = useRouter();
  const [questionSet, setQuestionSet] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [draftQuestions, setDraftQuestions] = useState([]);
  const [draftCategories, setDraftCategories] = useState([]);
  const [history] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionFormCategory, setQuestionFormCategory] = useState("");
  const [editingKey, setEditingKey] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [showAddSectionDialog, setShowAddSectionDialog] = useState(false);
  const [sectionDialogError, setSectionDialogError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);

  const visibleQuestions = editMode ? draftQuestions : questions;
  const categories = useMemo(
    () =>
      editMode
        ? draftCategories
        : [...new Set(visibleQuestions.map((question) => question.category))],
    [draftCategories, editMode, visibleQuestions]
  );
  const groupedQuestions = useMemo(
    () =>
      categories.map((category) => ({
        category,
        questions: visibleQuestions.filter(
          (question) => question.category === category
        ),
      })),
    [categories, visibleQuestions]
  );

  const notify = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const questionsResponse = await fetch(`${API}/api/screening_questions`, {
        credentials: "include",
        headers: headers(),
      });
      const current = await readResponse(
        questionsResponse,
        "Could not load screening questions."
      );
      const currentQuestions = current.questions || [];
      setQuestionSet(current.questionSet);
      setQuestions(currentQuestions);
      setDraftQuestions(currentQuestions);
      setDraftCategories([
        ...new Set(currentQuestions.map((question) => question.category)),
      ]);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  function beginEditing(openForm = false) {
    setDraftQuestions(questions.map((question) => ({ ...question })));
    setDraftCategories([
      ...new Set(questions.map((question) => question.category)),
    ]);
    setEditMode(true);
    setEditingKey(null);
    setQuestionFormCategory("");
    setShowQuestionForm(openForm);
  }

  function cancelEditing() {
    setDraftQuestions(questions);
    setDraftCategories([
      ...new Set(questions.map((question) => question.category)),
    ]);
    setEditMode(false);
    setEditingKey(null);
    setQuestionFormCategory("");
    setShowQuestionForm(false);
  }

  function requestCancelEditing() {
    setConfirmDialog({
      type: "cancel-editing",
      title: "Discard unpublished changes?",
      description:
        "Any questions, sections, ordering, visibility, or wording changes made in this draft will be lost.",
      detail: "The current published version will not be affected.",
      tone: "danger",
      confirmLabel: "Discard changes",
    });
  }

  function addQuestion(question) {
    if (!draftCategories.includes(question.category)) {
      setDraftCategories((current) => [...current, question.category]);
    }
    setDraftQuestions((current) => [
      ...current,
      { ...question, order: current.length + 1 },
    ]);
    setShowQuestionForm(false);
    setQuestionFormCategory("");
  }

  function updateQuestion(updated) {
    setDraftQuestions((current) =>
      current.map((question) =>
        question.question_key === updated.question_key ? updated : question
      )
    );
    setEditingKey(null);
  }

  function moveQuestion(questionKey, direction) {
    setDraftQuestions((current) => {
      const index = current.findIndex(
        (question) => question.question_key === questionKey
      );
      if (index < 0) return current;
      const category = current[index].category;
      const categoryIndexes = current
        .map((question, questionIndex) =>
          question.category === category ? questionIndex : -1
        )
        .filter((questionIndex) => questionIndex >= 0);
      const categoryPosition = categoryIndexes.indexOf(index);
      const targetPosition =
        direction === "up" ? categoryPosition - 1 : categoryPosition + 1;
      if (targetPosition < 0 || targetPosition >= categoryIndexes.length) {
        return current;
      }
      const target = categoryIndexes[targetPosition];
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((question, order) => ({ ...question, order: order + 1 }));
    });
  }

  function renameCategory(oldCategory, nextCategory) {
    setDraftCategories((current) =>
      current.map((category) =>
        category === oldCategory ? nextCategory : category
      )
    );
    setDraftQuestions((current) =>
      current.map((question) =>
        question.category === oldCategory
          ? { ...question, category: nextCategory }
          : question
      )
    );
  }

  function removeCategory(category) {
    const count = draftQuestions.filter(
      (question) => question.category === category
    ).length;
    setConfirmDialog({
      type: "remove-category",
      title: "Remove this section?",
      description:
        count > 0
          ? "All questions inside it will also be removed from this draft."
          : "This empty section will be removed from the draft.",
      detail: `${humanizeCategory(category)} · ${count} question${
        count === 1 ? "" : "s"
      }`,
      target: category,
      tone: "danger",
      confirmLabel: "Remove section",
    });
  }

  function confirmRemoveCategory(category) {
    setDraftCategories((current) =>
      current.filter((item) => item !== category)
    );
    setDraftQuestions((current) =>
      current
        .filter((question) => question.category !== category)
        .map((question, order) => ({ ...question, order: order + 1 }))
    );
    setConfirmDialog(null);
  }

  function addSection(sectionName) {
    const cleaned = humanizeCategory(sectionName);
    const duplicate = draftCategories.some(
      (category) => category.toLowerCase() === cleaned.toLowerCase()
    );
    if (duplicate) {
      setSectionDialogError("A section with this name already exists.");
      return;
    }
    setDraftCategories((current) => [...current, cleaned]);
    setSectionDialogError("");
    setShowAddSectionDialog(false);
    notify(`"${cleaned}" was added to this draft.`);
  }

  function addSectionFromQuestionForm(sectionName) {
    setDraftCategories((current) =>
      current.includes(sectionName) ? current : [...current, sectionName]
    );
  }

  async function publishVersion() {
    const cleaned = draftQuestions.map((question) => ({
      ...question,
      category: humanizeCategory(question.category),
    }));
    if (cleaned.length === 0) {
      notify("A version must contain at least one question.", "error");
      return;
    }
    if (cleaned.some((question) => !question.category.trim())) {
      notify("Every section needs a name.", "error");
      return;
    }
    const emptyCategories = draftCategories.filter((category) => {
      const normalizedCategory = humanizeCategory(category).toLowerCase();
      return !cleaned.some(
        (question) =>
          humanizeCategory(question.category).toLowerCase() ===
          normalizedCategory
      );
    });
    if (emptyCategories.length > 0) {
      setConfirmDialog({
        type: "empty-sections",
        title: "Some sections are still empty",
        description:
          "Add at least one question to every section before publishing. Empty sections cannot be saved because sections are stored with their questions.",
        detail: emptyCategories.map(humanizeCategory).join(", "),
        confirmLabel: "Got it",
      });
      return;
    }

    setPublishing(true);
    try {
      const response = await fetch(`${API}/api/screening_question_set`, {
        method: "POST",
        credentials: "include",
        headers: headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({ questions: cleaned }),
      });
      await readResponse(response, "Could not publish the new version.");
      await loadData();
      setEditMode(false);
      setShowQuestionForm(false);
      setEditingKey(null);
      notify("A new screening-question version is now active.");
    } catch (publishError) {
      notify(publishError.message, "error");
    } finally {
      setPublishing(false);
    }
  }

  function restoreVersion(version) {
    setConfirmDialog({
      type: "restore",
      title: `Restore ${version.version}?`,
      description:
        "This snapshot will be published as a new active version. Your current version will remain available in history.",
      detail: `${formatDate(version.created_at)} · ${
        (version.screening_questions || []).length
      } questions`,
      target: version,
      confirmLabel: "Restore as new version",
    });
  }

  async function confirmRestoreVersion(version) {
    setConfirmDialog(null);
    setRestoringId(version.screening_question_set_id);
    try {
      const response = await fetch(
        `${API}/api/screening_question_set/${version.screening_question_set_id}/restore`,
        {
          method: "POST",
          credentials: "include",
          headers: headers(),
        }
      );
      await readResponse(response, "Could not restore that version.");
      await loadData();
      notify(`${version.version} was restored as a new active version.`);
    } catch (restoreError) {
      notify(restoreError.message, "error");
    } finally {
      setRestoringId(null);
    }
  }

  function requestRemoveQuestion(question) {
    setConfirmDialog({
      type: "remove-question",
      title: "Remove this question?",
      description:
        "It will be removed from this draft only. Published versions and previous applicant answers will stay unchanged.",
      detail: question.question_text,
      target: question,
      tone: "danger",
      confirmLabel: "Remove question",
    });
  }

  function confirmRemoveQuestion(question) {
    setDraftQuestions((current) =>
      current
        .filter((item) => item.question_key !== question.question_key)
        .map((item, order) => ({ ...item, order: order + 1 }))
    );
    setConfirmDialog(null);
  }

  function handleDialogConfirm() {
    if (!confirmDialog) return;
    if (confirmDialog.type === "remove-category") {
      confirmRemoveCategory(confirmDialog.target);
      return;
    }
    if (confirmDialog.type === "remove-question") {
      confirmRemoveQuestion(confirmDialog.target);
      return;
    }
    if (confirmDialog.type === "cancel-editing") {
      setConfirmDialog(null);
      cancelEditing();
      return;
    }
    if (confirmDialog.type === "restore") {
      confirmRestoreVersion(confirmDialog.target);
      return;
    }
    setConfirmDialog(null);
  }

  return (
    <main className={styles.page}>
      <Toast toast={toast} />
      <TextInputDialog
        open={showAddSectionDialog}
        title="Add a Question Section"
        description="Sections help applicants understand why related questions are grouped together."
        label="Section name"
        placeholder="Example: Values & Conduct"
        confirmLabel="Add section"
        error={sectionDialogError}
        onConfirm={addSection}
        onCancel={() => {
          setShowAddSectionDialog(false);
          setSectionDialogError("");
        }}
      />
      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title}
        description={confirmDialog?.description}
        detail={confirmDialog?.detail}
        confirmLabel={confirmDialog?.confirmLabel}
        tone={confirmDialog?.tone}
        busy={
          confirmDialog?.type === "restore" &&
          restoringId === confirmDialog?.target?.screening_question_set_id
        }
        onConfirm={handleDialogConfirm}
        onCancel={() => setConfirmDialog(null)}
      />
      <div className={styles.container}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => router.push("/volunteer")}
        >
          <FiArrowLeft /> Back to Volunteer Management
        </button>

        <section className={styles.hero}>
          <div>
            <span>Volunteer applications</span>
            <h1>Screening Questions</h1>
            <p>
              Manage the questions applicants answer and keep a complete history
              of every published version.
            </p>
            {questionSet && <small>Current version: {questionSet.version}</small>}
          </div>
          <div className={styles.heroActions}>
            {!editMode ? (
              <Tooltip text="Open editing tools without changing the live version" position="bottom">
                <button
                  type="button"
                  className={styles.heroPrimary}
                  onClick={() => beginEditing(false)}
                  disabled={loading}
                >
                  <FiEdit2 /> Edit
                </button>
              </Tooltip>
            ) : (
              <Tooltip text="Discard all unpublished changes" position="bottom">
                <button
                  type="button"
                  className={styles.heroSecondary}
                  onClick={requestCancelEditing}
                >
                  <FiX /> Cancel Editing
                </button>
              </Tooltip>
            )}
            <Tooltip text="Add a question to a new unpublished draft" position="bottom">
              <button
                type="button"
                className={styles.heroSecondary}
                onClick={() => {
                  setQuestionFormCategory("");
                  if (editMode) setShowQuestionForm(true);
                  else beginEditing(true);
                }}
                disabled={loading}
              >
                <FiPlus /> Add Question
              </button>
            </Tooltip>
            <Tooltip text="Open the full version history workspace" position="bottom">
              <button
                type="button"
                className={styles.heroSecondary}
                onClick={() =>
                  router.push("/volunteer/screening-questions/history")
                }
                disabled={loading}
              >
                <FiClock /> Version History
              </button>
            </Tooltip>
          </div>
        </section>

        {editMode && (
          <div className={styles.editBanner}>
            <div>
              <strong>Editing a new version</strong>
              <span>
                Your changes are only visible to applicants after you publish.
              </span>
            </div>
            <Tooltip text="Publish this complete draft and preserve the current version in history">
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={publishVersion}
                disabled={publishing}
              >
                {publishing ? (
                  <><FiRefreshCw className={styles.spin} /> Publishing</>
                ) : (
                  <><FiSave /> Save as New Version</>
                )}
              </button>
            </Tooltip>
          </div>
        )}

        {loading && (
          <div className={styles.stateCard}>
            <FiRefreshCw className={styles.spin} />
            Loading screening questions...
          </div>
        )}
        {error && (
          <div className={`${styles.stateCard} ${styles.errorState}`}>
            <FiAlertCircle /> {error}
            <button type="button" className={styles.btnPrimary} onClick={loadData}>
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className={styles.layout}>
            <div className={styles.mainColumn}>
              {showQuestionForm && (
                <QuestionForm
                  categories={categories}
                  defaultCategory={questionFormCategory}
                  onSectionCreated={addSectionFromQuestionForm}
                  onSave={addQuestion}
                  onCancel={() => {
                    setShowQuestionForm(false);
                    setQuestionFormCategory("");
                  }}
                />
              )}

              {editMode && (
                <SectionCard
                  title="Question Sections"
                  subtitle="Create, rename, or remove the groups applicants see."
                  action={
                    <Tooltip text="Create a new group for related questions">
                      <button
                        type="button"
                        className={styles.addSectionButton}
                        onClick={() => setShowAddSectionDialog(true)}
                      >
                        <FiPlus /> Add Section
                      </button>
                    </Tooltip>
                  }
                >
                  <CategoryManager
                    categories={categories}
                    questions={draftQuestions}
                    onRename={renameCategory}
                    onRemove={removeCategory}
                  />
                </SectionCard>
              )}

              <SectionCard
                title="Questions Applicants Will Answer"
                subtitle={
                  editMode
                    ? "Arrange, edit, hide, or remove questions in this draft."
                    : "Questions are shown below in the same order applicants see them."
                }
              >
                {visibleQuestions.length === 0 ? (
                  <div className={styles.emptyState}>
                    No questions are included in this version.
                  </div>
                ) : (
                  <div className={styles.groupList}>
                    {groupedQuestions.map((group) => (
                      <div className={styles.questionGroup} key={group.category}>
                        <div className={styles.groupHeader}>
                          <h3>{humanizeCategory(group.category)}</h3>
                          <span>{group.questions.length} questions</span>
                        </div>
                        <div className={styles.questionList}>
                          {group.questions.length === 0 && (
                            <div className={styles.emptySection}>
                              <div>
                                <strong>This section has no questions yet.</strong>
                                <span>
                                  Add at least one question before publishing.
                                </span>
                              </div>
                              <button
                                type="button"
                                className={styles.btnSecondary}
                                onClick={() => {
                                  setQuestionFormCategory(group.category);
                                  setShowQuestionForm(true);
                                }}
                              >
                                <FiPlus /> Add Question
                              </button>
                            </div>
                          )}
                          {group.questions.map((question, groupIndex) => {
                            return editingKey === question.question_key ? (
                              <QuestionForm
                                key={question.question_key}
                                initial={question}
                                categories={categories}
                                defaultCategory={question.category}
                                onSectionCreated={addSectionFromQuestionForm}
                                onSave={updateQuestion}
                                onCancel={() => setEditingKey(null)}
                              />
                            ) : (
                              <QuestionCard
                                key={question.question_key}
                                question={question}
                                index={groupIndex}
                                total={group.questions.length}
                                editMode={editMode}
                                onMove={(direction) =>
                                  moveQuestion(question.question_key, direction)
                                }
                                onToggle={() =>
                                  updateQuestion({
                                    ...question,
                                    is_active: !question.is_active,
                                  })
                                }
                                onEdit={() => setEditingKey(question.question_key)}
                                onRemove={() => requestRemoveQuestion(question)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            <aside className={styles.sidebar}>
              <SectionCard
                title="Version History"
                subtitle="Older versions are read-only and can be restored safely."
              >
                <VersionHistory
                  history={history}
                  restoringId={restoringId}
                  onRestore={restoreVersion}
                />
              </SectionCard>

              <SectionCard title="Current Version">
                <dl className={styles.versionSummary}>
                  <div><dt>Version</dt><dd>{questionSet?.version || "—"}</dd></div>
                  <div><dt>Questions</dt><dd>{questions.length}</dd></div>
                  <div>
                    <dt>Visible</dt>
                    <dd>{questions.filter((question) => question.is_active).length}</dd>
                  </div>
                  <div><dt>Published</dt><dd>{formatDate(questionSet?.created_at)}</dd></div>
                </dl>
              </SectionCard>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
