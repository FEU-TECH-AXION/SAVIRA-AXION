"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiMenu, FiX } from "react-icons/fi";
import styles from "./navbar.module.css";

/**
 * Navbar Component
 *
 * Props:
 *   user  — null (logged out) | { role: "complainant" | "case_officer" | "admin" | "legal" | "sasha_officer" }
 *
 * Usage:
 *   <Navbar user={null} />               ← public visitor
 *   <Navbar user={{ role: "complainant" }} /> ← logged-in complainant
 */

// ── Link definitions per role ────────────────────────────────────────────────

const PUBLIC_LINKS = [
  { href: "/",         label: "Home" },
  { href: "/about",   label: "About" },
  { href: "/events",  label: "Events" },
  { href: "/contact", label: "Contact" },
  { href: "/volunteer", label: "Volunteer" },
];

const COMPLAINANT_LINKS = [
  { href: "/dashboard",      label: "Home" },
  { href: "/about",   label: "About" },
  { href: "/report",     label: "Report" },
  { href: "/volunteer", label: "Volunteer" },
  { href: "/contact", label: "Contact" },
  { href: "/events",         label: "Events" },
];

const CASE_OFFICER_LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/cases",     label: "Cases" },
  { href: "/heatmap", label: "Heatmap" },
];

const STAFF_LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/projects",     label: "Projects" },
  { href: "/volunteer", label: "Volunteers" },
  { href: "/heatmap", label: "Heatmap" },
];

const LEGAL_LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/cases",     label: "Cases" },
  { href: "/legalReviews",     label: "Legal Review" },
  { href: "/projects",     label: "Projects" },
];

const ADMIN_LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/users",     label: "Users" },
  { href: "/cases",     label: "Cases" },
  { href: "/legalReviews",     label: "Legal Review" },
  { href: "/projects",     label: "Projects" },
  { href: "/volunteer", label: "Volunteers" },
  { href: "/heatmap", label: "Heatmap" },
  { href: "/reports",   label: "Reports" },
];

function getLinks(user) {
  if (!user) return PUBLIC_LINKS;
  switch (user.role?.toLowerCase()) {
    case "admin":            return ADMIN_LINKS;
    case "staff":            return STAFF_LINKS;
    case "case officer":     return CASE_OFFICER_LINKS;
    case "legal personnel":  return LEGAL_LINKS;
    case "complainant":      return COMPLAINANT_LINKS;
    case "user":             return COMPLAINANT_LINKS;
    default:                 return PUBLIC_LINKS;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Navbar({ user = null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const links = getLinks(user);

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.navInner}>

        {/* ── Burger (mobile left) ── */}
        <button
          className={styles.burgerBtn}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>

        {/* ── Logo (center on mobile, left on desktop) ── */}
        <Link href="/" className={styles.navLogo} onClick={closeMenu}>
          <img src="/sasha-logo-white.png" alt="SASHA logo" />
        </Link>

        {/* ── Desktop links ── */}
        <ul className={styles.navLinks}>
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={isActive(href) ? styles.navLinkActive : styles.navLink}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* ── Right action (login / user menu) ── */}
        <div className={styles.navRight}>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link href="/login" className={styles.navLoginBtn}>
              Log In
            </Link>
          )}
        </div>

      </div>

      {/* ── Mobile dropdown ── */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          <ul className={styles.mobileLinks}>
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={isActive(href) ? styles.mobileLinkActive : styles.mobileLink}
                  onClick={closeMenu}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <div className={styles.mobileDivider} />

          {user ? (
            <div className={styles.mobileUserSection}>
              <span className={styles.mobileUserName}>
                {user.firstName ?? "Account"}
              </span>
              {/* Replace href with your actual logout handler */}
              <Link href="/logout" className={styles.mobileLogoutBtn} onClick={closeMenu}>
                Log Out
              </Link>
            </div>
          ) : (
            <Link href="/login" className={styles.mobileLoginBtn} onClick={closeMenu}>
              Log In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}

// ── User avatar / dropdown (desktop) ────────────────────────────────────────

function UserMenu({ user }) {
  const [open, setOpen] = useState(false);

const ROLE_LABEL = {
  admin:            "Admin",
  staff:            "Staff",
  "case officer":   "Case Officer",
  "legal personnel": "Legal Personnel",
  complainant:      "Complainant",
  user:             "User",
};

  return (
    <div className={styles.userMenu}>
      <button
        className={styles.userAvatar}
        onClick={() => setOpen(!open)}
        aria-label="Account menu"
        aria-expanded={open}
      >
        {/* Initials fallback */}
        <span>{user.firstName?.[0] ?? "U"}{user.lastName?.[0] ?? ""}</span>
      </button>

      {open && (
        <div className={styles.userDropdown}>
          <p className={styles.dropdownName}>
            {user.firstName} {user.lastName}
          </p>
          <p className={styles.dropdownRole}>{ROLE_LABEL[user.role]}</p>
          <hr className={styles.dropdownDivider} />
          <Link href="/profile"  className={styles.dropdownItem} onClick={() => setOpen(false)}>My Profile</Link>
          <Link href="/settings" className={styles.dropdownItem} onClick={() => setOpen(false)}>Settings</Link>
          <hr className={styles.dropdownDivider} />
          {/* Replace href with your actual logout handler */}
          <Link href="/logout" className={`${styles.dropdownItem} ${styles.dropdownLogout}`} onClick={() => setOpen(false)}>
            Log Out
          </Link>
        </div>
      )}
    </div>
  );
}