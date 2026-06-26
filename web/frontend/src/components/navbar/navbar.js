"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  FiMenu,
  FiBell,
  FiChevronDown,
  FiHelpCircle,
  FiSearch,
} from "react-icons/fi";
import Sidebar from "@/components/sidebar/sidebar";
import { PUBLIC_LINKS, ROLE_LABELS } from "@/components/navigation/navigationLinks";
import styles from "./navbar.module.css";
import { useNotificationStore, markAllRead } from '@/lib/notificationStore';

export default function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openPublicMenu, setOpenPublicMenu] = useState(null);
  const publicNavRef = useRef(null);
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const { notifications } = useNotificationStore();
  const unreadCount = notifications.filter(n => !n.read).length;
  const [notifOpen, setNotifOpen] = useState(false);

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!publicNavRef.current?.contains(event.target)) {
        setOpenPublicMenu(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenPublicMenu(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.navInner}>

          {loading ? (
            /* ── LOADING: neutral placeholder so nav doesn't flash wrong state ── */
            <div className={styles.navSpacer} />
          ) : user ? (
            /* ── LOGGED-IN layout ── */
            <>
              <button
                className={styles.hamburgerBtn}
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar menu"
                aria-expanded={sidebarOpen}
              >
                <FiMenu size={22} />
              </button>

              <Link href="/dashboard" className={styles.navLogo}>
                <img src="/sasha-logo-white.png" alt="SASHA logo" />
              </Link>

              <div className={styles.navSpacer} />

              <div className={styles.searchWrapper}>
                <FiSearch className={styles.searchIcon} size={15} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search…"
                  aria-label="Search"
                />
              </div>

              <div className={styles.navRight}>
                <div className={styles.notifWrapper}>
                  <button
                    className={styles.iconBtn}
                    aria-label="Notifications"
                    onClick={() => { setNotifOpen(o => !o); markAllRead(); }}
                  >
                    <FiBell size={20} />
                    {unreadCount > 0 && (
                      <span className={styles.notifBadge}>{unreadCount}</span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className={styles.notifDropdown}>
                      <div className={styles.notifHeader}>Notifications</div>
                      {notifications.length === 0 ? (
                        <div className={styles.notifEmpty}>No notifications yet</div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            className={`${styles.notifItem} ${!n.read ? styles.notifItemUnread : ''}`}
                          >
                            <p className={styles.notifTitle}>{n.title}</p>
                            <p className={styles.notifBody}>{n.body}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button className={styles.iconBtn} aria-label="Help">
                  <FiHelpCircle size={20} />
                </button>
                <UserMenu user={user} logout={logout} />
              </div>
            </>
          ) : (
            /* ── LOGGED-OUT layout ── */
            <>
              <button
                className={styles.publicMenuBtn}
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar menu"
                aria-expanded={sidebarOpen}
              >
                <FiMenu size={20} />
              </button>

              <Link href="/" className={styles.navLogo}>
                <img src="/sasha-logo-white.png" alt="SASHA logo" />
              </Link>

              <ul className={styles.navLinks} ref={publicNavRef}>
                {PUBLIC_LINKS.map((item) => {
                  const { href, label, children } = item;

                  if (children?.length) {
                    const isGroupActive = children.some((child) =>
                      isActive(child.href)
                    );
                    const isGroupOpen = openPublicMenu === label;
                    const menuId = `public-nav-${label
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")}`;

                    return (
                      <li
                        key={label}
                        className={`${styles.navGroup} ${
                          isGroupOpen ? styles.navGroupOpen : ""
                        }`}
                      >
                        <button
                          type="button"
                          className={
                            isGroupActive ? styles.navLinkActive : styles.navLink
                          }
                          aria-haspopup="true"
                          aria-expanded={isGroupOpen}
                          aria-controls={menuId}
                          onClick={() =>
                            setOpenPublicMenu((current) =>
                              current === label ? null : label
                            )
                          }
                        >
                          {label}
                          <FiChevronDown
                            className={styles.navGroupChevron}
                            aria-hidden="true"
                          />
                        </button>
                        <ul
                          id={menuId}
                          className={styles.navDropdown}
                          aria-hidden={!isGroupOpen}
                        >
                          {children.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={() => setOpenPublicMenu(null)}
                                className={
                                  isActive(child.href)
                                    ? styles.navDropdownLinkActive
                                    : styles.navDropdownLink
                                }
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  }

                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className={
                          isActive(href) ? styles.navLinkActive : styles.navLink
                        }
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className={styles.navRight}>
                <Link href="/login" className={styles.navLoginBtn}>
                  Log In
                </Link>
              </div>
            </>
          )}

        </div>
      </nav>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}

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
            {ROLE_LABELS[user.role_name?.toLowerCase()] ?? user.role_name}
          </p>

          <hr className={styles.dropdownDivider} />

          <Link
            href="/settings?tab=profile"
            className={styles.dropdownItem}
            onClick={() => setOpen(false)}
          >
            My Profile
          </Link>
          <Link
            href="/settings?tab=lock"
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