"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./contact.module.css";
import { FaXTwitter, FaInstagram, FaYoutube, FaLinkedin } from "react-icons/fa6";


export default function ContactPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Replace with your actual submit logic (API call, etc.)
    setSubmitted(true);
  };

  return (
    <main className={styles.main}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <h1 className={styles.heroTitle}>
          Get <span className={styles.accent}>In Touch</span>
        </h1>
      </section>

      {/* ── Intro ── */}
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

      {/* ── Form + Info card ── */}
      <section className={styles.formSection}>
        <div className={styles.formCard}>
          {/* ── Left: form ── */}
          <div className={styles.formLeft}>
            {submitted ? (
              <div className={styles.successMsg}>
                <span className={styles.successIcon}>✓</span>
                <h3>Message Sent!</h3>
                <p>Thank you for reaching out. We&apos;ll get back to you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
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
                    placeholder="Enter subject here…"
                    className={styles.input}
                    value={form.subject}
                    onChange={set("subject")}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Your Message</label>
                  <textarea
                    placeholder="Enter here…"
                    className={styles.textarea}
                    rows={5}
                    value={form.message}
                    onChange={set("message")}
                  />
                </div>

                <button type="submit" className={styles.submitBtn}>
                  Send Message
                </button>
              </form>
            )}
          </div>

          {/* ── Right: info ── */}
          <div className={styles.infoPanel}>
            <div className={styles.infoBlock}>
              <span className={styles.infoBar} />
              <h4 className={styles.infoTitle}>Address</h4>
              <p className={styles.infoText}>
                Mandaluyong City
              </p>
            </div>

            <div className={styles.infoBlock}>
              <span className={styles.infoBar} />
              <h4 className={styles.infoTitle}>Contact</h4>
              <p className={styles.infoText}>
                Email: info@sasha-ph.org
                <br />
                Contact Number: +63 9 1234 5678
              </p>
            </div>

            <div className={styles.infoBlock}>
              <span className={styles.infoBar} />
              <h4 className={styles.infoTitle}>Open Hours</h4>
              <p className={styles.infoText}>
                Monday – Friday: 9:00 AM – 5:00 PM
                <br />
                Saturday: 9:00 AM – 12:00 PM
              </p>
            </div>

            <div className={styles.infoBlock}>
              <span className={styles.infoBar} />
              <h4 className={styles.infoTitle}>Stay Connected</h4>
              <div className={styles.socials}>
                <a href="#" aria-label="X / Twitter"><FaXTwitter /></a>
                <a href="#" aria-label="Instagram"><FaInstagram /></a>
                <a href="#" aria-label="YouTube"><FaYoutube /></a>
                <a href="#" aria-label="LinkedIn"><FaLinkedin /></a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Map ── */}
      {/* <section className={styles.mapSection}>
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3860.4!2d121.0!3d14.65!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTTCsDM5JzAwLjAiTiAxMjHCsDAwJzAwLjAiRQ!5e0!3m2!1sen!2sph!4v1620000000000!5m2!1sen!2sph"
          className={styles.map}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="SASHA Office Location"
        />
      </section> */}
    </main>
  );
}