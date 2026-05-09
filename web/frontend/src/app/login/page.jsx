"use client";

import { useState } from "react";
import styles from "./login.module.css";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useRouter } from 'next/navigation';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState([]); // 👈 added

  const router = useRouter();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const getError = (field) => errors.find((e) => e.path === field)?.msg; // 👈 added

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]); // 👈 clear previous errors

    const fieldErrors = [];
    if (!form.email.trim()) fieldErrors.push({ path: 'email', msg: 'Email is required' });
    if (!form.password) fieldErrors.push({ path: 'password', msg: 'Password is required' });
    if (!form.password) fieldErrors.push({ path: 'password', msg: 'Password is required' });
    if (fieldErrors.length) {
      setErrors(fieldErrors);
      return;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, password: form.password }),
    });

    const data = await res.json();

    if (!res.ok) {
      // 👇 replaced alert with setErrors
      if (data.errors) {
        setErrors(data.errors);
      } else {
        setErrors([{ path: 'general', msg: data.error || 'Login failed.' }]);
      }
      return;
    }

    localStorage.setItem('user', JSON.stringify(data.user));
    router.push('/dashboard');
  };

  return (
    <div className={styles.wrapper}>

      {/* ── Left: hero image + overlay*/}
      <div className={styles.left}>
        <img src="sasha-bg-1.png" alt="SASHA community" />
        <div className={styles.leftOverlay} />
      </div>

      {/* ── Right: login form ── */}
      <div className={styles.right}>
        <div className={styles.formBox}>
          <h1 className={styles.title}>Welcome Back!</h1>
          <p className={styles.loginLink}>
            Don't have an account yet?&nbsp;
            <a href="/signup">Sign Up</a>
          </p>

          <form onSubmit={handleSubmit} noValidate>

            {/* General error e.g. "Invalid email or password" */}
            {getError('general') && (
              <p style={{ color: 'red', fontSize: '13px', marginBottom: '8px' }}>
                {getError('general')}
              </p>
            )}

            {/* Email */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>E-mail</label>
              <input
                className={styles.input}
                type="email"
                name="email"
                placeholder="E-mail"
                value={form.email}
                onChange={handleChange}
              />
              {/* 👇 Error shown under email */}
              {getError('email') && (
                <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                  {getError('email')}
                </p>
              )}
            </div>

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
              {/* 👇 Error shown under password */}
              {getError('password') && (
                <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                  {getError('password')}
                </p>
              )}
            </div>

            {/* Remember device + Forgot Password */}
            <div className={styles.auxiliaryGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                Recognize this device for 30 days
              </label>
              <a href="/forgotPassword" className={styles.forgotPassword}>
                Forgot Password?
              </a>
            </div>

            {/* Submit */}
            <button type="submit" className={styles.btn}>
              Log In
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}