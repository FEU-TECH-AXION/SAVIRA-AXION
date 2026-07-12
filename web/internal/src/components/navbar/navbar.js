"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiHelpCircle, FiMenu, FiSearch, FiX } from "react-icons/fi";
import { useAuth } from "@/lib/AuthContext";
import Sidebar from "@/components/sidebar/sidebar";
import { ROLE_LABELS } from "@/components/navigation/navigationLinks";
import styles from "./navbar.module.css";

function getInitials(user) {
  return `${user?.first_name?.[0] || "U"}${user?.last_name?.[0] || ""}`;
}

export default function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navbarRef = useRef(null);
  const menuRef = useRef(null);
  const { user, logout } = useAuth();
  const pathname = usePathname();

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
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      <nav className={styles.navbar} ref={navbarRef}>
        <div className={styles.navInner}>
          <button
            className={styles.hamburgerBtn}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
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
              placeholder="Search internal records"
              aria-label="Search"
            />
          </div>

          <div className={styles.navRight}>
            <button className={styles.iconBtn} aria-label="Help">
              <FiHelpCircle size={20} />
            </button>

            <div className={styles.userMenu} ref={menuRef}>
              <button
                className={styles.userAvatar}
                onClick={() => setMenuOpen((current) => !current)}
                aria-label="My profile"
                aria-expanded={menuOpen}
              >
                {user?.profile_img ? (
                  <img src={user.profile_img} alt="" className={styles.userAvatarImage} />
                ) : (
                  getInitials(user)
                )}
              </button>

              {menuOpen && (
                <div className={styles.userDropdown}>
                  <button
                    type="button"
                    className={styles.notifDismissBtn}
                    aria-label="Close menu"
                    onClick={() => setMenuOpen(false)}
                  >
                    <FiX size={15} />
                  </button>
                  <p className={styles.dropdownName}>
                    {user?.first_name || "Internal"} {user?.last_name || "User"}
                  </p>
                  <p className={styles.dropdownRole}>
                    {ROLE_LABELS[user?.role_name?.toLowerCase()] || user?.role_name || "Internal"}
                  </p>

                  <hr className={styles.dropdownDivider} />

                  <Link
                    href="/dashboard"
                    className={styles.dropdownItem}
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    className={`${styles.dropdownItem} ${styles.dropdownLogout}`}
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} pathname={pathname} />
    </>
  );
}
