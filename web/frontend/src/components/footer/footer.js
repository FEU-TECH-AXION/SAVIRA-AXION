"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaFacebook, FaInstagram} from "react-icons/fa6";
import styles from "./footer.module.css";
import { useAuth } from "@/lib/AuthContext";

const PUBLIC_QUICK_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Contact" },
  { href: "/volunteer", label: "Volunteer" },
];

const COMPLAINANT_QUICK_LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/cases", label: "Report" },
  { href: "/volunteer", label: "Volunteer" },
  { href: "/contact", label: "Contact" },
  { href: "/events", label: "Events" },
];

const CASE_OFFICER_QUICK_LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/cases", label: "Cases" },
  { href: "/heatmap", label: "Heatmap" },
];

const STAFF_QUICK_LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/volunteer", label: "Volunteers" },
  { href: "/heatmap", label: "Heatmap" },
];

const LEGAL_QUICK_LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/legalReviews", label: "Legal Review" },
  { href: "/heatmap", label: "Heatmap" },
];

const ADMIN_QUICK_LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/users", label: "Users" },
  { href: "/cases", label: "Cases" },
  { href: "/legalReviews", label: "Legal Review" },
  { href: "/projects", label: "Projects" },
  { href: "/volunteer", label: "Volunteers" },
  { href: "/heatmap", label: "Heatmap" },
  { href: "/reports", label: "Reports" },
];

const ROLE_LABEL = {
  admin: "Admin",
  staff: "Staff",
  case_officer: "Case Officer",
  legal_personnel: "Legal Personnel",
  complainant: "Complainant",
  user: "User",
};

function getQuickLinks(user) {
  if (!user) return PUBLIC_QUICK_LINKS;
  switch (user.role_name?.toLowerCase()) {
    case "admin":          return ADMIN_QUICK_LINKS;
    case "staff":          return STAFF_QUICK_LINKS;
    case "case officer":   return CASE_OFFICER_QUICK_LINKS;
    case "legal personnel":return LEGAL_QUICK_LINKS;
    case "complainant":
    case "user":           return COMPLAINANT_QUICK_LINKS;
    default:               return PUBLIC_QUICK_LINKS;
  }
}

export default function Footer() {
  const { user } = useAuth();
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
            <a href="https://www.facebook.com/PHsasha" aria-label="Facebook"><FaFacebook /></a>
            <a href="https://www.instagram.com/phsasha_official/?g=5" aria-label="Instagram"><FaInstagram /></a>
            {/* <a href="#" aria-label="YouTube"><FaYoutube /></a>
            <a href="#" aria-label="LinkedIn"><FaLinkedin /></a> */}
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