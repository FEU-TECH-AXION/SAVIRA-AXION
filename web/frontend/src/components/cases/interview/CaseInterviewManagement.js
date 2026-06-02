"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./CaseInterviewManagement.module.css";
import { FiSearch, FiX, FiPlus, FiAlertTriangle } from "react-icons/fi";
import InterviewsTable from "./InterviewsTable";
import FilterMenu from "./FilterMenu";
import AddMeetingLinkModal from "./AddMeetingLinkModal";

// Mock data generator
function makeInterview(id) {
  const statuses = ["Invited", "Scheduled", "Confirmed", "Completed", "Cancelled", "Expired", "Rejected"];
  const caseId = `2026-${String(id).padStart(3, "0")}`;
  const intervieweeName = [
    "Maria Garcia",
    "Juan Santos",
    "Anna Cruz",
    "Roberto Luna",
    "Sophia Reyes",
    "Carlos Diaz",
  ][id % 6];

  const date = new Date(2026, (id % 12), (id % 28) + 1);

  return {
    id: `interview_${id}`,
    caseId,
    intervieweeName,
    interviewType: ["Initial", "Follow-up", "Confirmation"][id % 3],
    interviewStatus: statuses[id % statuses.length],
    scheduledDate: date.toISOString().split("T")[0],
    scheduledTime: `${String(9 + (id % 8)).padStart(2, "0")}:${String((id * 7) % 60).padStart(2, "0")}`,
    duration: "60 minutes",
    meetingLink: id % 3 === 0 ? "https://meet.google.com/xyz" : null,
    notes: "Initial interview for case evaluation",
  };
}

const PLACEHOLDER_INTERVIEWS = Array.from({ length: 35 }, (_, i) => makeInterview(i + 1));

const PAGE_SIZE = 10;

function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalBox}
        style={wide ? { maxWidth: 700 } : {}}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button className={styles.modalClose} onClick={onClose}>
            <FiX />
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

function CreateInterviewSlotModal({ open, onClose, onCreate }) {
  const [formData, setFormData] = useState({
    dayOfWeek: "Monday",
    date: "",
    time: "09:00",
    duration: "60",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.date) {
      alert("Please select a date");
      return;
    }
    onCreate(formData);
    setFormData({ dayOfWeek: "Monday", date: "", time: "09:00", duration: "60" });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Interview Slot" wide>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Date</label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => handleChange("date", e.target.value)}
          className={styles.formInput}
        />
      </div>
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Time</label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => handleChange("time", e.target.value)}
            className={styles.formInput}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Duration (minutes)</label>
          <input
            type="number"
            value={formData.duration}
            onChange={(e) => handleChange("duration", e.target.value)}
            className={styles.formInput}
            min="15"
            max="180"
          />
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.cancelBtn} onClick={onClose}>
          Cancel
        </button>
        <button className={styles.saveBtn} onClick={handleSubmit}>
          Create Slot
        </button>
      </div>
    </Modal>
  );
}

