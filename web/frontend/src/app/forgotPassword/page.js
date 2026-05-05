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

  const router = useRouter();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: form.email }),
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error);
    return;
  }
  // TODO: Replace localStorage with httpOnly cookie for security
  // Save user to localStorage so other pages can access it
  localStorage.setItem('user', JSON.stringify(data.user));
  router.push('/dashboard');
};

  return (
    <div className={styles.wrapper}>

      {/* ── Left: hero image + overlay*/}
      <div className={styles.left}>
        <img
          src="sasha-bg-1.png"
          alt="SASHA community"
        />
        <div className={styles.leftOverlay} />
      </div>

      {/* ── Right: sign-up form ── */}
      <div className={styles.right}>
        <div className={styles.formBox}>
          <h1 className={styles.title}>Forgot Password?</h1>
          <p className={styles.pgdescription}>
            Enter the email used for your account and we'll send you a <br />
            link to reset your password
          </p>

          <form onSubmit={handleSubmit} noValidate>

            {/* Email */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>E-mail</label>
              <input
                className={styles.input}
                type="email"
                name="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* Submit */}
            <button type="submit" className={styles.btn}>
              Send Email
            </button>

            {/* Terms checkbox */}
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