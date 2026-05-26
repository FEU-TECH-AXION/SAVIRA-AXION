"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiChevronDown, FiChevronUp, FiAlertCircle, FiClock, FiX } from "react-icons/fi";
import { IoIosArrowBack } from "react-icons/io";
import styles from "./ViewApplication.module.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
  return null;
}

function capitalizeStatus(raw) {
  if (!raw) return "Pending";
  return raw
    .split("_")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  "Pending":   { bg: "#fef9c3", color: "#854d0e" },
  "Reviewing": { bg: "#dbeafe", color: "#1e40af" },
  "Approved":  { bg: "#d1fae5", color: "#065f46" },
  "Rejected":  { bg: "#fee2e2", color: "#991b1b" },
  "Withdrawn": { bg: "#f3f4f6", color: "#374151" },
  "Forfeited": { bg: "#f3f4f6", color: "#6b7280" },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 12px", borderRadius: 999,
      fontSize: "0.78rem", fontWeight: 700,
      background: s.bg, color: s.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
      {status}
    </span>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeadingText}>{title}</h2>
      {children}
    </section>
  );
}

// ─── Detail grid ─────────────────────────────────────────────────────────────

function DetailGrid({ rows }) {
  return (
    <div className={styles.detailGrid}>
      {rows.map(([k, v]) => (
        <div key={k} className={styles.detailItem}>
          <p className={styles.detailKey}>{k}</p>
          <p className={styles.detailVal}>{v ?? "—"}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button className={styles.modalClose} onClick={onClose}><FiX /></button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ─── Update Status Modal ──────────────────────────────────────────────────────

const APPLICATION_STATUSES = ["Pending", "Reviewing", "Approved", "Rejected", "Withdrawn", "Forfeited"];

function UpdateStatusModal({ open, onClose, appData, onSave }) {
  const [status, setStatus] = useState("Pending");
  const [notes, setNotes]   = useState("");

  useEffect(() => {
    if (appData) {
      setStatus(appData.applicationStatus || "Pending");
      setNotes(appData.reviewNotes || "");
    }
  }, [appData]);

  if (!appData) return null;

  async function handleSubmit() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/volunteer_applications/${appData.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getCookie("token")}`,
          },
          body: JSON.stringify({
            application_status: status.toLowerCase().replace(" ", "_"),
            notes,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to update status.");
      onSave({ ...appData, applicationStatus: status, reviewNotes: notes });
      onClose();
    } catch (err) {
      alert("Something went wrong: " + err.message);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Update Application Status">
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Applicant</label>
          <input className={styles.formInput} value={appData.name} disabled />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Status</label>
          <div className={styles.radioGroup}>
            {APPLICATION_STATUSES.map(s => (
              <label key={s} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="app-status"
                  value={s}
                  checked={status === s}
                  onChange={() => setStatus(s)}
                />
                {s}
              </label>
            ))}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Notes</label>
          <textarea
            className={styles.formInput}
            rows={3}
            placeholder="Optional reviewer notes…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ resize: "vertical" }}
          />
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSubmit}>Save</button>
      </div>
    </Modal>
  );
}

// ─── Application Details Tab ──────────────────────────────────────────────────

function ApplicationDetailsTab({ appData }) {
  const [showScreening, setShowScreening] = useState(false);

  const isScoutOrg = appData.organization === "BSP" || appData.organization === "GSP";
  const isOtherOrg = appData.organization === "Other";

  return (
    <div>
      {/* Applicant's Information */}
      <Section title="👤 Applicant's Information">
        <DetailGrid rows={[
          ["Full Name",       appData.name],
          ["Birthday",        appData.birthday],
          ["Age",             appData.age],
          ["Gender Identity", appData.gender],
          ["Pronouns",
            appData.pronouns === "he"   ? "He/Him/His" :
            appData.pronouns === "she"  ? "She/Her/Hers" :
            appData.pronouns === "they" ? "They/Them/Theirs" :
            appData.pronouns
          ],
          ["Organization",
            appData.organization === "BSP" ? "Boy Scouts of the Philippines (BSP)" :
            appData.organization === "GSP" ? "Girl Scouts of the Philippines (GSP)" :
            appData.organization
          ],
        ]} />
      </Section>

      {/* Scout organization details */}
      {isScoutOrg && (
        <Section title="🏕️ Scout Organization Details">
          <DetailGrid rows={[
            ["Council",                      appData.council],
            ["Region",                       appData.region],
            ["Tenure in Scouting",           appData.tenureInScouting],
            ["Rank",                         appData.rank],
            ["Scouting Membership Category", appData.scoutingMembership],
          ].filter(([, v]) => v)} />
        </Section>
      )}

      {/* Other org details */}
      {isOtherOrg && (
        <Section title="🏢 Affiliation Details">
          <DetailGrid rows={[
            ["Organization Type",   appData.organizationType],
            ...(appData.organizationType === "Other"
              ? [["Specified Type", appData.organizationTypeOther]]
              : []
            ),
            ...(appData.organizationType && appData.organizationType !== "No Organization / Independent"
              ? [
                  ["Organization Name", appData.orgName],
                  ["Organization City", appData.orgCity],
                ]
              : []
            ),
            ["Applicant's City / Municipality", appData.userCity],
          ].filter(([, v]) => v)} />
        </Section>
      )}

      {/* Contact & Consent */}
      <Section title="📞 Contact & Consent">
        <DetailGrid rows={[
          ["Contact Number",            appData.contactNumber],
          ["Email",                     appData.email],
          ["Willing to be Interviewed", appData.interview],
        ]} />
      </Section>

      {/* Screening Questions (collapsible) */}
      <section className={styles.section}>
        <button
          className={styles.screeningToggle}
          onClick={() => setShowScreening(s => !s)}
        >
          {showScreening ? <FiChevronUp /> : <FiChevronDown />}
          {showScreening ? "Hide" : "Show"} Screening Responses
        </button>

        {showScreening && (
          <div className={styles.screeningContent}>

            <div className={styles.screeningGroup}>
              <h3 className={styles.screeningGroupTitle}>Values &amp; Conduct</h3>
              <DetailGrid rows={[
                ["Survivors deserve dignity & respect",                              appData.survivorDignity],
                ["Follow confidentiality & safeguarding policies",                  appData.confidentialityPolicy],
                ["Harassment, discrimination & victim-blaming are unacceptable",    appData.noHarassment],
                ["Communicate respectfully regardless of background",               appData.respectfulComms],
              ]} />
            </div>

            <div className={styles.screeningDivider} />

            <div className={styles.screeningGroup}>
              <h3 className={styles.screeningGroupTitle}>Advocacy &amp; Participation</h3>
              <DetailGrid rows={[
                ["In favor of safer environments",   appData.saferEnvironments],
                ["Support advocacy efforts",         appData.advocacySupport],
                ["Enthusiastic to contribute",       appData.enthusiasm],
                ["Committed to professionalism",     appData.professionalism],
              ]} />
            </div>

            <div className={styles.screeningDivider} />

            <div className={styles.screeningGroup}>
              <h3 className={styles.screeningGroupTitle}>Learning &amp; Awareness</h3>
              <DetailGrid rows={[
                ["Familiar with gender equality issues",     appData.genderAwareness],
                ["Stays informed on social issues",          appData.stayInformed],
                ["Open to learning",                         appData.openToLearn],
                ["Comfortable with diverse teams",           appData.diverseTeams],
                ["Willing for orientations/trainings",       appData.orientationWilling],
                ["Able to dedicate time consistently",       appData.timeCommitment],
                ["Open to constructive feedback",            appData.feedbackWilling],
              ]} />
            </div>

            <div className={styles.screeningDivider} />

            <div className={styles.screeningGroup}>
              <h3 className={styles.screeningGroupTitle}>Expertise &amp; Interest</h3>
              <DetailGrid rows={[
                ["Fields with Background", appData.fieldsWithBackground],
                ["Fields of Interest",     appData.fieldsOfInterest],
                ["Hours per Week",         appData.hoursPerWeek],
              ]} />
            </div>

          </div>
        )}
      </section>

      {/* Essay */}
      <Section title="✍️ Essay">
        <div className={styles.essayBlock}>
          <p className={styles.detailKey}>Description / Personal Statement</p>
          <p className={styles.essayText}>{appData.essayDescription}</p>
        </div>
      </Section>

      {/* Application Status summary */}
      <Section title="📋 Application Status">
        <DetailGrid rows={[
          ["Current Status", <StatusBadge key="s" status={appData.applicationStatus} />],
          ["Date Applied",   appData.dateApplied],
          ["Reviewer Notes", appData.reviewNotes || "No notes yet."],
        ]} />
      </Section>
    </div>
  );
}

// ─── NLP Essay Analysis Tab (staff only) ─────────────────────────────────────

function NLPEssayTab({ appId, isAdmin }) {
  const [nlpData, setNlpData]       = useState(null);
  const [nlpLoading, setNlpLoading] = useState(false);
  const [nlpStatus, setNlpStatus]   = useState(null); // "processing" | "error" | null

  useEffect(() => {
    if (!appId) return;
    const fetchNlp = async () => {
      setNlpLoading(true);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_URL}/api/volunteer_applications/${appId}/nlp`, {
          credentials: "include",
        });
        if (res.status === 404) { setNlpStatus("processing"); return; }
        if (!res.ok) { setNlpStatus("error"); return; }
        const json = await res.json();
        setNlpData(json.data || json);
      } catch {
        setNlpStatus("error");
      } finally {
        setNlpLoading(false);
      }
    };
    fetchNlp();
  }, [appId]);

  const QualityBadge = ({ label, color }) => (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 999,
      fontSize: "0.78rem", fontWeight: 600,
      background: color?.bg || "#e1f5f5",
      color: color?.text || "#037F81",
      marginRight: 6, marginBottom: 4,
    }}>{label}</span>
  );

  const ScoreBar = ({ score, max = 10 }) => {
    const pct = Math.min(100, (score / max) * 100);
    const barColor = pct >= 70 ? "#16a34a" : pct >= 40 ? "#d97706" : "#dc2626";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
        <div style={{ flex: 1, height: 8, background: "#f3f4f6", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 999, transition: "width 0.4s ease" }} />
        </div>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: barColor, minWidth: 36 }}>{score}/{max}</span>
      </div>
    );
  };

  return (
    <div>
      {/* AI disclaimer */}
      <div style={{
        background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 8,
        padding: "10px 14px", marginBottom: "1.25rem",
        fontSize: "0.82rem", color: "#5b21b6",
        display: "flex", gap: 8, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: "1rem", flexShrink: 0 }}>🤖</span>
        <span>
          This analysis is <strong>AI-generated</strong> and is intended as a guide only.
          All decisions on volunteer applications remain with the reviewing officer.
        </span>
      </div>

      {nlpLoading && (
        <p style={{ fontSize: "0.875rem", color: "#6b7280", textAlign: "center", padding: "2rem" }}>
          Loading essay analysis…
        </p>
      )}

      {nlpStatus === "processing" && !nlpLoading && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8,
          padding: "12px 16px", fontSize: "0.875rem", color: "#92400e",
        }}>
          <FiClock style={{ flexShrink: 0 }} />
          NLP analysis is still processing. Refresh in a moment.
        </div>
      )}

      {nlpStatus === "error" && !nlpLoading && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8,
          padding: "12px 16px", fontSize: "0.875rem", color: "#991b1b",
        }}>
          <FiAlertCircle style={{ flexShrink: 0 }} />
          Could not load NLP analysis. Make sure the NLP service is running.
        </div>
      )}

      {nlpData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Essay Summary */}
          {nlpData.summary && (
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>
                📄 Essay Summary
              </h4>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#4b5563", lineHeight: 1.6 }}>
                {nlpData.summary}
              </p>
            </div>
          )}

          {/* Overall Quality Score */}
          {nlpData.overall_score != null && (
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>
                🏆 Overall Quality Score
              </h4>
              <ScoreBar score={nlpData.overall_score} max={10} />
              {nlpData.overall_label && (
                <div style={{ marginTop: 8 }}>
                  <QualityBadge
                    label={nlpData.overall_label}
                    color={
                      nlpData.overall_score >= 7
                        ? { bg: "#d1fae5", text: "#065f46" }
                        : nlpData.overall_score >= 4
                        ? { bg: "#fef3c7", text: "#92400e" }
                        : { bg: "#fee2e2", text: "#991b1b" }
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* Dimension Scores */}
          {nlpData.dimensions && Object.keys(nlpData.dimensions).length > 0 && (
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px" }}>
              <h4 style={{ margin: "0 0 12px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>
                📊 Evaluation Dimensions
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(nlpData.dimensions).map(([dim, score]) => (
                  <div key={dim}>
                    <p style={{ margin: "0 0 2px", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "capitalize" }}>
                      {dim.replace(/_/g, " ")}
                    </p>
                    <ScoreBar score={score} max={10} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {nlpData.strengths?.length > 0 && (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "14px 16px" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: "0.875rem", fontWeight: 700, color: "#166534" }}>
                ✅ Strengths
              </h4>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: 4 }}>
                {nlpData.strengths.map((s, i) => (
                  <li key={i} style={{ fontSize: "0.875rem", color: "#4b5563", lineHeight: 1.6 }}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Concerns */}
          {nlpData.concerns?.length > 0 && (
            <div style={{ background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 8, padding: "14px 16px" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: "0.875rem", fontWeight: 700, color: "#9a3412" }}>
                ⚠️ Areas of Concern
              </h4>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: 4 }}>
                {nlpData.concerns.map((c, i) => (
                  <li key={i} style={{ fontSize: "0.875rem", color: "#4b5563", lineHeight: 1.6 }}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendation */}
          {nlpData.recommendation && (
            <div style={{
              background: nlpData.recommend_approve ? "#f0fdf4" : "#fff7ed",
              border: `1px solid ${nlpData.recommend_approve ? "#86efac" : "#fdba74"}`,
              borderRadius: 8, padding: "14px 16px",
            }}>
              <h4 style={{
                margin: "0 0 6px", fontSize: "0.875rem", fontWeight: 700,
                color: nlpData.recommend_approve ? "#166534" : "#9a3412",
              }}>
                {nlpData.recommend_approve ? "👍 Recommended for Approval" : "👎 Further Review Suggested"}
              </h4>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#4b5563", lineHeight: 1.6 }}>
                {nlpData.recommendation}
              </p>
            </div>
          )}

          {/* Admin: technical details */}
          {isAdmin && (
            <details style={{ fontSize: "0.78rem", color: "#6b7280" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 6 }}>Technical Details</summary>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8, paddingLeft: 8 }}>
                {nlpData.model_used && <span><strong>Model:</strong> {nlpData.model_used}</span>}
                {nlpData.language_detected && <span><strong>Language detected:</strong> {nlpData.language_detected}</span>}
                {nlpData.word_count != null && <span><strong>Word count:</strong> {nlpData.word_count}</span>}
                {nlpData.anonymized_text && (
                  <>
                    <span><strong>Anonymized text:</strong></span>
                    <p style={{ margin: "4px 0 0", background: "#f3f4f6", padding: "8px 10px", borderRadius: 6, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {nlpData.anonymized_text}
                    </p>
                  </>
                )}
              </div>
            </details>
          )}

        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN VIEW APPLICATION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ViewApplication() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const appId        = searchParams.get("id");

  const [appData,     setAppData]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [toast,       setToast]       = useState(null);
  const [modal,       setModal]       = useState(null);
  const [user,        setUser]        = useState({ role: null });
  const [userLoaded,  setUserLoaded]  = useState(false);
  const [activeTab,   setActiveTab]   = useState("details");

  // ── Read user from cookie ─────────────────────────────────────────────────

  useEffect(() => {
    const c = getCookie("user");
    if (c) {
      try {
        const u = JSON.parse(c);
        setUser({ role: u.role_name, firstName: u.first_name, lastName: u.last_name });
      } catch (_) {}
    }
    setUserLoaded(true);
  }, []);

  // ── Fetch application ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!appId) { setError("No application ID provided."); setLoading(false); return; }

    async function fetchApp() {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API}/api/volunteer_applications/${appId}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Application not found.");
        }
        const data = await res.json();

        const computedAge = (() => {
          if (data.age) return String(data.age);
          if (!data.birthday) return "—";
          const birth = new Date(data.birthday);
          if (isNaN(birth.getTime())) return "—";
          const today = new Date();
          let age = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
          return String(age);
        })();

        setAppData({
          id:                    data.volunteer_application_id,
          applicationStatus:     capitalizeStatus(data.application_status),
          reviewNotes:           data.notes || "",
          dateApplied:           data.created_at
            ? new Date(data.created_at).toLocaleDateString("en-PH", {
                day: "2-digit", month: "short", year: "numeric",
              })
            : "—",

          // ── Step 0: Applicant's Info ──
          name:                  data.name || "—",
          birthday:              data.birthday || "—",
          age:                   computedAge,
          gender:                data.gender_identity || "—",
          pronouns:              data.pronouns || "—",
          organization:          data.organization || "—",

          // Scout fields
          council:               data.council || null,
          region:                data.region || "National Capital Region (NCR)",
          tenureInScouting:      data.tenure_in_scouting ? `${data.tenure_in_scouting} year(s)` : null,
          rank:                  data.rank || null,
          scoutingMembership:    data.scouting_membership || null,

          // Other org fields
          organizationType:      data.organization_type || null,
          organizationTypeOther: data.organization_type_other || null,
          orgName:               data.org_name || null,
          orgCity:               data.org_city || null,
          userCity:              data.user_city || null,

          // Contact & consent
          contactNumber:         data.contact_number || "—",
          email:                 data.email || "—",
          interview:             data.is_willing_for_interview ? "Yes" : "No",

          // ── Step 1: Screening Questions ──
          // Values & Conduct
          survivorDignity:       data.survivor_dignity || "—",
          confidentialityPolicy: data.confidentiality_policy || "—",
          noHarassment:          data.no_harassment || "—",
          respectfulComms:       data.respectful_comms || "—",

          // Advocacy & Participation
          saferEnvironments:     data.safer_environments || "—",
          advocacySupport:       data.advocacy_support || "—",
          enthusiasm:            data.enthusiasm || "—",
          professionalism:       data.professionalism || "—",

          // Learning & Awareness
          genderAwareness:       data.gender_awareness || "—",
          stayInformed:          data.stay_informed || "—",
          openToLearn:           data.open_to_learn || "—",
          diverseTeams:          data.diverse_teams || "—",
          orientationWilling:    data.orientation_willing || "—",
          timeCommitment:        data.time_commitment || "—",
          feedbackWilling:       data.feedback_willing || "—",

          // Expertise & Interest
          fieldsWithBackground:  Array.isArray(data.fields_with_background)
            ? data.fields_with_background.join(", ")
            : data.fields_with_background || "—",
          fieldsOfInterest:      Array.isArray(data.fields_of_interest)
            ? data.fields_of_interest.join(", ")
            : data.fields_of_interest || "—",
          hoursPerWeek:          data.hours_per_week || "—",

          // ── Step 2: Essay ──
          essayDescription:      data.essay_description || data.description || "—",
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchApp();
  }, [appId]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const isAdmin       = user.role?.toLowerCase() === "admin";
  const isCaseOfficer = user.role?.toLowerCase()?.includes("officer");
  const isStaff       = isAdmin || isCaseOfficer;

  // ── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.pageWrapper} style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>Loading application…</p>
      </div>
    );
  }

  if (error || !appData) {
    return (
      <div className={styles.pageWrapper} style={{ padding: "2rem" }}>
        <button className={styles.backBtn} onClick={() => router.push("/volunteer/manage")}>
          <IoIosArrowBack /> Back to Volunteer Management
        </button>
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px 16px", color: "#991b1b" }}>
          {error || "Application not found."}
        </div>
      </div>
    );
  }

  // ── Tab definitions — staff gets details + NLP, applicant gets details only ──

  const tabs = [
    { id: "details", label: "📄 Application Details", staffOnly: false },
    ...(isStaff ? [
      { id: "nlp", label: "🤖 AI / NLP Analysis", staffOnly: true },
    ] : []),
  ];

  const tabStyle = (id) => ({
    padding: "10px 20px",
    border: "none",
    borderBottom: activeTab === id ? "2px solid #037F81" : "2px solid transparent",
    background: "none",
    color: activeTab === id ? "#037F81" : "#6b7280",
    fontWeight: activeTab === id ? 700 : 500,
    cursor: "pointer",
    fontSize: "0.875rem",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.pageWrapper}>

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}>
          {toast.msg}
        </div>
      )}

      <div className={styles.pageInner}>

        {/* ── Header card ── */}
        <div className={styles.headerCard}>
          <button className={styles.backBtn} onClick={() => router.push("/volunteer/manage")}>
            <IoIosArrowBack /> Back to Volunteer Management
          </button>

          <div className={styles.headerTop}>
            <div>
              <h1 className={styles.headerName}>{appData.name}</h1>
              <p className={styles.headerMeta}>
                App ID: <strong>{appData.id}</strong>
                {" · "}
                Date Applied: <strong>{appData.dateApplied}</strong>
              </p>
            </div>
            <div className={styles.headerRight}>
              <StatusBadge status={appData.applicationStatus} />
              {isStaff && (
                <button
                  className={styles.btnPrimary}
                  onClick={() => setModal("updateStatus")}
                  style={{ marginTop: "0.5rem" }}
                >
                  Update Status
                </button>
              )}
            </div>
          </div>

          {appData.reviewNotes && (
            <div className={styles.reviewNotice}>
              <span>📝</span>
              <p><strong>Reviewer Notes:</strong> {appData.reviewNotes}</p>
            </div>
          )}
        </div>

        {/* ── Content card with tabs ── */}
        <div className={styles.contentCard}>

          {/* Tab bar */}
          <div style={{
            display: "flex",
            borderBottom: "1px solid #e5e7eb",
            marginBottom: "1.75rem",
            overflowX: "auto",
            gap: 0,
          }}>
            {tabs.map((t) => (
              <button key={t.id} style={tabStyle(t.id)} onClick={() => setActiveTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "details" && userLoaded && (
            <ApplicationDetailsTab appData={appData} />
          )}

          {activeTab === "nlp" && isStaff && userLoaded && (
            <NLPEssayTab appId={appData.id} isAdmin={isAdmin} />
          )}

        </div>
      </div>

      {/* ── Modals ── */}
      <UpdateStatusModal
        open={modal === "updateStatus"}
        onClose={() => setModal(null)}
        appData={appData}
        onSave={(updated) => {
          setAppData(updated);
          showToast(`Status updated to ${updated.applicationStatus}.`);
          setModal(null);
        }}
      />
    </div>
  );
}