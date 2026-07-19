"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiCamera, FiUser, FiLock, FiHelpCircle, FiSliders, FiFlag, FiClock } from "react-icons/fi";
import { internalApiFetch } from "@/lib/internalApiFetch";
import { useAuth } from "@/lib/AuthContext";
import styles from "./profile.module.css";

import ProfileTab from "@/components/settings/ProfileTab";
import AccountPrivacyTab from "@/components/settings/AccountPrivacyTab";
import AvailabilityTab from "@/components/settings/AvailabilityTab";
import HelpCenterTab from "@/components/settings/HelpCenterTab";
import DisplayAccessibilityTab from "@/components/settings/DisplayAccessibilityTab";
import ReportProblemTab from "@/components/settings/ReportProblemTab";
import { getCurrentLanguage, translate } from "@/lib/i18n";

const LABELS = {
  settingsProfile: "Profile",
  settingsAccountPrivacy: "Account & Security",
  settingsAvailability: "Availability",
  settingsDisplayAccessibility: "Display & Accessibility",
  profileCompletion: "Profile Completion",
  addProfileFields: "Add",
  toCompleteProfile: "to complete your profile.",
  useProfilePhotoTitle: "Use this profile photo?",
  useProfilePhotoDesc: "This image will appear on your internal SAVIRA account.",
  chooseAnother: "Choose Another",
  saving: "Saving...",
  yesUsePhoto: "Yes, Use Photo",
  firstName: "First Name",
  middleName: "Middle Name",
  lastName: "Last Name",
  extensionName: "Extension Name",
  username: "Username",
  email: "Email",
  contactNumber: "Contact Number",
  city: "City",
  province: "Province",
  birthday: "Birthday",
  genderIdentity: "Gender Identity",
  optional: "Optional",
  none: "None",
  select: "Select",
  selectCity: "Select city",
  verified: "Verified",
  notVerifiedInbox: "Not verified",
  contactNumberHint: "Use a Philippine mobile number.",
  birthdayHint: "You must be at least 13 years old.",
  genderIdentityHint: "Optional demographic information.",
  usernameHint: "Used to identify your account.",
  personalInformation: "Personal Information",
  aboutYou: "About You",
  contactLocation: "Contact & Location",
  saveChanges: "Save Changes",
  profileUpdated: "Profile updated.",
  updateFailed: "Update failed.",
  firstNameRequired: "First name is required.",
  lastNameRequired: "Last name is required.",
  emailRequired: "Email is required.",
  minimumAgeRequirement: "Minimum Age Requirement",
  minimumAgeDesc: "The selected birthday does not meet the minimum age requirement.",
  minimumAgeDetail: "Choose another birthday to continue.",
  chooseAnotherBirthday: "Choose Another Birthday",
  completeRequiredProfile: "Complete Required Profile Fields",
  reviewHighlightedFields: "Review the highlighted fields before saving.",
  reviewFields: "Review Fields",
  emailAddress: "Email Address",
  verificationCode: "Verification Code",
  sendVerificationCode: "Send Verification Code",
  sendAgainIn: "Send again in",
  verifyEmail: "Verify Email",
  working: "Working...",
  password: "Password",
  currentPassword: "Current Password",
  newPassword: "New Password",
  confirmNewPassword: "Confirm New Password",
  changePassword: "Change Password",
  changePasswordDesc: "Update your internal account password.",
  updatePassword: "Update Password",
  updating: "Updating...",
  notifications: "Notifications",
  notificationPreferences: "Notification Preferences",
  notificationPreferencesDesc: "Local notification preferences for your internal account.",
  generalEmailUpdates: "General email updates",
  generalEmailUpdatesDesc: "Receive operational email updates.",
  caseStatusNotifications: "Case status notifications",
  caseStatusNotificationsDesc: "Receive updates related to assigned case work.",
  eventReminders: "Event reminders",
  eventRemindersDesc: "Receive reminders for internal events and activities.",
  volunteerOpportunities: "Volunteer updates",
  volunteerOpportunitiesDesc: "Receive volunteer program updates.",
  notificationPrefsSaved: "Notification preferences saved.",
  savePreferences: "Save Preferences",
  preferencesSaved: "Preferences saved.",
  textReadability: "Text Readability",
  fontSize: "Font Size",
  small: "Small",
  default: "Default",
  large: "Large",
  extraLarge: "Extra Large",
  accessibility: "Accessibility",
  reduceMotion: "Reduce motion",
  reduceMotionDesc: "Reduce animations and motion-heavy effects.",
  highContrast: "High contrast",
  highContrastDesc: "Increase contrast for easier scanning.",
  extendedLabels: "Extended labels",
  extendedLabelsDesc: "Show more descriptive labels where supported.",
};

