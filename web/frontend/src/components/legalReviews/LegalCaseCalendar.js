"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiCalendar, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { getLegalCaseDeadlines } from "./legalReviewCalendar";
import styles from "./LegalCaseCalendar.module.css";
import { useAuth } from "@/lib/AuthContext";

const STATUS_STEP = {
  4: "Verified - True",
  6: "Under Case Evaluation",
  7: "Case Filed",
  8: "Investigation Ongoing",
  9: "Hearing Ongoing",
  10: "Dismissed",
  11: "Perpetrator Convicted",
  12: "Resolved",
};

const LEGAL_STATUSES = new Set(Object.values(STATUS_STEP));
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EVENT_STYLE = {
  hearing: { background: "#fce7f3", color: "#9d174d", borderColor: "#f9a8d4", label: "Hearing" },
  investigation: { background: "#cffafe", color: "#155e75", borderColor: "#67e8f9", label: "Investigation follow-up" },
  referral: { background: "#ede9fe", color: "#5b21b6", borderColor: "#c4b5fd", label: "Referral follow-up" },
};

export default function LegalCaseCalendar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const requestedIds = useMemo(() => new Set((searchParams.get("caseIds") || "").split(",").filter(Boolean)), [searchParams]);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
        const response = await fetch(`${API_URL}/api/case_reports/all`, { credentials: "include" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Failed to load legal cases.");
        const baseCases = (payload.data || [])
          .filter((report) => LEGAL_STATUSES.has(STATUS_STEP[report.case_status_id]))
          .filter((report) => requestedIds.size === 0 || requestedIds.has(String(report.case_report_id)))
          .map((report) => ({
            id: report.case_report_id,
            caseId: `${new Date(report.created_at).getFullYear()}-${String(report.case_report_id).padStart(3, "0")}`,
            status: STATUS_STEP[report.case_status_id],
            endorsementDetails: null,
            statusHistory: [],
          }));

        const enriched = await Promise.all(baseCases.map(async (caseData) => {
          const [reviewResponse, historyResponse] = await Promise.all([
            fetch(`${API_URL}/api/legal_reviews/case/${caseData.id}`, { credentials: "include" }),
            fetch(`${API_URL}/api/case_status_history/${caseData.id}?staffView=true`, { credentials: "include" }),
          ]);
          const review = reviewResponse.ok ? (await reviewResponse.json()).data : null;
          const history = historyResponse.ok ? (await historyResponse.json()).data : [];
          return {
            ...caseData,
            endorsementDetails: review?.endorsement_details || null,
            statusHistory: history || [],
          };
        }));
        setDeadlines(enriched.flatMap(getLegalCaseDeadlines));
      } catch (error) {
        console.error("[LegalCaseCalendar]", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authLoading, requestedIds, router, user]);

  const eventsByDate = useMemo(() => {
    const grouped = {};
    deadlines.forEach((deadline) => {
      if (!grouped[deadline.dateKey]) grouped[deadline.dateKey] = [];
      grouped[deadline.dateKey].push(deadline);
    });
    return grouped;
  }, [deadlines]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  function previousMonth() {
    if (month === 0) { setMonth(11); setYear((value) => value - 1); } else setMonth((value) => value - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((value) => value + 1); } else setMonth((value) => value + 1);
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Legal Case Calendar</h1>
            <p className={styles.subtitle}>Month view of hearings, investigation follow-ups, and referral deadlines.</p>
          </div>
          <button className={styles.backButton} onClick={() => router.push("/legalReviews")}><FiArrowLeft /> Back to Legal Review</button>
        </div>

        <section className={styles.calendar}>
          <div className={styles.toolbar}>
            <div className={styles.navigation}>
              <button className={styles.navButton} onClick={previousMonth}><FiChevronLeft /></button>
              <span className={styles.month}>{MONTHS[month]} {year}</span>
              <button className={styles.navButton} onClick={nextMonth}><FiChevronRight /></button>
            </div>
            <button className={styles.todayButton} onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}><FiCalendar /> Today</button>
          </div>

          <div className={styles.legend}>
            {Object.entries(EVENT_STYLE).map(([key, config]) => <span key={key} className={styles.legendItem}><span className={styles.dot} style={{ background: config.color }} />{config.label}</span>)}
          </div>

          {loading ? <div className={styles.loading}>Loading calendar…</div> : (
            <div className={styles.grid}>
              {DAYS.map((day) => <div key={day} className={styles.dayName}>{day}</div>)}
              {cells.map((day, index) => {
                if (!day) return <div key={`empty-${index}`} className={styles.emptyCell} />;
                const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                return (
                  <div key={dateKey} className={`${styles.cell} ${dateKey === todayKey ? styles.today : ""}`}>
                    <span className={styles.dayNumber}>{day}</span>
                    <div className={styles.events}>
                      {(eventsByDate[dateKey] || []).map((event) => {
                        const config = EVENT_STYLE[event.type] || EVENT_STYLE.referral;
                        return (
                          <a key={event.id} className={styles.event} style={config} href={`/legalReviews/view?caseId=${event.caseReportId}&from=legalCalendar`}>
                            <strong>{event.caseId}</strong>{event.label}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
