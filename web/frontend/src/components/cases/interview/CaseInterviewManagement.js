"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./CaseInterviewManagement.module.css";
import { FiSearch, FiX, FiPlus, FiAlertTriangle, FiChevronLeft, FiChevronRight, FiCalendar } from "react-icons/fi";
import InterviewsTable from "./InterviewsTable";
import FilterMenu from "./FilterMenu";
import AddMeetingLinkModal from "./AddMeetingLinkModal";
import { MdEdit, MdCancel } from "react-icons/md";

const PAGE_SIZE = 10;

const SLOT_STATUS = {
  confirmed:  { label: "Confirmed",        bg: "#dcfce7", color: "#166534", border: "#86efac" },
  free:       { label: "Free / Available", bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
  disabled:   { label: "Disabled",         bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" },
};

function formatInterviewStatus(status) {
  return String(status || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

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
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button className={styles.modalClose} onClick={onClose}><FiX /></button>
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
  if (!formData.date) { alert("Please select a date"); return; }

  // ── Validate future date ──
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDate = new Date(formData.date);
  selectedDate.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    alert("Cannot create a slot for a past date.");
    return;
  }

  if (selectedDate.getTime() === today.getTime()) {
    const [h, m] = formData.time.split(":").map(Number);
    const slotDateTime = new Date();
    slotDateTime.setHours(h, m, 0, 0);
    if (slotDateTime < new Date()) {
      alert("Cannot create a slot for a past time today.");
      return;
    }
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
          min={new Date().toISOString().split("T")[0]}
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
        <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
        <button className={styles.saveBtn} onClick={handleSubmit}>Create Slot</button>
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

    // ── Validate future date ──
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(formData.date);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      alert("Cannot reschedule to a past date.");
      return;
    }

    if (selectedDate.getTime() === today.getTime()) {
      const [h, m] = formData.time.split(":").map(Number);
      const slotDateTime = new Date();
      slotDateTime.setHours(h, m, 0, 0);
      if (slotDateTime < new Date()) {
        alert("Cannot reschedule to a past time today.");
        return;
      }
    }

    onSave({ ...slot, ...formData, duration: Number(formData.duration) });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Interview Slot" wide>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Date</label>
        <input type="date" value={formData.date} onChange={(e) => handleChange("date", e.target.value)} className={styles.formInput} min={new Date().toISOString().split("T")[0]} />
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
          onClick={() => { onConfirm(slot); }}
        >
          Disable Slot
        </button>
      </div>
    </Modal>
  );
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function InterviewSlotCalendar({ slots, onCreateSlot, onEditSlot, onDisableSlot }) {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth     = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfMonth = getFirstDayOfMonth(viewYear, viewMonth);

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

  const cells = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className={styles.calendarWrapper}>
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
          <button
            className={styles.primaryBtn}
            style={{ padding: "0.45rem 1rem", fontSize: "0.82rem" }}
            onClick={() => onCreateSlot(todayStr)}
          >
            <FiPlus size={15} /> Create Slot
          </button>
        </div>
      </div>

      <div className={styles.calLegend}>
        {Object.entries(SLOT_STATUS).map(([key, cfg]) => (
          <span key={key} className={styles.calLegendItem}>
            <span className={styles.calLegendDot} style={{ background: cfg.color }} />
            {cfg.label}
          </span>
        ))}
      </div>

      <div className={styles.calGrid}>
        {DAY_NAMES.map((d) => (
          <div key={d} className={styles.calDayName}>{d}</div>
        ))}

        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className={styles.calCell} style={{ background: "transparent" }} />;

          const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const daySlots = slotsByDate[dateStr] || [];
          const isToday  = dateStr === todayStr;

          return (
            <div key={dateStr} className={`${styles.calCell} ${isToday ? styles.calCellToday : ""}`}>
              <span className={styles.calDayNum}>{day}</span>
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
                      <div className={styles.calSlotActions}>
                        {slot.status !== "disabled" && (
                          <button
                            className={styles.calSlotActionBtn}
                            title="Edit slot"
                            onClick={(e) => { e.stopPropagation(); onEditSlot(slot); }}
                          ><MdEdit /></button>
                        )}
                        {slot.status !== "disabled" && (
                          <button
                            className={styles.calSlotActionBtn}
                            title="Disable slot"
                            onClick={(e) => onDisableSlot(slot) }
                          ><MdCancel /></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
  const [interviews, setInterviews] = useState([]);
  const [slots, setSlots] = useState([]);
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
  const [loadingData, setLoadingData] = useState(true);
  const [user, setUser] = useState(null);

  const [createSlotDate, setCreateSlotDate] = useState("");
  const [editingSlot, setEditingSlot]       = useState(null);
  const [disablingSlot, setDisablingSlot]   = useState(null);

  // ── Read user from cookie ──
  useEffect(() => {
    const userCookie = getCookie("user");
    if (userCookie) {
      try {
        const stored = JSON.parse(userCookie);
        setUser(stored);
      } catch (_) {}
    }
  }, []);

  // ── Fetch slots and interviews ──
  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      setLoadingData(true);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
        const isAdmin = String(user.role_name || user.role || "").toLowerCase() === "admin";

        const slotsRes = await fetch(
          `${API_URL}/api/interview_slots?slot_type=case_report${isAdmin ? "" : `&created_by=${user.user_id}`}`,
          { credentials: "include" }
        );
        const slotsJson = await slotsRes.json();
        setSlots(
          (slotsJson.data || []).map((s) => ({
            ...s,
            id: s.slot_id,
            date: s.slot_date,
            time: s.slot_time.slice(0, 5),
            duration: s.duration_minutes,
            status: s.is_available ? "free" : "disabled",
            interviewee: null,
          }))
        );

        const interviewsRes = await fetch(
          `${API_URL}/api/interviews?type=case_report${isAdmin ? "" : `&interviewer_user_id=${user.user_id}`}`,
          { credentials: "include" }
        );
        const interviewsJson = await interviewsRes.json();
        setInterviews(
          (interviewsJson.data || []).map((iv) => ({
            ...iv,
            id: iv.interview_id,
            caseId: `${new Date(iv.created_at).getFullYear()}-${String(iv.case_report_id).padStart(3, "0")}`,
            intervieweeName: iv.interviewee
              ? `${iv.interviewee.first_name} ${iv.interviewee.last_name}`
              : "—",
            interviewStatus: formatInterviewStatus(iv.status),
            scheduledDate: iv.slot?.slot_date || null,
            scheduledTime: iv.slot?.slot_time?.slice(0, 5) || null,
            duration: `${iv.slot?.duration_minutes || 60} minutes`,
            meetingLink: iv.meeting_link || null,
            availabilityRequest: iv.availability_request_reason || null,
            availabilityRequested: Boolean(iv.availability_requested),
          }))
        );
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchAll();
  }, [user]);

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

  const handleCreateSlot = async (formData) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${API_URL}/api/interview_slots`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_type: "case_report",
          created_by: user.user_id,
          slot_date: formData.date,
          slot_time: formData.time,
          duration_minutes: Number(formData.duration),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create slot");
      const s = json.data;
      setSlots((prev) => [...prev, {
        ...s,
        id: s.slot_id,
        date: s.slot_date,
        time: s.slot_time.slice(0, 5),
        duration: s.duration_minutes,
        status: "free",
        interviewee: null,
      }]);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditSlot = (slot) => {
    setEditingSlot(slot);
    setModalState("editSlot");
  };

  const handleSaveEditedSlot = async (updatedSlot) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${API_URL}/api/interview_slots/${updatedSlot.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_date: updatedSlot.date,
          slot_time: updatedSlot.time,
          duration_minutes: updatedSlot.duration,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update slot");
      setSlots((prev) => prev.map((s) => s.id === updatedSlot.id ? {
        ...s,
        date: updatedSlot.date,
        time: updatedSlot.time,
        duration: updatedSlot.duration,
      } : s));
      setEditingSlot(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDisableSlot = (slot) => {
    setDisablingSlot(slot);
    setModalState("disableSlot");
  };

  const handleConfirmDisableSlot = async (slot) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${API_URL}/api/interview_slots/${slot.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: false }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to disable slot");

      setSlots((prev) => prev.map((s) => s.id === slot.id ? { ...s, status: "disabled" } : s));
      setDisablingSlot(null);
      setModalState(null); // ← close modal after API succeeds
    } catch (err) {
      alert(err.message);
    }
  };

  // ── Interview handlers ──
  const handleAddMeetingLink = (selectedIds) => {
    setSelectedInterviews(selectedIds);
    setMeetingLinkModal(true);
  };

  const handleSaveMeetingLink = async (interviewIds, meetingLink) => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      await Promise.all(
        interviewIds.map((id) =>
          fetch(`${API_URL}/api/interviews/${id}/confirm`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ meeting_link: meetingLink }),
          })
        )
      );
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

  const handleMarkComplete = async (selectedIds) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`${API_URL}/api/interviews/${id}/complete`, {
            method: "PATCH",
            credentials: "include",
          })
        )
      );
      setInterviews((prev) =>
        prev.map((i) =>
          selectedIds.includes(i.id)
            ? { ...i, interviewStatus: "Completed" }
            : i
        )
      );
      setSelectedInterviews([]);
      alert("Interviews marked as complete!");
    } catch (err) {
      alert("Failed to mark complete");
    }
  };

  const handleViewDetails = (interviews) => {
    const interview = Array.isArray(interviews) ? interviews[0] : interviews;
    router.push(`/cases/view?caseId=${interview.caseId.split("-")[1]}&tab=interview`);
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.heroBanner}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Interview Management</h1>
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

        {interviews.some((interview) => interview.availabilityRequest) && (
          <div style={{ margin: "1rem auto", width: "min(1200px, calc(100% - 2rem))", padding: "1rem 1.1rem", borderRadius: 10, border: "1px solid #f5c26b", background: "#fff8e6", color: "#7c4a03", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>{interviews.filter((interview) => interview.availabilityRequest).length} interviewee availability request(s)</strong>
              <div style={{ marginTop: 3, fontSize: "0.82rem" }}>Open a highlighted record to review the request and offer new slots.</div>
            </div>
            <button className={styles.primaryBtn} onClick={() => handleViewDetails(interviews.find((interview) => interview.availabilityRequest))}>
              Review Requests
            </button>
          </div>
        )}

        <InterviewSlotCalendar
          slots={slots}
          onCreateSlot={handleOpenCreateSlot}
          onEditSlot={handleEditSlot}
          onDisableSlot={handleDisableSlot}
        />

        <section className={styles.allList}>
          <div className="container-xl">
            <div className={styles.sectionHeading}>
              <h2 className={styles.sectionTitle}>All Interviews</h2>
              <div className={styles.headingLine} />
            </div>
            <div className={styles.layout}>
              <div>
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
                      <button className={styles.clearSearchBtn} onClick={() => setSearchTerm("")}>
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

                <InterviewsTable
                  interviews={filteredInterviews}
                  selectedIds={selectedInterviews}
                  onSelectionChange={setSelectedInterviews}
                  onViewDetails={handleViewDetails}
                  onMarkComplete={handleMarkComplete}
                  onAddMeetingLink={handleAddMeetingLink}
                  onOfferNewSlots={handleViewDetails}
                  loading={loadingData}
                  pageSize={PAGE_SIZE}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

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

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2)
    return decodeURIComponent(parts.pop().split(";").shift());
  return null;
}
