"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./CaseInterviewManagement.module.css";
import { FiSearch, FiX, FiPlus, FiAlertTriangle, FiChevronLeft, FiChevronRight, FiCalendar } from "react-icons/fi";
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

// Mock interview slots for the calendar
function makeSlot(id) {
  const today = new Date();
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (id % 28) - 5);
  const statuses = ["free", "confirmed", "free", "confirmed", "disabled"];
  const interviewees = [null, "Maria Garcia", null, "Juan Santos", null];
  return {
    id: `slot_${id}`,
    date: date.toISOString().split("T")[0],
    time: `${String(9 + (id % 8)).padStart(2, "0")}:00`,
    duration: 60,
    status: statuses[id % statuses.length],
    interviewee: interviewees[id % interviewees.length],
  };
}

const PLACEHOLDER_SLOTS = Array.from({ length: 20 }, (_, i) => makeSlot(i + 1));

const PAGE_SIZE = 10;

// ── Slot status legend config ──
const SLOT_STATUS = {
  confirmed:  { label: "Confirmed",        bg: "#dcfce7", color: "#166534", border: "#86efac" },
  free:       { label: "Free / Available", bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
  disabled:   { label: "Disabled",         bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" },
};

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

function CreateInterviewSlotModal({ open, onClose, onCreate, initialDate }) {
  const [formData, setFormData] = useState({
    date: initialDate || "",
    time: "09:00",
    duration: "60",
  });

  useEffect(() => {
    if (open) setFormData((prev) => ({ ...prev, date: initialDate || "" }));
  }, [open, initialDate]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.date) {
      alert("Please select a date");
      return;
    }
    onCreate(formData);
    setFormData({ date: "", time: "09:00", duration: "60" });
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

function EditSlotModal({ open, onClose, slot, onSave }) {
  const [formData, setFormData] = useState({ date: "", time: "09:00", duration: "60" });

  useEffect(() => {
    if (open && slot) {
      setFormData({ date: slot.date, time: slot.time, duration: String(slot.duration) });
    }
  }, [open, slot]);

  const handleChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    if (!formData.date) { alert("Please select a date"); return; }
    onSave({ ...slot, ...formData, duration: Number(formData.duration) });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Interview Slot" wide>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Date</label>
        <input type="date" value={formData.date} onChange={(e) => handleChange("date", e.target.value)} className={styles.formInput} />
      </div>
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Time</label>
          <input type="time" value={formData.time} onChange={(e) => handleChange("time", e.target.value)} className={styles.formInput} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Duration (minutes)</label>
          <input type="number" value={formData.duration} onChange={(e) => handleChange("duration", e.target.value)} className={styles.formInput} min="15" max="180" />
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
        <button className={styles.saveBtn} onClick={handleSubmit}>Save Changes</button>
      </div>
    </Modal>
  );
}

function DisableSlotModal({ open, onClose, slot, onConfirm }) {
  if (!slot) return null;
  return (
    <Modal open={open} onClose={onClose} title="Disable Interview Slot">
      <div className={styles.warningNotice}>
        <FiAlertTriangle style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          Are you sure you want to disable this slot? It will no longer be available to interviewees.
          <br /><strong>{slot.date} at {slot.time}</strong>
        </span>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
        <button
          className={styles.btnDanger}
          onClick={() => { onConfirm(slot); onClose(); }}
        >
          Disable Slot
        </button>
      </div>
    </Modal>
  );
}

// ── Calendar helpers ──
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay(); // 0 = Sunday
}
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ── Interview Slot Calendar ──
function InterviewSlotCalendar({ slots, onCreateSlot, onEditSlot, onDisableSlot }) {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth  = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfMonth = getFirstDayOfMonth(viewYear, viewMonth);

  // Group slots by date string
  const slotsByDate = useMemo(() => {
    const map = {};
    slots.forEach((s) => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [slots]);

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  // Build calendar grid
  const cells = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className={styles.calendarWrapper}>
      {/* Calendar header */}
      <div className={styles.calendarHeader}>
        <div className={styles.calendarNav}>
          <button className={styles.calNavBtn} onClick={prevMonth}><FiChevronLeft /></button>
          <span className={styles.calMonthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
          <button className={styles.calNavBtn} onClick={nextMonth}><FiChevronRight /></button>
        </div>
        <div className={styles.calendarActions}>
          <button className={styles.calTodayBtn} onClick={goToToday}>
            <FiCalendar size={14} /> Today
          </button>
          <button className={styles.primaryBtn} style={{ padding: "0.45rem 1rem", fontSize: "0.82rem" }}
            onClick={() => onCreateSlot(todayStr)}>
            <FiPlus size={15} /> Create Slot
          </button>
        </div>
      </div>

      {/* Color legend */}
      <div className={styles.calLegend}>
        {Object.entries(SLOT_STATUS).map(([key, cfg]) => (
          <span key={key} className={styles.calLegendItem}>
            <span className={styles.calLegendDot} style={{ background: cfg.color }} />
            {cfg.label}
          </span>
        ))}
      </div>

      {/* Day-of-week headers */}
      <div className={styles.calGrid}>
        {DAY_NAMES.map((d) => (
          <div key={d} className={styles.calDayName}>{d}</div>
        ))}

        {/* Calendar cells */}
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className={styles.calCell} style={{ background: "transparent" }} />;

          const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const daySlots = slotsByDate[dateStr] || [];
          const isToday  = dateStr === todayStr;

          return (
            <div key={dateStr} className={`${styles.calCell} ${isToday ? styles.calCellToday : ""}`}>
              <span className={styles.calDayNum}>{day}</span>

              {/* Slots for this day */}
              <div className={styles.calSlotList}>
                {daySlots.map((slot) => {
                  const cfg = SLOT_STATUS[slot.status] || SLOT_STATUS.free;
                  return (
                    <div
                      key={slot.id}
                      className={styles.calSlotChip}
                      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
                    >
                      <span className={styles.calSlotTime}>{slot.time}</span>
                      {slot.interviewee && (
                        <span className={styles.calSlotName}>{slot.interviewee.split(" ")[0]}</span>
                      )}
                      {/* Quick actions */}
                      <div className={styles.calSlotActions}>
                        {slot.status !== "disabled" && (
                          <button
                            className={styles.calSlotActionBtn}
                            title="Edit slot"
                            onClick={(e) => { e.stopPropagation(); onEditSlot(slot); }}
                          >✏️</button>
                        )}
                        {slot.status !== "disabled" && (
                          <button
                            className={styles.calSlotActionBtn}
                            title="Disable slot"
                            onClick={(e) => { e.stopPropagation(); onDisableSlot(slot); }}
                          >🚫</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add slot quick button */}
              <button
                className={styles.calAddSlotBtn}
                title="Create slot on this day"
                onClick={() => onCreateSlot(dateStr)}
              >+</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CaseInterviewManagement() {
  const router = useRouter();
  const [interviews, setInterviews] = useState(PLACEHOLDER_INTERVIEWS);
  const [slots, setSlots] = useState(PLACEHOLDER_SLOTS);
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

  // Slot modal state
  const [createSlotDate, setCreateSlotDate] = useState("");
  const [editingSlot, setEditingSlot]   = useState(null);
  const [disablingSlot, setDisablingSlot] = useState(null);

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

    if (filters.interviewStatus && filters.interviewStatus !== "All" && filters.interviewStatus !== "") {
      result = result.filter((i) => i.interviewStatus === filters.interviewStatus);
    }

    if (filters.interviewType && filters.interviewType !== "All" && filters.interviewType !== "") {
      result = result.filter((i) => i.interviewType === filters.interviewType);
    }

    return result;
  }, [interviews, searchTerm, filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ interviewStatus: "All", dateRange: "", interviewType: "All" });
    setSearchTerm("");
    setCurrentPage(1);
  };

  // ── Slot handlers ──
  const handleOpenCreateSlot = (dateStr) => {
    setCreateSlotDate(dateStr || "");
    setModalState("createSlot");
  };

  const handleCreateSlot = (formData) => {
    const newSlot = {
      id: `slot_${Date.now()}`,
      date: formData.date,
      time: formData.time,
      duration: Number(formData.duration),
      status: "free",
      interviewee: null,
    };
    setSlots((prev) => [...prev, newSlot]);
    // TODO: Call API to create interview slot
    console.log("Creating interview slot:", formData);
  };

  const handleEditSlot = (slot) => {
    setEditingSlot(slot);
    setModalState("editSlot");
  };

  const handleSaveEditedSlot = (updatedSlot) => {
    setSlots((prev) => prev.map((s) => s.id === updatedSlot.id ? updatedSlot : s));
    setEditingSlot(null);
    // TODO: Call API to update slot
  };

  const handleDisableSlot = (slot) => {
    setDisablingSlot(slot);
    setModalState("disableSlot");
  };

  const handleConfirmDisableSlot = (slot) => {
    setSlots((prev) => prev.map((s) => s.id === slot.id ? { ...s, status: "disabled" } : s));
    setDisablingSlot(null);
    // TODO: Call API to disable slot
  };

  // ── Interview handlers ──
  const handleAddMeetingLink = (selectedIds) => {
    setSelectedInterviews(selectedIds);
    setMeetingLinkModal(true);
  };

  const handleSaveMeetingLink = async (interviewIds, meetingLink) => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      // await fetch(`${API_URL}/api/interviews/meeting-link`, { ... });

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
    const interview = Array.isArray(interviews) ? interviews[0] : interviews;
    router.push(`/cases/view?caseId=${interview.caseId.split("-")[1]}&tab=interview`);
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        {/* Hero Banner */}
        <div className={styles.heroBanner}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Interview Management</h1>

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
          </div>
        </div>

        {/* ── Interview Slot Calendar ── */}
        <InterviewSlotCalendar
          slots={slots}
          onCreateSlot={handleOpenCreateSlot}
          onEditSlot={handleEditSlot}
          onDisableSlot={handleDisableSlot}
        />

        {/* Table Section */}
        <section className={styles.allList}>
          <div className="container-xl">
            <div className={styles.sectionHeading}>
              <h2 className={styles.sectionTitle}>All Interviews</h2>
              <div className={styles.headingLine} />
            </div>
            <div className={styles.layout}>
              <div>
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
              </div>
            </div>
        </section>

      </div>

      {/* Modals */}
      <CreateInterviewSlotModal
        open={modalState === "createSlot"}
        onClose={() => setModalState(null)}
        onCreate={handleCreateSlot}
        initialDate={createSlotDate}
      />

      <EditSlotModal
        open={modalState === "editSlot"}
        onClose={() => { setModalState(null); setEditingSlot(null); }}
        slot={editingSlot}
        onSave={handleSaveEditedSlot}
      />

      <DisableSlotModal
        open={modalState === "disableSlot"}
        onClose={() => { setModalState(null); setDisablingSlot(null); }}
        slot={disablingSlot}
        onConfirm={handleConfirmDisableSlot}
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