"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FiArrowLeft,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import styles from "./ViewCase.module.css";

// ─── Status map ───────────────────────────────────────────────────────────────
const STATUS_STEP = {
  1: "For Verification",
  2: "Undergoing Review",
  3: "Verified - True",
  4: "Verified - False",
  5: "Under Case Evaluation",
  6: "Case Filed",
  7: "Closed",
};

// ─── StatusBadge ─────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  "For Verification":      { bg: "#fef3c7", color: "#92400e" },
  "Undergoing Review":     { bg: "#dbeafe", color: "#1e40af" },
  "Verified - True":       { bg: "#d1fae5", color: "#065f46" },
  "Verified - False":      { bg: "#fee2e2", color: "#991b1b" },
  "Under Case Evaluation": { bg: "#ede9fe", color: "#5b21b6" },
  "Case Filed":            { bg: "#e0f2fe", color: "#0c4a6e" },
  "Closed":                { bg: "#f3f4f6", color: "#374151" },
};

function StatusBadge({ status }) {
  const { bg, color } = STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      display: "inline-block",
      padding: "4px 12px",
      borderRadius: 999,
      fontSize: "0.78rem",
      fontWeight: 700,
      background: bg,
      color,
    }}>
      {status}
    </span>
  );
}

// ─── NLP Analysis Section ─────────────────────────────────────────────────────
function CategoryBadge({ label }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 999,
      fontSize: "0.78rem",
      fontWeight: 600,
      background: "#e1f5f5",
      color: "#037F81",
      marginRight: 6,
      marginBottom: 4,
    }}>
      {label}
    </span>
  );
}