export default function CaseInterviewManagement() {
  const router = useRouter();
  const [interviews, setInterviews] = useState(PLACEHOLDER_INTERVIEWS);
  const [selectedInterviews, setSelectedInterviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    interviewStatus: "All",
    dateRange: "",
  });
  const [modalState, setModalState] = useState(null);
  const [meetingLinkModal, setMeetingLinkModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredInterviews = useMemo(() => {
    let result = interviews;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (i) =>
          i.caseId.toLowerCase().includes(term) ||
          i.intervieweeName.toLowerCase().includes(term)
      );
    }

    if (filters.interviewStatus && filters.interviewStatus !== "All") {
      result = result.filter((i) => i.interviewStatus === filters.interviewStatus);
    }

    return result;
  }, [interviews, searchTerm, filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ interviewStatus: "All", dateRange: "" });
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handleCreateSlot = (formData) => {
    // TODO: Call API to create interview slot
    console.log("Creating interview slot:", formData);
  };

  const handleAddMeetingLink = (selectedIds) => {
    setSelectedInterviews(selectedIds);
    setMeetingLinkModal(true);
  };

  const handleSaveMeetingLink = async (interviewIds, meetingLink) => {
    setLoading(true);
    try {
      // TODO: Call API to save meeting link
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      // await fetch(`${API_URL}/api/interviews/meeting-link`, {
      //   method: "POST",
      //   credentials: "include",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ interviewIds, meetingLink }),
      // });

      // Update local state
      setInterviews((prev) =>
        prev.map((i) =>
          interviewIds.includes(i.id)
            ? { ...i, interviewStatus: "Confirmed", meetingLink }
            : i
        )
      );

      setMeetingLinkModal(false);
      setSelectedInterviews([]);
      alert("Meeting link saved successfully!");
    } catch (err) {
      console.error("Error saving meeting link:", err);
      alert("Failed to save meeting link");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = (selectedIds) => {
    // TODO: Call API to mark interviews as complete
    setInterviews((prev) =>
      prev.map((i) =>
        selectedIds.includes(i.id)
          ? { ...i, interviewStatus: "Completed" }
          : i
      )
    );
    setSelectedInterviews([]);
    alert("Interviews marked as complete!");
  };

  const handleViewDetails = (interviews) => {
    // If array, open first one; if single object, open it
    const interview = Array.isArray(interviews) ? interviews[0] : interviews;
    router.push(`/cases/view?caseId=${interview.caseId.split("-")[1]}&tab=interview`);
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        {/* Hero Banner */}
        <div className={styles.heroBanner}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>📅 Interview Management</h1>
            <p className={styles.heroSubtitle}>
              Create schedules, manage invitations, and track interview progress
            </p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className={styles.statsBar}>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{interviews.filter((i) => i.interviewStatus === "Invited").length}</span>
            <span className={styles.statLabel}>Pending Invitations</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{interviews.filter((i) => i.interviewStatus === "Scheduled").length}</span>
            <span className={styles.statLabel}>Scheduled</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{interviews.filter((i) => i.interviewStatus === "Confirmed").length}</span>
            <span className={styles.statLabel}>Confirmed</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{interviews.filter((i) => i.interviewStatus === "Completed").length}</span>
            <span className={styles.statLabel}>Completed</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionBar}>
          <button
            className={styles.primaryBtn}
            onClick={() => setModalState("createSlot")}
          >
            <FiPlus size={18} /> Create Interview Slot
          </button>
        </div>

        {/* Search and Filter */}
        <div className={styles.searchFilterBar}>
          <div className={styles.searchBox}>
            <FiSearch size={18} />
            <input
              type="text"
              placeholder="Search by case ID or interviewee name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            {searchTerm && (
              <button
                className={styles.clearSearchBtn}
                onClick={() => setSearchTerm("")}
              >
                <FiX size={16} />
              </button>
            )}
          </div>
          <FilterMenu
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearAll={handleClearFilters}
          />
        </div>

        {/* Interviews Table */}
        <InterviewsTable
          interviews={filteredInterviews}
          selectedIds={selectedInterviews}
          onSelectionChange={setSelectedInterviews}
          onViewDetails={handleViewDetails}
          onMarkComplete={handleMarkComplete}
          onAddMeetingLink={handleAddMeetingLink}
          loading={false}
          pageSize={PAGE_SIZE}
        />
      </div>

      {/* Modals */}
      <CreateInterviewSlotModal
        open={modalState === "createSlot"}
        onClose={() => setModalState(null)}
        onCreate={handleCreateSlot}
      />

      <AddMeetingLinkModal
        open={meetingLinkModal}
        onClose={() => setMeetingLinkModal(false)}
        interviewIds={selectedInterviews}
        onSave={handleSaveMeetingLink}
        loading={loading}
      />
    </div>
  );
}
