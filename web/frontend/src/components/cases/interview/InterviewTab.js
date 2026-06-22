"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./InterviewTab.module.css";
import {
  FiArrowLeft,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiAlertCircle,
  FiAlertTriangle,
  FiCheck,
  FiX,
  FiInfo,
} from "react-icons/fi";
import { FaCheckCircle } from "react-icons/fa";
import { IoIosInformationCircle, IoIosWarning, IoIosClose } from "react-icons/io";
import Tooltip from "@/components/ui/Tooltip";

// ─── InterviewTab ─────────────────────────────────────────────────────────────
//
// Displayed when caseData.isWillingForInterview === true.
//
// Staff view: schedule/manage interviews (unchanged).
// Complainant view: status-driven —
//   • No interview record         → hide section (nothing shown)
//   • interviewStatus = Invited   → "Select a Slot" calendar + expiry countdown
//   • interviewStatus = Scheduled → "Waiting for Link" view
//   • interviewStatus = Confirmed → "Your Interview is Confirmed" with meeting link
//

const INTERVIEW_STATUS_COLORS = {
  Scheduled:  { bg: "#dbeafe", color: "#1e40af" },
  Confirmed:  { bg: "#d1fae5", color: "#065f46" },
  Completed:  { bg: "#d1fae5", color: "#065f46" },
  Cancelled:  { bg: "#fee2e2", color: "#991b1b" },
  Invited:    { bg: "#fef3c7", color: "#92400e" },
  Expired:    { bg: "#f1f5f9", color: "#475569" },
  Pending:    { bg: "#fef3c7", color: "#92400e" },
};

function InterviewStatusBadge({ status }) {
  const s = INTERVIEW_STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 999,
      fontSize: "0.78rem",
      fontWeight: 700,
      background: s.bg,
      color: s.color,
    }}>
      {status}
    </span>
  );
}

// ─── Expiry Countdown ─────────────────────────────────────────────────────────

function ExpiryCountdown({ expiresAt }) {
  const calcRemaining = useCallback(() => {
    const diff = new Date(expiresAt) - Date.now();
    if (diff <= 0) return null;
    const totalSec = Math.floor(diff / 1000);
    const days    = Math.floor(totalSec / 86400);
    const hours   = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return { days, hours, minutes, seconds, totalSec };
  }, [expiresAt]);

  const [remaining, setRemaining] = useState(calcRemaining);

  useEffect(() => {
    const timer = setInterval(() => setRemaining(calcRemaining()), 1000);
    return () => clearInterval(timer);
  }, [calcRemaining]);

  if (!remaining) {
    return (
      <div style={{
        background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8,
        padding: "10px 14px", fontSize: "0.875rem", color: "#991b1b",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <strong>This invitation has expired.</strong> Please contact your case officer.
      </div>
    );
  }

  const urgent = remaining.totalSec < 86400; // less than 1 day
  const color  = urgent ? "#991b1b" : "#92400e";
  const bg     = urgent ? "#fee2e2" : "#fef3c7";
  const border = urgent ? "#fca5a5" : "#fde68a";

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 8,
      padding: "10px 14px", fontSize: "0.875rem", color,
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
    }}>
      <span style={{ fontSize: "1.1rem" }}><IoIosInformationCircle /></span>
      <span style={{ fontWeight: 600 }}>Invitation expires in:</span>
      <span className={styles.countdown} style={{ color, fontVariantNumeric: "tabular-nums" }}>
        {remaining.days > 0 && `${remaining.days}d `}
        {pad(remaining.hours)}h {pad(remaining.minutes)}m {pad(remaining.seconds)}s
      </span>
      {urgent && (
        <span style={{ fontWeight: 700, marginLeft: 4 }}>— Select a slot soon!</span>
      )}
    </div>
  );
}

// ─── Calendar Helpers ─────────────────────────────────────────────────────────

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Slot Picker Calendar — Calendly-style two-panel layout ──────────────────
//
//  LEFT  — compact month grid; days with free slots are highlighted/clickable
//  RIGHT — 3-state panel:
//            (1) prompt   → pick a day
//            (2) slots    → list of time chips for selected day
//            (3) confirm  → summary card with Back / Confirm buttons
//

