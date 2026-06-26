"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { FiCamera, FiUser, FiLock, FiHelpCircle, FiSliders, FiFlag } from "react-icons/fi";
import styles from "./profile.module.css";

import ProfileTab from "@/components/settings/ProfileTab";
import AccountPrivacyTab from "@/components/settings/AccountPrivacyTab";
import HelpCenterTab from "@/components/settings/HelpCenterTab";
import DisplayAccessibilityTab from "@/components/settings/DisplayAccessibilityTab";
import ReportProblemTab from "@/components/settings/ReportProblemTab";

// ── Tabs ─────────────────────────────────────────────────────
const TABS = [
  { id: "profile",  label: "Profile",                icon: FiUser },
  { id: "lock", label: "Account & Privacy",      icon: FiLock },
  { id: "help",     label: "Help Center",              icon: FiHelpCircle },
  { id: "display",  label: "Display & Accessibility", icon: FiSliders },
  { id: "report",   label: "Report a Problem",         icon: FiFlag },
];

// ── Completion helpers ────────────────────────────────────────
function getCompletionFields(user) {
  return [
    { key: "middle_name",     label: "Middle Name",     optional: true  },
    { key: "extension_name",  label: "Extension Name",  optional: true  },
    { key: "user_name",       label: "Username",        optional: false },
    { key: "contact_number",  label: "Contact Number",  optional: false },
    { key: "city",            label: "City",            optional: false },
    { key: "province",        label: "Province",        optional: false },
    { key: "profile_img",     label: "Profile Photo",   optional: true  },
    { key: "birthday",        label: "Birthday",        optional: true  },
    { key: "gender_identity", label: "Gender Identity",  optional: true  },
  ].map((f) => ({ ...f, filled: !!(user?.[f.key]) }));
}

function calcCompletion(user) {
  const required = getCompletionFields(user).filter((f) => !f.optional);
  const filled   = required.filter((f) => f.filled).length;
  const base  = 4; // first_name, last_name, email, password always filled after signup
  const total = base + required.length;
  const done  = base + filled;
  return Math.round((done / total) * 100);
}

function SettingsPageContent() {
  const { user, setUser, loading } = useAuth();
  const router  = useRouter();
  const searchParams = useSearchParams();
  const fileRef = useRef(null);
  const requestedTab = searchParams.get("tab");
  const activeTab = TABS.some((tab) => tab.id === requestedTab)
    ? requestedTab
    : "profile";

  // ── Profile form (lives here so the hero avatar can read profile_img too) ──
  const [form, setForm] = useState({
    first_name:      "",
    middle_name:     "",
    last_name:       "",
    extension_name:  "",
    user_name:       "",
    email:           "",
    contact_number:  "",
    city:            "",
    province:        "",
    profile_img:     "",
    birthday:        "",
    gender_identity: "",
  });

  // ── Fetch current user on mount ───────────────────────────
  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    setForm({
      first_name:      user.first_name      || "",
      middle_name:     user.middle_name     || "",
      last_name:       user.last_name       || "",
      extension_name:  user.extension_name  || "",
      user_name:       user.user_name       || "",
      email:           user.email           || "",
      contact_number:  user.contact_number  || "",
      city:            user.city            || "",
      province:        user.province        || "National Capital Region (NCR)",
      profile_img:     user.profile_img     || "",
      birthday:        user.birthday        || "",
      gender_identity: user.gender_identity || "",
    });
  }, [loading, user, router]);

  // ── Derived ───────────────────────────────────────────────
  const completion    = calcCompletion(user);
  const missingFields  = getCompletionFields(user).filter((f) => !f.filled && !f.optional);
  const initials = `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase() || "?";

  // ── Profile photo upload (lives in the hero, shared across all tabs) ──
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const formData = new FormData();
    formData.append("profile_img", file);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      const res   = await fetch(
        `${API_URL}/api/users/${user.user_id}/avatar`,
        { method: "POST", credentials: "include", body: formData }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      setForm((p) => ({ ...p, profile_img: data.profile_img }));
      if (setUser) setUser(data.user);
    } catch (err) {
      // Avatar upload errors surface locally; the hero has no flash banner
      // of its own, so this is intentionally quiet beyond a console trace.
      console.error(err);
    }
  };

  // Update the URL's ?tab= param without a full navigation/reload
  const handleTabChange = (id) => {
    router.replace(`/settings?tab=${id}`, { scroll: false });
  };

  if (loading) return null;
  if (!user) return null;

  return (
    <div className={styles.page}>

      {/* ── Hero strip ────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <div className={styles.avatarWrap}>
            {form.profile_img ? (
              <img src={form.profile_img} alt="Profile" className={styles.avatar} />
            ) : (
              <div className={styles.avatarInitials}>{initials}</div>
            )}
            <button
              type="button"
              className={styles.avatarEdit}
              onClick={() => fileRef.current?.click()}
              title="Change photo"
            >
              <FiCamera size={14} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageUpload}
            />
          </div>

          <div className={styles.heroMeta}>
            <h1 className={styles.heroName}>
              {[user.first_name, user.last_name].filter(Boolean).join(" ")}
            </h1>
            <p className={styles.heroSub}>{user.email}</p>
            {user.role_name && (
              <span className={styles.roleBadge}>{user.role_name}</span>
            )}
          </div>

          {/* ── Completion card ─────────────────────── */}
          <div className={styles.completionCard}>
            <div className={styles.completionHeader}>
              <span>Profile completion</span>
              <strong>{completion}%</strong>
            </div>
            <div className={styles.completionBar}>
              <div className={styles.completionFill} style={{ width: `${completion}%` }} />
            </div>
            {missingFields.length > 0 && (
              <p className={styles.completionHint}>
                Add your{" "}
                {missingFields.map((f) => f.label).join(", ")}{" "}
                to complete your profile.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────── */}
      <div className={styles.body}>

        {/* Tabs */}
        <div className={styles.tabs}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`${styles.tab} ${activeTab === id ? styles.tabActive : ""}`}
              onClick={() => handleTabChange(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "profile" && (
          <ProfileTab user={user} setUser={setUser} form={form} setForm={setForm} />
        )}
        {activeTab === "lock" && (
          <AccountPrivacyTab user={user} />
        )}
        {activeTab === "help" && (
          <HelpCenterTab user={user} />
        )}
        {activeTab === "display" && (
          <DisplayAccessibilityTab />
        )}
        {activeTab === "report" && (
          <ReportProblemTab user={user} />
        )}

      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageContent />
    </Suspense>
  );
}