const PROFILE_FIELD_LABELS = {
  first_name: "First Name",
  last_name: "Last Name",
  user_name: "Username",
  email: "Email",
  contact_number: "Contact Number",
  city: "City",
  province: "Province",
  birthday: "Birthday",
};

const TABS = [
  { id: "profile", labelKey: "settingsProfile", icon: FiUser },
  { id: "lock", labelKey: "settingsAccountPrivacy", icon: FiLock },
  { id: "availability", labelKey: "settingsAvailability", icon: FiClock },
  { id: "help", labelKey: "settingsHelpCenter", icon: FiHelpCircle },
  { id: "display", labelKey: "settingsDisplayAccessibility", icon: FiSliders },
  { id: "report", labelKey: "settingsReportProblem", icon: FiFlag },
];

function getCompletionFields(user) {
  return [
    { key: "first_name", optional: false },
    { key: "middle_name", optional: true },
    { key: "last_name", optional: false },
    { key: "extension_name", optional: true },
    { key: "user_name", optional: false },
    { key: "email", optional: false },
    { key: "contact_number", optional: false },
    { key: "city", optional: false },
    { key: "province", optional: false },
    { key: "profile_img", optional: true },
    { key: "birthday", optional: false },
    { key: "gender_identity", optional: true },
  ].map((f) => ({ ...f, filled: !!String(user?.[f.key] || "").trim() }));
}

function calcCompletion(user) {
  const required = getCompletionFields(user).filter((f) => !f.optional);
  const filled = required.filter((f) => f.filled).length;
  return required.length ? Math.round((filled / required.length) * 100) : 0;
}

