"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  MdDashboard,
  MdPeople,
  MdFolder,
  MdGavel,
  MdVolunteerActivism,
  MdMap,
  MdAssessment,
  MdInterpreterMode,
  MdExpandMore,
  MdExpandLess,
  MdClose,
  MdSettings,
  MdHelp,
  MdAccessibility,
  MdFlag,
  MdLogout,
} from "react-icons/md";
import styles from "./sidebar.module.css";

// ── Link definitions (mirrors navbar.js roles) ──────────────────────────────

const COMPLAINANT_LINKS = [
  { href: "/dashboard", label: "Home", icon: <MdDashboard /> },
  { href: "/cases", label: "Report", icon: <MdFolder /> },
  { href: "/volunteer", label: "Volunteer", icon: <MdVolunteerActivism /> },
  { href: "/events", label: "Events", icon: <MdInterpreterMode /> },
  { href: "/heatmap", label: "Heatmap", icon: <MdMap /> },
];

const CASE_OFFICER_LINKS = [
  { href: "/dashboard", label: "Home", icon: <MdDashboard /> },
  { href: "/cases", label: "Cases", icon: <MdFolder /> },
  { href: "/caseInterviews", label: "Interviews", icon: <MdInterpreterMode /> },
  { href: "/heatmap", label: "Heatmap", icon: <MdMap /> },
];

const STAFF_LINKS = [
  { href: "/dashboard", label: "Home", icon: <MdDashboard /> },
  { href: "/projects", label: "Projects", icon: <MdFolder /> },
  { href: "/volunteer", label: "Volunteers", icon: <MdVolunteerActivism /> },
  { href: "/heatmap", label: "Heatmap", icon: <MdMap /> },
];

const LEGAL_LINKS = [
  { href: "/dashboard", label: "Home", icon: <MdDashboard /> },
  { href: "/legalReviews", label: "Legal Review", icon: <MdGavel /> },
  { href: "/heatmap", label: "Heatmap", icon: <MdMap /> },
];

/**
 * ADMIN_LINKS with accordion sub-items.
 * Set `children` to add sub-nav links under a parent item.
 * Only ADMIN_LINKS uses accordion — add children to others manually later.
 */
const ADMIN_LINKS = [
  { href: "/dashboard", label: "Home", icon: <MdDashboard /> },
  {
    label: "Users",
    icon: <MdPeople />,
    children: [
      { href: "/users", label: "All Users" },
      { href: "/users/roles", label: "Roles & Permissions" },
    ],
  },
  {
    label: "Cases",
    icon: <MdFolder />,
    children: [
      { href: "/cases", label: "All Cases" },
      { href: "/caseInterviews", label: "Interviews" },
    ],
  },
  {
    label: "Legal",
    icon: <MdGavel />,
    children: [
      { href: "/legalReviews", label: "Legal Reviews" },
    ],
  },
  {
    label: "Projects",
    icon: <MdFolder />,
    children: [
      { href: "/projects", label: "All Projects" },
      { href: "/volunteer", label: "Volunteers" },
    ],
  },
  { href: "/heatmap", label: "Heatmap", icon: <MdMap /> },
  { href: "/reportGenerator", label: "Report Generator", icon: <MdAssessment /> },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getLinks(user) {
  if (!user) return [];
  switch (user.role_name?.toLowerCase()) {
    case "admin":           return ADMIN_LINKS;
    case "staff":           return STAFF_LINKS;
    case "case officer":    return CASE_OFFICER_LINKS;
    case "legal personnel": return LEGAL_LINKS;
    case "complainant":
    case "user":            return COMPLAINANT_LINKS;
    default:                return [];
  }
}

// ── AccordionItem ────────────────────────────────────────────────────────────

function AccordionItem({ item, pathname, onNavigate }) {
  const isAnyChildActive = item.children?.some((c) =>
    pathname.startsWith(c.href)
  );
  const [open, setOpen] = useState(isAnyChildActive);

  return (
    <li>
      <button
        className={`${styles.sidebarItem} ${styles.accordionToggle} ${
          isAnyChildActive ? styles.sidebarItemActive : ""
        }`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={styles.sidebarIcon}>{item.icon}</span>
        <span className={styles.sidebarLabel}>{item.label}</span>
        <span className={styles.accordionChevron}>
          {open ? <MdExpandLess /> : <MdExpandMore />}
        </span>
      </button>

      {open && (
        <ul className={styles.subNav}>
          {item.children.map((child) => (
            <li key={child.href}>
              <Link
                href={child.href}
                className={`${styles.subNavItem} ${
                  pathname.startsWith(child.href) ? styles.subNavItemActive : ""
                }`}
                onClick={onNavigate}
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// ── SidebarFooter ─────────────────────────────────────────────────────────────

const FOOTER_LINKS = [
  { href: "/settings", label: "Settings & privacy",      icon: <MdSettings /> },
  { href: "/help",     label: "Help & support",          icon: <MdHelp /> },
  { href: "/display",  label: "Display & accessibility", icon: <MdAccessibility /> },
  { href: "/report",   label: "Report a problem",        icon: <MdFlag /> },
];

function SidebarFooter({ logout }) {
  return (
    <div className={styles.sidebarFooter}>
      <hr className={styles.footerDivider} />

      <ul className={styles.navList}>
        {FOOTER_LINKS.map(({ href, label, icon }) => (
          <li key={href}>
            <Link href={href} className={styles.sidebarItem}>
              <span className={styles.sidebarIcon}>{icon}</span>
              <span className={styles.sidebarLabel}>{label}</span>
            </Link>
          </li>
        ))}

        <li>
          <button
            className={`${styles.sidebarItem} ${styles.footerLogout}`}
            onClick={logout}
          >
            <span className={styles.sidebarIcon}><MdLogout /></span>
            <span className={styles.sidebarLabel}>Log out</span>
          </button>
        </li>
      </ul>

      <div className={styles.footerPrivacy}>
        <Link href="/privacy">Privacy</Link>
        <span>·</span>
        <Link href="/terms">Terms</Link>
      </div>
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────────

/**
 * Sidebar component.
 *
 * Props:
 *  - isOpen   {boolean}  — controlled by Navbar's hamburger button
 *  - onClose  {function} — called when sidebar should close
 */
export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const sidebarRef = useRef(null);

  const links = getLinks(user);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Only render for logged-in users
  if (!user) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ""}`}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <aside
        ref={sidebarRef}
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}
        aria-label="Sidebar navigation"
      >
        {/* Header */}
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>Menu</span>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* User info pill */}
        <div className={styles.userPill}>
          <div className={styles.userAvatar}>
            {user.first_name?.[0] ?? "U"}
            {user.last_name?.[0] ?? ""}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>
              {user.first_name} {user.last_name}
            </span>
            <span className={styles.userRole}>{user.role_name}</span>
          </div>
        </div>

        <hr className={styles.divider} />

        {/* Nav links */}
        <nav>
          <ul className={styles.navList}>
            {links.map((item, i) =>
              item.children ? (
                <AccordionItem
                  key={i}
                  item={item}
                  pathname={pathname}
                  onNavigate={onClose}
                />
              ) : (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`${styles.sidebarItem} ${
                      (item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href))
                        ? styles.sidebarItemActive
                        : ""
                    }`}
                    onClick={onClose}
                  >
                    <span className={styles.sidebarIcon}>{item.icon}</span>
                    <span className={styles.sidebarLabel}>{item.label}</span>
                  </Link>
                </li>
              )
            )}
          </ul>
        </nav>

        {/* Footer — pinned to bottom, outside scroll */}
        <SidebarFooter logout={logout} />
      </aside>
    </>
  );
}