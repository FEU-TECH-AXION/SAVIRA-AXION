"use client";

import Link from "next/link";
import PolicyMarkdown from "@/components/policies/PolicyMarkdown";
import { POLICIES } from "@/components/policies/policyContent";
import styles from "./terms.module.css";
import { useI18n } from "@/lib/i18n";

export default function TermsPage() {
  const { t } = useI18n();
  const policy = POLICIES.terms;

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>{t("policyEyebrow")}</p>
          <h1>{t("terms")}</h1>
        </div>
      </div>

      <div className={`${styles.container} ${styles.layout}`}>
        <aside className={styles.aside}>
          <strong>{t("policyPolicies")}</strong>
          <Link className={styles.active} href="/terms">{t("terms")}</Link>
          <Link href="/privacy">{t("privacy")}</Link>
        </aside>

        <article className={styles.content}>
          <PolicyMarkdown markdown={policy.markdown} />
        </article>
      </div>
    </main>
  );
}
