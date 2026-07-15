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
  FiX,
} from "react-icons/fi";
import Sidebar from "@/components/sidebar/sidebar";
import { PUBLIC_LINKS, ROLE_LABELS } from "@/components/navigation/navigationLinks";
import styles from "./navbar.module.css";
import { formatNotificationTime, useNotificationStore } from '@/lib/notificationStore';
import { useI18n } from "@/lib/i18n";

// ── Component ──────────────────────────────────────────────

function normalizeRoleKey(role) {
  const normalized = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "legal") return "legal_personnel";
  return normalized;
}

function prettifyRole(role) {
  return String(role || "User")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getRoleLabel(user, t) {
  const role = user?.role_name || user?.role || "user";
  const roleKey = normalizeRoleKey(role);
  const labelKey =
    ROLE_LABELS[roleKey] ||
    Object.values(ROLE_LABELS).find((key) => key.toLowerCase() === roleKey);

  return labelKey ? t(labelKey) : prettifyRole(role);
}

export default function Navbar() {
  const { t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openPublicMenu, setOpenPublicMenu] = useState(null);
  const navbarRef = useRef(null);
  const publicNavRef = useRef(null);
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const { notifications, unreadCount, markAllRead, dismissNotification } = useNotificationStore({ enabled: Boolean(user) && !loading });
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    const navbar = navbarRef.current;

    if (!navbar) return undefined;

    const updateNavbarHeight = () => {
      document.documentElement.style.setProperty(
        "--navbar-height",
        `${navbar.getBoundingClientRect().height}px`
      );
    };

    updateNavbarHeight();

    const resizeObserver = new ResizeObserver(updateNavbarHeight);
    resizeObserver.observe(navbar);
    window.addEventListener("resize", updateNavbarHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateNavbarHeight);
    };
  }, [user]);

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

  useEffect(() => {
    if (!notifOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!notifRef.current?.contains(event.target)) {
        setNotifOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setNotifOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notifOpen]);

  return (
    <>
      <nav className={styles.navbar} ref={navbarRef}>
        <div className={styles.navInner}>

          {user ? (
            /* ── LOGGED-IN layout: hamburger | logo | (spacer) | search | bell | help | avatar ── */
            <>
              {/* Hamburger */}
              <button
                className={styles.hamburgerBtn}
                onClick={() => setSidebarOpen(true)}
                aria-label={t("navOpenSidebar")}
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
                  placeholder={t("navSearchPlaceholder")}
                  aria-label={t("navSearch")}
                />
              </div>

              {/* Right icons */}
              <div className={styles.navRight}>
                <div className={styles.notifWrapper} ref={notifRef}>
                  <button
                    className={styles.iconBtn}
                    aria-label={t("navNotifications")}
                    aria-expanded={notifOpen}
                    onClick={() => { setNotifOpen(o => !o); markAllRead(); }}
                  >
                    <FiBell size={20} />
                    {unreadCount > 0 && (
                      <span className={styles.notifBadge}>{unreadCount}</span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className={styles.notifDropdown}>
                      <div className={styles.notifHeader}>{t("navNotifications")}</div>
                      {notifications.length === 0 ? (
                        <div className={styles.notifEmpty}>{t("navNoNotifications")}</div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            className={`${styles.notifItem} ${!n.read ? styles.notifItemUnread : ''}`}
                          >
                            <button
                              type="button"
                              className={styles.notifDismissBtn}
                              aria-label="Dismiss notification"
                              onClick={(event) => {
                                event.stopPropagation();
                                dismissNotification(n.id).catch((err) => {
                                  console.error('[notifications] Failed to dismiss notification:', err.message);
                                });
                              }}
                            >
                              <FiX size={15} />
                            </button>
                            <p className={styles.notifTitle}>{n.title}</p>
                            <p className={styles.notifBody}>{n.body}</p>
                            {n.created_at && (
                              <p className={styles.notifTime}>
                                {formatNotificationTime(n.created_at)}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button className={styles.iconBtn} aria-label={t("navHelp")}>
                  <FiHelpCircle size={20} />
                </button>
                <UserMenu key={pathname} user={user} logout={logout} t={t} />
              </div>
            </>
          ) : (
            /* ── LOGGED-OUT layout: logo | public links | Log In (mirrors V1) ── */
            <>
              {/* Logo */}
              <button
                className={styles.publicMenuBtn}
                onClick={() => setSidebarOpen(true)}
                aria-label={t("navOpenSidebar")}
                aria-expanded={sidebarOpen}
              >
                <FiMenu size={20} />
              </button>

              <Link href="/" className={styles.navLogo}>
                <img src="/sasha-logo-white.png" alt="SASHA logo" />
              </Link>

              {/* Desktop public links */}
              <ul className={styles.navLinks} ref={publicNavRef}>
                {PUBLIC_LINKS.map((item) => {
                  const { href, label, labelKey, children } = item;
                  const displayLabel = labelKey ? t(labelKey) : label;

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
                          {displayLabel}
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
                                {child.labelKey ? t(child.labelKey) : child.label}
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
                        {displayLabel}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* Right slot */}
              <div className={styles.navRight}>
                <Link href="/login" className={styles.navLoginBtn}>
                  {t("navLogIn")}
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

function UserMenu({ user, logout, t }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.userMenu} ref={menuRef}>
      <button
        className={styles.userAvatar}
        onClick={() => setOpen((current) => !current)}
        aria-label={t("navMyProfile")}
        aria-expanded={open}
      >
        {user.profile_img ? (
          <img src={user.profile_img} alt="" className={styles.userAvatarImage} />
        ) : (
          <>
            {user.first_name?.[0] ?? "U"}
            {user.last_name?.[0] ?? ""}
          </>
        )}
      </button>

      {open && (
        <div className={styles.userDropdown}>
          <p className={styles.dropdownName}>
            {user.first_name} {user.last_name}
          </p>
          <p className={styles.dropdownRole}>
            {getRoleLabel(user, t)}
          </p>

          <hr className={styles.dropdownDivider} />

          <Link
            href="/settings?tab=profile"
            className={styles.dropdownItem}
            onClick={() => setOpen(false)}
          >
            {t("navMyProfile")}
          </Link>
          <Link
            href="/settings?tab=lock"
            className={styles.dropdownItem}
            onClick={() => setOpen(false)}
          >
            {t("navSettings")}
          </Link>

          <hr className={styles.dropdownDivider} />

          <button
            className={`${styles.dropdownItem} ${styles.dropdownLogout}`}
            onClick={() => { setOpen(false); logout(); }}
          >
            {t("navLogOut")}
          </button>
        </div>
      )}
    </div>
  );
}
