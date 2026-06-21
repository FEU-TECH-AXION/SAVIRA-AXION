"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiArrowLeft,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiCopy,
  FiEdit2,
  FiMoreVertical,
  FiRefreshCw,
  FiRotateCcw,
} from "react-icons/fi";
import { ConfirmDialog, TextInputDialog } from "@/components/ui/Dialog";
import Tooltip from "@/components/ui/Tooltip";
import styles from "./VersionHistory.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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

function formatHeading(value) {
  if (!value) return "Unknown version";
  return new Date(value).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFullDate(value) {
  if (!value) return "Unknown date";
  return new Date(value).toLocaleString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function questionSignature(question) {
  const normalizedOptions = Array.isArray(question.options)
    ? question.options.map((option) => String(option).trim())
    : [];
  const normalizedCategory = humanizeCategory(question.category).toLowerCase();
  const screeningRule =
    question.type === "non_negotiable" || question.auto_fail
      ? "non_negotiable"
      : "negotiable";

  return JSON.stringify({
    category: normalizedCategory,
    questionText: String(question.question_text || "").trim(),
    options: normalizedOptions,
    preferredAnswer: String(question.preferred_answer || "").trim(),
    screeningRule,
    isActive: question.is_active !== false,
  });
}

function compareVersions(selected, previous) {
  const selectedQuestions = [...(selected?.screening_questions || [])]
    .filter((question) => !question.deprecated_at)
    .sort((a, b) => a.order - b.order);
  const previousQuestions = [...(previous?.screening_questions || [])]
    .filter((question) => !question.deprecated_at)
    .sort((a, b) => a.order - b.order);
  const previousByKey = new Map(
    previousQuestions.map((question) => [question.question_key, question])
  );
  const selectedKeys = new Set(
    selectedQuestions.map((question) => question.question_key)
  );

  const rows = selectedQuestions.map((question) => {
    const oldQuestion = previousByKey.get(question.question_key);
    return {
      question,
      status: !oldQuestion
        ? "added"
        : questionSignature(question) !== questionSignature(oldQuestion)
          ? "modified"
          : "unchanged",
    };
  });

  previousQuestions.forEach((question) => {
    if (!selectedKeys.has(question.question_key)) {
      rows.push({ question, status: "removed" });
    }
  });

  return rows;
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`${styles.toast} ${toast.error ? styles.toastError : ""}`}>
      {toast.error ? null : <FiCheck />} {toast.message}
    </div>
  );
}

