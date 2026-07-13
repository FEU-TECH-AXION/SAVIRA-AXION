"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  MdAssessment,
  MdClose,
  MdDashboard,
  MdEvent,
  MdExpandLess,
  MdExpandMore,
  MdFolder,
  MdGavel,
  MdInterpreterMode,
  MdLogout,
  MdMap,
  MdPeople,
  MdContactSupport,
  MdSettings,
  MdVolunteerActivism,
  MdWork,
  MdWorkspacePremium,
} from "react-icons/md";
import { FaHandsHelping } from "react-icons/fa";
import { getSidebarLinks } from "@/components/navigation/navigationLinks";
import styles from "./sidebar.module.css";

const ICONS = {
  assessment: <MdAssessment />,
  calendar: <MdEvent />,
  contact: <MdContactSupport />,
  dashboard: <MdDashboard />,
  event: <MdEvent />,
  folder: <MdFolder />,
  gavel: <MdGavel />,
  handsHelping: <FaHandsHelping />,
  interpreter: <MdInterpreterMode />,
  map: <MdMap />,
  people: <MdPeople />,
  project: <MdWork />,
  projects: <MdWork />,
  ribbon: <MdWorkspacePremium />,
  settings: <MdSettings />,
  volunteer: <MdVolunteerActivism />,
};

function withIcons(items) {
  return items.map((item) => ({
    ...item,
    icon: item.icon ? ICONS[item.icon] : null,
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
        {item.icon && <span className={styles.sidebarIcon}>{item.icon}</span>}
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
        <li>
          <button
            className={`${styles.sidebarItem} ${styles.footerLogout}`}
            onClick={logout}
          >
            <span className={styles.sidebarIcon}>
              <MdLogout />
            </span>
            <span className={styles.sidebarLabel}>Log Out</span>
          </button>
        </li>
      </ul>
    </div>
  );
}

function SidebarHeader({ user, onClose }) {
  return (
    <div className={styles.sidebarHeader}>
      <div className={styles.userPill}>
        <div className={styles.userAvatar}>
          {user?.first_name?.[0] || "U"}
          {user?.last_name?.[0] || ""}
        </div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>
            {user?.first_name || "Internal"} {user?.last_name || "User"}
          </span>
          <span className={styles.userRole}>{user?.role_name || "Internal"}</span>
        </div>
      </div>
      <button className={styles.closeBtn} onClick={onClose} aria-label="Close sidebar">
        <MdClose size={20} />
      </button>
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
        aria-label="Internal navigation"
      >
        <SidebarHeader user={user} onClose={onClose} />

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
                      {item.icon && <span className={styles.sidebarIcon}>{item.icon}</span>}
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