function NLPAnalysisSection({ caseReportId, isAdmin, isCaseOfficer }) {
  const [nlpData, setNlpData] = useState(null);
  const [nlpLoading, setNlpLoading] = useState(false);
  const [nlpError, setNlpError] = useState(null);

  useEffect(() => {
    if (!caseReportId || (!isAdmin && !isCaseOfficer)) return;

    const fetchNlp = async () => {
      setNlpLoading(true);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_URL}/api/case_reports/${caseReportId}/nlp`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("NLP data not available");
        const json = await res.json();
        setNlpData(json.data || json);
      } catch (err) {
        setNlpError(err.message);
      } finally {
        setNlpLoading(false);
      }
    };

    fetchNlp();
  }, [caseReportId, isAdmin, isCaseOfficer]);

  if (!isAdmin && !isCaseOfficer) return null;

  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem", color: "#1f2937" }}>
        🤖 AI / NLP Analysis
      </h2>

      {nlpLoading && (
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Analyzing case...</p>
      )}

      {nlpError && (
        <p style={{ fontSize: "0.875rem", color: "#991b1b" }}>{nlpError}</p>
      )}

      {nlpData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {nlpData.summary && (
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>
                📝 Summary
              </h4>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#4b5563", lineHeight: 1.6 }}>
                {nlpData.summary}
              </p>
            </div>
          )}

          <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>
              🏷️ Suggested Classification
            </h4>
            <p style={{ margin: "0 0 4px", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Primary Categories
            </p>
            <div style={{ marginBottom: 12 }}>
              {nlpData.primary_categories?.length > 0
                ? nlpData.primary_categories.map((c) => <CategoryBadge key={c} label={c} />)
                : <span style={{ fontSize: "0.82rem", color: "#9ca3af" }}>None suggested</span>
              }
            </div>

            <p style={{ margin: "0 0 4px", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Possible Case Types
            </p>
            <div style={{ marginBottom: 12 }}>
              {nlpData.case_types?.length > 0
                ? nlpData.case_types.map((t) => (
                  <span key={t} style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    borderRadius: 999,
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    background: "#f3e8ff",
                    color: "#6b21a8",
                    marginRight: 6,
                    marginBottom: 4,
                  }}>
                    {t}
                  </span>
                ))
                : <span style={{ fontSize: "0.82rem", color: "#9ca3af" }}>None suggested</span>
              }
            </div>

            {nlpData.classification_notes && (
              <>
                <p style={{ margin: "0 0 4px", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Notes
                </p>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#4b5563", lineHeight: 1.6 }}>
                  {nlpData.classification_notes}
                </p>
              </>
            )}
          </div>

          <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>
              📋 Suggested Next Steps
            </h4>
            {nlpData.recommended_steps?.length > 0 ? (
              <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: 6 }}>
                {nlpData.recommended_steps.map((step, i) => (
                  <li key={i} style={{ fontSize: "0.875rem", color: "#4b5563", lineHeight: 1.6 }}>
                    {step}
                  </li>
                ))}
              </ol>
            ) : (
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#9ca3af" }}>No steps suggested.</p>
            )}
          </div>

          <div style={{
            background: nlpData.referral_suggested ? "#fffbeb" : "#f0fdf4",
            border: `1px solid ${nlpData.referral_suggested ? "#fcd34d" : "#86efac"}`,
            borderRadius: 8,
            padding: "14px 16px",
          }}>
            <h4 style={{ margin: "0 0 6px", fontSize: "0.875rem", fontWeight: 700, color: nlpData.referral_suggested ? "#92400e" : "#166534" }}>
              {nlpData.referral_suggested ? "⚠️ Referral may be appropriate" : "✅ May be resolvable internally"}
            </h4>
            {nlpData.referral_notes && (
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#4b5563", lineHeight: 1.6 }}>
                {nlpData.referral_notes}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN VIEWCASE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ViewCase() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // FIX: was searchParams.get("id") — URL uses ?caseId=40
  const caseId = searchParams.get("caseId");

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [user, setUser] = useState({ role: null });

  const isAdmin = user.role?.toLowerCase() === "admin";
  const isCaseOfficer =
    user.role?.toLowerCase() === "case officer" ||
    user.role?.toLowerCase() === "case_officer";

  useEffect(() => {
    const userCookie = getCookie("user");
    if (userCookie) {
      try {
        const stored = JSON.parse(userCookie);
        setUser({
          role: stored.role_name,
          firstName: stored.first_name,
          lastName: stored.last_name,
        });
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    if (!caseId) {
      setError("No case ID provided");
      setLoading(false);
      return;
    }

    const fetchCase = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_URL}/api/case_reports/${caseId}`, {
          credentials: "include",
        });
        if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Case not found");
      }
        const { data } = await res.json();

        setCaseData({
          id: data.case_report_id,
          caseId: "SASHA-" + String(data.case_report_id).padStart(5, "0"),
          reporterId: String(data.complainant_id),
          region: data.incident_province || data.incident_city || "—",
          status: STATUS_STEP[data.case_status_id] || "For Verification",
          assignedOfficer: data.assigned_officer || null,
          dateSubmitted: new Date(data.created_at).toLocaleDateString("en-PH"),
          description: data.incident_description || "—",
          incidentCity: data.incident_city,
          incidentLocation: data.incident_location,
          incidentDate: data.incident_date,
          incidentTime: data.incident_time,
          perpetratorKnown: data.is_perpetrator_known,
          perpetratorName: data.perpetrator_name,
          perpetratorGender: data.perpetrator_gender,
          perpetratorOccupation: data.perpetrator_occupation,
          perpetratorRelationship: data.perpetrator_relationship,
          hasWitnesses: data.has_witnesses,
          witnessName: data.witness_name,
          witnessContact: data.witness_contact,
          witnessRelationship: data.witness_relationship,
          reportedToOthers: data.reported_to_others,
          toldAnyoneWho: data.told_anyone_who,
          reportedToPolice: data.reported_to_police,
          policeStation: data.police_station,
          isAnonymous: data.is_anonymous,
          isWillingForInterview: data.is_willing_for_interview,
          name: data.name,
          age: data.age,
          genderIdentity: data.gender_identity,
          email: data.email,
          contactNumber: data.contact_number,
          statusHistory: [
            {
              status: STATUS_STEP[data.case_status_id] || "For Verification",
              date: new Date(data.created_at).toLocaleDateString("en-PH"),
              by: data.assigned_officer || "System",
              notes: "Report received and logged.",
            },
          ],
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [caseId]);

  if (loading) {
    return (
      <div className={styles.pageWrapper} style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading case details...</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className={styles.pageWrapper} style={{ padding: "2rem" }}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <FiArrowLeft /> Back
        </button>
        <div style={{
          background: "#fee2e2",
          border: "1px solid #fca5a5",
          borderRadius: 8,
          padding: "12px 16px",
          color: "#991b1b",
        }}>
          {error || "Case not found"}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageInner}>

        {/* Back Button */}
        <button className={styles.backBtn} onClick={() => router.back()}>
          <FiArrowLeft /> Back to Cases
        </button>

        {/* Header card */}
        <div className={styles.headerCard}>
          <div className={styles.headerTop}>
            <div>
              <h1 className={styles.caseTitle}>{caseData.caseId}</h1>
              <p className={styles.caseSubtitle}>Submitted: {caseData.dateSubmitted}</p>
            </div>
            <StatusBadge status={caseData.status} />
          </div>
        </div>

        {/* Main content card */}
        <div className={styles.contentCard}>

          {/* Complainant Details */}
          <section className={styles.section}>
            <h2 className={styles.sectionHeadingText}>👤 Complainant Details</h2>
            <div className={styles.detailGrid}>
              {[
                ["Name", caseData.name],
                ["Age", caseData.age],
                ["Gender Identity", caseData.genderIdentity],
                ["Email", caseData.email],
                ["Contact Number", caseData.contactNumber],
                ["Willing for Interview?", caseData.isWillingForInterview ? "Yes" : "No"],
                ["Anonymous Report?", caseData.isAnonymous ? "Yes" : "No"],
              ].map(([k, v]) => (
                <div key={k} className={styles.detailItem}>
                  <p className={styles.detailKey}>{k}</p>
                  <p className={styles.detailVal}>{v || "—"}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Incident Details */}
          <section className={styles.section}>
            <h2 className={styles.sectionHeadingText}>📍 Incident Details</h2>
            <div className={styles.detailGrid} style={{ marginBottom: "1rem" }}>
              {[
                ["City", caseData.incidentCity],
                ["Location/Venue", caseData.incidentLocation],
                ["Date", caseData.incidentDate],
                ["Time", caseData.incidentTime],
              ].map(([k, v]) => (
                <div key={k} className={styles.detailItem}>
                  <p className={styles.detailKey}>{k}</p>
                  <p className={styles.detailVal}>{v || "—"}</p>
                </div>
              ))}
            </div>
            <div>
              <p className={styles.detailKey}>Description</p>
              <p className={styles.descriptionVal}>{caseData.description}</p>
            </div>
          </section>

          {/* Perpetrator Information */}
          {caseData.perpetratorKnown && (
            <section className={styles.section}>
              <h2 className={styles.sectionHeadingText}>⚠️ Perpetrator Information</h2>
              <div className={styles.detailGrid}>
                {[
                  ["Name", caseData.perpetratorName],
                  ["Gender", caseData.perpetratorGender],
                  ["Occupation", caseData.perpetratorOccupation],
                  ["Relationship to Complainant", caseData.perpetratorRelationship],
                ].map(([k, v]) => (
                  <div key={k} className={styles.detailItem}>
                    <p className={styles.detailKey}>{k}</p>
                    <p className={styles.detailVal}>{v || "—"}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Witness Information */}
          {caseData.hasWitnesses && (
            <section className={styles.section}>
              <h2 className={styles.sectionHeadingText}>👥 Witness Information</h2>
              <div className={styles.detailGrid}>
                {[
                  ["Witness Name", caseData.witnessName],
                  ["Contact", caseData.witnessContact],
                  ["Relationship to Complainant", caseData.witnessRelationship],
                ].map(([k, v]) => (
                  <div key={k} className={styles.detailItem}>
                    <p className={styles.detailKey}>{k}</p>
                    <p className={styles.detailVal}>{v || "—"}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Additional Context */}
          <section className={styles.section}>
            <h2 className={styles.sectionHeadingText}>ℹ️ Additional Context</h2>
            <div className={styles.detailGrid}>
              {[
                ["Reported to Anyone Else?", caseData.reportedToOthers ? "Yes" : "No"],
                ...(caseData.reportedToOthers && caseData.toldAnyoneWho
                  ? [["Told To", caseData.toldAnyoneWho]]
                  : []),
                ["Reported to Police?", caseData.reportedToPolice ? "Yes" : "No"],
                ...(caseData.reportedToPolice && caseData.policeStation
                  ? [["Police Station", caseData.policeStation]]
                  : []),
              ].map(([k, v]) => (
                <div key={k} className={styles.detailItem}>
                  <p className={styles.detailKey}>{k}</p>
                  <p className={styles.detailVal}>{v || "—"}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Status History */}
          <section className={styles.section}>
            <button
              className={styles.historyToggle}
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? <FiChevronUp /> : <FiChevronDown />}
              {showHistory ? "Hide" : "Show"} Status History ({caseData.statusHistory?.length || 0} entries)
            </button>

            {showHistory && (
              <div className={styles.historyList}>
                {(caseData.statusHistory || []).map((h, i) => (
                  <div key={i} className={styles.historyItem}>
                    <div style={{ textAlign: "center" }}>
                      <div className={styles.historyDot} />
                      {i < (caseData.statusHistory?.length || 1) - 1 && (
                        <div style={{ width: 2, height: 40, background: "#e5e7eb", margin: "0 auto" }} />
                      )}
                    </div>
                    <div style={{ paddingTop: 2 }}>
                      <StatusBadge status={h.status} />
                      <p className={styles.historyMeta}>{h.date} · {h.by}</p>
                      {h.notes && <p className={styles.historyNotes}>{h.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* NLP Analysis */}
          <NLPAnalysisSection
            caseReportId={caseData.id}
            isAdmin={isAdmin}
            isCaseOfficer={isCaseOfficer}
          />

        </div>
      </div>
    </div>
  );
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2)
    return decodeURIComponent(parts.pop().split(";").shift());
  return null;
}