"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  FiMenu,
  FiBell,
  FiHelpCircle,
  FiSearch,
} from "react-icons/fi";
import Sidebar from "@/components/sidebar/sidebar";
import styles from "./navbar.module.css";

const PUBLIC_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Contact" },
  { href: "/volunteer", label: "Volunteer" },
  { href: "/heatmap", label: "Heatmap" },
];

// ── Component ──────────────────────────────────────────────

export default function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.navInner}>

          {user ? (
            /* ── LOGGED-IN layout: hamburger | logo | (spacer) | search | bell | help | avatar ── */
            <>
              {/* Hamburger */}
              <button
                className={styles.hamburgerBtn}
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar menu"
                aria-expanded={sidebarOpen}
              >
                <FiMenu size={22} />
              </button>

              {/* Logo */}
              <Link href="/dashboard" className={styles.navLogo}>
                <img src="/sasha-logo-white.png" alt="SASHA logo" />
              </Link>

              {/* Spacer pushes everything after it to the right */}
              <div className={styles.navSpacer} />

              {/* Search bar — right-aligned */}
              <div className={styles.searchWrapper}>
                <FiSearch className={styles.searchIcon} size={15} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search…"
                  aria-label="Search"
                />
              </div>

              {/* Right icons */}
              <div className={styles.navRight}>
                <button className={styles.iconBtn} aria-label="Notifications">
                  <FiBell size={20} />
                </button>
                <button className={styles.iconBtn} aria-label="Help">
                  <FiHelpCircle size={20} />
                </button>
                <UserMenu user={user} logout={logout} />
              </div>
            </>
          ) : (
            /* ── LOGGED-OUT layout: logo | public links | Log In (mirrors V1) ── */
            <>
              {/* Logo */}
              <Link href="/" className={styles.navLogo}>
                <img src="/sasha-logo-white.png" alt="SASHA logo" />
              </Link>

              {/* Desktop public links */}
              <ul className={styles.navLinks}>
                {PUBLIC_LINKS.map(({ href, label }) => (
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

              {/* Right slot */}
              <div className={styles.navRight}>
                <Link href="/login" className={styles.navLoginBtn}>
                  Log In
                </Link>
              </div>
            </>
          )}

        </div>
      </nav>

      {/* Sidebar — rendered outside nav so it overlays the full page */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}

// ── UserMenu ──────────────────────────────────────────────

const ROLE_LABEL = {
  admin: "Admin",
  staff: "Staff",
  case_officer: "Case Officer",
  legal_personnel: "Legal Personnel",
  complainant: "Complainant",
  user: "User",
};

function UserMenu({ user, logout }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.userMenu}>
      <button
        className={styles.userAvatar}
        onClick={() => setOpen(!open)}
        aria-label="Account menu"
        aria-expanded={open}
      >
        {user.first_name?.[0] ?? "U"}
        {user.last_name?.[0] ?? ""}
      </button>

      {open && (
        <div className={styles.userDropdown}>
          <p className={styles.dropdownName}>
            {user.first_name} {user.last_name}
          </p>
          <p className={styles.dropdownRole}>
            {ROLE_LABEL[user.role_name?.toLowerCase()] ?? user.role_name}
          </p>

          <hr className={styles.dropdownDivider} />

          <Link
            href="/profile"
            className={styles.dropdownItem}
            onClick={() => setOpen(false)}
          >
            My Profile
          </Link>
          <Link
            href="/profile?tab=security"
            className={styles.dropdownItem}
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>

          <hr className={styles.dropdownDivider} />

          <button
            className={`${styles.dropdownItem} ${styles.dropdownLogout}`}
            onClick={() => { setOpen(false); logout(); }}
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}