"use client";

import { useState, useEffect } from "react";
import { FiClock, FiCalendar, FiLink, FiX } from "react-icons/fi";
import styles from "./InterviewTab.module.css";

const INTERVIEW_STATUS_COLORS = {
  Invited: { bg: "#dbeafe", color: "#1e40af" },
  Scheduled: { bg: "#fef9c3", color: "#854d0e" },
  Confirmed: { bg: "#dcfce7", color: "#166534" },
  Completed: { bg: "#d1fae5", color: "#065f46" },
  Cancelled: { bg: "#fee2e2", color: "#991b1b" },
  Expired: { bg: "#f1f5f9", color: "#475569" },
  Rejected: { bg: "#fecdd3", color: "#be123c" },
};

function InterviewStatusBadge({ status }) {
  const s = INTERVIEW_STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      className={styles.statusBadge}
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

function InterviewSlotCard({ slot, onSelect }) {
  const date = new Date(slot.date);
  const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className={styles.slotCard}>
      <div className={styles.slotHeader}>
        <span className={styles.dayOfWeek}>{dayOfWeek}</span>
        <span className={styles.date}>{dateStr}</span>
      </div>
      <div className={styles.slotTime}>
        <FiClock size={18} />
        <span>{slot.time}</span>
        <span className={styles.duration}>({slot.duration} min)</span>
      </div>
      <button className={styles.selectSlotBtn} onClick={() => onSelect(slot)}>
        Select Slot
      </button>
    </div>
  );
}

