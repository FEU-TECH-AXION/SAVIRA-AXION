"use client";

import { useRouter } from "next/navigation";
import styles from "./LogoutButton.module.css";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/internal-auth/logout", {
      method: "POST",
      cache: "no-store",
    });

    if (typeof window !== "undefined") {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <button className={styles.button} type="button" onClick={logout}>
      Log out
    </button>
  );
}
