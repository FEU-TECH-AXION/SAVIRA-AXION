"use client";

import Link from "next/link";
import PolicyMarkdown from "@/components/policies/PolicyMarkdown";
import { POLICIES } from "@/components/policies/policyContent";
import { POLICY_TRANSLATIONS_TL } from "@/components/policies/policyContentTl";
import styles from "./privacy.module.css";
import { useI18n } from "@/lib/i18n";

export default function PrivacyPage() {
  const { language, t } = useI18n();
  const policy = language === "tl" ? POLICY_TRANSLATIONS_TL.privacy : POLICIES.privacy;

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>{t("policyEyebrow")}</p>
          <h1>{t("privacy")}</h1>
        </div>
      </div>

      <div className={`${styles.container} ${styles.layout}`}>
        <aside className={styles.aside}>
          <strong>{t("policyPolicies")}</strong>
          <Link href="/terms">{t("terms")}</Link>
          <Link className={styles.active} href="/privacy">{t("privacy")}</Link>
        </aside>

        <article className={styles.content}>
          <PolicyMarkdown markdown={policy.markdown} />
        </article>
      </div>
    </main>
  );
}
