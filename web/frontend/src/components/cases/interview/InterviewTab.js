"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./InterviewTab.module.css";

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
        ⏰ <strong>This invitation has expired.</strong> Please contact your case officer.
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
      <span style={{ fontSize: "1.1rem" }}>⏳</span>
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

// ─── Slot Picker Calendar (Month View) ─────────────────────────────────────────

function SlotPickerCalendar({ slots, onSelectSlot }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfMonth = getFirstDayOfMonth(viewYear, viewMonth);

  // Group slots by date string
  const slotsByDate = {};
  slots.forEach((s) => {
    if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
    slotsByDate[s.date].push(s);
  });

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const isoDate = (d) => d.toISOString().split("T")[0];
  const formatTime = (t) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  // Build calendar grid
  const cells = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className={styles.calendarWrapper}>
      {/* Calendar header */}
      <div className={styles.calendarHeader}>
        <div className={styles.calendarNav}>
          <button className={styles.calNavBtn} onClick={prevMonth}>
            ← Prev
          </button>
          <span className={styles.calMonthLabel}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button className={styles.calNavBtn} onClick={nextMonth}>
            Next →
          </button>
        </div>
        <button
          className={styles.calTodayBtn}
          onClick={goToToday}
          title="Go to today"
        >
          Today
        </button>
      </div>

      {/* Color legend for available slots */}
      <div className={styles.calLegend}>
        <span className={styles.calLegendItem}>
          <span className={styles.calLegendDot} style={{ background: "#0ea5e9" }} />
          Available Slots
        </span>
        <span className={styles.calLegendItem}>
          <span className={styles.calLegendDot} style={{ background: "#d1d5db" }} />
          No Available Slots
        </span>
      </div>

      {/* Day-of-week headers */}
      <div className={styles.calGrid}>
        {DAY_NAMES.map((d) => (
          <div key={d} className={styles.calDayName}>
            {d}
          </div>
        ))}

        {/* Calendar cells */}
        {cells.map((day, idx) => {
          if (!day)
            return (
              <div
                key={`empty-${idx}`}
                className={styles.calCell}
                style={{ background: "transparent" }}
              />
            );

          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dateObj = new Date(viewYear, viewMonth, day);
          const daySlots = (slotsByDate[dateStr] || []).filter(
            (s) => s.status === "free" && dateObj >= today
          );
          const isToday = dateStr === todayStr;
          const isPast = dateObj < today;

          return (
            <div
              key={dateStr}
              className={`${styles.calCell} ${isToday ? styles.calCellToday : ""}`}
              style={{ opacity: isPast ? 0.5 : 1 }}
            >
              <div className={styles.calDayNum}>{day}</div>

              {/* Slots for this day */}
              <div className={styles.calSlotList}>
                {isPast ? (
                  <div className={styles.calNoSlots}>—</div>
                ) : daySlots.length === 0 ? (
                  <div className={styles.calNoSlots}>No slots</div>
                ) : (
                  daySlots.map((slot) => (
                    <button
                      key={slot.id}
                      className={styles.calSlotChip}
                      onClick={() => onSelectSlot(slot)}
                      title={`Select ${formatTime(slot.time)}`}
                    >
                      <span className={styles.calSlotTime}>{formatTime(slot.time)}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Helpful message for no slots */}
      {Object.values(slotsByDate).every(
        (daySlots) => daySlots.every((s) => s.status !== "free" || s.date <= todayStr)
      ) && (
        <div style={{
          textAlign: "center",
          fontSize: "0.875rem",
          color: "#9ca3af",
          marginTop: "1rem",
          padding: "1rem",
          background: "#f9fafb",
          borderRadius: "8px"
        }}>
          No available slots. Please contact your case officer.
        </div>
      )}
    </div>
  );
}

// ─── Complainant: Invited view (Select a Slot) ────────────────────────────────

function InvitedView({ caseData, interview, onSlotSelected, showToast }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const [slots, setSlots]         = useState([]);
  const [loadingSlots, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [pendingSlot, setPendingSlot] = useState(null);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        // Fetch available slots from the assigned officer
        const res = await fetch(
          `${API_URL}/api/officers/${caseData.assignedOfficer}/slots?status=free`,
          { credentials: "include" }
        );
        if (res.ok) {
          const { data } = await res.json();
          setSlots(data || []);
        }
      } catch (_) {
        // fall through — show empty state
      } finally {
        setLoading(false);
      }
    };
    fetchSlots();
  }, [caseData.assignedOfficer]);

  async function handleConfirmSlot(slot) {
    setConfirming(true);
    try {
      const res = await fetch(
        `${API_URL}/api/case_reports/${caseData.id}/interviews/${interview.id}/select-slot`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slot_id: slot.id }),
        }
      );
      if (!res.ok) throw new Error("Failed to select slot.");
      showToast && showToast("Slot selected! Your case officer will confirm shortly.");
      onSlotSelected && onSlotSelected({ ...interview, interviewStatus: "Scheduled", slot });
    } catch (err) {
      showToast && showToast(err.message || "An error occurred.", "error");
    } finally {
      setConfirming(false);
      setPendingSlot(null);
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
        <h2 className={styles.statusTitle}>📅 Select an Interview Slot</h2>
        <p className={styles.statusDesc}>
          You have been invited to an interview with your SASHA case officer.
          Please select a time slot that works for you.
        </p>
      </div>

      {/* Invitation expiry countdown */}
      {interview.expiresAt && <ExpiryCountdown expiresAt={interview.expiresAt} />}

      {/* Slot picker */}
      {loadingSlots ? (
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Loading available slots…</p>
      ) : slots.length === 0 ? (
        <div style={{
          background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8,
          padding: "12px 16px", fontSize: "0.875rem", color: "#92400e",
        }}>
          ⚠️ No available slots at the moment. Please contact your case officer directly.
        </div>
      ) : (
        <div className={styles.statusSection}>
          <SlotPickerCalendar slots={slots} onSelectSlot={(slot) => setPendingSlot(slot)} />
        </div>
      )}

      {/* Confirmation prompt */}
      {pendingSlot && (
        <div style={{
          background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10,
          padding: "1rem 1.25rem",
        }}>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700, color: "#166534" }}>
            ✅ Confirm this slot?
          </p>
          <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "#374151" }}>
            <strong>{formatDate(pendingSlot.date)}</strong> at <strong>{formatTime(pendingSlot.time)}</strong>
            {pendingSlot.duration && ` · ${pendingSlot.duration} minutes`}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setPendingSlot(null)}
              style={{
                padding: "7px 16px", background: "#f3f4f6", border: "1px solid #d1d5db",
                borderRadius: 7, fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", color: "#374151",
              }}
            >
              Back
            </button>
            <button
              onClick={() => handleConfirmSlot(pendingSlot)}
              disabled={confirming}
              style={{
                padding: "7px 20px", background: "#037F81", border: "none",
                borderRadius: 7, fontWeight: 700, fontSize: "0.875rem",
                cursor: confirming ? "not-allowed" : "pointer", color: "#fff",
                opacity: confirming ? 0.7 : 1,
              }}
            >
              {confirming ? "Confirming…" : "Yes, select this slot"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Complainant: Scheduled view (Waiting for Link) ───────────────────────────

function ScheduledView({ interview }) {
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
      <div>
        <h2 className={styles.statusTitle}>🕐 Waiting for Meeting Link</h2>
        <p className={styles.statusDesc}>
          Your slot has been reserved. Your case officer will confirm and send you the meeting link shortly.
        </p>
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
          {interview.location && (
            <div>
              <p className={styles.slotLabel}>Location / Platform</p>
              <p className={styles.slotValue}>{interview.location}</p>
            </div>
          )}
        </div>
      </div>

      <div className={styles.waitingMessage}>
        🔔 You will be notified once the meeting link is ready. Please check back here or watch for a notification.
      </div>
    </div>
  );
}

