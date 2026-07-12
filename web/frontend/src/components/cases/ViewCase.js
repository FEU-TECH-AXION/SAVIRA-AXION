"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiHelpCircle, FiX } from "react-icons/fi";
import { IoIosArrowBack } from "react-icons/io";
import styles from "./ViewCase.module.css";
import InterviewTab from "./interview/InterviewTab";
import CaseDetailsPage from "./CaseDetailsPage";
import CaseUpdatesTab from "./CaseUpdatesTab";
import FollowUpsPanel, { FollowUpBadge, FollowUpComposer } from "./FollowUps";
import Tooltip from "@/components/ui/Tooltip";
import {
  getWithdrawalActionType,
  getWithdrawalCopy,
  WITHDRAWAL_ACTION,
} from "@/lib/caseWithdrawal";
import { useAuth, authFetch } from "@/lib/AuthContext";
import { API_URL } from "@/lib/config";
import StatusGuide from "./StatusGuide";
import { STATUS_COLORS } from "./caseStatusConstants";

const STATUS_STEP = {
  1: "Submitted",
  2: "For Verification",
  3: "Undergoing Review",
  4: "Verified - True",
  5: "Verified - False",
  6: "Under Case Evaluation",
  7: "Case Filed",
  8: "Investigation Ongoing",
  9: "Hearing Ongoing",
  10: "Dismissed",
  11: "Perpetrator Convicted",
  12: "Resolved",
  13: "Withdrawn",
};

function mapCaseReportToViewData(data) {
  const caseYear = new Date(data.created_at).getFullYear();
  return {
    reportData: data,
    id: data.case_report_id,
    caseId: String(caseYear) + "-" + String(data.case_report_id).padStart(3, "0"),
    reporterId: data.complainant_user_id,
    region: data.incident_province || data.incident_city || "Not provided",
    status: STATUS_STEP[data.case_status_id] || "For Verification",
    caseStatusId: Number(data.case_status_id) || null,
    assignedOfficer: data.assigned_officer || null,
    dateSubmitted: new Date(data.created_at).toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" }),
    description: data.incident_description || "No incident description provided.",
    requestedOutcome: data.action_requested || [],
    evidences: data.evidences || [],
    incidentLocationType: data.incident_location_type || null,
    incidentCity: data.incident_city,
    incidentLocation: data.incident_location,
    incidentLocationDisplay: data.incident_location_type === "Online"
      ? data.incident_location || "Online"
      : data.incident_location_type === "Physical Location"
        ? [data.incident_location, data.incident_city, "NCR"].filter(Boolean).join(", ")
        : data.incident_city || "Not provided",
    incidentDate: data.incident_date || null,
    incidentYear: data.incident_year ?? null,
    incidentMonth: data.incident_month ?? null,
    incidentDay: data.incident_day ?? null,
    incidentTime: data.incident_time
      ? new Date("1970-01-01T" + data.incident_time).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true })
      : "N/A",
    perpetratorKnown: data.is_perpetrator_known,
    perpetratorName: data.perpetrator_name,
    perpetratorGender: data.perpetrator_gender,
    perpetratorUnknownGender: data.perpetrator_unknown_gender || (!data.is_perpetrator_known ? data.perpetrator_gender : null),
    perpetratorUnknownAppearance: data.perpetrator_unknown_appearance,
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
    isWillingForInterview: Boolean(data.is_willing_for_interview),
    name: data.name,
    age: data.age,
    genderIdentity: data.gender_identity,
    email: data.email,
    contactNumber: data.contact_number,
    caseType: data.case_type || null,
    caseCategory: data.primary_category || data.case_category || null,
    primaryCategory: data.primary_category || data.case_category || null,
    alsoInvolves: data.additional_categories || [],
    additionalCategories: data.additional_categories || [],
    referralRequired: data.referral_required || false,
    referralBody: data.referral_body || null,
    assignedParalegal: data.assigned_paralegal || null,
    assignedLegal: (data.assigned_legal || []).map((person) => ({
      ...person,
      assignment_role: person.assignment_role === "legal_officer" ? "lawyer" : person.assignment_role,
    })),
    endorsementStatus: data.endorsement_status || null,
    internalNotes: data.internal_notes || null,
    pendingApproval: null,
    followUpSummary: data.follow_up_summary || null,
    assessmentHistory: data.assessment_history || [],
    followUps: data.follow_ups || [],
    withdrawalRequest: data.withdrawal_request || null,
    possibleDuplicates: data.possible_duplicates || [],
    statusHistory: data.status_history?.length
      ? data.status_history
      : [{
          status: STATUS_STEP[data.case_status_id] || "For Verification",
          date: new Date(data.created_at).toLocaleDateString("en-PH"),
          by: data.assigned_officer || "System",
          notes: "Report received and logged.",
        }],
  };
}

