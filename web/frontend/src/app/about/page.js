"use client";

import styles from "./about.module.css";
import { useI18n } from "@/lib/i18n";

export default function AboutPage() {
  const { t } = useI18n();
  function calculateYears() {
    const launchDate = new Date(2022, 10, 25);
    const today = new Date();
    let years = today.getFullYear() - launchDate.getFullYear();
    const hasLaunchAnniversaryPassed =
      today.getMonth() > launchDate.getMonth() ||
      (today.getMonth() === launchDate.getMonth() &&
        today.getDate() >= launchDate.getDate());

    if (!hasLaunchAnniversaryPassed) {
      years -= 1;
    }

    return years;
  }

  const yearsActive = calculateYears();

  return (
    <main className={styles.main}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <h1 className={styles.heroTitle}>
          {t("aboutHero")} <span className={styles.accent}>SASHA</span>
        </h1>
      </section>

      {/* ── About Us ── */}
      <section className={styles.aboutSection}>
        <div className={styles.aboutGrid}>
          {/* Left — photos */}
          <div className={`${styles.photoStack} position-relative`}>
            <div className={`${styles.photoCard} position-absolute`}>
              <img
                src="/about-photo-1.png"
                alt="SASHA members"
                className={styles.photo}
              />
            </div>
            <div className={`${styles.photoCardSmall} position-absolute`}>
              <img
                src="/about-photo-2.png"
                alt="SASHA activity"
                className={styles.photo}
              />
            </div>
            {/* <div className={`${styles.yearBadge} position-absolute`}>
              {yearsActive} {yearsActive === 1 ? "year" : "years"}
            </div> */}
          </div>

          {/* Right — text */}
          <div className={styles.aboutText}>
            <p className={styles.sectionLabel}>
              <span className={styles.labelLine} /> {t("aboutUs")}
            </p>
            <h2 className={styles.aboutHeading}>{t("aboutSashaIs")}</h2>
            <p className={styles.aboutBody}>
              {t("aboutBody")}
            </p>
          </div>
        </div>
      </section>

      {/* ── Mission & Vision ── */}
      <section className={styles.mvSection}>
        <div className={styles.missionBox}>
          <h2 className={styles.missionTitle}>{t("aboutMission")}</h2>
          <p className={styles.missionBody}>
            {t("aboutMissionBody")}
          </p>
        </div>
        <div className={styles.visionBox}>
          <h2 className={styles.visionTitle}>{t("aboutVision")}</h2>
          <div className={styles.visionCard}>
            <p className={styles.visionBody}>
              {t("aboutVisionBody")}
            </p>
          </div>
        </div>
      </section>

      {/* ── Core Values ── */}
      <section className={styles.valuesSection}>
        <p className={styles.sectionLabel}>
          <span className={styles.labelLine} /> {t("aboutBelieve")}
        </p>
        <h2 className={styles.valuesHeading}>
          {t("aboutCoreValues")}
        </h2>
        <div className={styles.valuesGrid}>
          {[
            {
              num: "01",
              title: t("aboutValueSafeTitle"),
              body: t("aboutValueSafeBody"),
            },
            {
              num: "02",
              title: t("aboutValueEqualityTitle"),
              body: t("aboutValueEqualityBody"),
            },
            {
              num: "03",
              title: t("aboutValueYouthTitle"),
              body: t("aboutValueYouthBody"),
            },
          ].map((v) => (
            <div key={v.num} className={styles.valueCard}>
              <div className={styles.valueNum}>{v.num}</div>
              <h3 className={styles.valueTitle}>{v.title}</h3>
              <p className={styles.valueBody}>{v.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
