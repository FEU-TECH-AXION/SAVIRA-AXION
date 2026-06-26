// frontend/src/components/volunteer/landing.js
// Shown to: public viewers (not logged in) and complainants (logged in).
// Complainants see an "Apply Now" button that links to /volunteer/apply.
// Public viewers see a "Log In to Apply" button instead.

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./VolunteerLanding.module.css";
import { useAuth } from "@/lib/AuthContext";

// ── Section: Hero ─────────────────────────────────────────────────────────────
function HeroSection() {
  const { user } = useAuth();
  const router = useRouter();

  const handleApplyClick = () => {
    if (user) {
      router.push("/volunteer/apply");
    } else {
      router.push("/login");
    }
  };

  return (
    <section className={styles.hero}>
      <div className={styles.heroBgOverlay} />
      <div className={styles.heroInner}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Join the <span className={styles.heroAccent}>Movement</span>
          </h1>
        </div>
      </div>
    </section>
  );
}

// ── Section: Advocacy Events and Activities ───────────────────────────────────
function AdvocacySection({ onApplyClick, isUserLoggedIn }) {
  return (
    <section className={styles.advocacySection}>
      <div className={styles.sectionInner}>
        <div className={styles.sectionLabel}>Volunteering</div>
        <h2 className={styles.sectionTitle}>
          Advocacy Events <span className={styles.heroAccent}>and Activities</span>
        </h2>
        <p className={styles.advocacyDesc}>
          SASHA welcomes individuals aged 13 to 35 who believe in gender equality and the protection of vulnerable communities. Volunteers play a crucial role in advocacy campaigns, educational initiatives, and organizational activities.
        </p>
        <button onClick={onApplyClick} className={styles.btnPrimary}>
          {isUserLoggedIn ? "Apply Now" : "Log In to Apply"}
        </button>
      </div>
    </section>
  );
}

// ── Section: Who Can Join ─────────────────────────────────────────────────────
const WHO_ITEMS = [
  "Youth aged 13 to 35 (Regular Members)",
  "Below 13 (Provisional Members)",
  "Above 35 (Honorary Members)",
  "Both current and former Scouts",
  "Affiliate organizations aligned with SASHA's mission",
];

function WhoCanJoin() {
  return (
    <section className={styles.whoSection}>
      <div className={styles.sectionInner}>
        <div className={styles.whoCard}>
          <div className={styles.whoHeader}>
            <span className={styles.whoHeaderLine} />
            <h2 className={styles.whoTitle}>Who Can Join?</h2>
            <span className={styles.whoHeaderLine} />
          </div>
          <div className={styles.whoContent}>
            <div className={styles.whoImageWrapper}>
              <img
                src="/sasha-bg-1.png"
                alt="SASHA volunteers"
                className={styles.whoImage}
              />
              <div className={styles.whoImageOverlay} />
            </div>
            <ul className={styles.whoList}>
              {WHO_ITEMS.map((item) => (
                <li key={item} className={styles.whoItem}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={styles.whoBulletIcon}
                  >
                    <circle cx="9" cy="12" r="6" fill="#e86c2c" />
                    <circle cx="14" cy="12" r="6" fill="#1a6b5a" />
                  </svg>
                  <span className={styles.whoItemText}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section: What You Will Do ─────────────────────────────────────────────────
const RESPONSIBILITIES = [
  {
    num: "01",
    title: "Promote",
    desc: "Help educate others about harassment prevention and safe spaces.",
  },
  {
    num: "02",
    title: "Participate",
    desc: "Join initiatives that promote equality and accountability for campaign advocacies.",
  },
  {
    num: "03",
    title: "Support",
    desc: "Assist in strengthening and expanding local SASHA chapters.",
  },
  {
    num: "04",
    title: "Uphold",
    desc: "Respect privacy and follow proper case-handling guidelines.",
  },
];

function WhatYouWillDo() {
  return (
    <section className={styles.responsibilitiesSection}>
      <div className={styles.sectionInner}>
        <div className={styles.sectionLabel}>Responsibilities</div>
        <h2 className={styles.sectionTitle}>What You Will Do</h2>
        <div className={styles.responsibilitiesGrid}>
          {RESPONSIBILITIES.map((r) => (
            <div key={r.num} className={styles.responsibilityCard}>
              <div className={styles.responsibilityNum}>{r.num}</div>
              <h3 className={styles.responsibilityTitle}>{r.title}</h3>
              <p className={styles.responsibilityDesc}>{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: How To Apply ─────────────────────────────────────────────────────
const STEPS = [
  {
    num: 1,
    title: "Create an account",
    desc: "Register to begin your volunteer application process.",
    side: "right",
    image: "/step-1-create-account.png",
  },
  {
    num: 2,
    title: "Complete the volunteer application form",
    desc: "Provide the necessary details about your background and interest in volunteering.",
    side: "left",
    image: "/step-2-application-form.png",
  },
  {
    num: 3,
    title: "Submit required personal information",
    desc: "Upload and confirm the documents needed for verification.",
    side: "right",
    image: "/step-3-submit-documents.png",
  },
  {
    num: 4,
    title: "Undergo evaluation and screening",
    desc: "Your application will be reviewed to ensure suitability and readiness.",
    side: "left",
    image: "/step-4-evaluation.png",
  },
  {
    num: 5,
    title: "Await approval and chapter assignment",
    desc: "Receive confirmation and be assigned to a local SASHA chapter.",
    side: "right",
    image: "/step-5-approval.png",
  },
];

function HowToApply() {
  return (
    <section id="how-to-apply" className={styles.howSection}>
      <div className={styles.sectionInner}>
        <div className={styles.sectionLabel}>How to Volunteer</div>
        <h2 className={styles.sectionTitle}>
          How To <span className={styles.heroAccent}>Apply</span>
        </h2>

        <div className={styles.timelineLabel}>Step by Step</div>

        <div className={styles.timeline}>
          <div className={styles.timelineLine} />
          {STEPS.map((step) => (
            <div
              key={step.num}
              className={`${styles.timelineRow} ${
                step.side === "left" ? styles.timelineLeft : styles.timelineRight
              }`}
            >
              {/* Content block */}
              <div className={styles.timelineContent}>
                <div className={styles.timelineStepBadge}>Step {step.num}</div>
                <h3 className={styles.timelineStepTitle}>{step.title}</h3>
                <p className={styles.timelineStepDesc}>{step.desc}</p>
              </div>

              {/* Center dot */}
              <div className={styles.timelineDot}>
                <span>{step.num}</span>
              </div>

              {/* Image block */}
              <div className={styles.timelineImage}>
                {step.image ? (
                  <img
                    src={step.image}
                    alt={step.title}
                    className={styles.timelineImg}
                  />
                ) : (
                  <div className={styles.timelineImagePlaceholder} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Root Export ───────────────────────────────────────────────────────────────
export default function VolunteerLanding() {
  const { user } = useAuth();
  const router = useRouter();

  const handleApplyClick = () => {
    if (user) {
      router.push("/volunteer/apply");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className={styles.page}>
      <HeroSection />
      <AdvocacySection onApplyClick={handleApplyClick} isUserLoggedIn={!!user} />
      <WhoCanJoin />
      <WhatYouWillDo />
      <HowToApply />
      {/* Apply Now CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.sectionInner}>
          <button onClick={handleApplyClick} className={styles.btnPrimary}>
            {user ? "Apply Now" : "Log In to Apply"}
          </button>
        </div>
      </section>
    </div>
  );
}