"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiMenu, FiX } from "react-icons/fi";
import { useAuth } from "@/lib/AuthContext";
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
  { href: "/",          label: "Home" },
  { href: "/about",     label: "About" },
  { href: "/events",    label: "Events" },
  { href: "/contact",   label: "Contact" },
  { href: "/volunteer", label: "Volunteer" },
];

const COMPLAINANT_LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/about",     label: "About" },
  { href: "/cases",     label: "Report" },
  { href: "/volunteer", label: "Volunteer" },
  { href: "/contact",   label: "Contact" },
  { href: "/events",    label: "Events" },
];

const CASE_OFFICER_LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/cases",     label: "Cases" },
  { href: "/heatmap",   label: "Heatmap" },
];

const STAFF_LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/projects",  label: "Projects" },
  { href: "/volunteer", label: "Volunteers" },
  { href: "/heatmap",   label: "Heatmap" },
];

const LEGAL_LINKS = [
  { href: "/dashboard",    label: "Home" },
  { href: "/cases",        label: "Cases" },
  { href: "/legalReviews", label: "Legal Review" },
  { href: "/projects",     label: "Projects" },
];

const ADMIN_LINKS = [
  { href: "/dashboard",    label: "Home" },
  { href: "/users",        label: "Users" },
  { href: "/cases",        label: "Cases" },
  { href: "/legalReviews", label: "Legal Review" },
  { href: "/projects",     label: "Projects" },
  { href: "/volunteer",    label: "Volunteers" },
  { href: "/heatmap",      label: "Heatmap" },
  { href: "/reports",      label: "Reports" },
];

const ROLE_LABEL = {
  admin:             "Admin",
  staff:             "Staff",
  "case officer":    "Case Officer",
  "legal personnel": "Legal Personnel",
  complainant:       "Complainant",
  user:              "User",
};

function getLinks(user) {
  if (!user) return PUBLIC_LINKS;
  switch (user.role?.toLowerCase()) {
    case "admin":            return ADMIN_LINKS;
    case "staff":            return STAFF_LINKS;
    case "case officer":     return CASE_OFFICER_LINKS;
    case "legal personnel":  return LEGAL_LINKS;
    case "complainant":
    case "user":             return COMPLAINANT_LINKS;
    default:                 return PUBLIC_LINKS;
  }
}

// ── Component ─────────────────────────────────────────────

export default function Navbar({ user = null, onLogout }) {  // ✅ accept onLogout
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const links    = getLinks(user);

  const isActive  = (href) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.navInner}>

        {/* Burger (mobile) */}
        <button
          className={styles.burgerBtn}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>

        {/* Logo */}
        <Link href="/" className={styles.navLogo} onClick={closeMenu}>
          <img src="/sasha-logo-white.png" alt="SASHA logo" />
        </Link>

        {/* Desktop links */}
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

        {/* Right: login or user menu */}
        <div className={styles.navRight}>
          {user
            ? <UserMenu user={user} onLogout={onLogout} />   // ✅ pass onLogout
            : <Link href="/login" className={styles.navLoginBtn}>Log In</Link>
          }
        </div>

      </div>

      {/* Mobile dropdown */}
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
              {/* ✅ button instead of Link — calls onLogout */}
              <button
                className={styles.mobileLogoutBtn}
                onClick={() => { closeMenu(); onLogout?.(); }}
              >
                Log Out
              </button>
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

// ── UserMenu (desktop dropdown) ───────────────────────────

function UserMenu({ user, onLogout }) {   // ✅ accept onLogout
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.userMenu}>
      <button
        className={styles.userAvatar}
        onClick={() => setOpen(!open)}
        aria-label="Account menu"
        aria-expanded={open}
      >
        <span>{user.firstName?.[0] ?? "U"}{user.lastName?.[0] ?? ""}</span>
      </button>

      {open && (
        <div className={styles.userDropdown}>
          <p className={styles.dropdownName}>{user.firstName} {user.lastName}</p>
          <p className={styles.dropdownRole}>{ROLE_LABEL[user.role?.toLowerCase()]}</p>
          <hr className={styles.dropdownDivider} />
          <Link href="/profile"  className={styles.dropdownItem} onClick={() => setOpen(false)}>My Profile</Link>
          <Link href="/settings" className={styles.dropdownItem} onClick={() => setOpen(false)}>Settings</Link>
          <hr className={styles.dropdownDivider} />
          {/* ✅ button instead of Link — calls onLogout */}
          <button
            className={`${styles.dropdownItem} ${styles.dropdownLogout}`}
            onClick={() => { setOpen(false); onLogout?.(); }}
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}