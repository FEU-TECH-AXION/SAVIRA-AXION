import Link from "next/link";
import styles from "./privacy.module.css";

export const metadata = {
  title: "Privacy Policy | Savira",
  description: "How Savira collects, uses, stores, and protects personal information.",
};

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>Savira Policies</p>
          <h1>Privacy Policy</h1>
          <p>Effective June 22, 2026</p>
        </div>
      </div>

      <div className={`${styles.container} ${styles.layout}`}>
        <aside className={styles.aside}>
          <strong>Policies</strong>
          <Link href="/terms">Terms &amp; Conditions</Link>
          <Link className={styles.active} href="/privacy">Privacy Policy</Link>
        </aside>

        <article className={styles.content}>
          <div className={styles.notice}>
            Savira handles case-related information with heightened care because it may include
            sensitive personal information.
          </div>

          <section>
            <h2>1. Scope and privacy commitment</h2>
            <p>
              This policy explains how Savira and SASHA process personal information when you use
              the website, create an account, submit a report, schedule an interview, volunteer,
              join an event, or communicate with us. We aim to follow the Philippine Data Privacy
              Act of 2012, its implementing rules, and applicable guidance.
            </p>
          </section>

          <section>
            <h2>2. Information we collect</h2>
            <ul>
              <li>Account details, such as name, email address, contact details, and credentials.</li>
              <li>Profile, role, verification, accessibility, and communication preferences.</li>
              <li>Case reports, narratives, dates, locations, attachments, and supporting records.</li>
              <li>Interview invitations, selected slots, meeting details, notes, and reschedule reasons.</li>
              <li>Volunteer applications, screening responses, availability, and participation history.</li>
              <li>Event, project, donation, inquiry, help-center, and support-resource activity.</li>
              <li>Technical data such as device, browser, IP address, logs, and security events.</li>
            </ul>
          </section>

          <section>
            <h2>3. How we use information</h2>
            <ul>
              <li>Provide accounts, case services, interviews, programs, events, and support resources.</li>
              <li>Verify submissions, coordinate authorized personnel, and communicate updates.</li>
              <li>Protect users, prevent misuse, investigate incidents, and maintain audit records.</li>
              <li>Improve accessibility, platform performance, service quality, and reporting.</li>
              <li>Meet legal, safeguarding, regulatory, and legitimate organizational obligations.</li>
            </ul>
          </section>

          <section>
            <h2>4. Legal bases and consent</h2>
            <p>
              Depending on the activity, processing may be based on consent, fulfillment of a
              requested service, legitimate interests, protection of vital interests, or compliance
              with legal obligations. Where consent is required, you may withdraw it, although this
              may affect services that rely on the information.
            </p>
          </section>

          <section>
            <h2>5. Who may receive information</h2>
            <p>
              Information is shared only as reasonably necessary with authorized SASHA personnel,
              assigned case officers, legal personnel, staff, administrators, vetted service
              providers, or competent authorities when required or permitted by law. Access is
              role-based and should be limited to a legitimate work purpose.
            </p>
          </section>

          <section>
            <h2>6. Sensitive case information</h2>
            <p>
              Case information is not published as ordinary public content. Heatmaps and reports
              should use aggregated or de-identified information where possible. Exact details may
              be restricted to personnel assigned to the case or otherwise authorized to assist.
            </p>
          </section>

          <section>
            <h2>7. Storage, retention, and security</h2>
            <p>
              We use administrative, technical, and organizational safeguards designed to protect
              personal information. Records are retained only as long as needed for service,
              safeguarding, audit, dispute, and legal purposes, then securely deleted, anonymized,
              or archived according to applicable requirements. No system can guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2>8. Cookies and third-party services</h2>
            <p>
              Savira may use cookies or similar storage for sessions, preferences, security, and
              functionality. Mapping, email, hosting, analytics, and meeting providers may process
              limited information under their own privacy terms and our service arrangements.
            </p>
          </section>

          <section>
            <h2>9. Your privacy rights</h2>
            <p>
              Subject to applicable law, you may request access, correction, deletion or blocking,
              object to or restrict certain processing, withdraw consent, obtain information about
              processing, or lodge a complaint. Some requests may be limited by confidentiality,
              safeguarding, evidence-preservation, or legal-retention duties.
            </p>
          </section>

          <section>
            <h2>10. Children and vulnerable users</h2>
            <p>
              Services involving minors or vulnerable people require added care. Where appropriate,
              we may seek consent from a parent, guardian, or authorized representative, unless
              another lawful basis or urgent safeguarding need applies.
            </p>
          </section>

          <section>
            <h2>11. Updates and contact</h2>
            <p>
              We may revise this policy as Savira, legal requirements, or our practices change. The
              effective date above identifies the latest version. For privacy questions or rights
              requests, use the <Link href="/contact">Contact page</Link> and identify the request as
              privacy-related.
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
