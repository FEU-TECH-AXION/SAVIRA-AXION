import Link from "next/link";
import styles from "./events.module.css";

export const metadata = {
  title: "Events | SASHA",
  description: "SASHA Initiatives — Advocacy events and activities across chapters nationwide.",
};

const EVENTS = [
  {
    id: 1,
    slug: "safe-spaces-summit",
    title: "Safe Spaces Summit",
    status: "Happening Soon",
    image: "/safe-spaces-summit.png",
    description:
      "A scout community discussion on preventing sexual harassment in schools and organizations. Participants will learn about reporting procedures and how to create safer environments.",
  },
  {
    id: 2,
    slug: "youth-against-abuse-summit",
    title: "Youth Against Abuse Summit",
    status: null,
    image: "/youth-summit.png",
    description:
      "A leadership summit empowering young advocates to stand against harassment and discrimination. The event features talks, workshops, and collaborative planning sessions.",
  },
  {
    id: 3,
    slug: "know-your-rights-workshop",
    title: "Know Your Rights Workshop",
    status: null,
    image: "/rights-workshop.png",
    description:
      "An educational session focused on understanding legal protections against sexual harassment. Attendees will gain practical knowledge on reporting processes and survivor support.",
  },
  {
    id: 4,
    slug: "campus-awareness-campaign",
    title: "Campus Awareness Campaign",
    status: null,
    image: "/campus-campaign.png",
    description:
      "A movement-driven event promoting respect, consent, and accountability within academic institutions. Volunteers and members will help spread awareness through organized activities.",
  },
];

const CATEGORIES = [
  "Awareness Campaigns",
  "Training & Workshops",
  "Youth Leadership Programs",
  "Legal & Policy Education",
];

const RECENT_POSTS = [
  { title: "SASHA believes that…", date: "March 1, 2026", image: "/post-1.png" },
  { title: "SASHA Awareness on…", date: "August 18, 2026", image: "/post-2.png" },
  { title: "Youth Empowerment a…", date: "April 1, 2026", image: "/post-3.png" },
];

export default function EventsPage() {
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
              {EVENTS.map((ev) => (
                <article key={ev.id} className={styles.eventCard}>
                  <div className={styles.eventImageWrap}>
                    <img
                      src={ev.image}
                      alt={ev.title}
                      className={styles.eventImage}
                    />
                    {ev.status && (
                      <span className={styles.eventBadge}>{ev.status}</span>
                    )}
                  </div>
                  <div className={styles.eventBody}>
                    <h3 className={styles.eventTitle}>{ev.title}</h3>
                    <p className={styles.eventDesc}>{ev.description}</p>
                    <Link
                      href={`/events/${ev.slug}`}
                      className={styles.eventBtn}
                    >
                      View Event
                    </Link>
                  </div>
                </article>
              ))}

              {/* Pagination */}
              <div className={styles.pagination}>
                <button className={styles.pageBtn} aria-label="Previous">←</button>
                <button className={styles.pageNum}>1</button>
                <button className={`${styles.pageNum} ${styles.pageNumActive}`}>2</button>
                <button className={styles.pageNum}>3</button>
                <button className={styles.pageBtn} aria-label="Next">→</button>
              </div>
            </div>

            {/* Sidebar */}
            <aside className={styles.sidebar}>
              {/* Search */}
              <div className={styles.sidebarBlock}>
                <h4 className={styles.sidebarTitle}>Search</h4>
                <div className={styles.searchBox}>
                  <input
                    type="text"
                    placeholder="Search"
                    className={styles.searchInput}
                  />
                  <button className={styles.searchBtn} aria-label="Search">
                    🔍
                  </button>
                </div>
              </div>

              {/* Categories */}
              <div className={styles.sidebarBlock}>
                <h4 className={styles.sidebarTitle}>Popular Category</h4>
                <ul className={styles.categoryList}>
                  {CATEGORIES.map((cat) => (
                    <li key={cat}>
                      <Link href="#" className={styles.categoryItem}>
                        {cat}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recent Posts */}
              <div className={styles.sidebarBlock}>
                <h4 className={styles.sidebarTitle}>Recent Post</h4>
                <ul className={styles.recentList}>
                  {RECENT_POSTS.map((p) => (
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