"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaFacebook, FaInstagram } from "react-icons/fa6";
import { getFooterQuickLinks } from "@/components/navigation/navigationLinks";
import { useAuth } from "@/lib/AuthContext";
import { useI18n } from "@/lib/i18n";
import styles from "./footer.module.css";

export default function Footer() {
  const { user } = useAuth();
  const { t } = useI18n();
  const quickLinks = getFooterQuickLinks(user);
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
          <h4 className={styles.footerColTitle}>{t("navQuickLinks")}</h4>
          <ul className={`${styles.footerList} ${styles.quickLinksGrid}`}>
            {quickLinks.map(({ href, label, labelKey }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={isActive(href) ? styles.footerLinkActive : styles.footerLink}
                >
                  {labelKey ? t(labelKey) : label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.footerCol}>
          <h4 className={styles.footerColTitle}>{t("navSupportInformation")}</h4>
          <ul className={styles.footerList}>
            <li><Link href="/dashboard">{t("navHome")}</Link></li>
            <li><Link href="/reportGenerator">{t("navReportsAnalysis")}</Link></li>
            <li><Link href="/staffAvailability">{t("navStaffAvailability")}</Link></li>
          </ul>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p>&copy; {new Date().getFullYear()} Scouts Against Sexual Harassment and Abuse</p>
      </div>
    </footer>
  );
}
