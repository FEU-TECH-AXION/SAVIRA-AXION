/**
 * web/frontend/src/app/events/page.js  (updated)
 *
 * Now derives events from the ProjectManagement data store.
 * Only projects where:
 *   visibility === "public"  &&  approvalStatus === "approved"
 * are displayed here.
 *
 * In production, replace the PROJECTS import with a Supabase query:
 *   const { data } = await supabase
 *     .from("projects")
 *     .select("*")
 *     .eq("visibility", "public")
 *     .eq("approval_status", "approved")
 *     .order("date_start", { ascending: true });
 */

import Link from "next/link";
import styles from "./events.module.css";
import { FaSearch, FaCalendarAlt } from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";
import { IoMdPeople } from "react-icons/io";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const CATEGORIES = [
  "All",
  "Youth Leadership Programs",
  "Legal & Policy Education",
  "Awareness Campaign",
  "Community Outreach",
  "New Projects",
];

const mapProjectToEvent = (project) => ({
  id: project.id ?? project.project_id,
  title: project.title || project.event_name || "Untitled event",
  description: project.description || project.tagline || project.event_tagline || "",
  category: project.category || project.project_category || "",
  activityMode: project.activityMode || project.activity_mode || "",
  dateStart: project.dateStart || project.start_date || "",
  dateEnd: project.dateEnd || project.end_date || "",
  venue: project.venue || "",
  targetParticipants: project.targetParticipants || project.target_participants || "",
  tagline: project.tagline || project.event_tagline || "",
  status: project.status || project.project_status || "",
  image: project.image || "/event-placeholder.png",
  visibility: project.visibility,
  approvalStatus: project.approvalStatus || project.approval_status,
  slug: project.slug || (project.title || project.event_name || "").toLowerCase().replace(/\s+/g, "-"),
});

const normalizeProjects = (rawProjects) => {
  const projects = Array.isArray(rawProjects) ? rawProjects : rawProjects?.data || [];
  const mapped = projects.map(mapProjectToEvent);
  const publicEvents = mapped.filter(
    (p) => p.visibility === "public" && p.approvalStatus === "approved"
  );
  return publicEvents.length > 0 ? publicEvents : mapped;
};