export default function ScreeningQuestionHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [highlightChanges, setHighlightChanges] = useState(true);
  const [showUnmodified, setShowUnmodified] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [nameDialog, setNameDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const loadHistory = useCallback(async (preferredId = null) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API}/api/screening_question_set`, {
        credentials: "include",
        headers: headers(),
      });
      const versions = await readResponse(
        response,
        "Could not load version history."
      );
      setHistory(versions);
      setSelectedId((current) => {
        const wanted = preferredId || current;
        if (
          wanted &&
          versions.some(
            (version) => version.screening_question_set_id === wanted
          )
        ) {
          return wanted;
        }
        return (
          versions.find((version) => version.is_active)
            ?.screening_question_set_id ||
          versions[0]?.screening_question_set_id ||
          null
        );
      });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadHistory, 0);
    return () => window.clearTimeout(timer);
  }, [loadHistory]);

  useEffect(() => {
    function closeMenu(event) {
      if (!event.target.closest("[data-version-menu]")) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const selectedIndex = history.findIndex(
    (version) => version.screening_question_set_id === selectedId
  );
  const selected = selectedIndex >= 0 ? history[selectedIndex] : null;
  const previous = selectedIndex >= 0 ? history[selectedIndex + 1] : null;
  const comparedRows = useMemo(
    () => compareVersions(selected, previous),
    [selected, previous]
  );
  const changedCount = comparedRows.filter(
    (row) => row.status !== "unchanged"
  ).length;
  const displayedRows = comparedRows.filter(
    (row) =>
      showUnmodified || changedCount === 0 || row.status !== "unchanged"
  );
  const categories = [
    ...new Set(displayedRows.map((row) => row.question.category)),
  ];

  function notify(message, errorToast = false) {
    setToast({ message, error: errorToast });
    window.setTimeout(() => setToast(null), 3500);
  }

  async function restoreOrCopy(version, endpoint, successMessage) {
    setBusy(true);
    try {
      const response = await fetch(
        `${API}/api/screening_question_set/${version.screening_question_set_id}/${endpoint}`,
        {
          method: "POST",
          credentials: "include",
          headers: headers(),
        }
      );
      const body = await readResponse(response, "Could not create the version.");
      setDialog(null);
      await loadHistory(body.questionSet?.screening_question_set_id);
      notify(successMessage);
    } catch (actionError) {
      notify(actionError.message, true);
    } finally {
      setBusy(false);
    }
  }

  async function renameVersion(name) {
    setBusy(true);
    try {
      const response = await fetch(
        `${API}/api/screening_question_set/${nameDialog.screening_question_set_id}/name`,
        {
          method: "PUT",
          credentials: "include",
          headers: headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({ version: name }),
        }
      );
      await readResponse(response, "Could not name this version.");
      setNameDialog(null);
      await loadHistory();
      notify("The version name was updated.");
    } catch (renameError) {
      notify(renameError.message, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <Toast toast={toast} />
      <TextInputDialog
        open={Boolean(nameDialog)}
        title="Name this version"
        description="Give this snapshot a memorable name without changing its questions."
        label="Version name"
        initialValue={nameDialog?.version || ""}
        confirmLabel="Save name"
        onConfirm={renameVersion}
        onCancel={() => setNameDialog(null)}
      />
      <ConfirmDialog
        open={Boolean(dialog)}
        title={dialog?.title}
        description={dialog?.description}
        detail={dialog?.detail}
        confirmLabel={dialog?.confirmLabel}
        busy={busy}
        onCancel={() => setDialog(null)}
        onConfirm={() =>
          restoreOrCopy(dialog.version, dialog.endpoint, dialog.successMessage)
        }
      />

      <div className={styles.container}>
        <button
          type="button"
          className={styles.pageBackButton}
          onClick={() => router.push("/volunteer/screening-questions")}
        >
          <FiArrowLeft /> Back to Screening Questions
        </button>
      <header className={styles.topBar}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => router.push("/volunteer/screening-questions")}
        >
          <FiArrowLeft />
          <span className={styles.backLabel}>Back</span>
        </button>
        <div className={styles.selectedTitle}>
          <span className={styles.heroEyebrow}>Volunteer applications</span>
          <strong>Version History</strong>
          <p>
            Review published question sets, compare changes, and safely restore
            an earlier version.
          </p>
          {selected?.version && (
            <small>
              Viewing {selected.version} · {formatHeading(selected.created_at)}
            </small>
          )}
        </div>
        <button
          type="button"
          className={styles.restorePrimary}
          disabled={!selected || selected.is_active || busy}
          onClick={() =>
            setDialog({
              version: selected,
              endpoint: "restore",
              title: "Restore this version?",
              description:
                "This snapshot will become a new active version. The current version will remain in history.",
              detail: `${formatFullDate(selected.created_at)} · ${
                selected.screening_questions?.length || 0
              } questions`,
              confirmLabel: "Restore this version",
              successMessage: "The selected snapshot was restored as a new version.",
            })
          }
        >
          <FiRotateCcw />{" "}
          {selected?.is_active ? "Current Version" : "Restore This Version"}
        </button>
      </header>

      <div className={styles.workspace}>
        <section className={styles.previewPane}>
          {loading && (
            <div className={styles.state}>
              <FiRefreshCw className={styles.spin} /> Loading version history...
            </div>
          )}
          {error && <div className={`${styles.state} ${styles.error}`}>{error}</div>}
          {!loading && !error && selected && (
            <div className={styles.document}>
              <div className={styles.documentHeader}>
                <span>Volunteer application</span>
                <h1>Screening Questions</h1>
                <p>
                  Snapshot from {formatFullDate(selected.created_at)}
                  {selected.is_active ? " · Current version" : ""}
                </p>
              </div>

              {displayedRows.length === 0 ? (
                <div className={styles.noChanges}>
                  No changed questions in this version. Enable “Show unmodified
                  rows” to view the full snapshot.
                </div>
              ) : (
                <div className={styles.questionGroups}>
                  {categories.map((category) => (
                    <section className={styles.questionGroup} key={category}>
                      <h2>{humanizeCategory(category)}</h2>
                      {displayedRows
                        .filter((row) => row.question.category === category)
                        .map((row) => (
                          <article
                            key={`${row.question.question_key}-${row.status}`}
                            className={`${styles.questionCard} ${
                              highlightChanges ? styles[row.status] : ""
                            }`}
                          >
                            <div className={styles.questionMeta}>
                              <span>Question {row.question.order}</span>
                              {highlightChanges && row.status !== "unchanged" && (
                                <strong>{row.status}</strong>
                              )}
                            </div>
                            <h3>{row.question.question_text}</h3>
                            <div className={styles.answers}>
                              {(row.question.options || []).map((option) => (
                                <span
                                  key={option}
                                  className={
                                    option === row.question.preferred_answer
                                      ? styles.expected
                                      : ""
                                  }
                                >
                                  {option}
                                </span>
                              ))}
                            </div>
                          </article>
                        ))}
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <aside className={styles.historyPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Version history</h2>
              <span>
                {changedCount} changed question{changedCount === 1 ? "" : "s"}
              </span>
            </div>
            <button
              type="button"
              className={styles.collapseButton}
              onClick={() => setExpanded((current) => !current)}
              aria-label={expanded ? "Collapse versions" : "Expand versions"}
            >
              {expanded ? <FiChevronUp /> : <FiChevronDown />}
            </button>
          </div>

          <div className={styles.options}>
            <label>
              <input
                type="checkbox"
                checked={highlightChanges}
                onChange={(event) => setHighlightChanges(event.target.checked)}
              />
              Highlight question changes
            </label>
            <label>
              <input
                type="checkbox"
                checked={showUnmodified}
                onChange={(event) => setShowUnmodified(event.target.checked)}
              />
              Show all questions
            </label>
          </div>

          {expanded && (
            <div className={styles.versionList}>
              {history.map((version) => {
                const isSelected =
                  version.screening_question_set_id === selectedId;
                return (
                  <div
                    key={version.screening_question_set_id}
                    className={`${styles.versionItem} ${
                      isSelected ? styles.versionSelected : ""
                    }`}
                    onClick={() => {
                      setSelectedId(version.screening_question_set_id);
                      setOpenMenuId(null);
                    }}
                  >
                    <div className={styles.versionDetails}>
                      <strong>{formatHeading(version.created_at)}</strong>
                      <span className={styles.author}>
                        <i /> Admin / Staff
                      </span>
                      <small>
                        {version.version}
                        {version.is_active ? " · Current" : ""}
                      </small>
                    </div>
                    <div className={styles.menuWrap} data-version-menu>
                      <Tooltip text="Version actions" position="left">
                        <button
                          type="button"
                          className={styles.menuButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuId((current) =>
                              current === version.screening_question_set_id
                                ? null
                                : version.screening_question_set_id
                            );
                          }}
                        >
                          <FiMoreVertical />
                        </button>
                      </Tooltip>
                      {openMenuId === version.screening_question_set_id && (
                        <div className={styles.menu}>
                          {!version.is_active && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDialog({
                                  version,
                                  endpoint: "restore",
                                  title: "Restore this version?",
                                  description:
                                    "This snapshot will become a new active version.",
                                  confirmLabel: "Restore this version",
                                  successMessage:
                                    "The selected snapshot was restored.",
                                });
                                setOpenMenuId(null);
                              }}
                            >
                              <FiRotateCcw /> Restore this version
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setNameDialog(version);
                              setOpenMenuId(null);
                            }}
                          >
                            <FiEdit2 /> Name this version
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDialog({
                                version,
                                endpoint: "copy",
                                title: "Make a copy of this version?",
                                description:
                                  "A new active version will be created from this snapshot.",
                                confirmLabel: "Make a copy",
                                successMessage:
                                  "A new active copy was created.",
                              });
                              setOpenMenuId(null);
                            }}
                          >
                            <FiCopy /> Make a copy
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
      </div>
    </main>
  );
}
