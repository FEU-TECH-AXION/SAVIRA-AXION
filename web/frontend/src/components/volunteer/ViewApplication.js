"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiChevronDown, FiChevronUp, FiAlertCircle, FiClock, FiX } from "react-icons/fi";
import { IoIosArrowBack, IoIosInformationCircle, IoIosWarning  } from "react-icons/io";
import styles from "./ViewApplication.module.css";
import InterviewTab from "../volunteerInterviews/InterviewTab";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { ConfirmDialog } from "@/components/ui/Dialog";

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
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span className={styles.statusBadgeDynamic} style={{ background: s.bg, color: s.color }}>
      <span className={styles.statusDot} />
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

const APPLICATION_STATUSES = ["Pending", "Reviewing", "Approved", "Rejected"];

function UpdateStatusModal({ open, onClose, appData, onSave }) {
  const [status, setStatus] = useState("Pending");
  const [notes, setNotes]   = useState("");
  const [errorMsg, setErrorMsg] = useState("");  // ← add this

  useEffect(() => {
    if (appData) {
      setStatus(appData.applicationStatus || "Pending");
      setNotes(appData.reviewNotes || "");
      setErrorMsg("");  // ← reset on open
    }
  }, [appData]);

  if (!appData) return null;

  async function handleSubmit() {
    setErrorMsg("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/volunteer_applications/${appData.id}`,
        {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            application_status: status.toLowerCase().replace(" ", "_"),
            notes,
          }),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        setErrorMsg(result.error || "Failed to update status.");  // ← inline error
        return;
      }

      onSave({ ...appData, applicationStatus: status, reviewNotes: notes });
      onClose();
    } catch (err) {
      setErrorMsg("Something went wrong: " + err.message);
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
          />
        </div>

        {/* ← error banner */}
        {errorMsg && (
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "8px",
            padding: "10px 14px",
            color: "#991b1b",
            fontSize: "0.875rem",
          }}>
            <FiAlertCircle style={{ marginTop: "2px", flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSubmit}>Save</button>
      </div>
    </Modal>
  );
}

// ─── Screening answer badge ───────────────────────────────────────────────────

function YesNoBadge({ value }) {
  const raw = String(value || "").toLowerCase().trim();
  const isYes = raw === "yes" || raw === "true" || raw === "1" || raw === "strongly agree" || raw === "agree";
  const isNo  = raw === "no"  || raw === "false" || raw === "0" || raw === "disagree" || raw === "strongly disagree";
  if (!value || value === "—") return <span className={styles.yesNoBadgeEmpty}>—</span>;
  return (
    <span className={styles.yesNoBadge} style={{
      background: isYes ? "#d1fae5" : isNo ? "#fee2e2" : "#f3f4f6",
      color:      isYes ? "#065f46" : isNo ? "#991b1b" : "#374151",
    }}>
      {isYes ? "Yes" : isNo ? "No" : value}
    </span>
  );
}

function ScreeningGrid({ rows }) {
  return (
    <div className={styles.screeningGridList}>
      {rows.map(([label, value]) => (
        <div key={label} className={styles.screeningGridRow}>
          <span className={styles.screeningGridLabel}>{label}</span>
          <YesNoBadge value={value} />
        </div>
      ))}
    </div>
  );
}

// ─── Applicant Scores Tab (visible to applicant when Approved/Rejected) ────────

