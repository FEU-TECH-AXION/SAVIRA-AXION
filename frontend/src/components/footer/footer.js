"use client";

import Link from "next/link";
import { FaXTwitter, FaInstagram, FaYoutube, FaLinkedin } from "react-icons/fa6";
import styles from "./footer.module.css";

/**
 * Footer Component
 *
 * Props:
 *   user — null | { role: "reporter" | "case_officer" | "admin" }
 *
 * Shows different quick links depending on auth state / role.
 */

const PUBLIC_QUICK_LINKS = [
  { href: "/",          label: "Home" },
  { href: "/about",     label: "About" },
  { href: "/volunteer", label: "Volunteer" },
  { href: "/events",    label: "Events" },
  { href: "/contact",   label: "Contact" },
  { href: "/login",     label: "Log In" },
];

const REPORTER_QUICK_LINKS = [
  { href: "/dashboard",       label: "Dashboard" },
  { href: "/report/new",      label: "File a Report" },
  { href: "/report/history",  label: "My Reports" },
  { href: "/events",          label: "Events" },
  { href: "/profile",         label: "My Profile" },
];

const OFFICER_QUICK_LINKS = [
  { href: "/officer/dashboard", label: "Dashboard" },
  { href: "/officer/cases",     label: "All Cases" },
  { href: "/officer/assigned",  label: "Assigned to Me" },
  { href: "/profile",           label: "My Profile" },
];

const ADMIN_QUICK_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users",     label: "Manage Users" },
  { href: "/admin/cases",     label: "All Cases" },
  { href: "/admin/reports",   label: "Reports" },
  { href: "/profile",         label: "My Profile" },
];

function getQuickLinks(user) {
  if (!user) return PUBLIC_QUICK_LINKS;
  switch (user.role) {
    case "reporter":     return REPORTER_QUICK_LINKS;
    case "case_officer": return OFFICER_QUICK_LINKS;
    case "admin":        return ADMIN_QUICK_LINKS;
    default:             return PUBLIC_QUICK_LINKS;
  }
}

export default function Footer({ user = null }) {
  const quickLinks = getQuickLinks(user);

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>

        {/* ── Brand column ── */}
        <div className={styles.footerBrand}>
          <img src="/sasha-logo-white.png" alt="SASHA" className={styles.footerLogo} />
          <p className={styles.footerBrandDesc}>
            This platform is designed for secure case reporting and organizational
            management. Unauthorized access, misuse, or reproduction of content is
            strictly prohibited.
          </p>
          <div className={styles.footerSocials}>
            <a href="#" aria-label="X / Twitter"><FaXTwitter /></a>
            <a href="#" aria-label="Instagram"><FaInstagram /></a>
            <a href="#" aria-label="YouTube"><FaYoutube /></a>
            <a href="#" aria-label="LinkedIn"><FaLinkedin /></a>
          </div>
        </div>

        {/* ── Quick links column ── */}
        <div className={styles.footerCol}>
          <h4 className={styles.footerColTitle}>Quick Links</h4>
          <ul className={styles.footerList}>
            {quickLinks.map(({ href, label }) => (
              <li key={href}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Support column ── */}
        <div className={styles.footerCol}>
          <h4 className={styles.footerColTitle}>Support &amp; Information</h4>
          <ul className={styles.footerList}>
            <li><a href="#">Frequently Asked Questions</a></li>
            <li><a href="#">Code of Conduct</a></li>
            <li><a href="#">Data Privacy Policy</a></li>
            <li><a href="#">Terms of Use</a></li>
          </ul>
        </div>

      </div>

      <div className={styles.footerBottom}>
        <p>© {new Date().getFullYear()} Scouts Against Sexual Harassment and Abuse</p>
      </div>
    </footer>
  );
}