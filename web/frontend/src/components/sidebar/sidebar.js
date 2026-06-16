"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  MdAccessibility,
  MdAssessment,
  MdClose,
  MdDashboard,
  MdExpandLess,
  MdExpandMore,
  MdEvent,
  MdFlag,
  MdFolder,
  MdGavel,
  MdHelp,
  MdInterpreterMode,
  MdLogout,
  MdMap,
  MdPeople,
  MdSettings,
  MdVolunteerActivism,
  MdLocalHospital,
} from "react-icons/md";
import { RiPoliceBadgeFill } from "react-icons/ri";
import {
  getSidebarLinks,
  SIDEBAR_FOOTER_LINKS,
} from "@/components/navigation/navigationLinks";
import styles from "./sidebar.module.css";

const ICONS = {
  accessibility: <MdAccessibility />,
  assessment: <MdAssessment />,
  dashboard: <MdDashboard />,
  flag: <MdFlag />,
  folder: <MdFolder />,
  gavel: <MdGavel />,
  help: <MdHelp />,
  interpreter: <MdInterpreterMode />,
  map: <MdMap />,
  people: <MdPeople />,
  settings: <MdSettings />,
  volunteer: <MdVolunteerActivism />,
  hospital: <MdLocalHospital />,
  police: <RiPoliceBadgeFill />,
  event: <MdEvent />,
};

function withIcons(items) {
  return items.map((item) => ({
    ...item,
    icon: ICONS[item.icon],
  }));
}

function AccordionItem({ item, pathname, onNavigate }) {
  const isAnyChildActive = item.children?.some((child) => pathname === child.href);
  const [open, setOpen] = useState(isAnyChildActive);

  return (
    <li>
      <button
        className={`${styles.sidebarItem} ${styles.accordionToggle} ${
          isAnyChildActive ? styles.sidebarItemActive : ""
        }`}
        onClick={() => setOpen((value) => !value)}
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
                  pathname === child.href ? styles.subNavItemActive : ""
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

function SidebarFooter({ logout }) {
  return (
    <div className={styles.sidebarFooter}>
      <hr className={styles.footerDivider} />

      <ul className={styles.navList}>
        {withIcons(SIDEBAR_FOOTER_LINKS).map(({ href, label, icon }) => (
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
            <span className={styles.sidebarIcon}>
              <MdLogout />
            </span>
            <span className={styles.sidebarLabel}>Log out</span>
          </button>
        </li>
      </ul>

      <div className={styles.footerPrivacy}>
        <Link href="/privacy">Privacy</Link>
        <span>&middot;</span>
        <Link href="/terms">Terms</Link>
      </div>
    </div>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const sidebarRef = useRef(null);
  const links = withIcons(getSidebarLinks(user));

  useEffect(() => {
    function handleOutside(event) {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!user) return null;

  return (
    <>
      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ""}`}
        aria-hidden="true"
        onClick={onClose}
      />

      <aside
        ref={sidebarRef}
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}
        aria-label="Sidebar navigation"
      >
        <div className={styles.sidebarHeader}>
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
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close sidebar">
            <MdClose size={20} />
          </button>
        </div>

        <div className={styles.sidebarBody}>
          <hr className={styles.divider} />

          <nav>
            <ul className={styles.navList}>
              {links.map((item) =>
                item.children ? (
                  <AccordionItem
                    key={item.label}
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

          <SidebarFooter logout={logout} />
        </div>
      </aside>
    </>
  );
}
