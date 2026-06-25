import Link from "next/link";
import { notFound } from "next/navigation";
import { FaArrowLeft, FaCalendarAlt, FaExternalLinkAlt } from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";
import { IoMdPeople } from "react-icons/io";
import styles from "../events.module.css";
import detailStyles from "./eventDetail.module.css";

const getServerApiUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || "http://localhost:5000";
  return apiUrl.replace(/\/$/, "");
};

const toSlug = (value = "") =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const mapProjectToEvent = (project) => ({
  id: project.id ?? project.project_id,
  title: project.title || project.event_name || "Untitled event",
  description: project.description || project.tagline || project.event_tagline || "",
  category: project.category || project.project_category || "",
  activityMode: project.activityMode || project.activity_mode || "",
  dateStart: project.dateStart || project.start_date || "",
  dateEnd: project.dateEnd || project.end_date || "",
  venue: project.venue || "",
  onlinePlatform: project.onlinePlatform || project.online_platform || "",
  onlineLink: project.onlineLink || project.online_link || "",
  targetParticipants: project.targetParticipants || project.target_participants || "",
  partnerOrganizations: project.partnerOrganizations || project.partner_organization || "",
  tagline: project.tagline || project.event_tagline || "",
  status: project.status || project.project_status || "",
  image: project.image || "",
  visibility: project.visibility,
  approvalStatus: project.approvalStatus || project.approval_status,
  slug: project.slug || toSlug(project.title || project.event_name || ""),
});

const normalizeProjects = (rawProjects) => {
  const projects = Array.isArray(rawProjects) ? rawProjects : rawProjects?.data || [];
  return projects.map(mapProjectToEvent);
};

async function fetchPublicEvents() {
  try {
    const res = await fetch(
      `${getServerApiUrl()}/api/projects?visibility=public&approval_status=approved`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    return normalizeProjects(await res.json());
  } catch (err) {
    console.error("Failed to fetch event details:", err);
    return [];
  }
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function DetailItem({ icon, label, value }) {
  if (!value) return null;
  return (
    <div className={detailStyles.detailItem}>
      <span className={detailStyles.detailIcon}>{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const events = await fetchPublicEvents();
  const event = events.find((item) => item.slug === slug || toSlug(item.title) === slug);

  return {
    title: event ? `${event.title} | SASHA Events` : "Event | SASHA",
    description: event?.tagline || event?.description || "SASHA event details.",
  };
}

export default async function EventDetailPage({ params }) {
  const { slug } = await params;
  const events = await fetchPublicEvents();
  const event = events.find((item) => item.slug === slug || toSlug(item.title) === slug);

  if (!event) notFound();

  const eventDates = [formatDate(event.dateStart), formatDate(event.dateEnd)]
    .filter(Boolean)
    .join(" to ");
  const imageSrc = event.image && event.image.startsWith("http") ? event.image : "/event-placeholder.png";

  return (
    <main className={styles.main}>
      <section className={detailStyles.hero}>
        <img src={imageSrc} alt={event.title} className={detailStyles.heroImage} />
        <div className={detailStyles.heroOverlay} />
        <div className={detailStyles.heroContent}>
          <Link href="/events" className={detailStyles.backLink}>
            <FaArrowLeft /> Back to Events
          </Link>
          <div className={detailStyles.badges}>
            {event.category && <span>{event.category}</span>}
            {event.activityMode && <span>{event.activityMode}</span>}
            {event.status && <span>{event.status}</span>}
          </div>
          <h1>{event.title}</h1>
          {event.tagline && <p>{event.tagline}</p>}
        </div>
      </section>

      <section className={detailStyles.content}>
        <div className={detailStyles.contentInner}>
          <article className={detailStyles.mainPanel}>
            <p className={detailStyles.sectionLabel}>
              <span /> Event Overview
            </p>
            <h2>About this Event</h2>
            <p>{event.description || "More details about this event will be available soon."}</p>

            {(event.partnerOrganizations || event.onlineLink) && (
              <div className={detailStyles.infoGrid}>
                {event.partnerOrganizations && (
                  <div>
                    <span>Partner Organization/s</span>
                    <strong>{event.partnerOrganizations}</strong>
                  </div>
                )}
                {event.onlineLink && (
                  <div>
                    <span>Virtual Event Link</span>
                    <a href={event.onlineLink} target="_blank" rel="noreferrer">
                      Open Link <FaExternalLinkAlt />
                    </a>
                  </div>
                )}
              </div>
            )}
          </article>

          <aside className={detailStyles.sidePanel}>
            <p className={detailStyles.sectionLabel}>
              <span /> Schedule
            </p>
            <h2>Event Details</h2>
            <DetailItem icon={<FaCalendarAlt />} label="Date" value={eventDates} />
            <DetailItem icon={<FaLocationDot />} label="Venue" value={event.venue || event.onlinePlatform} />
            <DetailItem icon={<IoMdPeople />} label="Target Participants" value={event.targetParticipants} />
          </aside>
        </div>
      </section>
    </main>
  );
}
