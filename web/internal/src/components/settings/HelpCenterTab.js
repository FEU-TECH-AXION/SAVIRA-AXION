"use client";

import { useState } from "react";
import { FiChevronDown, FiMail, FiMessageSquare, FiCheck } from "react-icons/fi";
import { internalApiFetch } from "@/lib/internalApiFetch";
import styles from "./HelpCenterTab.module.css";

const FAQ_KEYS = [
  ["faqContactInfoQ", "faqContactInfoA"],
  ["faqCaseStatusQ", "faqCaseStatusA"],
  ["faqTwoFactorQ", "faqTwoFactorA"],
  ["faqProfileVisibilityQ", "faqProfileVisibilityA"],
  ["faqDeactivateQ", "faqDeactivateA"],
];

export default function HelpCenterTab({ user, t }) {
  const [openIndex, setOpenIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [contactForm, setContactForm] = useState({ subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const faqs = FAQ_KEYS.map(([questionKey, answerKey]) => ({
    q: t(questionKey),
    a: t(answerKey),
  }));

  const filteredFaqs = faqs.filter(
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
      const res = await internalApiFetch("/api/support/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
    } catch {
      // Keep the form steady if sending fails.
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.cardTitle}>{t("faqs")}</div>

        <input
          type="text"
          className={styles.searchInput}
          placeholder={t("searchHelp")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className={styles.faqList}>
          {filteredFaqs.length === 0 && (
            <p className={styles.emptyNote}>{t("noHelpResults")} &quot;{search}&quot;. {t("tryDifferentSearch")}</p>
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
        <div className={styles.cardTitle}>{t("contactSupport")}</div>
        <p className={styles.cardDesc}>
          {t("contactSupportDesc")}
        </p>

        <form className={styles.contactForm} onSubmit={handleContactSubmit}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t("subject")}</label>
            <input
              name="subject"
              value={contactForm.subject}
              onChange={handleContactChange}
              placeholder={t("subjectPlaceholder")}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t("message")}</label>
            <textarea
              name="message"
              value={contactForm.message}
              onChange={handleContactChange}
              placeholder={t("messagePlaceholder")}
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
              {sending ? t("sending") : t("sendMessage")}
            </button>
          </div>
        </form>
      </div>

      {sent && (
        <div className={styles.modalBackdrop} role="presentation">
          <div className={styles.sentModal} role="dialog" aria-modal="true" aria-labelledby="support-sent-title">
            <span className={styles.modalIcon}><FiCheck size={28} /></span>
            <h3 id="support-sent-title">{t("messageSent")}</h3>
            <p>{t("messageSentDesc")}</p>
            <button type="button" className={styles.modalButton} onClick={() => setSent(false)}>
              {t("ok")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
