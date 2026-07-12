"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaFacebook, FaInstagram } from "react-icons/fa6";
import { getFooterQuickLinks } from "@/components/navigation/navigationLinks";
import styles from "./footer.module.css";

export default function Footer() {
  const quickLinks = getFooterQuickLinks();
  const pathname = usePathname();

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <img src="/sasha-logo-white.png" alt="SASHA" className={styles.footerLogo} />
          <p className={styles.footerBrandDesc}>
            Internal operations portal for SAVIRA case, legal, project, volunteer, and reporting work.
          </p>
          <div className={styles.footerSocials}>
            <a href="https://www.facebook.com/PHsasha" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <FaFacebook />
            </a>
            <a href="https://www.instagram.com/phsasha_official/?g=5" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <FaInstagram />
            </a>
          </div>
        </div>

        <div className={styles.footerCol}>
          <h4 className={styles.footerColTitle}>Quick Links</h4>
          <ul className={`${styles.footerList} ${styles.quickLinksGrid}`}>
            {quickLinks.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={isActive(href) ? styles.footerLinkActive : styles.footerLink}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.footerCol}>
          <h4 className={styles.footerColTitle}>Internal Support</h4>
          <ul className={styles.footerList}>
            <li><Link href="/dashboard">Dashboard</Link></li>
            <li><Link href="/reportGenerator">Reports</Link></li>
            <li><Link href="/staffAvailability">Staff Availability</Link></li>
          </ul>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p>&copy; {new Date().getFullYear()} Scouts Against Sexual Harassment and Abuse</p>
      </div>
    </footer>
  );
}