function ApplicantScoresTab({ appData }) {
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appData?.id) return;
    async function fetchScores() {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const [essayRes, interviewRes] = await Promise.all([
          fetch(`${API}/api/volunteer_applications/${appData.id}/essay_evaluation`, { credentials: "include" }),
          fetch(`${API}/api/volunteer_applications/${appData.id}/interview_evaluation`, { credentials: "include" }),
        ]);
        const essayJson     = essayRes.ok     ? await essayRes.json()     : {};
        const interviewJson = interviewRes.ok ? await interviewRes.json() : {};
        setScores({
          essay:     essayJson.data     || essayJson     || {},
          interview: interviewJson.data || interviewJson || {},
        });
      } catch (_) {}
      finally { setLoading(false); }
    }
    fetchScores();
  }, [appData?.id]);

  // ScoreBar is shared — defined at module level

  if (loading) return <p className={styles.scoresLoadingText}>Loading your scores…</p>;

  const statusColor = appData.applicationStatus === "Approved" ? { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" } : { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" };

  return (
    <div className={styles.scoresTabWrap}>
      {/* Result banner */}
      <div className={styles.resultBanner} style={{ background: statusColor.bg, border: `1px solid ${statusColor.border}` }}>
        <div>
          <p className={styles.resultBannerTitle} style={{ color: statusColor.text }}>
            Application {appData.applicationStatus}
          </p>
          <p className={styles.resultBannerSub} style={{ color: statusColor.text }}>
            {appData.applicationStatus === "Approved"
              ? "Congratulations! You have been selected as a SASHA volunteer."
              : "Thank you for applying. You may reapply in the next cycle."}
          </p>
        </div>
      </div>

      {/* Essay scores breakdown */}
      {scores?.essay && Object.keys(scores.essay).some(k => ["alignment","maturity","commitment","clarity","experience"].includes(k)) && (
        <div className={styles.evalBlock}>
          <h3 className={styles.evalBlockTitle}>Essay Evaluation</h3>
          {[
            { key: "alignment",  label: "Alignment with SASHA's Mission",        weight: 30 },
            { key: "maturity",   label: "Maturity and Judgment",                  weight: 20 },
            { key: "commitment", label: "Commitment and Reliability",              weight: 20 },
            { key: "clarity",    label: "Writing Clarity and Thoughtfulness",      weight: 15 },
            { key: "experience", label: "Relevant Experience / Transferable Skills", weight: 15 },
          ].map(c => scores.essay[c.key] > 0 ? (
            <div key={c.key} className={styles.evalCriterionItem}>
              <div className={styles.evalCriterionHeader}>
                <span className={styles.evalCriterionLabel}>{c.label}</span>
                <span className={styles.evalCriterionWeight}>{c.weight}% weight</span>
              </div>
              <ScoreBar score={scores.essay[c.key]} max={10} />
            </div>
          ) : null)}
          {scores.essay.notes && (
            <div className={styles.evalNotesBox}>
              <p className={styles.evalNotesLabel}>Reviewer Notes</p>
              <p className={styles.evalNotesText}>{scores.essay.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Interview score */}
      {scores?.interview?.score > 0 && (
        <div className={styles.evalBlock}>
          <h3 className={styles.evalBlockTitleSm}>Interview Score</h3>
          <ScoreBar score={scores.interview.score} max={10} />
          {scores.interview.notes && (
            <div className={styles.evalNotesBox}>
              <p className={styles.evalNotesLabel}>Reviewer Notes</p>
              <p className={styles.evalNotesText}>{scores.interview.notes}</p>
            </div>
          )}
        </div>
      )}

      {!scores?.essay && !scores?.interview?.score && (
        <p className={styles.scoresEmptyText}>Scores are not yet available for this application.</p>
      )}
    </div>
  );
}

// ─── Application Details Tab ──────────────────────────────────────────────────

function ApplicationDetailsTab({ appData, isStaff }) {
  const [showScreening, setShowScreening] = useState(false);

  const isScoutOrg = appData.organization === "BSP" || appData.organization === "GSP";
  const isOtherOrg = appData.organization === "Other";

  return (
    <div>
      {/* Applicant's Information */}
      <Section title="Applicant's Information">
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
        <Section title="Scout Organization Details">
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
        <Section title="Affiliation Details">
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
      <Section title="Contact & Consent">
        <DetailGrid rows={[
          ["Contact Number",            appData.contactNumber],
          ["Email",                     appData.email],
          ["Willing to be Interviewed", appData.interview],
        ]} />
      </Section>

      {/* Screening Questions (collapsible) */}
      <Section title="Screening Questions">
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
              <ScreeningGrid rows={[
                ["Survivors deserve dignity & respect",                              appData.survivorDignity],
                ["Follow confidentiality & safeguarding policies",                  appData.confidentialityPolicy],
                ["Harassment, discrimination & victim-blaming are unacceptable",    appData.noHarassment],
                ["Communicate respectfully regardless of background",               appData.respectfulComms],
              ]} />
            </div>

            <div className={styles.screeningDivider} />

            <div className={styles.screeningGroup}>
              <h3 className={styles.screeningGroupTitle}>Advocacy &amp; Participation</h3>
              <ScreeningGrid rows={[
                ["In favor of safer environments",   appData.saferEnvironments],
                ["Support advocacy efforts",         appData.advocacySupport],
                ["Enthusiastic to contribute",       appData.enthusiasm],
                ["Committed to professionalism",     appData.professionalism],
              ]} />
            </div>

            <div className={styles.screeningDivider} />

            <div className={styles.screeningGroup}>
              <h3 className={styles.screeningGroupTitle}>Learning &amp; Awareness</h3>
              <ScreeningGrid rows={[
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

            

          </div>
        )}
        <div className={styles.screeningGroup}>
              <h3 className={styles.screeningGroupTitle}>Expertise &amp; Interest</h3>
              <DetailGrid rows={[
                ["Fields with Background", appData.fieldsWithBackground],
                ["Fields of Interest",     appData.fieldsOfInterest],
                ["Hours per Week",         appData.hoursPerWeek],
              ]} />
            </div>
      </section>
      </Section>

      {/* Essay */}
      <Section title="Essay">
        <div className={styles.essayBlock}>
          <p className={styles.detailKey}>Applicant Statement</p>
          <p className={styles.essayText}>{appData.essayDescription}</p>
        </div>
      </Section>

      {/* Application Status summary */}
      <Section title="Application Status">
        <DetailGrid rows={[
          ["Current Status",     <StatusBadge key="s" status={appData.applicationStatus} />],
          ["Date Applied",       appData.dateApplied],
          ["Assigned Evaluator", appData.assignedEvaluator || "Unassigned"],
          ["Reviewer Notes",     appData.reviewNotes || "No notes yet."],
        ]} />
      </Section>
    </div>
  );
}

// ─── Application Evaluation Tab (staff only) ─────────────────────────────────

const ESSAY_CRITERIA = [
  { key: "alignment",    label: "Alignment with SASHA's Mission",       weight: 30, hint: "Does the applicant understand survivor-centered, gender-sensitive, and accountability-based work?" },
  { key: "maturity",     label: "Maturity and Judgment",                 weight: 20, hint: "Does the essay show discretion, empathy, and seriousness in handling sensitive matters?" },
  { key: "commitment",   label: "Commitment and Reliability",            weight: 20, hint: "Does the applicant show realistic availability and willingness to do sustained work?" },
  { key: "clarity",      label: "Writing Clarity and Thoughtfulness",    weight: 15, hint: "Is the essay coherent, reflective, and understandable?" },
  { key: "experience",   label: "Relevant Experience / Transferable Skills", weight: 15, hint: "Advocacy, community work, peer support, writing, research, documentation, legal or psychosocial exposure." },
];

// Scoring helpers
function weightedEssayScore(scores) {
  return ESSAY_CRITERIA.reduce((sum, c) => {
    const raw = Number(scores[c.key] ?? 0);
    return sum + (raw / 10) * c.weight;
  }, 0);
}

function ScoreBar({ score, max = 10, color }) {
  const pct = Math.min(100, (score / max) * 100);
  const barColor = color || (pct >= 70 ? "#16a34a" : pct >= 40 ? "#d97706" : "#dc2626");
  return (
    <div className={styles.scoreBarWrap}>
      <div className={styles.scoreBarTrack}>
        <div className={styles.scoreBarFill} style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <span className={styles.scoreBarLabel} style={{ color: barColor }}>{score}/{max}</span>
    </div>
  );
}

function RatingStars({ value, onChange, disabled }) {
  return (
    <div className={styles.ratingStarsRow}>
      {[...Array(10)].map((_, i) => {
        const v = i + 1;
        const active = v <= value;
        return (
          <button
            key={v}
            disabled={disabled}
            onClick={() => onChange(v)}
            className={active ? styles.ratingStarActive : styles.ratingStar}
            style={{ cursor: disabled ? "default" : "pointer" }}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

function ApplicationEvaluationTab({ appData, isAdmin, canEdit, onUpdateStatus }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // ── State ──────────────────────────────────────────────────────────────────

  // Quantitative scores (non-negotiable & negotiable from screening)
  const [quantScores, setQuantScores] = useState(null);
  const [quantLoading, setQuantLoading] = useState(true);

  // Essay rubric scores (qualitative – manual input)
  const [essayScores, setEssayScores] = useState({
    alignment: 0, maturity: 0, commitment: 0, clarity: 0, experience: 0,
  });
  const [essayNotes, setEssayNotes] = useState("");
  const [essaySaving, setEssaySaving] = useState(false);
  const [essaySaved, setEssaySaved] = useState(false);
  const [essayLoaded, setEssayLoaded] = useState(false);
  const [essayAggregate, setEssayAggregate] = useState(null);
  const [nlpEssayScore, setNlpEssayScore] = useState(0);

  // Interview score
  const [interviewScore, setInterviewScore] = useState(0);
  const [interviewNotes, setInterviewNotes] = useState("");
  const [interviewSaving, setInterviewSaving] = useState(false);
  const [interviewSaved, setInterviewSaved] = useState(false);
  const [interviewLoaded, setInterviewLoaded] = useState(false);

  // ── Fetch quantitative scores ──────────────────────────────────────────────

  useEffect(() => {
    if (!appData?.id) return;
    async function fetchQuant() {
      try {
        const res = await fetch(
          `${API_URL}/api/volunteer_applications/${appData.id}/scores`,
          { credentials: "include" }
        );
        if (res.ok) {
          const json = await res.json();
          setQuantScores(json.data || json);
        }
      } catch (_) {}
      finally { setQuantLoading(false); }
    }
    fetchQuant();
  }, [appData?.id]);

  // ── Fetch saved essay rubric scores ───────────────────────────────────────

  useEffect(() => {
    if (!appData?.id) return;
    async function fetchEssay() {
      try {
        const res = await fetch(
          `${API_URL}/api/volunteer_applications/${appData.id}/essay_evaluation`,
          { credentials: "include" }
        );
        if (res.ok) {
          const json = await res.json();
          const d = json.data || json;
          setEssayScores({
            alignment:  d.alignment  ?? 0,
            maturity:   d.maturity   ?? 0,
            commitment: d.commitment ?? 0,
            clarity:    d.clarity    ?? 0,
            experience: d.experience ?? 0,
          });
          setEssayNotes(d.notes || "");
          setEssayAggregate(d.aggregate || null);
        }
      } catch (_) {}
      finally { setEssayLoaded(true); }
    }
    fetchEssay();
  }, [appData?.id]);

  useEffect(() => {
    if (!appData?.id) return;
    async function fetchNlp() {
      try {
        const res = await fetch(`${API_URL}/api/volunteer_applications/${appData.id}/nlp`, { credentials: "include" });
        if (!res.ok) return;
        const json = await res.json();
        const d = json.data || json;
        setNlpEssayScore(Number(d.essay_weighted_total) || 0);
      } catch (_) {}
    }
    fetchNlp();
  }, [appData?.id]);

  // ── Fetch saved interview score ────────────────────────────────────────────

  useEffect(() => {
    if (!appData?.id) return;
    async function fetchInterview() {
      try {
        const res = await fetch(
          `${API_URL}/api/volunteer_applications/${appData.id}/interview_evaluation`,
          { credentials: "include" }
        );
        if (res.ok) {
          const json = await res.json();
          const d = json.data || json;
          setInterviewScore(d.score ?? 0);
          setInterviewNotes(d.notes || "");
        }
      } catch (_) {}
      finally { setInterviewLoaded(true); }
    }
    fetchInterview();
  }, [appData?.id]);

  // ── Save handlers ──────────────────────────────────────────────────────────

  async function saveEssayScores() {
    if (!canEdit) {
      alert("Only assigned Membership Committee staff can modify this evaluation.");
      return;
    }
    setEssaySaving(true);
    try {
      await fetch(
        `${API_URL}/api/volunteer_applications/${appData.id}/essay_evaluation`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ...essayScores, notes: essayNotes }),
        }
      );
      setEssaySaved(true);
      setTimeout(() => setEssaySaved(false), 2500);
    } catch (_) {
      alert("Failed to save essay scores. Please try again.");
    } finally {
      setEssaySaving(false);
    }
  }

  async function saveInterviewScore() {
    if (!canEdit) {
      alert("Only assigned Membership Committee staff can modify this evaluation.");
      return;
    }
    setInterviewSaving(true);
    try {
      await fetch(
        `${API_URL}/api/volunteer_applications/${appData.id}/interview_evaluation`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ score: interviewScore, notes: interviewNotes }),
        }
      );
      setInterviewSaved(true);
      setTimeout(() => setInterviewSaved(false), 2500);
    } catch (_) {
      alert("Failed to save interview score. Please try again.");
    } finally {
      setInterviewSaving(false);
    }
  }

  // ── Computed totals ────────────────────────────────────────────────────────

  const essayWeightedTotal = weightedEssayScore(essayScores); // 0–100
  const aggregateHumanEssay = essayAggregate?.evaluator_count > 0
    ? weightedEssayScore(essayAggregate)
    : essayWeightedTotal;
  const hybridEssayScore = aggregateHumanEssay > 0 && nlpEssayScore > 0
    ? (aggregateHumanEssay * 0.70) + (nlpEssayScore * 0.30)
    : aggregateHumanEssay || nlpEssayScore;

  // Derive non-negotiable / negotiable pass counts from screening answers
  const NON_NEG_FIELDS = [
    "survivorDignity", "confidentialityPolicy", "noHarassment", "respectfulComms",
    "saferEnvironments", "advocacySupport",
  ];
  const NEG_FIELDS = [
    "enthusiasm", "professionalism", "genderAwareness", "stayInformed",
    "openToLearn", "diverseTeams", "orientationWilling", "timeCommitment", "feedbackWilling",
  ];

  function isYes(v) { return typeof v === "string" && v.toLowerCase().startsWith("y"); }

  const nonNegTotal  = NON_NEG_FIELDS.length;
  const nonNegPassed = NON_NEG_FIELDS.filter(f => isYes(appData[f])).length;
  const negTotal     = NEG_FIELDS.length;
  const negPassed    = NEG_FIELDS.filter(f => isYes(appData[f])).length;

  // Aggregate score: non-neg (20%) + neg (10%) + essay (50%) + interview (20%)
  const nonNegScore   = nonNegTotal > 0 ? (nonNegPassed / nonNegTotal) * 20 : 0;
  const negScore      = negTotal > 0 ? (negPassed / negTotal) * 10 : 0;
  const essayScore20  = (hybridEssayScore / 100) * 50;
  const interviewScore20 = (interviewScore / 10) * 20;
  const aggregateTotal = nonNegScore + negScore + essayScore20 + interviewScore20;

  const aggColor = aggregateTotal >= 75 ? "#16a34a" : aggregateTotal >= 50 ? "#d97706" : "#dc2626";

  const allEssayFilled  = ESSAY_CRITERIA.every(c => (essayScores[c.key] ?? 0) > 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.evalTabWrap}>

      {/* ── Management Actions ── */}
      <div className={styles.mgmtBar}>
        <div>
          <p className={styles.mgmtLabel}>Assigned Evaluator</p>
          <p className={styles.mgmtValue} style={{ color: appData.assignedEvaluator ? "#037F81" : "#9ca3af" }}>
            {appData.assignedEvaluator || "Unassigned"}
          </p>
          {essayAggregate?.evaluator_count > 0 && (
            <p className={styles.mgmtLabel}>{essayAggregate.evaluator_count} evaluator score{essayAggregate.evaluator_count === 1 ? "" : "s"} recorded</p>
          )}
        </div>

        <div className={styles.weightedTotalRow}>
          <div>
            <p className={styles.weightedTotalLabel}>
              Hybrid Essay Score
            </p>
            <p className={styles.weightedTotalSub}>
              70% human average + 30% NLP score
            </p>
          </div>
          <span className={styles.weightedTotalValue} style={{
            color: hybridEssayScore >= 70 ? "#16a34a" : hybridEssayScore >= 40 ? "#d97706" : hybridEssayScore > 0 ? "#dc2626" : "#d1d5db",
          }}>
            {hybridEssayScore > 0 ? hybridEssayScore.toFixed(1) : "—"}<span className={styles.weightedTotalDenom}>/100</span>
          </span>
        </div>
        <button
          className={canEdit ? styles.btnPrimary : styles.btnDisabled}
          onClick={canEdit ? onUpdateStatus : undefined}
          disabled={!canEdit}
        >
          Update Status
        </button>
      </div>

      {/* ── Notice ── */}
      <div className={styles.staffNotice}>
        <span className={styles.noticeIcon}><IoIosInformationCircle /></span>
        <span>
          {canEdit ? (
            <>
              This tab is for <strong>assigned Membership Committee staff only.</strong>{" "}
              Scores entered here are saved and contribute to the automated aggregate evaluation of the applicant.
            </>
          ) : (
            <>
              You can review this evaluation, but only the assigned Membership Committee staff can update statuses or save scores.
            </>
          )}
        </span>
      </div>

      {/* ════════════════════════════════════════════
          SECTION 1 – QUANTITATIVE: Screening Scores
          ════════════════════════════════════════════ */}
      <div className={styles.evalBlock}>
        <h3 className={styles.evalBlockTitle}>
          Quantitative Scores — Screening Responses
        </h3>

        <p className={styles.evalBlockDesc}>
          These scores are automatically derived from the applicant's answers to the screening questions.
          Non-negotiables reflect values alignment; negotiables reflect readiness and commitment.
        </p>

        <div className={styles.quantGrid}>

          {/* Non-negotiable block */}
          <div className={styles.quantCard}>
            <p className={styles.quantCardTitle}>
              Non-Negotiables
            </p>
            <p className={styles.quantCardDesc}>
              Core values that every volunteer must hold.
            </p>
            {NON_NEG_FIELDS.map(f => {
              const label = {
                survivorDignity:       "Survivors deserve dignity & respect",
                confidentialityPolicy: "Follow confidentiality & safeguarding policies",
                noHarassment:          "Harassment / victim-blaming are unacceptable",
                respectfulComms:       "Communicate respectfully",
                saferEnvironments:     "In favor of safer environments",
                advocacySupport:       "Support advocacy efforts",
              }[f] || f;
              const yes = isYes(appData[f]);
              return (
                <div key={f} className={styles.quantFieldRow}>
                  <span className={styles.quantFieldIcon} style={{
                    background: yes ? "#d1fae5" : "#fee2e2",
                    color: yes ? "#065f46" : "#991b1b",
                  }}>{yes ? <FaCheckCircle /> : <FaTimesCircle />}</span>
                  <span className={styles.quantFieldLabel}>{label}</span>
                </div>
              );
            })}
            <div className={styles.quantScoreFooter}>
              <div className={styles.quantScoreRow}>
                <span className={styles.quantScoreText}>Score</span>
                {/* <span className={styles.quantScoreValue} style={{
                  color: nonNegPassed === nonNegTotal ? "#16a34a" : nonNegPassed >= nonNegTotal - 1 ? "#d97706" : "#dc2626",
                }}>
                  {nonNegPassed} / {nonNegTotal}
                </span> */}
              </div>
              <ScoreBar score={nonNegPassed} max={nonNegTotal} color={nonNegPassed === nonNegTotal ? "#16a34a" : nonNegPassed >= nonNegTotal - 1 ? "#d97706" : "#dc2626"} />
            </div>
          </div>

          {/* Negotiable block */}
          <div className={styles.quantCard}>
            <p className={styles.quantCardTitle}>
              Negotiables
            </p>
            <p className={styles.quantCardDesc}>
              Readiness, openness, and availability indicators.
            </p>
            {NEG_FIELDS.map(f => {
              const label = {
                enthusiasm:         "Enthusiastic to contribute",
                professionalism:    "Committed to professionalism",
                genderAwareness:    "Familiar with gender equality issues",
                stayInformed:       "Stays informed on social issues",
                openToLearn:        "Open to learning",
                diverseTeams:       "Comfortable with diverse teams",
                orientationWilling: "Willing for orientations/trainings",
                timeCommitment:     "Able to dedicate time consistently",
                feedbackWilling:    "Open to constructive feedback",
              }[f] || f;
              const yes = isYes(appData[f]);
              return (
                <div key={f} className={styles.quantFieldRow}>
                  <span className={styles.quantFieldIcon} style={{
                    background: yes ? "#d1fae5" : "#fee2e2",
                    color: yes ? "#065f46" : "#991b1b",
                  }}>{yes ? <FaCheckCircle /> : <FaTimesCircle />}</span>
                  <span className={styles.quantFieldLabel}>{label}</span>
                </div>
              );
            })}
            <div className={styles.quantScoreFooter}>
              <div className={styles.quantScoreRow}>
                <span className={styles.quantScoreText}>Score</span>
                {/* <span className={styles.quantScoreValue} style={{
                  color: negPassed === negTotal ? "#16a34a" : negPassed >= negTotal * 0.6 ? "#d97706" : "#dc2626",
                }}>
                  {negPassed} / {negTotal}
                </span> */}
              </div>
              <ScoreBar score={negPassed} max={negTotal} color={negPassed === negTotal ? "#16a34a" : negPassed >= negTotal * 0.6 ? "#d97706" : "#dc2626"} />
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          ESSAY RESPONSE (visible before rubric for grading ease)
          ════════════════════════════════════════════ */}
      {appData.essayDescription && appData.essayDescription !== "—" && (
        <div className={styles.essayResponseBlock}>
          <h3 className={styles.essayResponseTitle}>
            Applicant's Essay Response
          </h3>
          <p className={styles.essayResponseHint}>
            Read this before scoring the rubric below.
          </p>
          <div className={styles.essayResponseText}>
            {appData.essayDescription}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          SECTION 2 – QUALITATIVE: Essay Rubric
          ════════════════════════════════════════════ */}
      <div className={styles.evalBlock}>
        <h3 className={styles.evalBlockTitle}>
          Qualitative Assessment — Essay Rubric
        </h3>
        <p className={styles.evalBlockDesc}>
          Rate each criterion from <strong>1 (lowest)</strong> to <strong>10 (highest)</strong>.
          Scores are weighted and automatically compute the essay total.
        </p>

        <div className={styles.criteriaList}>
          {ESSAY_CRITERIA.map((c) => (
            <div key={c.key} className={styles.criterionCard}>
              <div className={styles.criterionCardHeader}>
                <div>
                  <p className={styles.criterionName}>
                    {c.label}
                    <span className={styles.criterionWeight}>{c.weight}%</span>
                  </p>
                  <p className={styles.criterionHint}>{c.hint}</p>
                </div>
                <span className={styles.criterionScore} style={{ color: essayScores[c.key] > 0 ? "#037F81" : "#d1d5db" }}>
                  {essayScores[c.key] > 0 ? essayScores[c.key] : "—"}
                </span>
              </div>
              <RatingStars
                value={essayScores[c.key]}
                onChange={(v) => setEssayScores(prev => ({ ...prev, [c.key]: v }))}
                disabled={!canEdit}
              />
              {essayScores[c.key] > 0 && (
                <div className={styles.criterionBarWrap}>
                  <ScoreBar score={essayScores[c.key]} max={10} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Weighted total */}
        <div className={styles.weightedTotalRow}>
          <div>
            <p className={styles.weightedTotalLabel}>
              Essay Weighted Total
            </p>
            <p className={styles.weightedTotalSub}>
              Σ (score/10 × weight%) across all criteria
            </p>
          </div>
          <span className={styles.weightedTotalValue} style={{
            color: essayWeightedTotal >= 70 ? "#16a34a" : essayWeightedTotal >= 40 ? "#d97706" : essayWeightedTotal > 0 ? "#dc2626" : "#d1d5db",
          }}>
            {essayWeightedTotal > 0 ? essayWeightedTotal.toFixed(1) : "—"}<span className={styles.weightedTotalDenom}>/100</span>
          </span>
        </div>

        {/* Essay reviewer notes */}
        <div className={styles.notesFieldWrap}>
          <label className={styles.notesFieldLabel}>
            Essay Reviewer Notes <span className={styles.notesFieldOptional}>(optional)</span>
          </label>
          <textarea
            rows={3}
            value={essayNotes}
            onChange={e => setEssayNotes(e.target.value)}
            disabled={!canEdit}
            placeholder="Observations, justifications, or flagged concerns about the essay…"
            className={styles.notesFieldTextarea}
          />
        </div>

        <div className={styles.saveRow}>
          {essaySaved && (
            <span className={styles.savedConfirm}>Saved!</span>
          )}
          {!allEssayFilled && (
            <span className={styles.saveHint}>Score all criteria to save.</span>
          )}
          <button
            onClick={saveEssayScores}
            disabled={!canEdit || essaySaving || !allEssayFilled}
            className={canEdit && allEssayFilled ? styles.btnPrimary : styles.btnDisabled}
          >
            {essaySaving ? "Saving…" : "Save Essay Scores"}
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          SECTION 3 – INTERVIEW SCORE
          ════════════════════════════════════════════ */}
      <div className={styles.evalBlock}>
        <h3 className={styles.evalBlockTitle}>
          Interview Score
        </h3>
        <p className={styles.evalBlockDesc}>
          If the applicant was interviewed, rate the overall interview performance from <strong>1–10</strong>.
          Leave at 0 if the interview has not yet taken place or is not applicable.
        </p>

        <div className={styles.quantCard}>
          <div className={styles.interviewCardHeader}>
            <p className={styles.interviewCardTitle}>
              Overall Interview Performance
            </p>
            <span className={styles.interviewScoreDisplay} style={{
              color: interviewScore > 0 ? (interviewScore >= 7 ? "#16a34a" : interviewScore >= 4 ? "#d97706" : "#dc2626") : "#d1d5db",
            }}>
              {interviewScore > 0 ? interviewScore : "—"}<span className={styles.weightedTotalDenom}>/10</span>
            </span>
          </div>
          <RatingStars value={interviewScore} onChange={setInterviewScore} disabled={!canEdit} />
          {interviewScore > 0 && (
            <div className={styles.criterionBarWrap}>
              <ScoreBar score={interviewScore} max={10} />
            </div>
          )}
        </div>

        <div className={styles.notesFieldWrap}>
          <label className={styles.notesFieldLabel}>
            Interview Notes <span className={styles.notesFieldOptional}>(optional)</span>
          </label>
          <textarea
            rows={3}
            value={interviewNotes}
            onChange={e => setInterviewNotes(e.target.value)}
            disabled={!canEdit}
            placeholder="Key impressions, red flags, standout qualities from the interview…"
            className={styles.notesFieldTextarea}
          />
        </div>

        <div className={styles.saveRow}>
          {interviewSaved && (
            <span className={styles.savedConfirm}>Saved!</span>
          )}
          <button
            onClick={saveInterviewScore}
            disabled={!canEdit || interviewSaving}
            className={canEdit ? styles.btnPrimary : styles.btnDisabled}
          >
            {interviewSaving ? "Saving…" : "Save Interview Score"}
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          SECTION 4 – AGGREGATE SCORE SUMMARY
          ════════════════════════════════════════════ */}
      <div className={styles.aggregateBlock} style={{ border: `2px solid ${aggColor}` }}>
        <h3 className={styles.aggregateTitle} style={{ color: aggColor }}>
          Evaluation Summary
        </h3>

        <div className={styles.aggregateGrid}>
          {[
            { label: "Non-Negotiables", value: nonNegScore.toFixed(1), max: "20", desc: `${nonNegPassed}/${nonNegTotal} passed`, color: nonNegPassed === nonNegTotal ? "#16a34a" : "#dc2626" },
            { label: "Negotiables",     value: negScore.toFixed(1),    max: "10", desc: `${negPassed}/${negTotal} passed`,    color: negPassed >= negTotal * 0.6 ? "#16a34a" : "#d97706" },
            { label: "Essay",           value: essayScore20.toFixed(1), max: "50", desc: `${hybridEssayScore.toFixed(1)}/100 hybrid`, color: hybridEssayScore >= 70 ? "#16a34a" : hybridEssayScore >= 40 ? "#d97706" : "#9ca3af" },
            { label: "Interview",       value: interviewScore20.toFixed(1), max: "20", desc: `${interviewScore}/10 raw score`, color: interviewScore >= 7 ? "#16a34a" : interviewScore >= 4 ? "#d97706" : "#9ca3af" },
          ].map(({ label, value, max, desc, color }) => (
            <div key={label} className={styles.aggregateCell}>
              <p className={styles.aggregateCellLabel}>{label}</p>
              <p className={styles.aggregateCellValue} style={{ color }}>
                {value}<span className={styles.aggregateCellDenom}>/{max}</span>
              </p>
              <p className={styles.aggregateCellDesc}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Aggregate bar */}
        <div className={styles.totalScoreSection}>
          <div className={styles.totalScoreRow}>
            <span className={styles.totalScoreText}>Total Score</span>
            <span className={styles.totalScoreValue} style={{ color: aggColor }}>
              {aggregateTotal.toFixed(1)}<span className={styles.weightedTotalDenom}>/100</span>
            </span>
          </div>
          <div className={styles.totalBarTrack}>
            <div className={styles.totalBarFill} style={{
              width: `${Math.min(100, aggregateTotal)}%`,
              background: aggColor,
            }} />
          </div>
        </div>

        {/* Recommendation badge */}
        <div className={styles.recBadge} style={{
          background: aggregateTotal >= 75 ? "#f0fdf4" : aggregateTotal >= 50 ? "#fffbeb" : "#fef2f2",
          border: `1px solid ${aggregateTotal >= 75 ? "#86efac" : aggregateTotal >= 50 ? "#fcd34d" : "#fca5a5"}`,
        }}>
          <div>
            <p className={styles.recBadgeTitle} style={{ color: aggColor }}>
              {aggregateTotal >= 75
                ? "Recommended for Approval"
                : aggregateTotal >= 50
                ? "For Further Review"
                : "Below Passing Threshold"}
            </p>
            <p className={styles.recBadgeDesc}>
              {aggregateTotal >= 75
                ? "Applicant meets most evaluation criteria. Final decision rests with reviewing officer."
                : aggregateTotal >= 50
                ? "Applicant shows potential but has gaps. Review essay and interview scores carefully."
                : "Applicant does not meet the minimum threshold. Rejection may be warranted."}
            </p>
          </div>
        </div>

        <p className={styles.aggregateDisclaimer}>
          <IoIosWarning /> This aggregate score is a guide for the Membership Committee. Final decisions remain with the reviewing officer.
          Weights: Non-Negotiables 20 pts · Negotiables 10 pts · Essay 50 pts · Interview 20 pts.
        </p>
      </div>

    </div>
  );
}

// ─── NLP Essay Analysis Tab (staff only) ─────────────────────────────────────

function NLPEssayTab({ appId, isAdmin }) {
  const [nlpData,    setNlpData]    = useState(null);
  const [nlpLoading, setNlpLoading] = useState(false);
  const [nlpStatus,  setNlpStatus]  = useState(null); // "processing" | "error" | null

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
        if (!res.ok)            { setNlpStatus("error");      return; }
        const json = await res.json();
        const d    = json.data || json;

        // ── Still pending from DB ──────────────────────────────────────────
        if (d.status === "pending") { setNlpStatus("processing"); return; }
        if (d.status === "failed")  { setNlpStatus("error");      return; }

        setNlpData(d);
      } catch {
        setNlpStatus("error");
      } finally {
        setNlpLoading(false);
      }
    };
    fetchNlp();
  }, [appId]);

  // ── Sub-components ─────────────────────────────────────────────────────────

  // ScoreBar is shared — defined at module level

  // ── Dimension config — maps flat DB columns → display labels + weights ─────
  const DIMENSIONS = [
    { scoreKey: "mission_alignment_score",   noteKey: "mission_alignment_notes",   label: "Alignment with SASHA's Mission",          weight: 30 },
    { scoreKey: "maturity_judgment_score",   noteKey: "maturity_judgment_notes",   label: "Maturity and Judgment",                    weight: 20 },
    { scoreKey: "commitment_score",          noteKey: "commitment_notes",          label: "Commitment and Reliability",               weight: 20 },
    { scoreKey: "writing_clarity_score",     noteKey: "writing_clarity_notes",     label: "Writing Clarity and Thoughtfulness",       weight: 15 },
    { scoreKey: "relevant_experience_score", noteKey: "relevant_experience_notes", label: "Relevant Experience / Transferable Skills", weight: 15 },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* AI disclaimer */}
      <div className={styles.aiDisclaimer}>
        <span className={styles.noticeIcon}><IoIosInformationCircle /></span>
        <span>
          This analysis is <strong>AI-generated</strong> and is intended as a guide only.
          All decisions on volunteer applications remain with the reviewing officer.
        </span>
      </div>

      {/* Loading */}
      {nlpLoading && (
        <p className={styles.nlpLoadingText}>
          Loading essay analysis…
        </p>
      )}

      {/* Still processing */}
      {nlpStatus === "processing" && !nlpLoading && (
        <div className={styles.nlpProcessing}>
          <FiClock className={styles.noticeIconSm} />
          NLP analysis is still processing. Refresh in a moment.
        </div>
      )}

      {/* Error */}
      {nlpStatus === "error" && !nlpLoading && (
        <div className={styles.nlpError}>
          <FiAlertCircle className={styles.noticeIconSm} />
          Could not load NLP analysis. Make sure the NLP service is running.
        </div>
      )}

      {/* ── Main content — only when data is loaded ── */}
      {nlpData && (
        <div className={styles.nlpContentWrap}>

          {/* ── Aggregate scores ── */}
          <div className={styles.evalBlock}>
            <h4 className={styles.evalBlockTitle}>
              Essay Score Summary
            </h4>
            <p className={styles.evalBlockDescSm}>
              Weighted across all five evaluation criteria (total out of 50 pts).
            </p>
            <div className={styles.nlpScoreSummaryRow}>
              <div>
                <p className={styles.nlpScoreSubLabel}>Weighted Total (out of 100)</p>
                <p className={styles.nlpScoreBig} style={{
                  color: nlpData.essay_weighted_total >= 70 ? "#16a34a"
                       : nlpData.essay_weighted_total >= 40 ? "#d97706"
                       : "#dc2626",
                }}>
                  {nlpData.essay_weighted_total ?? "—"}
                  <span className={styles.weightedTotalDenom}>/100</span>
                </p>
              </div>
              <div>
                <p className={styles.nlpScoreSubLabel}>Score (out of 50 pts)</p>
                <p className={styles.nlpScoreBig} style={{
                  color: nlpData.essay_score_out_of_50 >= 35 ? "#16a34a"
                       : nlpData.essay_score_out_of_50 >= 20 ? "#d97706"
                       : "#dc2626",
                }}>
                  {nlpData.essay_score_out_of_50 ?? "—"}
                  <span className={styles.weightedTotalDenom}>/50</span>
                </p>
              </div>
            </div>
          </div>

          {/* ── Per-dimension scores with notes ── */}
          <div className={styles.evalBlock}>
            <h4 className={styles.evalBlockTitle}>
              Evaluation Dimensions
            </h4>
            <div className={styles.dimensionsList}>
              {DIMENSIONS.map(({ scoreKey, noteKey, label, weight }) => {
                const score = nlpData[scoreKey];
                const note  = nlpData[noteKey];
                if (score == null) return null;
                return (
                  <div key={scoreKey} className={styles.criterionCard}>
                    <div className={styles.dimensionCardHeader}>
                      <span className={styles.dimensionCardLabel}>
                        {label}
                      </span>
                      <span className={styles.criterionWeight}>
                        {weight}% weight
                      </span>
                    </div>
                    <ScoreBar score={score} max={10} />
                    {note && (
                      <p className={styles.dimensionNote}>
                        {note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Recommendation ── */}
          {nlpData.recommendation && (
            <div className={styles.nlpRecBlock} style={{
              background: nlpData.threshold_passed ? "#f0fdf4" : "#fff7ed",
              border: `1px solid ${nlpData.threshold_passed ? "#86efac" : "#fdba74"}`,
            }}>
              <h4 className={styles.nlpRecTitle} style={{ color: nlpData.threshold_passed ? "#166534" : "#9a3412" }}>
                {nlpData.threshold_passed ? "Recommended for Approval" : "Further Review Suggested"}
              </h4>
              <p className={styles.nlpRecText}>
                {nlpData.recommendation}
              </p>
              {nlpData.recommendation_notes && (
                <p className={styles.nlpRecNotes}>
                  {nlpData.recommendation_notes}
                </p>
              )}
            </div>
          )}

          {/* ── Technical details (admin only) ── */}
          {isAdmin && (
            <details className={styles.techDetails}>
              <summary className={styles.techDetailsSummary}>
                Technical Details
              </summary>
              <div className={styles.techDetailsBody}>
                {nlpData.model_used        && <span><strong>Model:</strong> {nlpData.model_used}</span>}
                {nlpData.language_detected && <span><strong>Language detected:</strong> {nlpData.language_detected}</span>}
                {nlpData.analyzed_at       && <span><strong>Analyzed at:</strong> {new Date(nlpData.analyzed_at).toLocaleString("en-PH")}</span>}
                {nlpData.anonymized_essay  && (
                  <>
                    <span><strong>Anonymized essay:</strong></span>
                    <p className={styles.techAnonymized}>
                      {nlpData.anonymized_essay}
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
  const requestedTab = searchParams.get("tab");

  const [appData,     setAppData]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [toast,       setToast]       = useState(null);
  const [modal,       setModal]       = useState(null);
  const [user,        setUser]        = useState({ role: null });
  const [userLoaded,  setUserLoaded]  = useState(false);
  const [activeTab,   setActiveTab]   = useState(requestedTab || "details");
  const [withdrawing, setWithdrawing] = useState(false);

  // ── Read user from cookie ─────────────────────────────────────────────────

  useEffect(() => {
    const c = getCookie("user");
    if (c) {
      try {
        const u = JSON.parse(c);
        setUser({ id: u.user_id, role: u.role_name, firstName: u.first_name, lastName: u.last_name });
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

        if (!data) throw new Error("Application not found.");

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

        const answerMap = {}
        if (Array.isArray(data.screening_answers)) {
          data.screening_answers.forEach(a => {
            if (a.screening_questions?.question_key) {
              answerMap[a.screening_questions.question_key] = a.answer_value
                  }
            })
        }

        setAppData({
          id:                    data.volunteer_application_id,
          appRefId:              `APP-${String(data.volunteer_application_id).padStart(4, "0")}`,
          applicantUserId:       data.applicant_user_id || data.user_id || null,
          applicationStatus:     capitalizeStatus(data.application_status),
          reviewNotes:           data.notes || "",
          assignedEvaluator: (data.volunteer_application_assignments || [])
              .filter((aa) => aa.is_active === true)
              .map((aa) => `${aa.users?.first_name || ""} ${aa.users?.last_name || ""}`.trim())
              .filter(Boolean)
              .join(", ") || null,
          assignedEvaluatorIds: (data.volunteer_application_assignments || [])
              .filter((aa) => aa.is_active === true)
              .map((aa) => aa.assessor_id)
              .filter(Boolean),
          dateApplied:           data.created_at
              ? new Date(data.created_at).toLocaleDateString("en-PH", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
              : "Not Provided",

          // ── Step 0: Applicant's Info ──
          name:                  data.name || "Not Provided",
          birthday:              new Date(data.birthday).toLocaleDateString("en-PH", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }) || "Not Provided",
          age:                   computedAge,
          gender:                data.gender_identity || "Not Provided",
          pronouns:              data.pronouns || "Not Provided",

          // ── Organization from join ──
          organization:          data.organizations?.organization || "Not Provided",
          council:               data.organizations?.council || null,
          region:                data.organizations?.region || "National Capital Region (NCR)",
          tenureInScouting:      data.tenure_years ? `${data.tenure_years} year(s)` : null,
          rank:                  data.rank || null,
          scoutingMembership:    data.scouting_membership || null,
          organizationType:      data.organizations?.organization_type || null,
          organizationTypeOther: data.organizations?.organization_type_other || null,
          orgName:               data.organizations?.organization_name || null,
          orgCity:               data.organizations?.organization_city || null,
          userCity:              data.organizations?.user_city || null,

          // ── Contact & Consent ──
          contactNumber:         data.contact_number || "Not Provided",
          email:                 data.email || "Not Provided",
          interview:             data.interview_required ? "Yes" : "No",
          isWillingForInterview: !!data.interview_required,

          // ── Screening Questions ──
          // These come from screening_answers table — need a separate fetch
          // For now mapping from flat data won't work since they're not columns

          survivorDignity:       answerMap['survivor_dignity']       || "—",
          confidentialityPolicy: answerMap['confidentiality_policy'] || "—",
          noHarassment:          answerMap['no_harassment']          || "—",
          respectfulComms:       answerMap['respectful_comms']       || "—",
          saferEnvironments:     answerMap['safer_environments']     || "—",
          advocacySupport:       answerMap['advocacy_support']       || "—",
          enthusiasm:            answerMap['enthusiasm']             || "—",
          professionalism:       answerMap['professionalism']        || "—",
          genderAwareness:       answerMap['gender_awareness']       || "—",
          stayInformed:          answerMap['stay_informed']          || "—",
          openToLearn:           answerMap['open_to_learn']          || "—",
          diverseTeams:          answerMap['diverse_teams']          || "—",
          orientationWilling:    answerMap['orientation_willing']    || "—",
          timeCommitment:        answerMap['time_commitment']        || "—",
          feedbackWilling:       answerMap['feedback_willing']       || "—",

          // ── Expertise & Interest ──
          fieldsWithBackground:  Array.isArray(data.fields_with_background)
              ? data.fields_with_background.join(", ")
              : data.fields_with_background || "—",
          fieldsOfInterest:      Array.isArray(data.fields_of_interest)
              ? data.fields_of_interest.join(", ")
              : data.fields_of_interest || "—",
          hoursPerWeek:          data.hours_per_week || "—",

          // ── Essay ──
          essayDescription:      data.essay_response || "—",
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

  async function handleWithdrawApplication() {
    setWithdrawing(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/api/volunteer_applications/${appData.id}/withdraw`, {
        method: "POST",
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to withdraw application.");

      setAppData((current) => ({ ...current, applicationStatus: "Withdrawn" }));
      setModal(null);
      showToast("Application withdrawn successfully.");
    } catch (err) {
      showToast(err.message || "Failed to withdraw application.", "danger");
    } finally {
      setWithdrawing(false);
    }
  }

  const isAdmin       = user.role?.toLowerCase() === "admin";
  const isApplicationOfficer = user.role?.toLowerCase()?.includes("officer");
  const isStaff       = isAdmin || isApplicationOfficer || user.role?.toLowerCase() === "staff";
  const isAssignedEvaluator = (appData?.assignedEvaluatorIds || [])
    .some((id) => String(id) === String(user.id));
  const canManageVolunteerApplication = isAdmin || isAssignedEvaluator;
  const canWithdrawApplication =
    !isStaff &&
    ["Pending", "Reviewing"].includes(appData?.applicationStatus);

  // ── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <p className={styles.loadingText}>Loading application…</p>
      </div>
    );
  }

  if (error || !appData) {
    return (
      <div className={styles.pageWrapper}>
        <button className={styles.backBtn} onClick={() => router.push("/volunteer")}>
          <IoIosArrowBack /> Back to Volunteer Management
        </button>
        <div className={styles.errorBox}>
          {error || "Application not found."}
        </div>
      </div>
    );
  }

  // ── Tab definitions — role-based ──
  // Admin/Staff: Details + Evaluation + NLP
  // User: Details only; if Approved or Rejected, also see Scores tab

  const userCanSeeScores =
    !isStaff &&
    (appData.applicationStatus === "Approved" || appData.applicationStatus === "Rejected");

  const tabs = [
    { id: "details",    label: " Application Details" },
    ...(appData.isWillingForInterview ? [
      { id: "interview", label: "Interview" },
    ] : []),
    ...(isStaff ? [
      { id: "evaluation", label: "Application Evaluation" },
      { id: "nlp",        label: "NLP Analysis" },
    ] : []),
    ...(userCanSeeScores ? [
      { id: "scores", label: "My Scores" },
    ] : []),
  ];

  // tabStyle removed — using CSS classes with active state below

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
          <button className={styles.backBtn} onClick={() => router.push("/volunteer")}>
            <IoIosArrowBack /> Back to Volunteer Management
          </button>

          <div className={styles.headerTop}>
            <div>
              <h1 className={styles.caseTitle}>APP-{String(appData.id).padStart(4, "0")}</h1>
              <p className={styles.caseSubtitle}>
                Date Applied: {appData.dateApplied}
              </p>
            </div>
            <div className={styles.headerActions}>
              {canWithdrawApplication && (
                <button
                  type="button"
                  className={styles.withdrawBtn}
                  onClick={() => setModal("withdraw")}
                >
                  Withdraw Application
                </button>
              )}
              <StatusBadge status={appData.applicationStatus} />
            </div>
          </div>

          {appData.reviewNotes && (
            <div className={styles.reviewNotice}>
              <p><strong>Reviewer Notes:</strong> {appData.reviewNotes}</p>
            </div>
          )}
        </div>

        {/* ── Content card with tabs ── */}
        <div className={styles.contentCard}>

          {/* Tab bar */}
          <div className={styles.tabBar}>
            {tabs.map((t) => (
              <button key={t.id} className={activeTab === t.id ? styles.tabBtnActive : styles.tabBtn} onClick={() => setActiveTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "details" && userLoaded && (
            <ApplicationDetailsTab appData={appData} isStaff={isStaff} />
          )}

          {activeTab === "interview" && appData.isWillingForInterview && userLoaded && (
            <InterviewTab
              appData={appData}
              isStaff={isStaff}
              isApplicationOfficer={isApplicationOfficer}
              showToast={showToast}
              userId={user.id}
              actorName={`${user.firstName || ""} ${user.lastName || ""}`.trim()}
              userRole={user.role}
              canManageInterview={canManageVolunteerApplication}
            />
          )}

          {activeTab === "evaluation" && isStaff && userLoaded && (
            <ApplicationEvaluationTab
              appData={appData}
              isAdmin={isAdmin}
              canEdit={canManageVolunteerApplication}
              onUpdateStatus={() => {
                if (!canManageVolunteerApplication) {
                  showToast("Only assigned Membership Committee staff can update this application.", "error");
                  return;
                }
                setModal("updateStatus");
              }}
            />
          )}

          {activeTab === "nlp" && isStaff && userLoaded && (
            <NLPEssayTab appId={appData.id} isAdmin={isAdmin} />
          )}

          {activeTab === "scores" && userLoaded && (
            <ApplicantScoresTab appData={appData} />
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
      <ConfirmDialog
        open={modal === "withdraw"}
        title="Withdraw Application"
        description="Are you sure you want to withdraw this volunteer application?"
        detail={`Application ${appData.appRefId}. You can restore it later from your application history.`}
        confirmLabel="Withdraw Application"
        cancelLabel="Keep Application"
        tone="danger"
        busy={withdrawing}
        dismissible={!withdrawing}
        onCancel={() => {
          if (!withdrawing) setModal(null);
        }}
        onConfirm={handleWithdrawApplication}
      />
    </div>
  );
}