function SlotPickerCalendar({ slots, onSelectSlot }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear]     = useState(today.getFullYear());
  const [viewMonth, setViewMonth]   = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null); // "YYYY-MM-DD"
  const [pendingSlot, setPendingSlot]   = useState(null); // slot object

  const daysInMonth    = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfMonth = getFirstDayOfMonth(viewYear, viewMonth);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Group slots by date string — only future free slots
  const slotsByDate = {};
  slots.forEach((s) => {
    if (s.status !== "free") return;
    const slotDate = new Date(s.date);
    slotDate.setHours(0, 0, 0, 0);
    if (slotDate < today) return;
    if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
    slotsByDate[s.date].push(s);
  });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const formatTime = (t) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const formatDateLong = (dateStr) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("en-PH", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });

  const formatDateShort = (dateStr) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("en-PH", {
      weekday: "short", month: "short", day: "numeric",
    });

  // Build calendar grid
  const cells = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const slotsForSelected = selectedDate ? (slotsByDate[selectedDate] || []) : [];

  // ── Right-panel content ──────────────────────────────────────────────────
  let rightPanel;

  if (pendingSlot) {
    // Step 3 — Confirmation card
    rightPanel = (
      <div className={styles.rpConfirm}>
        <div className={styles.rpConfirmIcon}><FaCheckCircle /></div>
        <h3 className={styles.rpConfirmTitle}>Confirm your slot?</h3>
        <div className={styles.rpConfirmCard}>
          <div className={styles.rpConfirmRow}>
            <span className={styles.rpConfirmLabel}>Date</span>
            <span className={styles.rpConfirmValue}>{formatDateLong(pendingSlot.date)}</span>
          </div>
          <div className={styles.rpConfirmRow}>
            <span className={styles.rpConfirmLabel}>Time</span>
            <span className={styles.rpConfirmValue}>{formatTime(pendingSlot.time)}</span>
          </div>
          {pendingSlot.duration && (
            <div className={styles.rpConfirmRow}>
              <span className={styles.rpConfirmLabel}> Duration</span>
              <span className={styles.rpConfirmValue}>{pendingSlot.duration} minutes</span>
            </div>
          )}
        </div>
        <p className={styles.rpConfirmNote}>
          Once confirmed, your case officer will be notified and will send the meeting details shortly.
        </p>
        <div className={styles.rpConfirmActions}>
          <button className={styles.rpBackBtn} onClick={() => setPendingSlot(null)}>
            ← Back
          </button>
          <button className={styles.rpConfirmBtn} onClick={() => onSelectSlot(pendingSlot)}>
            Confirm Slot
          </button>
        </div>
      </div>
    );
  } else if (selectedDate) {
    // Step 2 — Time slot list for selected day
    rightPanel = (
      <div className={styles.rpSlots}>
        <div className={styles.rpSlotsHeader}>
          <button className={styles.rpBackLink} onClick={() => setSelectedDate(null)}>← Back</button>
          <div>
            <p className={styles.rpSlotsDay}>{formatDateShort(selectedDate)}</p>
            <p className={styles.rpSlotsCount}>
              {slotsForSelected.length} slot{slotsForSelected.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>
        {slotsForSelected.length === 0 ? (
          <p className={styles.rpNoSlots}>No available slots for this day.</p>
        ) : (
          <div className={styles.rpSlotList}>
            {slotsForSelected.map((slot) => (
              <button
                key={slot.id}
                className={styles.rpSlotBtn}
                onClick={() => setPendingSlot(slot)}
              >
                <span className={styles.rpSlotTime}>{formatTime(slot.time)}</span>
                {slot.duration && (
                  <span className={styles.rpSlotDur}>{slot.duration} min</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  } else {
    // Step 1 — Prompt to pick a date
    const hasAnySlots = Object.keys(slotsByDate).length > 0;
    rightPanel = (
      <div className={styles.rpPrompt}>
        {hasAnySlots ? (
          <>
            <p className={styles.rpPromptTitle}>Select a date</p>
            <p className={styles.rpPromptSub}>
              Highlighted dates have available slots. Click a date to see the times.
            </p>
          </>
        ) : (
          <>
            <p className={styles.rpPromptTitle}>No slots available</p>
            <p className={styles.rpPromptSub}>
              Please contact your case officer to arrange an interview time.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={styles.slotPickerLayout}>
      {/* ── LEFT: compact month calendar ── */}
      <div className={styles.calPanel}>
        {/* Month navigation */}
        <div className={styles.calPanelHeader}>
          <Tooltip text="Previous month">
            <button className={styles.calNavBtn} onClick={prevMonth} aria-label="Previous month">‹</button>
          </Tooltip>
          <span className={styles.calMonthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
          <Tooltip text="Next month">
            <button className={styles.calNavBtn} onClick={nextMonth} aria-label="Next month">›</button>
          </Tooltip>
        </div>

        {/* Day-of-week headers */}
        <div className={styles.calMiniGrid}>
          {DAY_NAMES.map((d) => (
            <div key={d} className={styles.calMiniDayName}>{d}</div>
          ))}

          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />;

            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dateObj = new Date(viewYear, viewMonth, day);
            const hasSlots = !!(slotsByDate[dateStr]?.length);
            const isPast   = dateObj < today;
            const isToday  = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;

            return (
              <button
                key={dateStr}
                disabled={isPast || !hasSlots}
                onClick={() => { setSelectedDate(dateStr); setPendingSlot(null); }}
                className={[
                  styles.calMiniDay,
                  isToday    ? styles.calMiniToday    : "",
                  isSelected ? styles.calMiniSelected : "",
                  hasSlots && !isPast ? styles.calMiniHasSlots : "",
                  isPast     ? styles.calMiniPast     : "",
                ].filter(Boolean).join(" ")}
                title={hasSlots ? `${slotsByDate[dateStr].length} slot(s) on this day` : undefined}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className={styles.calMiniLegend}>
          <span>
            <span className={styles.calMiniLegendDot} style={{ background: "transparent", border: "2px solid #037F81" }} />
            Available slots
          </span>
          <span>
            <span className={styles.calMiniLegendDot} style={{ background: "#037F81" }} />
            Selected
          </span>
        </div>
      </div>

      {/* ── RIGHT: dynamic panel ── */}
      <div className={styles.rightPanel}>
        {rightPanel}
      </div>
    </div>
  );
}

// Modal shell (same as CaseManagement)
function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalBox}
        style={wide ? { maxWidth: 700 } : {}}
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true"
      >
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

function FormGroup({ label, required, hint, error, children }) {
  return (
    <div className={styles.formGroup}>
      <label className={styles.formLabel}>{label}{required && <span style={{ color: "#ef4444" }}> *</span>}</label>
      {children}
      {hint && !error && <span className={styles.formHint}>{hint}</span>}
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  );
}

function FSelect({ error, children, ...props }) {
  return (
    <select className={`${styles.formInput} ${error ? styles.inputError : ""}`} {...props}>
      {children}
    </select>
  );
}

function FTextarea({ error, ...props }) {
  return <textarea className={`${styles.formInput} ${error ? styles.inputError : ""}`} rows={3} style={{ resize: "vertical" }} {...props} />;
}

// ─── Invite to Interview Modal ────────────────────────────────────────────────

function InviteToInterviewModal({ open, onClose, caseData, actorName, showToast, userId, userRole }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const [expiryDays, setExpiryDays] = useState("7");
  const [notes, setNotes]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);

  useEffect(() => { if (open) { setExpiryDays("7"); setNotes(""); setError(null); } }, [open]);

  async function handleSaveMeetingLink(interviewId, meetingLink) {
  // API call later

  setInterviews((prev) =>
    prev.map((iv) =>
      iv.id === interviewId
        ? {
            ...iv,
            meetingLink,
            interviewStatus: "Confirmed",
            status: "Confirmed",
          }
        : iv
    )
  );
}

  async function handleSend() {
    console.log("handleSend fired", { userId, caseDataId: caseData.id, reporterId: caseData.reporterId });
    setSubmitting(true);
    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      
      // Validate reporterId exists
      if (!caseData.reporterId) {
        throw new Error("Complainant user ID is missing. Cannot create interview. Check that the case has a valid complainant assigned.");
      }
      
      if (!userId) {
        throw new Error("Officer user ID is missing. Cannot create interview.");
      }

      console.log("Creating interview with:", {
        type: "case_report",
        case_report_id: caseData.id,
        interviewee_user_id: caseData.reporterId,
        interviewer_user_id: userId,
      });
      
      const interviewRes = await fetch(`${API_URL}/api/interviews`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "case_report",
          case_report_id: caseData.id,
          interviewee_user_id: caseData.reporterId,
          interviewer_user_id: userId,
          notes: notes || null,
          slot_expires_at: new Date(Date.now() + parseInt(expiryDays) * 86400000).toISOString(),
          status: "invited",
        }),
      });

      console.log("interview response status:", interviewRes.status);
      const interviewBody = await interviewRes.json();
      console.log("interview response body:", interviewBody);

      if (!interviewRes.ok) {
        throw new Error(interviewBody.error || `Failed to create interview (${interviewRes.status})`);
      }

      console.log("Interview created successfully");
      showToast && showToast(`Interview invitation sent for ${caseData.caseId}.`);
      onClose();

    } catch (err) {
      console.error("FULL ERROR:", err);
      setError(err.message);
      showToast && showToast(err.message || "Failed to send invitation.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite Complainant to Interview">
      <p className={styles.formDesc}>
        Send an interview invitation to the complainant for <strong>{caseData?.caseId}</strong>.
        They will be able to select a slot from your available calendar.
      </p>
      
      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: "0.875rem", color: "#991b1b" }}>
          <IoIosWarning /> {error}
        </div>
      )}

      <div className={styles.formGrid}>
        <FormGroup label="Invitation expiry (days)" hint="How many days the complainant has to select a slot.">
          <FSelect value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)}>
            <option value="3">3 days</option>
            <option value="5">5 days</option>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
          </FSelect>
        </FormGroup>
        <FormGroup label="Notes for complainant" hint="Optional message shown alongside the invitation.">
          <FTextarea
            placeholder="e.g. Please select a slot at your earliest convenience."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FormGroup>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSend} disabled={submitting}>
          {submitting ? "Sending…" : "Send Invitation"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Add Meeting Link Modal ────────────────────────────────────────────────
function AddMeetingLinkModal({
  open,
  onClose,
  interview,
  onSave,
  showToast,
}) {
  const [meetingLink, setMeetingLink] = useState(
    interview?.meetingLink || ""
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMeetingLink(interview?.meetingLink || "");
    }
  }, [open, interview]);

  const ALLOWED_DOMAINS = [
    "meet.google.com",
    "zoom.us",
    "teams.microsoft.com",
    "teams.live.com", // Teams personal links use this
  ];

  function validateMeetingLink(url) {
    try {
      const { protocol, hostname } = new URL(url.trim());
      if (!["https:", "http:"].includes(protocol)) return false;
      return ALLOWED_DOMAINS.some(
        (d) => hostname === d || hostname.endsWith(`.${d}`)
      );
    } catch {
      return false;
    }
  }

  async function handleSave() {
    if (!meetingLink.trim()) {
      showToast?.("Meeting link is required.", "error");
      return;
    }
    if (!validateMeetingLink(meetingLink)) {
      showToast?.(
        "Only Google Meet, Zoom, or Microsoft Teams links are allowed.",
        "error"
      );
      return;
    }

    try {
      setSubmitting(true);

      // API call goes here later
      await onSave(meetingLink);

      showToast?.("Meeting link added successfully.");
      onClose();
    } catch (err) {
      showToast?.(err.message || "Failed to save meeting link.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Meeting Link"
    >
      <FormGroup
        label="Meeting Link"
        required
        hint="Accepted: Google Meet, Zoom, or Microsoft Teams"
      >
        <input
          type="url"
          className={styles.formInput}
          placeholder="https://meet.google.com/..."
          value={meetingLink}
          onChange={(e) => setMeetingLink(e.target.value)}
        />
      </FormGroup>

      <div className={styles.modalFooter}>
        <button
          className={styles.btnSecondary}
          onClick={onClose}
        >
          Cancel
        </button>

        <button
          className={styles.btnPrimary}
          onClick={handleSave}
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Save Link"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Complainant: Invited view (Select a Slot) ────────────────────────────────

function InvitedView({ caseData, interview, onSlotSelected, showToast }) {

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(
          `${API_URL}/api/interview_slots?slot_type=case_report&is_available=true`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("Failed to load slots");
        const json = await res.json();
        // Map slot_id → id so SlotPickerCalendar works
        setSlots((json.data || []).map(s => ({
          ...s,
          id: s.slot_id,
          date: s.slot_date,
          time: s.slot_time,
          status: "free",
        })));
      } catch {
        setSlots([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSlots();
  }, []);

  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoading] = useState(true); // no loading needed for mock
  const [confirming, setConfirming] = useState(false);
  const [pendingSlot, setPendingSlot] = useState(null);

  async function handleConfirmSlot(slot) {
    setConfirming(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/api/interviews/${interview.id}/select-slot`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_id: slot.id }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to confirm slot.");
      }

      showToast?.("Slot selected! Your case officer will confirm shortly.");
      onSlotSelected?.({ ...interview, interviewStatus: "Scheduled", slot });
    } catch (err) {
      showToast?.(err.message || "Failed to confirm slot.", "error");
    } finally {
      setConfirming(false);
    }
  }

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString("en-PH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const formatTime = (t) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Header */}
      <div>
        <h2 className={styles.statusTitle}>Select an Interview Slot</h2>
        <p className={styles.statusDesc}>
          You have been invited to an interview with your SASHA case officer.
          Please select a time slot that works for you.
        </p>
      </div>

      {/* Invitation expiry countdown */}
      {interview.expiresAt && <ExpiryCountdown expiresAt={interview.expiresAt} />}

      {/* Slot picker — calendar + right panel are fully self-contained */}
      {loadingSlots ? (
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Loading available slots…</p>
      ) : slots.length === 0 ? (
        <div style={{
          background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8,
          padding: "12px 16px", fontSize: "0.875rem", color: "#92400e",
        }}>
          <IoIosWarning /> No available slots at the moment. Please contact your case officer directly.
        </div>
      ) : (
        <SlotPickerCalendar
          slots={slots}
          onSelectSlot={(slot) => handleConfirmSlot(slot)}
        />
      )}

      {confirming && (
        <p style={{ fontSize: "0.875rem", color: "#6b7280", textAlign: "center" }}>
           Confirming your slot…
        </p>
      )}
    </div>
  );
}

// ─── Complainant: Scheduled view (Waiting for Link) ───────────────────────────

function ScheduledView({ interview, onReschedule }) {
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString("en-PH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const formatTime = (t) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 className={styles.statusTitle}>Waiting for Meeting Link</h2>
          <p className={styles.statusDesc}>
            Your slot has been reserved. Your case officer will confirm and send you the meeting link shortly.
          </p>
        </div>
        {onReschedule && (
          <button className={styles.rescheduleBtn} onClick={onReschedule}>
            Reschedule
          </button>
        )}
      </div>

      <div className={styles.selectedSlot}>
        <div className={styles.slotInfo}>
          <div>
            <p className={styles.slotLabel}>Scheduled Date & Time</p>
            <p className={styles.slotValue}>
              {interview.scheduledDate ? formatDate(interview.scheduledDate) : interview.interview_date || "—"}
              {" at "}
              {interview.scheduledTime ? formatTime(interview.scheduledTime) : interview.interview_time || "—"}
            </p>
          </div>
          {interview.notes && (
            <div>
              <p className={styles.slotLabel}>Notes</p>
              <p className={styles.slotValue}>{interview.notes}</p>
            </div>
          )}
          {interview.meetingLink && (
            <div>
              <p className={styles.slotLabel}>Meeting Link</p>
              <a
                href={interview.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.meetingLink}
              >
                Join Meeting
              </a>
            </div>
          )}
        </div>
      </div>

      <div className={styles.waitingMessage}>
        You will be notified once the meeting link is ready. Please check back here or watch for a notification.
      </div>
    </div>
  );
}

// ─── Complainant: Confirmed view (Interview is Confirmed) ─────────────────────

function ConfirmedView({ interview, onReschedule }) {
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString("en-PH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const formatTime = (t) => {
    if (!t) return "—";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 className={styles.statusTitle}>Your Interview is Confirmed</h2>
          <p className={styles.statusDesc}>
            Everything is set. See the details below and join at the scheduled time.
          </p>
        </div>
        {onReschedule && (
          <button className={styles.rescheduleBtn} onClick={onReschedule}>
            Reschedule
          </button>
        )}
      </div>

      <div className={styles.confirmedDetails}>
        <div className={styles.detailRow}>
          <div>
            <p className={styles.detailLabel}>Date</p>
            <p className={styles.detailValue}>
              {interview.scheduledDate ? formatDate(interview.scheduledDate) : interview.interview_date || "—"}
            </p>
          </div>
        </div>
        <div className={styles.detailRow}>
          <div>
            <p className={styles.detailLabel}>Time</p>
            <p className={styles.detailValue}>
              {interview.scheduledTime ? formatTime(interview.scheduledTime) : formatTime(interview.interview_time)}
            </p>
          </div>
        </div>
        {interview.location && (
          <div className={styles.detailRow}>
            <div>
              <p className={styles.detailLabel}>Location / Platform</p>
              <p className={styles.detailValue}>{interview.location}</p>
            </div>
          </div>
        )}
        {interview.meetingLink && (
          <div className={styles.detailRow}>
            <div>
              <p className={styles.detailLabel}>Meeting Link</p>
              <a
                href={interview.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.meetingLink}
              >
                Join Meeting
              </a>
            </div>
          </div>
        )}
      </div>

      <div className={styles.confirmMessage}>
        Your interview has been confirmed. Please join using the link above at the scheduled time.
      </div>
    </div>
  );
}

// ─── Staff: Reschedule Modal ──────────────────────────────────────────────────
//
// Opens when staff/case officer clicks "Reschedule" on an interview card.
// Pre-fills current date/time/location and lets them pick a new one.
//

function RescheduleModal({ interview, onClose, onConfirm }) {
  const formatDateInput = (dateStr) => dateStr || "";
  const formatTimeInput = (timeStr) => timeStr || "";

  const [form, setForm] = useState({
    interviewDate: formatDateInput(interview.interview_date || interview.scheduledDate),
    interviewTime: formatTimeInput(interview.interview_time || interview.scheduledTime),
    location:      interview.location || "",
    notes:         interview.notes   || "",
  });
  const [errors, setErrors]       = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  function validate() {
    const e = {};
    if (!form.interviewDate) e.interviewDate = "Required.";
    if (!form.interviewTime) e.interviewTime = "Required.";
    if (!form.location.trim()) e.location = "Required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleConfirm() {
    if (!validate()) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    onConfirm({
      ...interview,
      interview_date:  form.interviewDate,
      interview_time:  form.interviewTime,
      scheduledDate:   form.interviewDate,
      scheduledTime:   form.interviewTime,
      location:        form.location,
      notes:           form.notes,
      interviewStatus: "Scheduled",
      status:          "Scheduled",
    });
    setSubmitting(false);
  }

  const inputStyle = (hasErr) => ({
    width: "100%",
    padding: "8px 10px",
    border: `1px solid ${hasErr ? "#ef4444" : "#d1d5db"}`,
    borderRadius: 8,
    fontSize: "0.875rem",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  });

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modalBox}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Reschedule Interview</h3>
          <Tooltip text="Close dialog">
            <button className={styles.modalClose} onClick={onClose} aria-label="Close dialog"><IoIosClose /></button>
          </Tooltip>
        </div>
        <div className={styles.modalBody}>
          <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "#6b7280" }}>
            Update the date, time, or location below. The complainant will be notified of the change.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                New Date <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input type="date" value={form.interviewDate} onChange={set("interviewDate")} style={inputStyle(errors.interviewDate)} />
              {errors.interviewDate && <span style={{ fontSize: "0.78rem", color: "#ef4444" }}>{errors.interviewDate}</span>}
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                New Time <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input type="time" value={form.interviewTime} onChange={set("interviewTime")} style={inputStyle(errors.interviewTime)} />
              {errors.interviewTime && <span style={{ fontSize: "0.78rem", color: "#ef4444" }}>{errors.interviewTime}</span>}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                Location / Platform <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. SASHA Office — Room 204, or Zoom link"
                value={form.location}
                onChange={set("location")}
                style={inputStyle(errors.location)}
              />
              {errors.location && <span style={{ fontSize: "0.78rem", color: "#ef4444" }}>{errors.location}</span>}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                Reason / Notes
              </label>
              <textarea
                placeholder="Briefly explain the reason for rescheduling (optional)…"
                value={form.notes}
                onChange={set("notes")}
                rows={3}
                style={{ ...inputStyle(false), resize: "vertical" }}
              />
            </div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={submitting}>
            Keep Original
          </button>
          <button className={styles.saveBtn} onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Saving…" : "Confirm Reschedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main InterviewTab component ──────────────────────────────────────────────

export default function InterviewTab({ caseData, isStaff, isCaseOfficer, showToast, userId, actorName,
  userRole, }) {
  // ── HARDCODED MOCK DATA (design preview) ──────────────────────────────────
  // Switch MOCK_VIEW to see each complainant state:
  //   "Invited" | "Scheduled" | "Confirmed" | "Completed" | "Cancelled" | "Expired"
  // const MOCK_VIEW = "Invited";

  // const MOCK_INTERVIEWS = [
  //   {
  //     id: "iv-1",
  //     interview_date: "2026-06-09",
  //     interview_time: "10:00",
  //     scheduledDate:  "2026-06-09",
  //     scheduledTime:  "10:00",
  //     location:       "SASHA Office — Room 204",
  //     notes:          "Please bring a valid ID and any supporting documents.",
  //     interviewStatus: MOCK_VIEW,
  //     status:          MOCK_VIEW,
  //     meetingLink:    "https://meet.google.com/abc-defg-hij",
  //     expiresAt:      new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
  //   },
  //   {
  //     id: "iv-2",
  //     interview_date: "2026-05-20",
  //     interview_time: "14:00",
  //     location:       "Zoom",
  //     notes:          "",
  //     interviewStatus: "Cancelled",
  //     status:          "Cancelled",
  //   },
  // ];
  // // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(
          `${API_URL}/api/interviews?type=case_report&case_report_id=${caseData.id}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("Failed to load interviews");
        const json = await res.json();

        console.log("interviews from API:", JSON.stringify(json.data?.[0], null, 2));

        setInterviews(
          (json.data || []).map((iv) => ({
            ...iv,
            id: iv.interview_id,
            interviewStatus: iv.status.charAt(0).toUpperCase() + iv.status.slice(1),
            scheduledDate: iv.slot?.slot_date || null,
            scheduledTime: iv.slot?.slot_time?.slice(0, 5) || null,
            interview_date: iv.slot?.slot_date || null,        
            interview_time: iv.slot?.slot_time?.slice(0, 5) || null, 
            location: iv.notes || null,
            meetingLink: iv.meeting_link || iv.meetingLink || null,
          }))
        );
      } catch (err) {
        console.error("Failed to fetch interviews:", err);
        setInterviews([]);
      } finally {
        setLoading(false);
      }
    };
    fetchInterviews();
  }, [caseData.id]);

  
  const [modal, setModal] = useState(null);
  const [meetingLinkInterview, setMeetingLinkInterview] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true); // no loading for mock
  const [showForm, setShowForm]       = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  // Reschedule state: null = closed; string = interview id being rescheduled (staff)
  const [rescheduleId, setRescheduleId]         = useState(null);
  // Complainant reschedule: flip back to Invited so they can pick a new slot
  const [complainantRescheduling, setComplainantRescheduling] = useState(false);

  const [form, setForm] = useState({
    interviewDate: "",
    interviewTime: "",
    location:      "",
    notes:         "",
  });
  const [errors, setErrors] = useState({});

  // ── MOCK: no fetch needed — data is hardcoded above for design preview ──

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  function validate() {
    const e = {};
    if (!form.interviewDate) e.interviewDate = "Required.";
    if (!form.interviewTime) e.interviewTime = "Required.";
    if (!form.location.trim()) e.location = "Required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSchedule() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      // Get complainant UUID from case report
      const caseRes = await fetch(`${API_URL}/api/case_reports/${caseData.id}`, {
        credentials: "include",
      });
      const caseJson = await caseRes.json();
      const intervieweeId = caseJson.data?.complainant_user_id;

      if (!intervieweeId) {
        throw new Error("Complainant not found for this case.");
      }

      // Step 1: Create the slot
      const slotRes = await fetch(`${API_URL}/api/interview_slots`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_type: "case_report",
          created_by: userId,
          slot_date: form.interviewDate,
          slot_time: form.interviewTime,
          duration_minutes: 60,
        }),
      });

      const slotBody = await slotRes.json();
      if (!slotRes.ok) throw new Error(slotBody.error || "Failed to create slot");

      const slot = slotBody.data;

      // Step 2: Create the interview
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const interviewRes = await fetch(`${API_URL}/api/interviews`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "case_report",
          case_report_id: caseData.id,
          interviewee_user_id: intervieweeId,
          interviewer_user_id: userId,
          notes: form.notes || null,
          slot_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
          status: "invited",
        }),
      });

      const interviewBody = await interviewRes.json();
      if (!interviewRes.ok) throw new Error(interviewBody.error || "Failed to create interview");

      const interview = interviewBody.data;

      // Step 3: Select the slot
      const selectRes = await fetch(`${API_URL}/api/interviews/${interview.interview_id}/select-slot`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_id: slot.slot_id }),
      });

      const selectBody = await selectRes.json();
      if (!selectRes.ok) throw new Error(selectBody.error || "Failed to select slot");

      // Update local state
      setInterviews((prev) => [
        {
          id: interview.interview_id,
          interview_date: form.interviewDate,
          interview_time: form.interviewTime,
          scheduledDate: form.interviewDate,
          scheduledTime: form.interviewTime,
          location: form.location,
          notes: form.notes,
          interviewStatus: "Scheduled",
          status: "Scheduled",
          meetingLink: null,
        },
        ...prev,
      ]);

      setForm({ interviewDate: "", interviewTime: "", location: "", notes: "" });
      setErrors({});
      setShowForm(false);
      showToast?.("Interview scheduled successfully.");
    } catch (err) {
      console.error("Schedule error:", err);
      showToast?.(err.message || "Failed to schedule interview.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(interviewId) {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/api/interviews/${interviewId}/cancel`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancellation_reason: null }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to cancel interview.");
      }

      setInterviews((prev) =>
        prev.map((iv) =>
          iv.id === interviewId
            ? { ...iv, interviewStatus: "Cancelled", status: "Cancelled" }
            : iv
        )
      );
      showToast?.("Interview cancelled.");
    } catch (err) {
      showToast?.(err.message || "Failed to cancel interview.", "error");
    }
  }

  async function handleStaffRescheduleConfirm(updated) {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      // Step 1: Create new slot
      const slotRes = await fetch(`${API_URL}/api/interview_slots`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_type: "case_report",
          created_by: userId,
          slot_date: updated.scheduledDate,
          slot_time: updated.scheduledTime,
          duration_minutes: 60,
        }),
      });

      const slotBody = await slotRes.json();
      if (!slotRes.ok) throw new Error(slotBody.error || "Failed to create slot.");

      const slot = slotBody.data;

      // Step 2: Select new slot on interview
      const selectRes = await fetch(`${API_URL}/api/interviews/${updated.id}/select-slot`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_id: slot.slot_id }),
      });

      const selectBody = await selectRes.json();
      if (!selectRes.ok) throw new Error(selectBody.error || "Failed to reschedule.");

      setInterviews((prev) => prev.map((iv) => iv.id === updated.id ? updated : iv));
      setRescheduleId(null);
      showToast?.("Interview rescheduled successfully.");
    } catch (err) {
      showToast?.(err.message || "Failed to reschedule interview.", "error");
    }
  }

  const inputStyle = (hasErr) => ({
    width: "100%",
    padding: "8px 10px",
    border: `1px solid ${hasErr ? "#ef4444" : "#d1d5db"}`,
    borderRadius: 8,
    fontSize: "0.875rem",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  });

  // ── Complainant view: status-driven ──────────────────────────────────────────
  if (!isStaff && !isCaseOfficer) {
    if (loading) {
      return <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Loading interview details…</p>;
    }

    // Find the most relevant interview (latest non-cancelled)
    const activeInterview = interviews.find(
      (iv) => !["Cancelled", "Completed", "Expired"].includes(iv.interviewStatus || iv.status)
    ) || interviews[0];

    // No interview record → hide the section entirely
    if (!activeInterview) return null;

    const status = activeInterview.interviewStatus || activeInterview.status;

    // Complainant requested a reschedule → show slot picker again with a banner
    if (complainantRescheduling || status === "Invited") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {complainantRescheduling && (
            <div style={{
              background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8,
              padding: "10px 14px", fontSize: "0.875rem", color: "#92400e",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
            }}>
              <span><strong>Rescheduling:</strong> Please select a new slot below.</span>
              <button
                onClick={() => setComplainantRescheduling(false)}
                style={{ background: "none", border: "none", fontSize: "0.8rem", color: "#92400e", cursor: "pointer", fontWeight: 600 }}
              >
                Keep original
              </button>
            </div>
          )}
          <InvitedView
            caseData={caseData}
            interview={{ ...activeInterview, interviewStatus: "Invited", status: "Invited" }}
            onSlotSelected={(updated) => {
              setInterviews((prev) =>
                prev.map((iv) =>
                  iv.id === updated.id
                    ? {
                        ...iv,
                        interviewStatus: "Scheduled",
                        status: "Scheduled",
                        scheduledDate: updated.slot?.date || iv.scheduledDate,
                        scheduledTime: updated.slot?.time || iv.scheduledTime,
                        interview_date: updated.slot?.date || iv.interview_date,
                        interview_time: updated.slot?.time || iv.interview_time,
                      }
                    : iv
                )
              );
              setComplainantRescheduling(false);
              showToast && showToast(complainantRescheduling ? "Slot rescheduled! Your case officer will confirm shortly." : "Slot selected! Your case officer will confirm shortly.");
            }}
            showToast={showToast}
          />
        </div>
      );
    }

    if (status === "Scheduled") {
      return (
        <ScheduledView
          interview={activeInterview}
          onReschedule={() => setComplainantRescheduling(true)}
        />
      );
    }

    if (status === "Confirmed") {
      return (
        <ConfirmedView
          interview={activeInterview}
          onReschedule={() => setComplainantRescheduling(true)}
        />
      );
    }

    // Completed / Cancelled / Expired — show a simple note
    return (
      <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
        <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
          {status === "Completed"
            ? "Your interview has been completed. Thank you."
            : status === "Expired"
            ? "Your interview invitation has expired. Please contact your case officer."
            : "Your interview has been cancelled. Please contact your case officer if you have questions."}
        </p>
      </div>
    );
  }

  // ── Staff view ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>
            Interview Scheduling
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
            Manage interview sessions for this complainant.
          </p>
        </div>
        {(isStaff || isCaseOfficer) && !showForm && 
        (
          <button
            onClick={() => {
              console.log("invite clicked", { isCaseOfficer, isWillingForInterview: caseData.isWillingForInterview });
              setModal("inviteInterview");
            }}
            style={{
              padding: "8px 18px",
              background: "#037F81",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Invite to Interview
          </button>
        )
        }
      </div>

      {/* Schedule form */}
      {showForm && (isStaff || isCaseOfficer) && (
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1.25rem 1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700, color: "#374151" }}>
            Schedule New Interview
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                Date <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input type="date" value={form.interviewDate} onChange={set("interviewDate")} style={inputStyle(errors.interviewDate)} />
              {errors.interviewDate && <span style={{ fontSize: "0.78rem", color: "#ef4444" }}>{errors.interviewDate}</span>}
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                Time <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input type="time" value={form.interviewTime} onChange={set("interviewTime")} style={inputStyle(errors.interviewTime)} />
              {errors.interviewTime && <span style={{ fontSize: "0.78rem", color: "#ef4444" }}>{errors.interviewTime}</span>}
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                Location / Platform <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. SASHA Office — Room 204, or Zoom link"
                value={form.location}
                onChange={set("location")}
                style={inputStyle(errors.location)}
              />
              {errors.location && <span style={{ fontSize: "0.78rem", color: "#ef4444" }}>{errors.location}</span>}
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                Notes / Instructions
              </label>
              <textarea
                placeholder="Any preparation notes or instructions for the complainant…"
                value={form.notes}
                onChange={set("notes")}
                rows={3}
                style={{ ...inputStyle(false), resize: "vertical" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: "1rem" }}>
            <button
              onClick={() => { setShowForm(false); setErrors({}); }}
              style={{ padding: "8px 16px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSchedule}
              disabled={submitting}
              style={{ padding: "8px 18px", background: "#037F81", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: "0.875rem", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? "Scheduling…" : "Confirm Schedule"}
            </button>
          </div>
        </div>
      )}

      {/* Interview list */}
      {loading ? (
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Loading interviews…</p>
      ) : interviews.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", background: "#f9fafb", borderRadius: 12, border: "1px dashed #d1d5db" }}>
          <p style={{ margin: "8px 0 0", fontSize: "0.9rem", color: "#6b7280" }}>No interviews scheduled yet.</p>
          {(isStaff || isCaseOfficer) && (
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#9ca3af" }}>Use the button above to schedule an interview session.</p>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {interviews.map((iv) => (
            <div
              key={iv.id}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "1rem 1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong style={{ fontSize: "0.95rem", color: "#111827" }}>
                    {iv.interview_date} at {iv.interview_time}
                  </strong>
                </div>
                <InterviewStatusBadge status={iv.interviewStatus || iv.status || "Scheduled"} />
              </div>

              <p style={{ margin: 0, fontSize: "0.875rem", color: "#374151" }}>
                <span style={{ fontWeight: 600 }}>Location:</span> {iv.location}
              </p>

              {iv.notes && (
                <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>
                  <span style={{ fontWeight: 600 }}>Notes:</span> {iv.notes}
                </p>
              )}

              {(isStaff || isCaseOfficer) && iv.status !== "Cancelled" && iv.status !== "Completed" && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                  <button
                    onClick={() => setMeetingLinkInterview(iv)}
                    style={{ padding: "5px 14px", background: "#e0f7f7", color: "#037F81", border: "1.5px solid #037F81", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                  >
                    Add Link
                  </button>
                  <button
                    onClick={() => setRescheduleId(iv.id)}
                    style={{ padding: "5px 14px", background: "#e0f7f7", color: "#037F81", border: "1.5px solid #037F81", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                  >
                    Reschedule
                  </button>
                  <button
                    onClick={() => handleCancel(iv.id)}
                    style={{ padding: "5px 14px", background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                  >
                    Cancel Interview
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite to Interview */}
      {modal === "inviteInterview" && (
        <InviteToInterviewModal
          open
          onClose={() => setModal(null)}
          caseData={caseData}
          actorName={actorName}
          userId={userId}
          userRole={userRole}
          showToast={showToast}
        />
      )}

      {/* Add Meeting Link */}
      {meetingLinkInterview && (
        <AddMeetingLinkModal
          open
          interview={meetingLinkInterview}
          showToast={showToast}
          onClose={() => setMeetingLinkInterview(null)}
          onSave={async (meetingLink) => {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
            const res = await fetch(
              `${API_URL}/api/interviews/${meetingLinkInterview.id}/confirm`,
              {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ meeting_link: meetingLink }),
              }
            );

            if (!res.ok) {
              const body = await res.json();
              throw new Error(body.error || "Failed to save meeting link.");
            }

            // Only update local state after API confirms
            setInterviews((prev) =>
              prev.map((iv) =>
                iv.id === meetingLinkInterview.id
                  ? { ...iv, meetingLink, interviewStatus: "Confirmed", status: "Confirmed" }
                  : iv
              )
            );
            setMeetingLinkInterview(null);
          }}
        />
      )}

      {/* ── Staff reschedule modal ── */}
      {rescheduleId && (() => {
        const iv = interviews.find((x) => x.id === rescheduleId);
        return iv ? (
          <RescheduleModal
            interview={iv}
            onClose={() => setRescheduleId(null)}
            onConfirm={handleStaffRescheduleConfirm}
          />
        ) : null;
      })()}
    </div>
  );
}
