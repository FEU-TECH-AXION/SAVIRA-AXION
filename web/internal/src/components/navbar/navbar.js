"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiBell, FiHelpCircle, FiMenu, FiSearch, FiX } from "react-icons/fi";
import AvailabilityBadge from "@/components/availability/AvailabilityBadge";
import { useAuth } from "@/lib/AuthContext";
import { fetchAvailabilityFor, updateStaffAvailability } from "@/lib/api";
import Sidebar from "@/components/sidebar/sidebar";
import { ROLE_LABELS } from "@/components/navigation/navigationLinks";
import { formatNotificationTime, useNotificationStore } from "@/lib/notificationStore";
import { useI18n } from "@/lib/i18n";
import { isInternalRole } from "@/lib/roles";
import styles from "./navbar.module.css";

function getInitials(user) {
  return `${user?.first_name?.[0] || "U"}${user?.last_name?.[0] || ""}`.toUpperCase();
}

function getDisplayName(user) {
  const name = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  return name || user?.user_name || "Internal User";
}

function normalizeRoleKey(role) {
  const normalized = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "legal") return "legal_personnel";
  return normalized;
}

function prettifyRole(role) {
  return String(role || "Internal")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getRoleLabel(user, t) {
  const role = user?.role_name || user?.role || "Internal";
  const roleKey = normalizeRoleKey(role);
  const labelKey =
    ROLE_LABELS[roleKey] ||
    Object.values(ROLE_LABELS).find((key) => key.toLowerCase() === roleKey);

  return labelKey ? t(labelKey) : prettifyRole(role);
}

export default function Navbar() {
  const { t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const navbarRef = useRef(null);
  const notifRef = useRef(null);
  const availabilityRef = useRef(null);
  const { user, setUser, logout, loading } = useAuth();
  const pathname = usePathname();
  const { notifications, unreadCount, markAllRead, dismissNotification } = useNotificationStore({
    enabled: Boolean(user) && !loading,
  });

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

  useEffect(() => {
    if (!availabilityOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!availabilityRef.current?.contains(event.target)) {
        setAvailabilityOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setAvailabilityOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [availabilityOpen]);

  return (
    <>
      <nav className={styles.navbar} ref={navbarRef}>
        <div className={styles.navInner}>
          <button
            className={styles.hamburgerBtn}
            onClick={() => setSidebarOpen(true)}
            aria-label={t("navOpenSidebar")}
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
              placeholder={t("navSearchPlaceholder")}
              aria-label={t("navSearch")}
            />
          </div>

          <div className={styles.navRight}>
            {user && isInternalRole(user.role_name || user.role) && (
              <AvailabilityQuickToggle
                user={user}
                setUser={setUser}
                open={availabilityOpen}
                setOpen={setAvailabilityOpen}
                wrapperRef={availabilityRef}
              />
            )}

            <div className={styles.notifWrapper} ref={notifRef}>
              <button
                className={styles.iconBtn}
                aria-label={t("navNotifications")}
                aria-expanded={notifOpen}
                onClick={() => {
                  setNotifOpen((open) => !open);
                  markAllRead().catch((err) => {
                    console.error("[notifications] Failed to mark notifications read:", err.message);
                  });
                }}
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
                    notifications.map((notification) => {
                      const content = (
                        <>
                          <p className={styles.notifTitle}>{notification.title}</p>
                          <p className={styles.notifBody}>{notification.body}</p>
                          {notification.created_at && (
                            <p className={styles.notifTime}>
                              {formatNotificationTime(notification.created_at)}
                            </p>
                          )}
                        </>
                      );

                      return (
                        <div
                          key={notification.id}
                          className={`${styles.notifItem} ${!notification.read ? styles.notifItemUnread : ""} ${notification.link ? styles.notifItemLinked : ""}`}
                        >
                          <button
                            type="button"
                            className={styles.notifDismissBtn}
                            aria-label={t("navDismissNotification")}
                            onClick={(event) => {
                              event.stopPropagation();
                              dismissNotification(notification.id).catch((err) => {
                                console.error("[notifications] Failed to dismiss notification:", err.message);
                              });
                            }}
                          >
                            <FiX size={15} />
                          </button>
                          {notification.link ? (
                            <Link href={notification.link} className={styles.notifLink} onClick={() => setNotifOpen(false)}>
                              {content}
                            </Link>
                          ) : (
                            content
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <button className={`${styles.iconBtn} ${styles.helpBtn}`} aria-label={t("navHelp")}>
              <FiHelpCircle size={20} />
            </button>

            <UserMenu key={pathname} user={user} setUser={setUser} logout={logout} t={t} />
          </div>
        </div>
      </nav>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} pathname={pathname} />
    </>
  );
}

function AvailabilityQuickToggle({ user, setUser, open, setOpen, wrapperRef }) {
  const [status, setStatus] = useState(user?.availability_status || "Available");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      if (!user?.user_id) return;
      try {
        const data = await fetchAvailabilityFor(user.user_id);
        if (cancelled) return;
        const nextStatus = data.availability_status || "Available";
        setStatus(nextStatus);
        setUser?.((current) => current ? { ...current, availability_status: nextStatus } : current);
      } catch {
        if (!cancelled) setStatus(user?.availability_status || "Available");
      }
    }

    loadAvailability();
    return () => { cancelled = true; };
  }, [setUser, user?.availability_status, user?.user_id]);

  async function setQuickStatus(nextStatus) {
    setSaving(true);
    setError("");
    try {
      const updated = await updateStaffAvailability(user.user_id, {
        availability_status: nextStatus,
        availability_note: null,
      });
      const savedStatus = updated.availability_status || nextStatus;
      setStatus(savedStatus);
      setUser?.((current) => current ? { ...current, availability_status: savedStatus } : current);
      setOpen(false);
    } catch (err) {
      setError(err.message || "Unable to update availability.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.availabilityWrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.availabilityPill}
        aria-label="Update availability"
        aria-expanded={open}
        onClick={() => {
          setError("");
          setOpen((current) => !current);
        }}
      >
        <AvailabilityBadge status={status} compact />
      </button>

      {open && (
        <div className={styles.availabilityDropdown}>
          <div className={styles.availabilityHeader}>Availability</div>
          <div className={styles.availabilityCurrent}>
            Current <AvailabilityBadge status={status} compact />
          </div>
          {error && <p className={styles.availabilityError}>{error}</p>}
          <button
            type="button"
            className={styles.availabilityAction}
            disabled={saving || status === "Available"}
            onClick={() => setQuickStatus("Available")}
          >
            Set Available
          </button>
          <button
            type="button"
            className={styles.availabilityAction}
            disabled={saving || status === "Busy"}
            onClick={() => setQuickStatus("Busy")}
          >
            Set Busy
          </button>
          <Link
            href="/settings?tab=availability"
            className={styles.availabilityManage}
            onClick={() => setOpen(false)}
          >
            Manage availability
          </Link>
        </div>
      )}
    </div>
  );
}

function UserMenu({ user, setUser, logout, t }) {
  const [open, setOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const menuRef = useRef(null);
  const mobileAvailabilityRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
        setAvailabilityOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        setAvailabilityOpen(false);
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
        {user?.profile_img ? (
          <img src={user.profile_img} alt="" className={styles.userAvatarImage} />
        ) : (
          getInitials(user)
        )}
      </button>

      {open && (
        <div className={styles.userDropdown}>
          <p className={styles.dropdownName}>{getDisplayName(user)}</p>
          <p className={styles.dropdownRole}>{getRoleLabel(user, t)}</p>

          <div className={styles.mobileDropdownControls}>
            <div className={styles.dropdownSearchWrapper}>
              <FiSearch className={styles.dropdownSearchIcon} size={15} />
              <input
                type="text"
                className={styles.dropdownSearchInput}
                placeholder={t("navSearchPlaceholder")}
                aria-label={t("navSearch")}
              />
            </div>

            {user && isInternalRole(user.role_name || user.role) && (
              <AvailabilityQuickToggle
                user={user}
                setUser={setUser}
                open={availabilityOpen}
                setOpen={setAvailabilityOpen}
                wrapperRef={mobileAvailabilityRef}
              />
            )}
          </div>

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
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            {t("navLogOut")}
          </button>
        </div>
      )}
    </div>
  );
}
