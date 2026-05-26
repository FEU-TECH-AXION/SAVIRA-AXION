"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiChevronDown, FiChevronUp } from "react-icons/fi";
import styles from "./ViewApplication.module.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
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
    <span className={styles.statusBadge} style={{ background: s.bg, color: s.color }}>
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
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ─── Update Status Modal ──────────────────────────────────────────────────────

const APPLICATION_STATUSES = ["Pending", "Reviewing", "Approved", "Rejected", "Withdrawn"];

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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN VIEW APPLICATION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ViewApplication() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const appId        = searchParams.get("id");

  const [appData,  setAppData]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [toast,    setToast]    = useState(null);
  const [modal,    setModal]    = useState(null);
  const [user,     setUser]     = useState({ role: null });

  // Collapsible screening questions
  const [showScreening, setShowScreening] = useState(false);

  useEffect(() => {
    const c = getCookie("user");
    if (c) {
      try {
        const u = JSON.parse(c);
        setUser({ role: u.role_name, firstName: u.first_name, lastName: u.last_name });
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    if (!appId) { setError("No application ID provided."); setLoading(false); return; }

    async function fetchApp() {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API}/api/volunteer_applications/${appId}`, {
          headers: { Authorization: `Bearer ${getCookie("token")}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Application not found.");
        }
        const data = await res.json();

        setAppData({
          id:                    data.volunteer_application_id,
          applicationStatus:     capitalizeStatus(data.application_status),
          reviewNotes:           data.notes || "",
          dateApplied:           data.created_at ? new Date(data.created_at).toLocaleDateString("en-PH", { day: "2-digit", month: "short", year: "numeric" }) : "—",

          // ── Step 0: Applicant's Info ──
          name:                  data.name || "—",
          birthday:              data.birthday || "—",
          age:                   data.age ? String(data.age) : "—",
          gender:                data.gender || "—",
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

  const isAdmin      = user.role?.toLowerCase() === "admin";
  const isCaseOfficer = user.role?.toLowerCase()?.includes("officer");
  const isStaff      = isAdmin || isCaseOfficer;

  const isScoutOrg = appData?.organization === "BSP" || appData?.organization === "GSP";
  const isOtherOrg = appData?.organization === "Other";

  // ── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <p className={styles.loadingText}>Loading application…</p>
      </div>
    );
  }

  if (error || !appData) {
    return (
      <div className={styles.errorWrap}>
        <p className={styles.errorText}>{error || "Application not found."}</p>
        <button className={styles.btnPrimary} onClick={() => router.push("/volunteer/manage")}>
          Back to Volunteer Management
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.pageWrap}>
      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}>
          {toast.msg}
        </div>
      )}

      {/* Back button */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.push("/volunteer/manage")}>
          <FiArrowLeft size={16} />
          Back to Volunteer Management
        </button>
      </div>

      {/* ── Header card ── */}
      <div className={styles.headerCard}>
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

      {/* ── Main content ── */}
      <div className={styles.contentWrap}>

        {/* ── APPLICANT'S INFORMATION ── */}
        <Section title="👤 Applicant's Information">
          <DetailGrid rows={[
            ["Full Name",       appData.name],
            ["Birthday",        appData.birthday],
            ["Age",             appData.age],
            ["Gender Identity", appData.gender],
            ["Pronouns",
              appData.pronouns === "he" ? "He/Him/His" :
              appData.pronouns === "she" ? "She/Her/Hers" :
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
              ["Council",                     appData.council],
              ["Region",                      appData.region],
              ["Tenure in Scouting",          appData.tenureInScouting],
              ["Rank",                        appData.rank],
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
            ["Contact Number",                   appData.contactNumber],
            ["Email",                            appData.email],
            ["Willing to be Interviewed",        appData.interview],
          ]} />
        </Section>

        {/* ── SCREENING QUESTIONS (collapsible) ── */}
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

              {/* Values & Conduct */}
              <div className={styles.screeningGroup}>
                <h3 className={styles.screeningGroupTitle}>Values &amp; Conduct</h3>
                <DetailGrid rows={[
                  ["Survivors deserve dignity & respect",           appData.survivorDignity],
                  ["Follow confidentiality & safeguarding policies", appData.confidentialityPolicy],
                  ["Harassment, discrimination & victim-blaming are unacceptable", appData.noHarassment],
                  ["Communicate respectfully regardless of background", appData.respectfulComms],
                ]} />
              </div>

              <div className={styles.screeningDivider} />

              {/* Advocacy & Participation */}
              <div className={styles.screeningGroup}>
                <h3 className={styles.screeningGroupTitle}>Advocacy &amp; Participation</h3>
                <DetailGrid rows={[
                  ["In favor of safer environments",       appData.saferEnvironments],
                  ["Support advocacy efforts",             appData.advocacySupport],
                  ["Enthusiastic to contribute",           appData.enthusiasm],
                  ["Committed to professionalism",         appData.professionalism],
                ]} />
              </div>

              <div className={styles.screeningDivider} />

              {/* Learning & Awareness */}
              <div className={styles.screeningGroup}>
                <h3 className={styles.screeningGroupTitle}>Learning &amp; Awareness</h3>
                <DetailGrid rows={[
                  ["Familiar with gender equality issues",          appData.genderAwareness],
                  ["Stays informed on social issues",               appData.stayInformed],
                  ["Open to learning",                              appData.openToLearn],
                  ["Comfortable with diverse teams",                appData.diverseTeams],
                  ["Willing for orientations/trainings",            appData.orientationWilling],
                  ["Able to dedicate time consistently",            appData.timeCommitment],
                  ["Open to constructive feedback",                 appData.feedbackWilling],
                ]} />
              </div>

              <div className={styles.screeningDivider} />

              {/* Expertise & Interest */}
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

        {/* ── ESSAY ── */}
        <Section title="✍️ Essay">
          <div className={styles.essayBlock}>
            <p className={styles.detailKey}>Description / Personal Statement</p>
            <p className={styles.essayText}>{appData.essayDescription}</p>
          </div>
        </Section>

        {/* ── APPLICATION STATUS (summary) ── */}
        <Section title="📋 Application Status">
          <DetailGrid rows={[
            ["Current Status", <StatusBadge key="s" status={appData.applicationStatus} />],
            ["Date Applied",   appData.dateApplied],
            ["Reviewer Notes", appData.reviewNotes || "No notes yet."],
          ]} />
          {isStaff && (
            <div style={{ marginTop: "1rem" }}>
              <button
                className={styles.btnPrimary}
                onClick={() => setModal("updateStatus")}
              >
                Update Status
              </button>
            </div>
          )}
        </Section>

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