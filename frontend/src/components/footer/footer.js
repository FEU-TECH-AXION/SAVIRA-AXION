"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

const COMPLAINANT_QUICK_LINKS = [
  { href: "/dashboard",      label: "Home" },
  { href: "/about",   label: "About" },
  { href: "/report",     label: "Report" },
  { href: "/volunteer", label: "Volunteer" },
  { href: "/contact", label: "Contact" },
  { href: "/events",         label: "Events" },
];

const CASE_OFFICER_QUICK_LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/case-officer/cases",     label: "Cases" },
  { href: "/case-officer/projects",  label: "Projects" },
  { href: "/case-officer/insights", label: "Insights" },
];

const ADMIN_QUICK_LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/admin/users",     label: "Users" },
  { href: "/admin/cases",     label: "Cases" },
  { href: "/admin/projects",     label: "Projects" },
  { href: "/admin/volunteers", label: "Volunteers" },
  { href: "/admin/heatmap", label: "Heatmap" },
  { href: "/admin/reports",   label: "Reports" },
];

function getQuickLinks(user) {
  if (!user) return PUBLIC_QUICK_LINKS;
  switch (user.role) {
    case "complainant":   return COMPLAINANT_QUICK_LINKS;
    case "case_officer":  return CASE_OFFICER_QUICK_LINKS;
    case "admin":         return ADMIN_QUICK_LINKS;
    case "legal":         return LEGAL_QUICK_LINKS;
    case "sasha_officer": return SASHA_OFFICER_QUICK_LINKS;
    default:              return PUBLIC_QUICK_LINKS;
  }
}

export default function Footer({ user = null }) {
  const quickLinks = getQuickLinks(user);
  const pathname = usePathname();

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

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

        {/* Quick links */}
        <div className={styles.footerCol}>
          <h4 className={styles.footerColTitle}>Quick Links</h4>
          <ul className={styles.footerList}>
            {quickLinks.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={isActive(href) ? styles.footerLinkActive : styles.footerLink}
                >
                  {label}
                </Link>
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