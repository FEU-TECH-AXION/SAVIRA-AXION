"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaFacebook, FaInstagram} from "react-icons/fa6";
import styles from "./footer.module.css";
import { useAuth } from "@/lib/AuthContext";
import { getFooterQuickLinks } from "@/components/navigation/navigationLinks";

export default function Footer() {
  const { user } = useAuth();
  const quickLinks = getFooterQuickLinks(user);
  const pathname = usePathname();

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>

        {/* ── Brand column ── */}
        <div className={styles.footerBrand}>
          <img src="/sasha-logo-white.png" alt="SASHA" className={styles.footerLogo} />
          <p className={styles.footerBrandDesc}>
            This platform is designed for secure case reporting and organizational
            management. Unauthorized access, misuse, or reproduction of content is
            strictly prohibited.
          </p>
          <div className={styles.footerSocials}>
            <a href="https://www.facebook.com/PHsasha" aria-label="Facebook"><FaFacebook /></a>
            <a href="https://www.instagram.com/phsasha_official/?g=5" aria-label="Instagram"><FaInstagram /></a>
            {/* <a href="#" aria-label="YouTube"><FaYoutube /></a>
            <a href="#" aria-label="LinkedIn"><FaLinkedin /></a> */}
          </div>
        </div>

        {/* Quick links */}
        <div className={styles.footerCol}>
          <h4 className={styles.footerColTitle}>Quick Links</h4>
          <ul className={styles.footerList}>
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

        {/* ── Support column ── */}
        <div className={styles.footerCol}>
          <h4 className={styles.footerColTitle}>Support &amp; Information</h4>
          <ul className={styles.footerList}>
            <li><a href="#">Frequently Asked Questions</a></li>
            <li><a href="#">Code of Conduct</a></li>
            <li><a href="#">Data Privacy Policy</a></li>
            <li><a href="#">Terms of Use</a></li>
          </ul>
        </div>

      </div>

      <div className={styles.footerBottom}>
        <p>© {new Date().getFullYear()} Scouts Against Sexual Harassment and Abuse</p>
      </div>
    </footer>
  );
}
