"use client";

import { useState } from "react";
import { FiChevronDown, FiMail, FiMessageSquare, FiCheck } from "react-icons/fi";
import styles from "./HelpCenterTab.module.css";

const FAQS = [
  {
    q: "How do I update my contact information?",
    a: "Go to the Profile tab, edit your email or contact number, then click Save Changes. You may need to re-verify a new email or number.",
  },
  {
    q: "How do I file or check the status of a case?",
    a: "Cases can be filed and tracked from the Cases section in the main navigation. Status updates are sent to your registered email and shown under Case Notifications.",
  },
  {
    q: "How do I enable two-factor authentication?",
    a: "Open Settings & Privacy → Two-Factor Authentication and toggle it on. You'll need a verified email or contact number to receive codes.",
  },
  {
    q: "Who can see my profile information?",
    a: "By default, your profile is visible to staff and case officers handling your case. You can adjust this under Settings & Privacy → Data & Privacy.",
  },
  {
    q: "How do I delete or deactivate my account?",
    a: "Account deactivation is available under Settings & Privacy → Data & Privacy. Deactivation is temporary; contact support for permanent deletion requests.",
  },
];

export default function HelpCenterTab({ user }) {
  const [openIndex, setOpenIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [contactForm, setContactForm] = useState({ subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const filteredFaqs = FAQS.filter(
    (f) =>
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase())
  );

  const handleContactChange = (e) =>
    setContactForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/support/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user?.user_id,
          subject: contactForm.subject,
          message: contactForm.message,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not send your message.");
      }
      setContactForm({ subject: "", message: "" });
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    } catch {
      // Surfaced inline via the disabled/sent state; avoid noisy alerts here.
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.cardTitle}>Frequently Asked Questions</div>

        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search help topics…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className={styles.faqList}>
          {filteredFaqs.length === 0 && (
            <p className={styles.emptyNote}>No results for "{search}". Try a different search, or contact support below.</p>
          )}
          {filteredFaqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={faq.q} className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => setOpenIndex(isOpen ? -1 : i)}
                >
                  {faq.q}
                  <FiChevronDown className={`${styles.faqChevron} ${isOpen ? styles.faqChevronOpen : ""}`} size={16} />
                </button>
                {isOpen && <p className={styles.faqAnswer}>{faq.a}</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Contact Support</div>
        <p className={styles.cardDesc}>
          Didn't find what you needed? Send our support team a message and we'll get back to you by email.
        </p>

        {sent && (
          <div className={styles.flashSuccess}><FiCheck size={16} /> Message sent — we'll be in touch soon.</div>
        )}

        <form className={styles.contactForm} onSubmit={handleContactSubmit}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Subject</label>
            <input
              name="subject"
              value={contactForm.subject}
              onChange={handleContactChange}
              placeholder="Briefly describe your question"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Message</label>
            <textarea
              name="message"
              value={contactForm.message}
              onChange={handleContactChange}
              placeholder="Tell us more…"
              rows={5}
              required
            />
          </div>
          <div className={styles.formActions}>
            <a className={styles.emailLink} href="mailto:support@savira.org">
              <FiMail size={14} /> support@savira.org
            </a>
            <button type="submit" className={styles.btnPrimary} disabled={sending}>
              <FiMessageSquare size={14} style={{ marginRight: "0.4rem", verticalAlign: "-2px" }} />
              {sending ? "Sending…" : "Send Message"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}