function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 700, background: colors.bg, color: colors.color }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
      {status}
    </span>
  );
}

function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <Tooltip text="Close dialog">
            <button className={styles.modalClose} onClick={onClose} aria-label="Close dialog"><FiX /></button>
          </Tooltip>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

function FormGroup({ label, required, children }) {
  return (
    <div className={styles.formGroup}>
      <label className={styles.formLabel}>{label}{required && <span style={{ color: "#ef4444" }}> *</span>}</label>
      {children}
    </div>
  );
}

function FTextarea(props) {
  return <textarea className={styles.formInput} rows={3} style={{ resize: "vertical" }} {...props} />;
}

export default function ViewCase() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: authUser, loading: authLoading } = useAuth();
  const caseId = searchParams.get("caseId");
  const fromParam = searchParams.get("from");

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "details");
  const [hasInterviewRecord, setHasInterviewRecord] = useState(false);
  const [interviewsChecked, setInterviewsChecked] = useState(false);
  const [toast, setToast] = useState(null);
  const [statusGuideOpen, setStatusGuideOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawAffidavit, setWithdrawAffidavit] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [followUpComposerOpen, setFollowUpComposerOpen] = useState(false);
  const [caseRefreshKey, setCaseRefreshKey] = useState(0);

  const user = {
    id: authUser?.user_id || authUser?.id || null,
  };
  const userLoaded = !authLoading;
  const backRoute = fromParam === "dashboard" ? "/dashboard" : "/cases/history";
  const backLabel = fromParam === "dashboard" ? "Back to Dashboard" : "Back to Report History";

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const handleWithdraw = async (id) => {
    if (!withdrawReason.trim()) {
      showToast("Enter a reason for withdrawal.", "error");
      return;
    }
    try {
      setWithdrawing(true);
      const form = new FormData();
      form.append("reason", withdrawReason.trim());
      if (withdrawAffidavit) form.append("affidavit", withdrawAffidavit);
      const res = await authFetch(API_URL + "/api/case_reports/" + id + "/withdraw", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to withdraw case.");
      showToast(body.message || "Withdrawal submitted.");
      setWithdrawModalOpen(false);
      setWithdrawReason("");
      setWithdrawAffidavit(null);
      setCaseRefreshKey((current) => current + 1);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setWithdrawing(false);
    }
  };

  useEffect(() => {
    if (!caseId) {
      const timer = setTimeout(() => {
        setError("No case ID provided");
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }
    const fetchCase = async () => {
      try {
        setFollowUpsLoading(true);
        const followUpsPromise = authFetch(API_URL + "/api/case_reports/" + caseId + "/follow-ups", { cache: "no-store" })
          .then(async (response) => ({ ok: response.ok, data: response.ok ? (await response.json().catch(() => ({}))).data || [] : [] }))
          .catch(() => ({ ok: false, data: [] }));
        const caseRes = await authFetch(API_URL + "/api/case_reports/" + caseId);
        if (!caseRes.ok) {
          const body = await caseRes.json().catch(() => ({}));
          throw new Error(body.error || "Case not found");
        }
        const { data } = await caseRes.json();
        const mappedCase = mapCaseReportToViewData(data);
        setCaseData(mappedCase);
        followUpsPromise
          .then((followUpsResult) => {
            setCaseData((current) => current ? { ...current, followUps: followUpsResult.data } : current);
          })
          .finally(() => setFollowUpsLoading(false));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
    return undefined;
  }, [caseId, caseRefreshKey]);

  useEffect(() => {
    if (!userLoaded || !caseData?.id) return;
    let cancelled = false;
    const fetchInterviewAccess = async () => {
      setInterviewsChecked(false);
      try {
        const res = await authFetch(API_URL + "/api/interviews?type=case_report&case_report_id=" + caseData.id);
        if (!res.ok) throw new Error("Failed to check interview invitation");
        const json = await res.json();
        if (!cancelled) setHasInterviewRecord(Array.isArray(json.data) && json.data.length > 0);
      } catch {
        if (!cancelled) setHasInterviewRecord(false);
      } finally {
        if (!cancelled) setInterviewsChecked(true);
      }
    };
    fetchInterviewAccess();
    return () => { cancelled = true; };
  }, [caseData?.id, userLoaded]);

  const showInterviewTab = Boolean(caseData?.isWillingForInterview) && interviewsChecked && hasInterviewRecord;
  const displayedActiveTab = activeTab === "interview" && !showInterviewTab ? "details" : activeTab;
  const withdrawalCopy = getWithdrawalCopy(caseData?.status);
  const withdrawalPending = caseData?.withdrawalRequest?.status === "pending";

  if (loading) {
    return <div className={styles.pageWrapper} style={{ padding: "2rem", textAlign: "center" }}><p>Loading case details...</p></div>;
  }

  if (error || !caseData) {
    return (
      <div className={styles.pageWrapper} style={{ padding: "2rem" }}>
        <button className={styles.backBtn} onClick={() => router.push(backRoute)}><IoIosArrowBack /> {backLabel}</button>
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px 16px", color: "#991b1b" }}>{error || "Case not found"}</div>
      </div>
    );
  }

  const tabs = [
    { id: "details", label: "Case Details", tooltip: "View the submitted report and case information." },
    { id: "updates", label: "Case Updates", tooltip: "See progress and announcements about your case." },
    ...(showInterviewTab ? [{ id: "interview", label: "Interview", tooltip: "View interview scheduling and details." }] : []),
    { id: "follow-ups", label: "Follow-ups", tooltip: "View clarification requests, corrections, and replies." },
  ];

  const tabStyle = (id) => ({
    padding: "10px 20px",
    border: "none",
    borderBottom: displayedActiveTab === id ? "2px solid #037F81" : "2px solid transparent",
    background: "none",
    color: displayedActiveTab === id ? "#037F81" : "#6b7280",
    fontWeight: displayedActiveTab === id ? 700 : 500,
    cursor: "pointer",
    fontSize: "0.875rem",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  });

  return (
    <div className={styles.pageWrapper}>
      {toast && <div className={styles.toast + " " + styles["toast--" + (toast.type || "success")]}>{toast.msg}</div>}
      <div className={styles.pageInner}>
        <button className={styles.backBtn} onClick={() => router.push(backRoute)}><FiArrowLeft /> {backLabel}</button>
        <div className={styles.headerCard}>
          <div className={styles.headerTop}>
            <div>
              <h1 className={styles.caseTitle}>{caseData.caseId}</h1>
              <p className={styles.caseSubtitle}>Submitted: {caseData.dateSubmitted}</p>
            </div>
            <div className={styles.headerActions}>
              <StatusBadge status={caseData.status} />
              <button type="button" className={styles.statusGuideBtn} onClick={() => setStatusGuideOpen(true)}><FiHelpCircle /> Guide</button>
              <FollowUpBadge summary={caseData.followUpSummary} />
              {!["Dismissed", "Perpetrator Convicted", "Resolved", "Withdrawn"].includes(caseData.status) && (
                <Tooltip text={caseData.followUpSummary?.type === "user_change_request" && ["open", "responded"].includes(caseData.followUpSummary?.status) ? "A follow-up is already in progress." : "Request a correction or provide more case information."}>
                  <button
                    className={styles.followUpButton}
                    disabled={caseData.followUpSummary?.type === "user_change_request" && ["open", "responded"].includes(caseData.followUpSummary?.status)}
                    onClick={() => setFollowUpComposerOpen(true)}
                  >
                    Follow Up
                  </button>
                </Tooltip>
              )}
              {getWithdrawalActionType(caseData.status) !== WITHDRAWAL_ACTION.BLOCK && (
                <button style={{ background: "#6b7280", padding: "6px 14px", color: "white", border: "none", borderRadius: "999px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }} disabled={withdrawalPending} onClick={() => setWithdrawModalOpen(true)}>
                  {withdrawalPending ? "Withdrawal Pending" : withdrawalCopy.buttonLabel}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className={styles.contentCard}>
          <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", marginBottom: "1.75rem", overflowX: "auto", gap: 0 }}>
            {tabs.map((tab) => (
              <Tooltip key={tab.id} text={tab.tooltip} position="bottom">
                <button style={tabStyle(tab.id)} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
              </Tooltip>
            ))}
          </div>
          {displayedActiveTab === "details" && userLoaded && <CaseDetailsPage caseData={caseData} isStaff={false} />}
          {displayedActiveTab === "updates" && userLoaded && <CaseUpdatesTab caseId={caseData.id} />}
          {displayedActiveTab === "interview" && showInterviewTab && userLoaded && <InterviewTab caseData={caseData} isStaff={false} isCaseOfficer={false} showToast={showToast} userId={user.id} />}
          {displayedActiveTab === "follow-ups" && userLoaded && (
            <FollowUpsPanel
              caseId={caseData.id}
              caseStatus={caseData.status}
              isStaff={false}
              canManage={false}
              loading={followUpsLoading}
              currentUserId={user.id}
              reportData={caseData.reportData}
              onCaseChanged={() => setCaseRefreshKey((current) => current + 1)}
              onSummaryChange={(followUpSummary) => setCaseData((current) => ({ ...current, followUpSummary }))}
            />
          )}
        </div>
        <Modal open={withdrawModalOpen} onClose={() => !withdrawing && setWithdrawModalOpen(false)} title={withdrawalCopy.title}>
          <p className={styles.formDesc}>{withdrawalCopy.description}</p>
          <FormGroup label="Reason for withdrawal" required>
            <FTextarea value={withdrawReason} onChange={(event) => setWithdrawReason(event.target.value)} placeholder="Explain why you want to withdraw this case." />
          </FormGroup>
          {withdrawalCopy.requiresAffidavit && (
            <FormGroup label="Affidavit of Desistance or official withdrawal document" required>
              <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(event) => setWithdrawAffidavit(event.target.files?.[0] || null)} />
            </FormGroup>
          )}
          <div className={styles.modalFooter}>
            <button className={styles.btnSecondary} disabled={withdrawing} onClick={() => setWithdrawModalOpen(false)}>Cancel</button>
            <button
              className={styles.btnPrimary}
              style={{ background: "#dc2626", borderColor: "#dc2626" }}
              disabled={withdrawing || !withdrawReason.trim() || (withdrawalCopy.requiresAffidavit && !withdrawAffidavit)}
              onClick={() => handleWithdraw(caseData.id)}
            >
              {withdrawing ? "Submitting..." : withdrawalCopy.actionType === WITHDRAWAL_ACTION.REQUIRE_APPROVAL ? "Submit Request" : "Confirm Withdrawal"}
            </button>
          </div>
        </Modal>
        <FollowUpComposer
          open={followUpComposerOpen}
          onClose={() => setFollowUpComposerOpen(false)}
          caseId={caseData.id}
          isStaff={false}
          reportData={caseData.reportData}
          activeFollowUp={caseData.followUpSummary?.type === "user_change_request" && ["open", "responded"].includes(caseData.followUpSummary?.status) ? caseData.followUpSummary : null}
          onCreated={(created) => {
            setCaseData((current) => ({ ...current, followUpSummary: created }));
            setCaseRefreshKey((current) => current + 1);
            setActiveTab("follow-ups");
          }}
        />
      </div>
      <StatusGuide open={statusGuideOpen} onClose={() => setStatusGuideOpen(false)} />
    </div>
  );
}
