"use client";

/**
 * web/frontend/src/app/page.js  (updated)
 *
 * The "Our Latest Events" section now sources from approved public projects
 * instead of hardcoded static data.
 *
 * Only shows up to 3 most recent public+approved events.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import styles from "./page.module.css";
import { FiArrowRight, FiMenu, FiX } from "react-icons/fi";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [publicEvents, setPublicEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    let mounted = true;

    const fetchPublicEvents = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/projects?visibility=public&approval_status=approved`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          console.error("Public events request failed:", res.status, res.statusText);
          return;
        }
        const data = await res.json();
        if (!mounted) return;
        setPublicEvents(
          Array.isArray(data)
            ? data.slice(0, 3)
            : data?.data?.slice(0, 3) || []
        );
      } catch (error) {
        console.error("Failed to load public events:", error);
      } finally {
        if (mounted) setEventsLoading(false);
      }
    };

    fetchPublicEvents();
    return () => {
      mounted = false;
    };
  }, []);

  const steps = [
    { step: "Step 1", title: "Register",        desc: "Create a secure account to access reporting and support features",                             active: true  },
    { step: "Step 2", title: "Submit a Report",  desc: "Registered users may file a detailed incident report through a structured form",               active: false },
    { step: "Step 3", title: "Case Review",      desc: "Case officers verify and evaluate reports following confidentiality protocols",                active: false },
    { step: "Step 4", title: "Case Monitoring",  desc: "Users may track the status of their submitted reports through their dashboard",                active: false },
  ];

  return (
    <div className={styles.pageWrapper}>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          <img src="/sasha-bg-2.png" alt="" aria-hidden="true" />
        </div>
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <p className={styles.heroEyebrow}>
              <span className={styles.heroLine} />
              Scouts Against Sexual Harassment and Abuse
            </p>
            <h1 className={styles.heroTitle}>
              Break the Silence<br />
              <span className={styles.heroTitleAccent}>Stand for Justice</span>
            </h1>
            <p className={styles.heroDesc}>
              Scouts Against Sexual Harassment and Abuse (SASHA) is a Scout-led
              civil society organization dedicated to protecting children, women,
              youth, and LGBTQIA+ individuals from sexual harassment and abuse.
            </p>
            <div className={styles.heroBtns}>
              <a href="/signup" className={styles.btnPrimary}>Create an Account</a>
              <a href="/volunteer" className={styles.btnOutline}>Be a Volunteer</a>
            </div>
          </div>
          <div className={styles.heroImage}>
            <img src="/sasha-hero-card.png" alt="You are safe with SASHA" />
          </div>
        </div>
      </section>

      {/* ── COMMITMENT ── */}
      <section className={styles.commitment}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>
            <span className={styles.eyebrowLine} /> What We Do
          </p>
          <div className={styles.commitmentHeader}>
            <h2 className={styles.sectionTitle}>Our <span className={styles.howTitleAccent}>Commitment</span></h2>
            <a href="/about" className={styles.learnMoreBtn}>Learn More <FiArrowRight /></a>
          </div>
          <p className={styles.commitmentDesc}>
            SASHA provides a platform for reporting cases of sexual harassment and abuse.
            Beyond case handling, SASHA actively promotes gender equality, youth empowerment,
            and accountability within and beyond the Scouting movement.
          </p>
          <div className={styles.commitmentGrid}>
            <div className={styles.commitmentImgWrap}>
              <img src="/sasha-commitment.png" alt="SASHA community" />
            </div>
            <div className={styles.commitmentCard}>
              <p>
                SASHA ensures that all reports are handled with{" "}
                <strong>confidentiality and responsibly</strong> through verification,
                evaluation, and proper case management procedures.
              </p>
              <div className={styles.commitmentCardIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW WE GET IT DONE ── */}
      <section className={styles.howItWorks}>
        <div className={styles.howBg}>
          <img src="/sasha-bg-1.png" alt="" aria-hidden="true" />
          <div className={styles.howBgOverlay} />
        </div>
        <div className={styles.sectionInner}>
          <div className={styles.howHeader}>
            <div>
              <p className={styles.sectionEyebrowLight}><span className={styles.eyebrowLineLight} /> How SASHA Works</p>
              <h2 className={styles.sectionTitleLight}>How We <span className={styles.howTitleAccent}>Get It Done</span></h2>
            </div>
            <a href="/about" className={styles.learnMoreBtnLight}>Learn More <FiArrowRight /></a>
          </div>
          <div className={styles.stepsContainer}>
            <div className={styles.timelineRow}>
              <div className={styles.timelineLine} />
              {steps.map((s, i) => (
                <div key={`badge-${i}`} className={styles.badgeWrapper}>
                  <span className={s.active ? styles.stepBadgeActive : styles.stepBadge}>{s.step}</span>
                  {i < steps.length - 1 && (
                    <span className={styles.stepArrow}>
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
                        <path d="M7 7L12 12L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M13 7L18 12L13 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className={styles.stepsGrid}>
              {steps.map((s, i) => (
                <div key={`card-${i}`} className={styles.stepCard}>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── INITIATIVE ── */}
      <section className={styles.initiative}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}><span className={styles.eyebrowLine} /> Advocacy and Action</p>
          <div className={styles.initiativeHeader}>
            <h2 className={styles.initiativeTitle}>The SASHA <span className={styles.initiativeTitleAccent}>Initiative</span></h2>
            <a href="/about" className={styles.learnMoreBtn}>Learn More <FiArrowRight /></a>
          </div>
          <p className={styles.initiativeDesc}>
            SASHA conducts awareness campaigns, educational discussions, and organizational
            initiatives to promote safe spaces and uphold the rights of women, children,
            youth, and LGBTQIA+ individuals. Through coordinated chapters nationwide,
            SASHA continues to expand its reach and impact.
          </p>
        </div>
      </section>

      {/* ── EVENTS — derived from public approved projects ── */}
      <section className={styles.events}>
        <div className={styles.sectionInner}>
          <h2 className={styles.eventsTitle}>Our Latest Events</h2>
          <div className={styles.eventsGrid}>
            {eventsLoading ? (
              <p style={{ color: "#6b7280", gridColumn: "1/-1" }}>
                Loading events...
              </p>
            ) : publicEvents.length === 0 ? (
              <p style={{ color: "#6b7280", gridColumn: "1/-1" }}>
                No public events available yet. Check back soon.
              </p>
            ) : (
              publicEvents.map((ev) => (
                <div key={ev.id} className={styles.eventCard}>
                  <div className={styles.eventImgWrap}>
                    <img src={ev.image && ev.image.startsWith('http') ? ev.image : "/event-placeholder.png"} alt={ev.title} />
                  </div>
                  <div className={styles.eventBody}>
                    <h3 className={styles.eventTag}>{ev.title}</h3>
                    {ev.tagline && <p style={{ fontSize: "0.82rem", color: "#037F81", fontStyle: "italic", margin: "0.25rem 0" }}>{ev.tagline}</p>}
                    <p className={styles.eventDesc}>{ev.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className={styles.eventsFooter}>
            <Link href="/events" className={styles.btnPrimary}>View All Events</Link>
          </div>
        </div>
      </section>

    </div>
  );
}