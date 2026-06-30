"use client";
import { useState } from "react";
import styles from "./forgotPassword.module.css";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter } from 'next/navigation';

export default function ForgotPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const sendResetEmail = async () => {
    setError("");
    setMessage("");

    const email = form.email.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!email || !emailValid) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { message: raw };
      }

      console.log("[forgot-password]", {
        status: res.status,
        ok: res.ok,
        body: data,
      });

      const responseMessage = data.message || data.error || "";
      const looksLikePostEmailServerError =
        res.status >= 500 && /something went wrong/i.test(responseMessage);

      if (!res.ok && !looksLikePostEmailServerError) {
        setError(responseMessage || "Something went wrong.");
      } else {
        setMessage("Email sent. Please check your inbox.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await sendResetEmail();
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.left}>
        <img src="sasha-bg-1.png" alt="SASHA community" />
        <div className={styles.leftOverlay} />
      </div>
      <div className={styles.right}>
        <div className={styles.formBox}>
          <h1 className={styles.title}>Forgot Password?</h1>
          <p className={styles.pgdescription}>
            Enter the email used for your account and we'll send you a <br />
            link to reset your password
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>E-mail</label>
              <input
                className={styles.input}
                type="email"
                name="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
              />
              {error && (
                <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                  {error}
                </p>
              )}
            </div>

            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? "Sending..." : "Send Email"}
            </button>

            {message && (
              <div className={styles.sentMessage}>
                <p>{message}</p>
                <p>
                  Didn't receive the email?{" "}
                  <button
                    type="button"
                    className={styles.resendBtn}
                    onClick={sendResetEmail}
                    disabled={loading}
                  >
                    {loading ? "Resending..." : "Resend reset link"}
                  </button>
                </p>
              </div>
            )}

            <div className={styles.auxiliaryGroup}>
              <a href="/login" className={styles.backtoLogin}>
                <IoIosArrowBack /> Back to Login
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
