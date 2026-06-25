import Link from "next/link";
import PolicyMarkdown from "@/components/policies/PolicyMarkdown";
import { POLICIES } from "@/components/policies/policyContent";
import styles from "./terms.module.css";

export const metadata = {
  title: "Terms and Conditions | Savira",
  description: "Terms governing access to and use of the Savira platform.",
};

export default function TermsPage() {
  const policy = POLICIES.terms;

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>Savira Policies</p>
          <h1>{policy.title}</h1>
        </div>
      </div>

      <div className={`${styles.container} ${styles.layout}`}>
        <aside className={styles.aside}>
          <strong>Policies</strong>
          <Link className={styles.active} href="/terms">Terms and Conditions</Link>
          <Link href="/privacy">Privacy Policy</Link>
        </aside>

        <article className={styles.content}>
          <PolicyMarkdown markdown={policy.markdown} />
        </article>
      </div>
    </main>
  );
}
