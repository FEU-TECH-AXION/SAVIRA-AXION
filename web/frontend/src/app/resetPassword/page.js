"use client";

import { useEffect, useState } from "react";
import styles from "./resetPassword.module.css";
import { IoIosArrowBack } from "react-icons/io";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      setReady(true); // token is valid, allow form submission
    }
  });

  return () => subscription.unsubscribe();
  }, []);

  const router = useRouter();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  if (form.password !== form.confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  if (form.password.length < 6) {
    alert("Password must be at least 6 characters.");
    return;
  }

  // ✅ Supabase uses the recovery token from the URL automatically
  const { error } = await supabase.auth.updateUser({ password: form.password });

  if (error) {
    alert(error.message);
    return;
  }

  setMessage("Password reset successful! Redirecting to login...");
  setTimeout(() => router.push('/login'), 2000); // redirect to login, not dashboard
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