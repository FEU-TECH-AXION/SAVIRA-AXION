import Link from "next/link";
import PolicyMarkdown from "@/components/policies/PolicyMarkdown";
import { POLICIES } from "@/components/policies/policyContent";
import styles from "./privacy.module.css";

export const metadata = {
  title: "Privacy Policy | SASHA",
  description: "How SASHA collects, uses, stores, and protects personal information.",
};

export default function PrivacyPage() {
  const policy = POLICIES.privacy;

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>SASHA Policies</p>
          <h1>{policy.title}</h1>
        </div>
      </div>

      <div className={`${styles.container} ${styles.layout}`}>
        <aside className={styles.aside}>
          <strong>Policies</strong>
          <Link href="/terms">Terms and Conditions</Link>
          <Link className={styles.active} href="/privacy">Privacy Policy</Link>
        </aside>

        <article className={styles.content}>
          <PolicyMarkdown markdown={policy.markdown} />
        </article>
      </div>
    </main>
  );
}
