"use client";

import { useState } from "react";
import styles from "./resetPassword.module.css";
import { IoIosArrowBack } from "react-icons/io";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useRouter } from 'next/navigation';

export default function ResetPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const router = useRouter();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: form.password }),
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
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.pgdescription}>
            Please kindly set your new password below
          </p>

          <form onSubmit={handleSubmit} noValidate>

            {/* Password */}
            <div className={styles.fieldGroupLg}>
              <label className={styles.label}>Password</label>
              <div className={styles.passwordWrap}>
                <input
                  className={styles.input}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <FiEye /> : <FiEyeOff />}
                </button>
              </div>
            </div>

            {/* Re-Enter Password */}
            <div className={styles.fieldGroupLg}>
              <label className={styles.label}>Confirm Password</label>
              <div className={styles.passwordWrap}>
                <input
                  className={styles.input}
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <FiEye /> : <FiEyeOff />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" className={styles.btn}>
              Reset Password
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