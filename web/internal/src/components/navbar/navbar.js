"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiHelpCircle, FiMenu, FiSearch } from "react-icons/fi";
import { useAuth } from "@/lib/AuthContext";
import Sidebar from "@/components/sidebar/sidebar";
import { ROLE_LABELS } from "@/components/navigation/navigationLinks";
import styles from "./navbar.module.css";

function getInitials(user) {
  return `${user?.first_name?.[0] || "U"}${user?.last_name?.[0] || ""}`.toUpperCase();
}

function getDisplayName(user) {
  const name = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  return name || user?.user_name || "Internal User";
}

function getRoleLabel(user) {
  const role = user?.role_name || user?.role || "Internal";
  return ROLE_LABELS[role?.toLowerCase()] || role;
}

export default function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navbarRef = useRef(null);
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

            <UserMenu user={user} logout={logout} />
          </div>
        </div>
      </nav>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} pathname={pathname} />
    </>
  );
}

function UserMenu({ user, logout }) {
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
        aria-label="My profile"
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
          <p className={styles.dropdownRole}>{getRoleLabel(user)}</p>

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
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
