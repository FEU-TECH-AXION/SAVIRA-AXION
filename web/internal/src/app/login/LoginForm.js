"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import styles from "./login.module.css";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const requestedNextPath = searchParams.get("next");
  const nextPath = requestedNextPath?.startsWith("/") && !requestedNextPath.startsWith("//")
    ? requestedNextPath
    : null;
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/internal-auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = Array.isArray(data.errors)
        ? data.errors.map((item) => item.msg).join(" ")
        : data.error || "Unable to sign in.";
      setError(message);
      setIsSubmitting(false);
      return;
    }

    window.location.assign(nextPath || data.redirectTo || "/admin");
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error ? <p className={styles.error}>{error}</p> : null}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
