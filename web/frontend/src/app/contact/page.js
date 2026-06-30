"use client";

import { useState } from "react";
import styles from "./contact.module.css";
import { FaFacebook, FaInstagram, FaCheck } from "react-icons/fa6";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

export default function ContactPage() {
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send your message.");
      setSubmitted(true);
      setForm(emptyForm);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <h1 className={styles.heroTitle}>
          Get <span className={styles.accent}>In Touch</span>
        </h1>
      </section>

      <section className={styles.intro}>
        <p className={styles.sectionLabel}>
          <span className={styles.labelLine} /> Contact Us
        </p>
        <h2 className={styles.introHeading}>
          We&apos;re Here <span className={styles.accent}>to Help</span>
        </h2>
        <p className={styles.introBody}>
          For inquiries, partnership proposals, or organizational concerns, you may reach
          out through the form below. All messages are handled by authorized
          representatives of SASHA.
        </p>
      </section>

      <section className={styles.formSection}>
        <div className={styles.formCard}>
          <div className={styles.formLeft}>
            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <p className={styles.errorMsg}>{error}</p>}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>First Name</label>
                  <input
                    type="text"
                    placeholder="First Name"
                    className={styles.input}
                    value={form.firstName}
                    onChange={set("firstName")}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Last Name</label>
                  <input
                    type="text"
                    placeholder="Last Name"
                    className={styles.input}
                    value={form.lastName}
                    onChange={set("lastName")}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>E-mail</label>
                  <input
                    type="email"
                    placeholder="user@gmail.com"
                    className={styles.input}
                    value={form.email}
                    onChange={set("email")}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="Number"
                    className={styles.input}
                    value={form.phone}
                    onChange={set("phone")}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Subject</label>
                <input
                  type="text"
                  placeholder="Enter subject here..."
                  className={styles.input}
                  value={form.subject}
                  onChange={set("subject")}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Your Message</label>
                <textarea
                  placeholder="Enter here..."
                  className={styles.textarea}
                  rows={5}
                  value={form.message}
                  onChange={set("message")}
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>

          <div className={styles.infoPanel}>
            <div className={styles.infoOverlay} />
            <div className={styles.infoBlock}>
              <span className={styles.infoBar} />
              <h4 className={styles.infoTitle}>Address</h4>
              <p className={styles.infoText}>
                270A ML Quezon Street, Buli, Muntinlupa City
              </p>
            </div>

            <div className={styles.infoBlock}>
              <span className={styles.infoBar} />
              <h4 className={styles.infoTitle}>Contact</h4>
              <p className={styles.infoText}>
                Email: sasha@oneamaps.com
                <br />
                Contact Number: 0977 319 6087
              </p>
            </div>

            <div className={styles.infoBlock}>
              <span className={styles.infoBar} />
              <h4 className={styles.infoTitle}>Open Hours</h4>
              <p className={styles.infoText}>
                Monday - Friday: 9:00 AM - 5:00 PM
                <br />
                Saturday: 9:00 AM - 12:00 PM
              </p>
            </div>

            <div className={styles.infoBlock}>
              <span className={styles.infoBar} />
              <h4 className={styles.infoTitle}>Stay Connected</h4>
              <div className={styles.socials}>
                <a href="https://www.facebook.com/PHsasha" aria-label="Facebook"><FaFacebook /></a>
                <a href="https://www.instagram.com/phsasha_official/?g=5" aria-label="Instagram"><FaInstagram /></a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {submitted && (
        <div className={styles.modalBackdrop} role="presentation">
          <div className={styles.sentModal} role="dialog" aria-modal="true" aria-labelledby="contact-sent-title">
            <span className={styles.modalIcon}><FaCheck /></span>
            <h3 id="contact-sent-title">Message Sent</h3>
            <p>Thank you for reaching out. We&apos;ll get back to you shortly.</p>
            <button type="button" className={styles.modalButton} onClick={() => setSubmitted(false)}>
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