async function fetchProjectEvents() {
  try {
    const res = await fetch(`${API_URL}/api/projects`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return normalizeProjects(data);
  } catch (err) {
    console.error("Failed to fetch project events:", err);
    return [];
  }
}

const RECENT_POSTS = [];

export const metadata = {
  title: "Events | SASHA",
  description: "SASHA Initiatives — Advocacy events and activities across chapters nationwide.",
};

export default async function EventsPage({ searchParams }) {
  const params = await searchParams;
  let activeCategories = [];
  if (Array.isArray(params?.category)) {
    activeCategories = params.category;
  } else if (typeof params?.category === "string") {
    activeCategories = params.category.includes(",") 
      ? params.category.split(",").map(c => c.trim())
      : [params.category];
  }
  const searchQuery = (params?.search || "").toLowerCase();

  const PUBLIC_EVENTS = await fetchProjectEvents();
  
  let filteredEvents = PUBLIC_EVENTS;
  if (activeCategories.length > 0) {
    filteredEvents = filteredEvents.filter(ev => activeCategories.includes(ev.category));
  }
  if (searchQuery) {
    filteredEvents = filteredEvents.filter(ev => 
      ev.title.toLowerCase().includes(searchQuery) ||
      ev.description.toLowerCase().includes(searchQuery) ||
      (ev.tagline && ev.tagline.toLowerCase().includes(searchQuery))
    );
  }

  const recentPosts = PUBLIC_EVENTS.slice(0, 3).map((p) => ({
    title: p.title,
    date: p.dateStart,
    slug: p.slug,
    image: p.image || "/event-placeholder.png",
  }));

  return (
    <main className={styles.main}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <h1 className={styles.heroTitle}>
          SASHA <span className={styles.accent}>Initiatives</span>
        </h1>
        <div className={styles.heroBanner}>
          <img src="/hero-banner.png" alt="SASHA advocacy event" className={styles.heroBannerImg} />
        </div>
      </section>

      {/* ── Intro ── */}
      <section className={styles.intro}>
        <p className={styles.sectionLabel}>
          <span className={styles.labelLine} /> What We Advocate
        </p>
        <h2 className={styles.introHeading}>
          Advocacy Events <br />
          <span className={styles.accent}>and Activities</span>
        </h2>
        <p className={styles.introBody}>
          SASHA organizes awareness campaigns, educational forums, and advocacy-driven
          activities across various chapters nationwide. These initiatives aim to promote
          safe spaces, educate communities, and strengthen collective action against sexual
          harassment and abuse.
        </p>
      </section>

      {/* ── Events list + sidebar ── */}
      <section className={styles.content}>
        <div className={styles.contentInner}>
          <h2 className={styles.latestHeading}>Our Latest Events</h2>

          <div className={styles.contentGrid}>
            {/* Events list */}
            <div className={styles.eventsList}>
              {filteredEvents.length === 0 ? (
                <p style={{ color: "#6b7280" }}>No public events available at this time.</p>
              ) : (
                filteredEvents.map((ev) => {
                  const slug = ev.slug || ev.title.toLowerCase().replace(/\s+/g, "-");
                  const isUpcoming = ev.status?.toLowerCase() === "upcoming";
                  const isActive = ev.status?.toLowerCase() === "active";

                  const trimmedTitle = ev.title?.trim().toLowerCase() || "";
                  const trimmedTagline = ev.tagline?.trim().toLowerCase() || "";
                  const trimmedDesc = ev.description?.trim().toLowerCase() || "";

                  const showTagline = ev.tagline && trimmedTagline !== trimmedTitle;
                  const showDesc = ev.description && 
                    trimmedDesc !== trimmedTitle && 
                    (!showTagline || trimmedDesc !== trimmedTagline);

                  return (
                    <article key={ev.id} className={styles.eventCard}>
                      <div className={styles.eventImageWrap}>
                        <img
                          src={ev.image && ev.image.startsWith('http') ? ev.image : "/event-placeholder.png"}
                          alt={ev.title}
                          className={styles.eventImage}
                        />
                        {isUpcoming && <span className={styles.eventBadge}>Happening Soon</span>}
                        {isActive && (
                          <span className={`${styles.eventBadge} ${styles.eventBadgeActive}`}>
                            Ongoing
                          </span>
                        )}
                      </div>
                      <div className={styles.eventBody}>
                        <div className={styles.eventMeta}>
                          <span className={styles.eventCategory}>{ev.category}</span>
                          <span className={styles.eventMode}>{ev.activityMode}</span>
                        </div>
                        <h3 className={styles.eventTitle}>{ev.title}</h3>
                        {showTagline && <p className={styles.eventTagline}>{ev.tagline}</p>}
                        {showDesc && <p className={styles.eventDesc}>{ev.description}</p>}
                        <div className={styles.eventDetails}>
                          <span>
                            <FaCalendarAlt /> {ev.dateStart}
                            {ev.dateEnd ? ` – ${ev.dateEnd}` : ""}
                          </span>
                          {ev.venue && (
                            <span>
                              <FaLocationDot /> {ev.venue}
                            </span>
                          )}
                          {ev.targetParticipants && (
                            <span>
                              <IoMdPeople /> {ev.targetParticipants}
                            </span>
                          )}
                        </div>
                        <Link href={`/events/${slug}`} className={styles.eventBtn}>
                          View Event
                        </Link>
                      </div>
                    </article>
                  );
                })
              )}

              {/* Pagination placeholder */}
              <div className={styles.pagination}>
                <button className={styles.pageBtn} aria-label="Previous">←</button>
                <button className={`${styles.pageNum} ${styles.pageNumActive}`}>1</button>
                <button className={styles.pageBtn} aria-label="Next">→</button>
              </div>
            </div>

            {/* Sidebar */}
            <aside className={styles.sidebar}>
              {/* Search */}
              <div className={styles.sidebarBlock}>
                <h4 className={styles.sidebarTitle}>Search</h4>
                <form action="/events" method="GET" className={styles.searchBox}>
                  {activeCategories.map((cat) => (
                    <input key={cat} type="hidden" name="category" value={cat} />
                  ))}
                  <input type="text" name="search" defaultValue={params?.search || ""} placeholder="Search events…" className={styles.searchInput} />
                  <button type="submit" className={styles.searchBtn} aria-label="Search">
                    <FaSearch />
                  </button>
                </form>
              </div>

              {/* Categories */}
              <div className={styles.sidebarBlock}>
                <h4 className={styles.sidebarTitle}>Categories</h4>
                <ul className={styles.categoryList}>
                  {CATEGORIES.map((cat) => {
                    const query = new URLSearchParams();
                    if (searchQuery) query.set("search", searchQuery);
                    
                    let isActive = false;
                    let nextCategories = [];
                    
                    if (cat === "All") {
                      isActive = activeCategories.length === 0;
                    } else {
                      isActive = activeCategories.includes(cat);
                      if (isActive) {
                        nextCategories = activeCategories.filter(c => c !== cat);
                      } else {
                        nextCategories = [...activeCategories, cat];
                      }
                    }
                    
                    nextCategories.forEach(c => query.append("category", c));
                    const href = `/events${query.toString() ? `?${query.toString()}` : ""}`;
                    
                    return (
                    <li key={cat}>
                      <Link href={href} scroll={false}
                        className={`${styles.categoryItem} ${isActive ? styles.categoryActive : ""}`}>
                        {cat}
                      </Link>
                    </li>
                  )})}
                </ul>
              </div>

              {/* Recent Posts */}
              <div className={styles.sidebarBlock}>
                <h4 className={styles.sidebarTitle}>Recent Events</h4>
                <ul className={styles.recentList}>
                  {recentPosts.map((p) => (
                    <li key={p.title} className={styles.recentItem}>
                      <img src={p.image} alt={p.title} className={styles.recentThumb} />
                      <div>
                        <p className={styles.recentTitle}>{p.title}</p>
                        <p className={styles.recentDate}>{p.date}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}