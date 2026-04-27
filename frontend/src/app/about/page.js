import Link from "next/link";
import styles from "./about.module.css";

export const metadata = {
  title: "About | SASHA",
  description: "Know more about Scouts Against Sexual Harassment and Abuse (SASHA).",
};

export default function AboutPage() {
  return (
    <main className={styles.main}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <h1 className={styles.heroTitle}>
          Know More About <span className={styles.accent}>SASHA</span>
        </h1>
      </section>

      {/* ── About Us ── */}
      <section className={styles.aboutSection}>
        <div className={styles.aboutGrid}>
          {/* Left — photos */}
          <div className={styles.photoStack}>
            <div className={styles.photoCard}>
              <img
                src="/about-photo-1.png"
                alt="SASHA members"
                className={styles.photo}
              />
              <div className={styles.yearBadge}>3 years</div>
            </div>
            <div className={styles.photoCardSmall}>
              <img
                src="/about-photo-2.png"
                alt="SASHA activity"
                className={styles.photo}
              />
            </div>
          </div>

          {/* Right — text */}
          <div className={styles.aboutText}>
            <p className={styles.sectionLabel}>
              <span className={styles.labelLine} /> About Us
            </p>
            <h2 className={styles.aboutHeading}>SASHA is:</h2>
            <p className={styles.aboutBody}>
              Scouts Against Sexual Harassment and Abuse (SASHA) is a Scout-led
              organization established in 2022 to address issues of sexual
              harassment and abuse affecting children, women, youth, and LGBTQIA+
              individuals. It unites members from different sectors who share a
              commitment to gender equality and social justice.
            </p>
          </div>
        </div>
      </section>

      {/* ── Mission & Vision ── */}
      <section className={styles.mvSection}>
        <div className={styles.missionBox}>
          <h2 className={styles.missionTitle}>Our Mission</h2>
          <p className={styles.missionBody}>
            To defend and uphold the rights of vulnerable sectors against sexual
            harassment and abuse by providing structured reporting mechanisms,
            responsible case management, and sustained advocacy.
          </p>
        </div>
        <div className={styles.visionBox}>
          <h2 className={styles.visionTitle}>Our Vision</h2>
          <div className={styles.visionCard}>
            <p className={styles.visionBody}>
              A society where safe spaces are ensured, abuse is not tolerated,
              and survivors are supported with dignity, respect, and justice.
            </p>
          </div>
        </div>
      </section>

      {/* ── Core Values ── */}
      <section className={styles.valuesSection}>
        <p className={styles.sectionLabel}>
          <span className={styles.labelLine} /> What We Believe
        </p>
        <h2 className={styles.valuesHeading}>
          Our <span className={styles.accent}>Core Values</span>
        </h2>
        <div className={styles.valuesGrid}>
          {[
            {
              num: "01",
              title: "Safe Spaces Commitment",
              body: "SASHA maintains a firm stance against all forms of sexual harassment and abuse. We advocate for prevention, survivor protection, and accountability to ensure safe and respectful spaces for everyone.",
            },
            {
              num: "02",
              title: "Gender Equality",
              body: "SASHA upholds the equal rights, dignity, and opportunities of all genders. The organization actively challenges discrimination, harmful stereotypes, and systems that enable inequality and abuse.",
            },
            {
              num: "03",
              title: "Youth Empowerment",
              body: "SASHA believes that young people are not only beneficiaries of protection but also leaders of change. The organization promotes youth participation in advocacy, education, and decision-making processes.",
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