function CountdownTimer({ expiryDate }) {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const expiry = new Date(expiryDate);
      const diff = expiry - now;

      if (diff <= 0) {
        setCountdown("Expired");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setCountdown(`${days}d ${hours}h remaining`);
      } else if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m remaining`);
      } else {
        setCountdown(`${minutes}m remaining`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [expiryDate]);

  return <span className={styles.countdown}>{countdown}</span>;
}

export default function InterviewTab({
  caseData,
  isStaff,
  isCaseOfficer,
  showToast,
}) {
  const interview = caseData.interview;
  const [showAddMeetingLink, setShowAddMeetingLink] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If no interview data, hide the entire section
  if (!interview) {
    return null;
  }

  const handleAddMeetingLink = async () => {
    if (!meetingLink.trim()) {
      setError("Please enter a meeting link");
      return;
    }

    const urlRegex = /^https?:\/\/.+/i;
    if (!urlRegex.test(meetingLink)) {
      setError("Please enter a valid URL");
      return;
    }

    setLoading(true);
    try {
      // TODO: Call API to save meeting link
      // const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      // await fetch(`${API_URL}/api/interviews/${interview.id}/meeting-link`, {
      //   method: "PUT",
      //   credentials: "include",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ meetingLink }),
      // });

      showToast("Meeting link saved successfully!");
      setShowAddMeetingLink(false);
      setMeetingLink("");
      setError("");
    } catch (err) {
      console.error("Error saving meeting link:", err);
      setError("Failed to save meeting link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.interviewTab}>
      {interview.interviewStatus === "Invited" && (
        <div className={styles.statusSection}>
          <div className={styles.statusHeader}>
            <h3 className={styles.statusTitle}>📋 Available Interview Slots</h3>
            <p className={styles.statusDesc}>
              Please select one of the available slots below. Your invitation expires in <CountdownTimer expiryDate={interview.expiryDate} />
            </p>
          </div>

          <div className={styles.slotsContainer}>
            {interview.availableSlots?.map((slot, idx) => (
              <InterviewSlotCard
                key={idx}
                slot={slot}
                onSelect={(selected) => {
                  console.log("Selected slot:", selected);
                  showToast("Slot selection submitted for approval");
                }}
              />
            ))}
          </div>
        </div>
      )}

      {interview.interviewStatus === "Scheduled" && (
        <div className={styles.statusSection}>
          <div className={styles.statusBadgeWrapper}>
            <InterviewStatusBadge status="Scheduled" />
          </div>
          <h3 className={styles.statusTitle}>Waiting for Meeting Link</h3>
          <div className={styles.selectedSlot}>
            <div className={styles.slotInfo}>
              <FiCalendar size={20} />
              <div>
                <p className={styles.slotLabel}>Selected Date & Time</p>
                <p className={styles.slotValue}>
                  {new Date(interview.scheduledDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  at {interview.scheduledTime}
                </p>
              </div>
            </div>
          </div>
          <div className={styles.waitingMessage}>
            ⏳ The interviewer is preparing the meeting link. You will receive it soon.
          </div>
        </div>
      )}

      {interview.interviewStatus === "Confirmed" && (
        <div className={styles.statusSection}>
          <div className={styles.statusBadgeWrapper}>
            <InterviewStatusBadge status="Confirmed" />
          </div>
          <h3 className={styles.statusTitle}>✅ Interview Confirmed</h3>
          <div className={styles.confirmedDetails}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Interview Date & Time</span>
              <span className={styles.detailValue}>
                {new Date(interview.scheduledDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                at {interview.scheduledTime}
              </span>
            </div>
            {interview.meetingLink && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Meeting Link</span>
                <a
                  href={interview.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.meetingLink}
                >
                  <FiLink size={16} /> Join Meeting
                </a>
              </div>
            )}
          </div>
          <div className={styles.confirmMessage}>
            ✅ Your interview is confirmed. Click the button above to join the meeting at the scheduled time.
          </div>
        </div>
      )}

      {interview.interviewStatus === "Completed" && (
        <div className={styles.statusSection}>
          <div className={styles.statusBadgeWrapper}>
            <InterviewStatusBadge status="Completed" />
          </div>
          <h3 className={styles.statusTitle}>✅ Interview Completed</h3>
          <div className={styles.completedMessage}>
            Thank you for participating in the interview. Your case will be reviewed and updated accordingly.
          </div>
        </div>
      )}

      {["Cancelled", "Rejected", "Expired"].includes(interview.interviewStatus) && (
        <div className={styles.statusSection}>
          <div className={styles.statusBadgeWrapper}>
            <InterviewStatusBadge status={interview.interviewStatus} />
          </div>
          <h3 className={styles.statusTitle}>{interview.interviewStatus} Interview</h3>
          {interview.reason && (
            <div className={styles.reasonBox}>
              <strong>Reason:</strong> {interview.reason}
            </div>
          )}
        </div>
      )}

      {/* Case Officer: Add Meeting Link Modal */}
      {isCaseOfficer && interview.interviewStatus === "Scheduled" && (
        <div className={styles.actionSection}>
          <button
            className={styles.addMeetingBtn}
            onClick={() => setShowAddMeetingLink(true)}
          >
            + Add Meeting Link
          </button>

          {showAddMeetingLink && (
            <div className={styles.modalOverlay} onClick={() => setShowAddMeetingLink(false)}>
              <div
                className={styles.modalBox}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>Add Meeting Link</h3>
                  <button
                    className={styles.modalClose}
                    onClick={() => setShowAddMeetingLink(false)}
                  >
                    <FiX />
                  </button>
                </div>
                <div className={styles.modalBody}>
                  <label className={styles.formLabel}>
                    Meeting Link <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="url"
                    className={`${styles.formInput} ${error ? styles.inputError : ""}`}
                    placeholder="https://meet.google.com/... or https://zoom.us/..."
                    value={meetingLink}
                    onChange={(e) => {
                      setMeetingLink(e.target.value);
                      setError("");
                    }}
                    disabled={loading}
                  />
                  {error && <span className={styles.errorMsg}>{error}</span>}
                </div>
                <div className={styles.modalFooter}>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => setShowAddMeetingLink(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.saveBtn}
                    onClick={handleAddMeetingLink}
                    disabled={loading || !meetingLink.trim()}
                  >
                    {loading ? "Saving..." : "Save & Confirm"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
