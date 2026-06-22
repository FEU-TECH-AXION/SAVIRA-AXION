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

// ── Component ──────────────────────────────────────────────

export default function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openPublicMenu, setOpenPublicMenu] = useState(null);
  const publicNavRef = useRef(null);
  const { user, logout } = useAuth();
  const pathname = usePathname();

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

              {/* Desktop public links */}
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
            href="/settings?tab=security"
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
