"use client";

import { useEffect, useState } from "react";
import { FiAlertCircle, FiClock } from "react-icons/fi";
import { IoIosAlert } from "react-icons/io";
import styles from "./ViewCase.module.css";
import { authFetch } from "@/lib/AuthContext";
import { API_URL } from "@/lib/internalApiFetch";

export default function NLPAnalysisTab({ caseReportId, isAdmin, onRequestClarification }) {
  const [nlpData, setNlpData]     = useState(null);
  const [nlpLoading, setNlpLoading] = useState(false);
  const [nlpStatus, setNlpStatus]   = useState(null);

  useEffect(() => {
    if (!caseReportId) return;
    const fetchNlp = async () => {
      setNlpLoading(true);
      try {
        const res = await authFetch(`${API_URL}/api/case_reports/${caseReportId}/nlp`);
        if (res.status === 202 || res.status === 404) {
          setNlpData(null);
          setNlpStatus("processing");
          return;
        }
        if (!res.ok) {
          setNlpData(null);
          setNlpStatus(res.status === 502 ? "failed" : "error");
          return;
        }
        const json = await res.json();
        setNlpData(json.data || json);
        setNlpStatus(null);
      } catch {
        setNlpData(null);
        setNlpStatus("error");
      } finally {
        setNlpLoading(false);
      }
    };
    fetchNlp();
  }, [caseReportId]);

  // const CategoryBadge = ({ label }) => (
  //   <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 600, background: "#e1f5f5", color: "#037F81", marginRight: 6, marginBottom: 4 }}>{label}</span>
  // );
  // const CaseTypeBadge = ({ label }) => (
  //   <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 600, background: "#f3e8ff", color: "#6b21a8", marginRight: 6, marginBottom: 4 }}>{label}</span>
  // );

  const CONFIDENCE_COLORS = {
    high:     { bar: "#16a34a", bg: "#f0fdf4", border: "#86efac", label: "#166534" },
    moderate: { bar: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "#92400e" },
    low:      { bar: "#9ca3af", bg: "#f9fafb", border: "#e5e7eb", label: "#6b7280" },
  };

  const ConfidenceBar = ({ confidence }) => {
    const c     = CONFIDENCE_COLORS[confidence] || CONFIDENCE_COLORS.low;
    const width = confidence === "high" ? "85%" : confidence === "moderate" ? "50%" : "25%";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width, height: "100%", background: c.bar, borderRadius: 999, transition: "width 0.4s ease" }} />
        </div>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "capitalize", color: c.label, minWidth: 64 }}>
          {confidence} confidence
        </span>
      </div>
    );
  };

  const ClassificationCard = ({ item, type }) => {
    const isObj      = typeof item === "object" && item !== null;
    const label      = isObj ? (item.category || item.type) : item;
    const confidence = isObj ? item.confidence : null;
    const basis      = isObj ? item.basis : null;
    const c          = CONFIDENCE_COLORS[confidence] || { bg: "#f9fafb", border: "#e5e7eb" };
    {nlpData.primary_categories?.length > 0
      ? nlpData.primary_categories.map((c, i) => {
          // ── Parse if item is a JSON string instead of an object ──
          let item = c;
          if (typeof c === "string") {
            try { item = JSON.parse(c); } catch { item = { category: c }; }
          }
          return <ClassificationCard key={i} item={item} type="category" />;
        })
      : <p style={{ fontSize: "0.82rem", color: "#9ca3af", marginBottom: 12 }}>None suggested</p>
    }

    {nlpData.case_types?.length > 0
      ? nlpData.case_types.map((t, i) => {
          // ── Parse if item is a JSON string instead of an object ──
          let item = t;
          if (typeof t === "string") {
            try { item = JSON.parse(t); } catch { item = { type: t }; }
          }
          return <ClassificationCard key={i} item={item} type="type" />;
        })
      : <p style={{ fontSize: "0.82rem", color: "#9ca3af" }}>None suggested</p>
    }
    return (
      <div className={styles.nlpClassificationCard} style={{ background: c.bg, borderColor: c.border }}>
        <span className={`${styles.nlpBadge} ${type === "category" ? styles.nlpBadgeCategory : styles.nlpBadgeType}`}>
          {label}
        </span>
        {confidence && <ConfidenceBar confidence={confidence} />}
        {basis && (
          <p style={{ margin: "6px 0 0", fontSize: "0.78rem", color: "#4b5563", lineHeight: 1.5, fontStyle: "italic" }}>
            &quot;{basis}&quot;
          </p>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* AI disclaimer */}
      <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "10px 14px", marginBottom: "1.25rem", fontSize: "0.82rem", color: "#9a3412", display: "flex", gap: 8, alignItems: "flex-start" }}>
        <span>This analysis is <strong>AI-generated</strong> and is intended as a guide only. All decisions remain with the case officer and are subject to admin approval.</span>
      </div>

      {nlpLoading && <p style={{ fontSize: "0.875rem", color: "#6b7280", textAlign: "center", padding: "2rem" }}>Loading analysis...</p>}

      {nlpStatus === "processing" && !nlpLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "12px 16px", fontSize: "0.875rem", color: "#92400e" }}>
          <FiClock style={{ flexShrink: 0 }} />
          NLP analysis is still processing. Refresh in a moment.
        </div>
      )}

      {nlpStatus === "error" && !nlpLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px 16px", fontSize: "0.875rem", color: "#991b1b" }}>
          <FiAlertCircle style={{ flexShrink: 0 }} />
          Could not load NLP analysis. Make sure the NLP service is running.
        </div>
      )}

      {nlpStatus === "failed" && !nlpLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px 16px", fontSize: "0.875rem", color: "#991b1b" }}>
          <FiAlertCircle style={{ flexShrink: 0 }} />
          NLP analysis failed on the server. Check the backend NLP service URL and logs, then rerun analysis for this case.
        </div>
      )}

      {nlpData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {nlpData.summary && (
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>Incident Summary</h4>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#4b5563", lineHeight: 1.6 }}>{nlpData.summary}</p>
            </div>
          )}

    
          <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px" }}>
            <h4 style={{ margin: "0 0 6px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>
              Suggested Classification
            </h4>

            {/* Confidence tier disclaimer */}
            <p style={{ margin: "0 0 12px", fontSize: "0.75rem", color: "#9ca3af", fontStyle: "italic", lineHeight: 1.5 }}>
              Confidence tiers reflect the AI&apos;s assessment based on language in the report — not statistical probabilities.
              High = clearly described · Moderate = implied · Low = vaguely suggested.
            </p>

            {/* Case Categories */}
            <p style={{ margin: "0 0 6px", fontSize: "0.78rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Case Categories
            </p>
            {nlpData.primary_categories?.length > 0
              ? nlpData.primary_categories.map((c, i) => <ClassificationCard key={i} item={c} type="category" />)
              : <p style={{ fontSize: "0.82rem", color: "#9ca3af", marginBottom: 12 }}>None suggested</p>
            }

            {/* Case Types */}
            <p style={{ margin: "8px 0 6px", fontSize: "0.78rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Case Types
            </p>
            {nlpData.case_types?.length > 0
              ? nlpData.case_types.map((t, i) => <ClassificationCard key={i} item={t} type="type" />)
              : <p style={{ fontSize: "0.82rem", color: "#9ca3af" }}>None suggested</p>
            }

            {/* Classification Notes */}
            {nlpData.classification_notes && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e5e7eb" }}>
                <p style={{ margin: "0 0 4px", fontSize: "0.78rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</p>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#4b5563", lineHeight: 1.6 }}>{nlpData.classification_notes}</p>
              </div>
            )}
          </div>

          <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>Suggested Next Steps</h4>
            {nlpData.recommended_steps?.length > 0 ? (
              <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: 6 }}>
                {nlpData.recommended_steps.map((step, i) => <li key={i} style={{ fontSize: "0.875rem", color: "#4b5563", lineHeight: 1.6 }}>{step}</li>)}
              </ol>
            ) : <p style={{ margin: 0, fontSize: "0.82rem", color: "#9ca3af" }}>No steps suggested.</p>}
          </div>

          <div className={`${styles.nlpResultBox} ${nlpData.referral_suggested ? styles.nlpResultWarning : styles.nlpResultSuccess}`}>
            <h4 style={{ margin: "0 0 6px", fontSize: "0.875rem", fontWeight: 700 }}>
              {nlpData.referral_suggested ? "Referral may be appropriate" : "May be resolvable internally"}
            </h4>
            {nlpData.referral_notes && <p style={{ margin: 0, fontSize: "0.82rem", color: "#4b5563", lineHeight: 1.6 }}>{nlpData.referral_notes}</p>}
          </div>

          {isAdmin && (
            <details style={{ fontSize: "0.78rem", color: "#6b7280" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 6 }}>Technical Details</summary>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8, paddingLeft: 8 }}>
                <span><strong>Model:</strong> {nlpData.model_used}</span>
                <span><strong>Language detected:</strong> {nlpData.language_detected}</span>
                <span><strong>PII detected and masked:</strong> {nlpData.detected_pii?.join(", ") || "None"}</span>
                <span><strong>Anonymized text:</strong></span>
                <p style={{ margin: "4px 0 0", background: "#f3f4f6", padding: "8px 10px", borderRadius: 6, lineHeight: 1.6 }}>{nlpData.anonymized_text}</p>
              </div>
            </details>
          )}

          {/* ── Clarification Warning ── */}
          {nlpData.needs_clarification && (
              <div style={{
                  background: "#fffbeb",
                  border: "1px solid #fcd34d",
                  borderRadius: 8,
                  padding: "12px 16px",
                  marginBottom: "1.25rem",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
              }}>
                  <span style={{ fontSize: "1.1rem", flexShrink: 0, margin: 0, color: "#92400e"  }}><IoIosAlert /></span>
                  <div>
                      <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 700, color: "#92400e" }}>
                          Report Needs Clarification
                      </p>
                      <p style={{ margin: "4px 0 8px", fontSize: "0.82rem", color: "#78350f", lineHeight: 1.6 }}>
                          {nlpData.clarification_reason}
                      </p>
                      <button
                          onClick={onRequestClarification}
                          style={{
                              background: "#d97706", color: "#fff",
                              border: "none", borderRadius: 999,
                              padding: "6px 16px", fontSize: "0.82rem",
                              fontWeight: 700, cursor: "pointer",
                          }}
                      >
                          Request Clarification
                      </button>
                  </div>
              </div>
          )}

          {/* ── Report Structure Assessment ── */}
          {nlpData.report_structure && (
              <div style={{
                  background: "#f9fafb", borderRadius: 8,
                  padding: "14px 16px", marginBottom: "1.25rem",
                  border: "1px solid #e5e7eb",
              }}>
                  <h4 style={{ margin: "0 0 12px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>
                      Report Structure Assessment
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                          { key: "has_introduction", label: "Introduction", notes: nlpData.report_structure.introduction_notes },
                          { key: "has_body",         label: "Body",         notes: nlpData.report_structure.body_notes },
                          { key: "has_conclusion",   label: "Conclusion",   notes: nlpData.report_structure.conclusion_notes },
                      ].map(({ key, label, notes }) => (
                          <div
                              key={key}
                              className={`${styles.nlpStructureItem} ${nlpData.report_structure[key] ? styles.nlpStructurePass : styles.nlpStructureFail}`}
                          >
                              <span style={{
                                  fontSize: "0.85rem", fontWeight: 700, minWidth: 20,
                                  color: nlpData.report_structure[key] ? "#16a34a" : "#dc2626",
                              }}>
                                  {nlpData.report_structure[key] ? "✓" : "✗"}
                              </span>
                              <div>
                                  <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: "#374151" }}>
                                      {label}
                                  </p>
                                  {notes && (
                                      <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#6b7280", lineHeight: 1.5 }}>
                                          {notes}
                                      </p>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>

                  {/* Clarity score */}
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151" }}>
                          Clarity Score
                      </span>
                      <div style={{ display: "flex", gap: 3 }}>
                          {[1,2,3,4,5].map(n => (
                              <div key={n} style={{
                                  width: 20, height: 8, borderRadius: 999,
                                  background: n <= nlpData.clarity_score
                                      ? nlpData.clarity_score >= 4 ? "#16a34a"
                                      : nlpData.clarity_score >= 3 ? "#d97706" : "#dc2626"
                                      : "#e5e7eb",
                              }} />
                          ))}
                      </div>
                      <span style={{
                          fontSize: "0.78rem", fontWeight: 700,
                          color: nlpData.clarity_score >= 4 ? "#16a34a"
                              : nlpData.clarity_score >= 3 ? "#d97706" : "#dc2626",
                      }}>
                          {nlpData.clarity_score}/5 — {
                              nlpData.clarity_score >= 4 ? "Clear" :
                              nlpData.clarity_score >= 3 ? "Moderate" : "Vague"
                          }
                      </span>
                  </div>
              </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Invite to Interview Modal ────────────────────────────────────────────────
