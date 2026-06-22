import Link from "next/link";
import styles from "./terms.module.css";

export const metadata = {
  title: "Terms & Conditions | Savira",
  description: "Terms governing access to and use of the Savira platform.",
};

export default function TermsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>Savira Policies</p>
          <h1>Terms &amp; Conditions</h1>
          <p>Effective June 22, 2026</p>
        </div>
      </div>

      <div className={`${styles.container} ${styles.layout}`}>
        <aside className={styles.aside}>
          <strong>Policies</strong>
          <Link className={styles.active} href="/terms">Terms &amp; Conditions</Link>
          <Link href="/privacy">Privacy Policy</Link>
        </aside>

        <article className={styles.content}>
          <section>
            <h2>1. Acceptance of these terms</h2>
            <p>
              By creating an account, submitting information, or otherwise using Savira, you agree
              to these Terms &amp; Conditions and our <Link href="/privacy">Privacy Policy</Link>.
              If you do not agree, do not use the platform.
            </p>
          </section>

          <section>
            <h2>2. About Savira</h2>
            <p>
              Savira supports SASHA programs, including case reporting and management, interview
              scheduling, volunteer applications, projects, events, support resources, and
              administrative coordination. Savira is not an emergency response service and does
              not replace professional legal, medical, counseling, or law-enforcement assistance.
            </p>
          </section>

          <section>
            <h2>3. Account eligibility and security</h2>
            <ul>
              <li>You must provide accurate, current, and complete information.</li>
              <li>You are responsible for protecting your password and account access.</li>
              <li>You must promptly report suspected unauthorized use or security incidents.</li>
              <li>You may not impersonate another person or create an account for misuse.</li>
            </ul>
          </section>

          <section>
            <h2>4. Sensitive reports and supporting information</h2>
            <p>
              Case reports may contain sensitive personal information. Submit only information
              that is relevant and that you are authorized to provide. You are responsible for the
              accuracy of your submissions. Savira may restrict access to case information based on
              assigned roles, case responsibilities, safety, confidentiality, and applicable law.
            </p>
          </section>

          <section>
            <h2>5. Interviews and appointments</h2>
            <p>
              Interview invitations, selected time slots, meeting links, and reschedule requests
              must be used responsibly. If you cannot attend, provide a truthful reason and choose
              another available schedule as early as possible. A requested time remains subject to
              availability and confirmation by authorized personnel.
            </p>
          </section>

          <section>
            <h2>6. Acceptable use</h2>
            <p>You must not use Savira to:</p>
            <ul>
              <li>harass, threaten, exploit, deceive, or harm another person;</li>
              <li>submit knowingly false, unlawful, or malicious reports;</li>
              <li>access records or accounts without authorization;</li>
              <li>upload malware or interfere with platform operation or security;</li>
              <li>copy, disclose, or distribute confidential information improperly; or</li>
              <li>use the service in violation of applicable Philippine law.</li>
            </ul>
          </section>

          <section>
            <h2>7. Volunteer, event, and project participation</h2>
            <p>
              Applications and registrations do not guarantee acceptance or participation.
              Additional screening, consent, safeguarding, conduct, and attendance requirements
              may apply. SASHA may change or cancel activities when necessary.
            </p>
          </section>

          <section>
            <h2>8. Platform availability and third-party services</h2>
            <p>
              We work to keep Savira reliable, but access may be interrupted for maintenance,
              security, technical issues, or circumstances beyond our control. Maps, meeting
              platforms, email, and other third-party services may have separate terms and
              availability.
            </p>
          </section>

          <section>
            <h2>9. Suspension and termination</h2>
            <p>
              We may limit, suspend, or terminate access when reasonably necessary to protect
              people, confidential information, platform security, legal compliance, or the
              integrity of SASHA services. You may request account deactivation through account
              settings, subject to lawful record-retention requirements.
            </p>
          </section>

          <section>
            <h2>10. Disclaimers and limitation</h2>
            <p>
              Savira is provided on an “as available” basis. To the extent permitted by law, SASHA
              is not liable for indirect or consequential loss caused by unauthorized use,
              third-party services, inaccurate user submissions, or service interruptions. Nothing
              in these terms excludes rights or liabilities that cannot legally be excluded.
            </p>
          </section>

          <section>
            <h2>11. Changes and contact</h2>
            <p>
              We may update these terms to reflect service, legal, or security changes. The updated
              effective date will appear above. Questions may be sent through the{" "}
              <Link href="/contact">Contact page</Link>.
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