function SettingsPageContent() {
  const { user, setUser, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileRef = useRef(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [language, setLanguage] = useState(() => getCurrentLanguage());
  const t = (key) => translate(language, key);
  const requestedTab = searchParams.get("tab");
  const activeTab = TABS.some((tab) => tab.id === requestedTab) ? requestedTab : "profile";

  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    extension_name: "",
    user_name: "",
    email: "",
    contact_number: "",
    city: "",
    province: "",
    profile_img: "",
    birthday: "",
    gender_identity: "",
  });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    const timer = window.setTimeout(() => {
      setForm({
        first_name: user.first_name || "",
        middle_name: user.middle_name || "",
        last_name: user.last_name || "",
        extension_name: user.extension_name || "",
        user_name: user.user_name || "",
        email: user.email || "",
        contact_number: user.contact_number || "",
        city: user.city || "",
        province: user.province || "National Capital Region (NCR)",
        profile_img: user.profile_img || "",
        birthday: user.birthday || "",
        gender_identity: user.gender_identity || "",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loading, user, router]);

  const completion = calcCompletion(form);
  const missingFields = getCompletionFields(form).filter((f) => !f.filled && !f.optional);
  const initials = `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase() || "?";

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
    setPendingAvatarFile(file);
    setPendingAvatarPreview(URL.createObjectURL(file));
    setAvatarError("");
  };

  const cancelAvatarUpload = () => {
    if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
    setPendingAvatarFile(null);
    setPendingAvatarPreview("");
    setAvatarError("");
  };

  const confirmAvatarUpload = async () => {
    if (!pendingAvatarFile) return;
    const formData = new FormData();
    formData.append("profile_img", pendingAvatarFile);
    setAvatarUploading(true);
    setAvatarError("");
    try {
      const res = await internalApiFetch(`/api/users/${user.user_id}/avatar`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      setForm((current) => ({ ...current, profile_img: data.profile_img }));
      if (setUser) setUser(data.user);
      cancelAvatarUpload();
    } catch (error) {
      setAvatarError(error.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleTabChange = (id) => {
    router.replace(`/settings?tab=${id}`, { scroll: false });
  };

  if (loading || !user) return null;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <div className={styles.avatarWrap}>
            {form.profile_img ? (
              <img src={form.profile_img} alt="Profile" className={styles.avatar} />
            ) : (
              <div className={styles.avatarInitials}>{initials}</div>
            )}
            <button type="button" className={styles.avatarEdit} onClick={() => fileRef.current?.click()} title="Change photo">
              <FiCamera size={14} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImageSelect} />
          </div>

          <div className={styles.heroMeta}>
            <h1 className={styles.heroName}>{[user.first_name, user.last_name].filter(Boolean).join(" ")}</h1>
            <p className={styles.heroSub}>{user.email}</p>
            {user.role_name && <span className={styles.roleBadge}>{user.role_name}</span>}
          </div>

          <div className={styles.completionCard}>
            <div className={styles.completionHeader}>
              <span>{t("profileCompletion")}</span>
              <strong>{completion}%</strong>
            </div>
            <div className={styles.completionBar}>
              <div className={styles.completionFill} style={{ width: `${completion}%` }} />
            </div>
            {missingFields.length > 0 && (
              <p className={styles.completionHint}>
                {t("addProfileFields")} {missingFields.map((f) => t(`profileField.${f.key}`)).join(", ")} {t("toCompleteProfile")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.tabs}>
          {TABS.map(({ id, labelKey, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`${styles.tab} ${activeTab === id ? styles.tabActive : ""}`}
              onClick={() => handleTabChange(id)}
            >
              <Icon size={15} />
              {t(labelKey)}
            </button>
          ))}
        </div>

        {activeTab === "profile" && (
          <ProfileTab user={user} setUser={setUser} form={form} setForm={setForm} t={t} />
        )}
        {activeTab === "lock" && (
          <AccountPrivacyTab user={user} setUser={setUser} t={t} />
        )}
        {activeTab === "availability" && (
          <AvailabilityTab user={user} setUser={setUser} t={t} />
        )}
        {activeTab === "help" && (
          <HelpCenterTab user={user} t={t} />
        )}
        {activeTab === "display" && (
          <DisplayAccessibilityTab onLanguageChange={setLanguage} />
        )}
        {activeTab === "report" && (
          <ReportProblemTab user={user} t={t} />
        )}
      </div>

      {pendingAvatarFile && (
        <div className={styles.confirmOverlay} role="presentation">
          <div className={styles.confirmDialog} role="dialog" aria-modal="true" aria-labelledby="avatar-confirm-title">
            <div className={styles.confirmPreviewWrap}>
              <img src={pendingAvatarPreview} alt="Selected profile preview" className={styles.confirmPreview} />
            </div>
            <div className={styles.confirmContent}>
              <h2 id="avatar-confirm-title">{t("useProfilePhotoTitle")}</h2>
              <p>{t("useProfilePhotoDesc")}</p>
              {avatarError && <p className={styles.confirmError}>{avatarError}</p>}
              <div className={styles.confirmActions}>
                <button type="button" className={styles.confirmSecondary} onClick={cancelAvatarUpload} disabled={avatarUploading}>
                  {t("chooseAnother")}
                </button>
                <button type="button" className={styles.confirmPrimary} onClick={confirmAvatarUpload} disabled={avatarUploading}>
                  {avatarUploading ? t("saving") : t("yesUsePhoto")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
