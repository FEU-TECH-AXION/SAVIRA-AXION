import { Suspense } from "react";
import LoginForm from "./LoginForm";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div>
          <p className={styles.kicker}>SAVIRA Internal</p>
          <h1>Sign in to operations</h1>
          <p className={styles.copy}>
            Access is limited to admins, case officers, legal personnel, and staff.
          </p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
