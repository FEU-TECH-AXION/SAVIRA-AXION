"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import styles from "./DashboardDataCards.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function normalizeProject(project) {
  return {
    id: project.id || project.project_id,
    title: project.title || project.event_name || "Untitled event",
    date: project.dateStart || project.start_date || null,
    endDate: project.dateEnd || project.end_date || null,
    image: project.image || null,
    status: String(project.status || project.project_status || "").toLowerCase(),
    visibility: project.visibility,
    approvalStatus: project.approvalStatus || project.approval_status,
  };
}

function formatDate(value) {
  if (!value) return "Date to be announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function DashboardEventsCard() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    async function loadEvents() {
      try {
        const response = await fetch(`${API_URL}/api/projects`, { cache: "no-store" });
        const body = await response.json().catch(() => []);
        if (!response.ok) throw new Error(body.error || "Unable to load events.");
        const rows = Array.isArray(body) ? body : body.data || [];
        setEvents(rows.map(normalizeProject));
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  const currentEvents = useMemo(() => {
    const now = new Date();
    const publicEvents = events
      .filter((event) =>
        (!event.visibility || event.visibility === "public") &&
        (!event.approvalStatus || event.approvalStatus === "approved")
      )
      .filter((event) => {
        if (["active", "upcoming", "ongoing"].includes(event.status)) return true;
        const relevantDate = event.endDate || event.date;
        return relevantDate && new Date(`${relevantDate}T23:59:59`) >= now;
      })
      .sort((a, b) => {
        const aDate = a.date ? new Date(a.date) : now;
        const bDate = b.date ? new Date(b.date) : now;
        return aDate - bDate;
      })
    return publicEvents.slice(0, 3);
  }, [events]);

  const selectedEvents = useMemo(
    () => currentEvents.filter((event) => {
      if (!selectedDate || !event.date) return false;
      const eventDate = new Date(`${event.date}T00:00:00`);
      return eventDate.toDateString() === selectedDate.toDateString();
    }),
    [currentEvents, selectedDate]
  );

  const upcomingEvent = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return currentEvents.find((event) => {
      if (!event.date) return false;
      return new Date(`${event.date}T00:00:00`) >= today;
    }) || currentEvents[0] || null;
  }, [currentEvents]);

  const displayedEvents = selectedDate
    ? selectedEvents
    : upcomingEvent
      ? [upcomingEvent]
      : [];

  const displayedHeading = selectedDate
    ? formatDate(selectedDate)
    : "Upcoming Event";

  const eventDateKeys = useMemo(
    () => new Set(currentEvents
      .filter((event) => event.date)
      .map((event) => new Date(`${event.date}T00:00:00`).toDateString())),
    [currentEvents]
  );

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <span>Current Events</span>
        <button type="button" onClick={() => router.push("/events")}>View &rarr;</button>
      </div>
      <div className={styles.body}>
        {loading && <p className={styles.state}>Loading events...</p>}
        {error && <p className={styles.error}>{error}</p>}
        {!loading && !error && (
          <>
            <div
              className={styles.calendar}
              onMouseLeave={() => setSelectedDate(null)}
            >
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                locale="en-US"
                tileContent={({ date, view }) =>
                  view === "month" && eventDateKeys.has(date.toDateString())
                    ? <span className={styles.eventDot} />
                    : null
                }
              />
            </div>
            <div className={styles.selectedEvents}>
              <h3>{displayedHeading}</h3>
              {displayedEvents.length === 0 ? (
                <p className={styles.state}>
                  {selectedDate
                    ? "No event scheduled for this date."
                    : "No public events available."}
                </p>
              ) : displayedEvents.map((event) => (
                <article className={styles.eventItem} key={event.id}>
                  <div className={styles.eventThumb}>
                    {event.image ? <img src={event.image} alt="" /> : <span>📅</span>}
                  </div>
                  <div>
                    <h3>{event.title}</h3>
                    <p>{formatDate(event.date)}</p>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
