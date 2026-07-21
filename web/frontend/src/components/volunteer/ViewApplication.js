"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { IoIosArrowBack } from "react-icons/io";
import styles from "./ViewApplication.module.css";
import InterviewTab from "../volunteerInterviews/InterviewTab";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useAuth, authFetch } from "@/lib/AuthContext";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Screening answer badge ───────────────────────────────────────────────────

function YesNoBadge({ value }) {
  const raw = String(value || "").toLowerCase().trim();
  const isYes = raw === "yes" || raw === "true" || raw === "1" || raw === "strongly agree" || raw === "agree";
  const isNo  = raw === "no"  || raw === "false" || raw === "0" || raw === "disagree" || raw === "strongly disagree";
  if (!value || value === "—") return <span className={styles.yesNoBadgeEmpty}>—</span>;
  return (
    <span className={styles.yesNoBadge} style={{
      background: isYes ? "#d1fae5" : isNo ? "#fee2e2" : "#d1fae5",
      color:      isYes ? "#065f46" : isNo ? "#991b1b" : "#065f46",
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
        const API = process.env.NEXT_PUBLIC_API_URL || "";
        const [essayRes, interviewRes] = await Promise.all([
          authFetch(`${API}/api/volunteer_applications/${appData.id}/essay_evaluation`),
          authFetch(`${API}/api/volunteer_applications/${appData.id}/interview_evaluation`),
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
  const [expandedGroups, setExpandedGroups] = useState({
    values: false,
    advocacy: false,
    learning: false,
  });

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const isBspOrg =
    appData.organization === "BSP" ||
    appData.organization === "Boy Scouts of the Philippines (BSP)";
  const isGspOrg =
    appData.organization === "GSP" ||
    appData.organization === "Girl Scouts of the Philippines (GSP)";
  const isScoutOrg = isBspOrg || isGspOrg;
  const isOtherOrg =
    appData.organization === "Other" ||
    appData.organization === "Others" ||
    Boolean(appData.organizationType);
  const organizationLabel =
    isBspOrg ? "Boy Scouts of the Philippines (BSP)" :
    isGspOrg ? "Girl Scouts of the Philippines (GSP)" :
    isOtherOrg ? "Other" :
    appData.organization;
  const affiliationRows = [
    ["Organization", organizationLabel],
    ...(isScoutOrg
      ? [
          ["Council", appData.council],
          ["Region", appData.region],
          ["Tenure in Scouting", appData.tenureInScouting],
          ["Rank", appData.rank],
          ["Scouting Membership Category", appData.scoutingMembership],
        ]
      : []
    ),
    ...(isOtherOrg
      ? [
          ["Organization Type", appData.organizationType],
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
        ]
      : []
    ),
  ].filter(([, value]) => value);

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
        ]} />
      </Section>

      {/* Affiliation and organization details */}
      <Section title="Affiliation Details">
        <DetailGrid rows={affiliationRows} />
      </Section>

      {/* Contact & Consent */}
      <Section title="Contact & Consent">
        <DetailGrid rows={[
          ["Contact Number",            appData.contactNumber],
          ["Email",                     appData.email],
          ["Willing to be Interviewed", appData.interview],
        ]} />
      </Section>

      {/* Expertise & Interest */}
      <Section title="Expertise &amp; Interest">
        <DetailGrid rows={[
          ["Fields with Background", appData.fieldsWithBackground],
          ["Fields of Interest",     appData.fieldsOfInterest],
          ["Hours per Week",         appData.hoursPerWeek],
        ]} />
      </Section>

      {/* Screening Questions (collapsible by group) */}
      <Section title="Screening Questions">
        <div className={styles.screeningContent}>

            <div className={styles.screeningGroup}>
              <button
                type="button"
                className={styles.screeningGroupHeader}
                onClick={() => toggleGroup("values")}
              >
                <span className={styles.screeningGroupTitle}>Values &amp; Conduct</span>
                {expandedGroups.values ? <FiChevronUp /> : <FiChevronDown />}
              </button>
              {expandedGroups.values && (
                <div style={{ marginTop: "0.75rem" }}>
                  <ScreeningGrid rows={[
                    ["Survivors deserve dignity & respect",                              appData.survivorDignity],
                    ["Follow confidentiality & safeguarding policies",                  appData.confidentialityPolicy],
                    ["Harassment, discrimination & victim-blaming are unacceptable",    appData.noHarassment],
                    ["Communicate respectfully regardless of background",               appData.respectfulComms],
                  ]} />
                </div>
              )}
            </div>

            <div className={styles.screeningDivider} />

            <div className={styles.screeningGroup}>
              <button
                type="button"
                className={styles.screeningGroupHeader}
                onClick={() => toggleGroup("advocacy")}
              >
                <span className={styles.screeningGroupTitle}>Advocacy &amp; Participation</span>
                {expandedGroups.advocacy ? <FiChevronUp /> : <FiChevronDown />}
              </button>
              {expandedGroups.advocacy && (
                <div style={{ marginTop: "0.75rem" }}>
                  <ScreeningGrid rows={[
                    ["In favor of safer environments",   appData.saferEnvironments],
                    ["Support advocacy efforts",         appData.advocacySupport],
                    ["Enthusiastic to contribute",       appData.enthusiasm],
                    ["Committed to professionalism",     appData.professionalism],
                  ]} />
                </div>
              )}
            </div>

            <div className={styles.screeningDivider} />

            <div className={styles.screeningGroup}>
              <button
                type="button"
                className={styles.screeningGroupHeader}
                onClick={() => toggleGroup("learning")}
              >
                <span className={styles.screeningGroupTitle}>Learning &amp; Awareness</span>
                {expandedGroups.learning ? <FiChevronUp /> : <FiChevronDown />}
              </button>
              {expandedGroups.learning && (
                <div style={{ marginTop: "0.75rem" }}>
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
              )}
            </div>

        </div>
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
      
      {/* Status History */}
      {!isStaff ? (
        <section className={styles.section}>
          <h2 className={styles.sectionHeadingText}>Your Application History</h2>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem", lineHeight: 1.6 }}>
            Below is a timeline of your application's progress.
          </p>
          <VolunteerStatusHistorySection applicationId={appData.id} isStaff={false} />
        </section>
      ) : (
        <VolunteerStatusHistorySection applicationId={appData.id} isStaff={true} />
      )}
    </div>
  );
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

function formatApplicationRef(id, fallback) {
  if (fallback) return fallback;
  if (!id) return "APP";
  return `APP-${String(id).replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}
function VolunteerStatusHistorySection({ applicationId, isStaff }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await authFetch(
          `${API_URL}/api/volunteer_applications/${applicationId}/status-history`
        );
        if (!res.ok) throw new Error("Failed to load history");
        const json = await res.json();
        setHistory(json.data || []);
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [applicationId]);

  const STATUS_COLORS = {
    pending:     { bg: "#fef3c7", color: "#92400e" },
    reviewing:   { bg: "#dbeafe", color: "#1e40af" },
    interviewed: { bg: "#e0f2fe", color: "#0369a1" },
    accepted:    { bg: "#d1fae5", color: "#065f46" },
    rejected:    { bg: "#fee2e2", color: "#991b1b" },
    withdrawn:   { bg: "#f1f5f9", color: "#475569" },
  };

  function StatusBadge({ status }) {
    const s = STATUS_COLORS[status?.toLowerCase()] || { bg: "#f3f4f6", color: "#374151" };
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 10px", borderRadius: 999,
        fontSize: "0.78rem", fontWeight: 700,
        background: s.bg, color: s.color,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
        {status}
      </span>
    );
  }

  if (loading) return <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Loading history…</p>;

  return (
    <section>
      <button
        onClick={() => setShowHistory((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none", cursor: "pointer",
          fontSize: "0.875rem", fontWeight: 600, color: "#374151", padding: 0,
        }}
      >
        {showHistory ? <FiChevronUp /> : <FiChevronDown />}
        {showHistory ? "Hide" : "Show"} Status History ({history.length} {history.length === 1 ? "entry" : "entries"})
      </button>

      {showHistory && (
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: 0 }}>
          {history.length === 0 ? (
            <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>No status history yet.</p>
          ) : (
            [...history].reverse().map((h, i, arr) => (
              <div key={h.history_id} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#037F81", flexShrink: 0 }} />
                  {i < arr.length - 1 && (
                    <div style={{ width: 2, height: 40, background: "#e5e7eb" }} />
                  )}
                </div>
                <div style={{ paddingBottom: "1.25rem" }}>
                  <StatusBadge status={capitalizeStatus(h.status)} />
                  <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#6b7280" }}>
                    {new Date(h.created_at).toLocaleDateString("en-PH", {
                      month: "numeric", day: "numeric", year: "numeric",
                    })} · {h.changed_by_name || "System"}
                  </p>
                  {h.notes && (
                    <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#374151", lineHeight: 1.5 }}>
                      {h.notes}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN VIEW APPLICATION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ViewApplication() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user: authUser, loading: authLoading } = useAuth();
  const appId        = searchParams.get("id");
  const requestedTab = searchParams.get("tab");

  const [appData,     setAppData]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [toast,       setToast]       = useState(null);
  const [modal,       setModal]       = useState(null);
  const [activeTab,   setActiveTab]   = useState(requestedTab || "details");
  const [withdrawing, setWithdrawing] = useState(false);
  const [hasInterviewRecord, setHasInterviewRecord] = useState(false);

  const user = {
    id: authUser?.user_id || authUser?.id || null,
    role: authUser?.role_name || authUser?.role || null,
    firstName: authUser?.first_name || "",
    lastName: authUser?.last_name || "",
  };
  const userLoaded = !authLoading;

  // ── Fetch application ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!appId) { setError("No application ID provided."); setLoading(false); return; }

    async function fetchApp() {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await authFetch(`${API}/api/volunteer_applications/${appId}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Application not found.");
        }
        
        const data = await res.json();

        if (!data) throw new Error("Application not found.");

        const interviewsRes = await authFetch(
          `${API}/api/interviews?type=volunteer&volunteer_application_id=${data.volunteer_application_id}`
        );
        const interviewsJson = interviewsRes.ok ? await interviewsRes.json().catch(() => ({})) : {};
        const interviews = Array.isArray(interviewsJson?.data) ? interviewsJson.data : [];
        setHasInterviewRecord(interviews.length > 0);

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
          appRefId:              formatApplicationRef(data.volunteer_application_id, data.application_ref),
          applicantUserId:       data.applicant_user_id || data.user_id || null,
          applicationStatus:     capitalizeStatus(data.application_status),
          reviewNotes:           data.status_notes || data.notes || "",
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
          userCity:              data.organizations?.user_city || data.city || null,

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
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await authFetch(`${API_URL}/api/volunteer_applications/${appData.id}/withdraw`, {
        method: "POST",
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

  const isApplicationOfficer = false;
  const isStaff = false;
  const showInterviewTab = appData?.isWillingForInterview && (isStaff || hasInterviewRecord);
  const canWithdrawApplication =
    !isStaff &&
    ["Pending", "Reviewing"].includes(appData?.applicationStatus);

  useEffect(() => {
    if (activeTab === "interview" && appData && !showInterviewTab) {
      setActiveTab("details");
    }
  }, [activeTab, appData, showInterviewTab]);

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
        <button className={styles.backBtn} onClick={() => router.push("/volunteer/history")}>
          <IoIosArrowBack /> Back to Application History
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
    ...(showInterviewTab ? [
      { id: "interview", label: "Interview" },
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
        <button className={styles.backBtn} onClick={() => router.push("/volunteer/history")}>
          <FiArrowLeft /> Back to Application History
        </button>

        <div className={styles.headerCard}>
          <div className={styles.headerTop}>
            <div>
              <h1 className={styles.caseTitle}>{appData.appRefId}</h1>
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

          {activeTab === "interview" && showInterviewTab && userLoaded && (
            <InterviewTab
              appData={appData}
              isStaff={false}
              isApplicationOfficer={false}
              showToast={showToast}
              userId={user.id}
              actorName={`${user.firstName || ""} ${user.lastName || ""}`.trim()}
              userRole={user.role}
              canManageInterview={false}
            />
          )}

          {activeTab === "scores" && userLoaded && (
            <ApplicantScoresTab appData={appData} />
          )}

        </div>
      </div>

      {/* ── Modals ── */}
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