// ─── Complainant: Confirmed view (Interview is Confirmed) ─────────────────────

function ConfirmedView({ interview }) {
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
      <div>
        <h2 className={styles.statusTitle}>✅ Your Interview is Confirmed</h2>
        <p className={styles.statusDesc}>
          Everything is set. See the details below and join at the scheduled time.
        </p>
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
                🔗 Join Meeting
              </a>
            </div>
          </div>
        )}
      </div>

      <div className={styles.confirmMessage}>
        🎉 Your interview has been confirmed. Please join using the link above at the scheduled time.
        If you need to reschedule, please contact your case officer.
      </div>
    </div>
  );
}

// ─── Main InterviewTab component ──────────────────────────────────────────────

export default function InterviewTab({ caseData, isStaff, isCaseOfficer, showToast }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const [interviews, setInterviews]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  const [form, setForm] = useState({
    interviewDate: "",
    interviewTime: "",
    location:      "",
    notes:         "",
  });
  const [errors, setErrors] = useState({});

  // Fetch existing interviews for this case
  useEffect(() => {
    if (!caseData?.id) return;
    const fetchInterviews = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/case_reports/${caseData.id}/interviews`,
          { credentials: "include" }
        );
        if (res.ok) {
          const { data } = await res.json();
          setInterviews(data || []);
        }
      } catch (_) {
        // silently fail — show empty state
      } finally {
        setLoading(false);
      }
    };
    fetchInterviews();
  }, [caseData?.id]);

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
      const res = await fetch(
        `${API_URL}/api/case_reports/${caseData.id}/interviews`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interview_date: form.interviewDate,
            interview_time: form.interviewTime,
            location:       form.location,
            notes:          form.notes,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to schedule interview.");
      const { data } = await res.json();
      setInterviews((prev) => [data, ...prev]);
      setForm({ interviewDate: "", interviewTime: "", location: "", notes: "" });
      setErrors({});
      setShowForm(false);
      showToast && showToast("Interview scheduled successfully.");
    } catch (err) {
      showToast && showToast(err.message || "An error occurred.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(interviewId) {
    try {
      const res = await fetch(
        `${API_URL}/api/case_reports/${caseData.id}/interviews/${interviewId}/cancel`,
        { method: "PATCH", credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to cancel interview.");
      setInterviews((prev) =>
        prev.map((iv) =>
          iv.id === interviewId ? { ...iv, status: "Cancelled" } : iv
        )
      );
      showToast && showToast("Interview cancelled.");
    } catch (err) {
      showToast && showToast(err.message || "An error occurred.", "error");
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

    if (status === "Invited") {
      return (
        <InvitedView
          caseData={caseData}
          interview={activeInterview}
          onSlotSelected={(updated) =>
            setInterviews((prev) => prev.map((iv) => iv.id === updated.id ? updated : iv))
          }
          showToast={showToast}
        />
      );
    }

    if (status === "Scheduled") {
      return <ScheduledView interview={activeInterview} />;
    }

    if (status === "Confirmed") {
      return <ConfirmedView interview={activeInterview} />;
    }

    // Completed / Cancelled / Expired — show a simple note
    return (
      <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
        <p style={{ fontSize: "1.5rem" }}>📋</p>
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
            📅 Interview Scheduling
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
            Manage interview sessions for this complainant.
          </p>
        </div>
        {(isStaff || isCaseOfficer) && !showForm && (
          <button
            onClick={() => setShowForm(true)}
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
            + Schedule Interview
          </button>
        )}
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
          <p style={{ margin: 0, fontSize: "1.5rem" }}>📋</p>
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
                  <span style={{ fontSize: "1rem" }}>📅</span>
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
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
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
    </div>
  );
}