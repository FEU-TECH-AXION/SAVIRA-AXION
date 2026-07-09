"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaFacebook, FaInstagram} from "react-icons/fa6";
import styles from "./footer.module.css";
import { useAuth } from "@/lib/AuthContext";
import { getFooterQuickLinks } from "@/components/navigation/navigationLinks";
import { useI18n } from "@/lib/i18n";

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

        {/* ── Brand column ── */}
        <div className={styles.footerBrand}>
          <img src="/sasha-logo-white.png" alt="SASHA" className={styles.footerLogo} />
          <p className={styles.footerBrandDesc}>
            {t("footerBrandDesc")}
          </p>
          <div className={styles.footerSocials}>
            <a href="https://www.facebook.com/PHsasha" target="_blank"
    rel="noopener noreferrer" aria-label="Facebook"><FaFacebook /></a>
            <a href="https://www.instagram.com/phsasha_official/?g=5" target="_blank"
    rel="noopener noreferrer" aria-label="Instagram"><FaInstagram /></a>
            {/* <a href="#" aria-label="YouTube"><FaYoutube /></a>
            <a href="#" aria-label="LinkedIn"><FaLinkedin /></a> */}
          </div>
        </div>

        {/* Quick links */}
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

        {/* ── Support column ── */}
        <div className={styles.footerCol}>
          <h4 className={styles.footerColTitle}>{t("navSupportInformation")}</h4>
          <ul className={styles.footerList}>
            <li><a href="#">{t("navFaq")}</a></li>
            <li><a href="#">{t("navCodeOfConduct")}</a></li>
            <li><a href="#">{t("navDataPrivacyPolicy")}</a></li>
            <li><a href="#">{t("navTermsOfUse")}</a></li>
          </ul>
        </div>

      </div>

      <div className={styles.footerBottom}>
        <p>© {new Date().getFullYear()} Scouts Against Sexual Harassment and Abuse</p>
      </div>
    </footer>
  );
}
