"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { ConfirmDialog } from "@/components/ui/Dialog";
import styles from "../login/login.module.css";

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { setUser } = useAuth();
  const email = params.get("email") || "";
  const purpose = params.get("purpose") === "signup" ? "signup" : "login";
  const inputsRef = useRef([]);
  const [digits, setDigits] = useState(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setTimeout(() => {
      setResendCooldown((seconds) => Math.max(seconds - 1, 0));
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const setDigit = (index, value) => {
    const nextValue = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = nextValue;
    setDigits(next);
    if (nextValue && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length < 2) return;
    e.preventDefault();
    const next = Array(6).fill("");
    pasted.split("").forEach((digit, index) => {
      next[index] = digit;
    });
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, 6) - 1]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) {
      setModal({
        title: "Incomplete code",
        description: "Please enter the 6-digit verification code from your inbox.",
      });
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/auth/${purpose}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Verification code is wrong.");
      localStorage.setItem("token", data.token);
      if (setUser) setUser(data.user);
      router.push("/dashboard");
    } catch (err) {
      setDigits(Array(6).fill(""));
      inputsRef.current[0]?.focus();
      setModal({
        title: "Wrong verification code",
        description: err.message || "The verification code you entered is wrong. Please check the code and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verification/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, purpose }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const resendError = new Error(data.error || "Could not resend verification code.");
        resendError.retryAfter = data.retryAfter;
        throw resendError;
      }
      setDigits(Array(6).fill(""));
      setResendCooldown(60);
      setModal({
        title: "Code sent",
        description: "We sent a new verification code. Please check your inbox.",
      });
    } catch (err) {
      if (err.retryAfter) setResendCooldown(Number(err.retryAfter) || 60);
      setModal({
        title: "Could not resend code",
        description: err.message || "Please try again later.",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.left}>
        <img src="/sasha-bg-1.png" alt="SASHA community" />
        <div className={styles.leftOverlay} />
      </div>

      <div className={styles.right}>
        <div className={styles.formBox}>
          <h1 className={styles.title}>Verify your email</h1>
          <p className={styles.loginLink}>
            We sent a 6-digit code to <strong>{email}</strong>.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <p style={{ color: "red", fontSize: "13px", marginBottom: "12px" }}>
                {error}
              </p>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(42px, 54px))", justifyContent: "center", gap: "10px", marginBottom: "22px" }}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(node) => { inputsRef.current[index] = node; }}
                  className={styles.input}
                  value={digit}
                  inputMode="numeric"
                  maxLength={1}
                  onChange={(e) => setDigit(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  aria-label={`Verification digit ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "72px",
                    textAlign: "center",
                    fontSize: "1.45rem",
                    fontWeight: 800,
                    paddingInline: 0,
                    borderRadius: "12px",
                  }}
                />
              ))}
            </div>

            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? "Verifying..." : "Verify"}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              style={{
                width: "100%",
                marginTop: "14px",
                border: "none",
                background: "transparent",
                color: "#037F81",
                fontWeight: 800,
                cursor: resending || resendCooldown > 0 ? "not-allowed" : "pointer",
                opacity: resending || resendCooldown > 0 ? 0.65 : 1,
              }}
            >
              {resending
                ? "Sending new code..."
                : resendCooldown > 0
                ? `Resend available in ${resendCooldown}s`
                : "Didn't receive a code? Resend"}
            </button>
          </form>
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(modal)}
        title={modal?.title || ""}
        description={modal?.description || ""}
        confirmLabel="OK"
        hideCancel
        onConfirm={() => setModal(null)}
        onCancel={() => setModal(null)}
      />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
