import { useState, useRef, useEffect } from "react";
import SideNav from '../../components/SideNav';
import HeaderAvatar from '../../components/HeaderAvatar';

import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

const TEAL = "#037F81";
const ORANGE = "#E96433";
const BORDER = "#e5e7eb";
const BG = "#f5f7f8";
const ERROR = "#dc2626";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";

// ── Wizard steps ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 0, label: "Applicant's\nInfo" },
  { id: 1, label: "Screening\nQuestions" },
  { id: 2, label: "Essay" },
  { id: 3, label: "Supporting\nCredentials" },
  { id: 4, label: "Review &\nSubmit" },
];



// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onBurger, notifCount = 0 }) {
  return (
    <View style={s.navbar}>
      <Pressable onPress={onBurger} style={{ padding: 4 }}>
        <Ionicons name="menu" size={26} color="#fff" />
      </Pressable>
      <View style={s.navRight}>
        <Feather name="search" size={20} color="#fff" />
        <View>
          <Ionicons name="notifications-outline" size={20} color="#fff" />
          {notifCount > 0 && (
            <View style={s.notifBadge}>
              <Text style={s.notifBadgeText}>{notifCount}</Text>
            </View>
          )}
        </View>
        <HeaderAvatar />
      </View>
    </View>
  );
}

// ── Wizard Stepper ────────────────────────────────────────────────────────────
function WizardStepper({ current }) {
  return (
    <View style={s.wizardRow}>
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={step.id} style={s.wizardItem}>
            {i > 0 && <View style={[s.wizardLine, done && s.wizardLineDone]} />}
            <View
              style={[
                s.wizardDot,
                active && s.wizardDotActive,
                done && s.wizardDotDone,
              ]}
            >
              {done ? (
                <Ionicons name="checkmark" size={12} color="#fff" />
              ) : (
                <Text style={s.wizardDotText}>{i + 1}</Text>
              )}
            </View>
            <Text
              style={[
                s.wizardLabel,
                active && s.wizardLabelActive,
                done && s.wizardLabelDone,
              ]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Shared Field ──────────────────────────────────────────────────────────────
function Field({ label, required, children, error, hint }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>
        {label}
        {required && <Text style={{ color: ERROR }}> *</Text>}
      </Text>
      {children}
      {hint && !error && <Text style={s.fieldHint}>{hint}</Text>}
      {error && <Text style={s.fieldError}>{error}</Text>}
    </View>
  );
}

function StyledInput({ error, multiline, numberOfLines, ...props }) {
  return (
    <TextInput
      style={[
        s.input,
        error && s.inputError,
        multiline && {
          height: (numberOfLines || 4) * 24 + 20,
          textAlignVertical: "top",
          paddingTop: 10,
        },
      ]}
      placeholderTextColor="#aaa"
      multiline={multiline}
      numberOfLines={numberOfLines}
      {...props}
    />
  );
}

function SelectBox({ value, placeholder, options, onSelect, error }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        style={[s.selectBox, error && s.inputError]}
        onPress={() => setOpen(!open)}
      >
        <Text style={[s.selectBoxText, value && { color: "#1a1a1a" }]}>
          {value || placeholder}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color="#aaa"
        />
      </Pressable>
      {open && (
        <View style={s.dropdown}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              style={s.dropdownItem}
              onPress={() => {
                onSelect(opt);
                setOpen(false);
              }}
            >
              <Text
                style={[
                  s.dropdownItemText,
                  value === opt && { color: TEAL, fontWeight: "700" },
                ]}
              >
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function RadioGroup({ name, options, value, onChange, error }) {
  return (
    <View
      style={[
        s.radioRow,
        error && {
          borderColor: ERROR,
          borderWidth: 1,
          borderRadius: 8,
          padding: 8,
        },
      ]}
    >
      {options.map((opt) => (
        <Pressable key={opt} style={s.radioItem} onPress={() => onChange(opt)}>
          <View style={[s.radioOuter, value === opt && s.radioOuterActive]}>
            {value === opt && <View style={s.radioInner} />}
          </View>
          <Text style={s.radioText}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Status Stepper ────────────────────────────────────────────────────────────
function StatusStepper({ steps, current }) {
  return (
    <View style={s.stepper}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={label} style={s.stepItem}>
            {i > 0 && (
              <View style={[s.stepLine, (done || active) && s.stepLineDone]} />
            )}
            <View
              style={[
                s.stepDot,
                done && s.stepDotDone,
                active && s.stepDotActive,
              ]}
            />
            <Text style={[s.stepLabel, active && s.stepLabelActive]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Application Status Card ───────────────────────────────────────────────────
function ApplicationStatusCard({ app, index, onView }) {
  const STATUS_STEP = {
    Pending: 0,
    "Under Review": 1,
    Approved: 2,
    Rejected: 2,
  };
  const currentStep = STATUS_STEP[app.status] ?? 0;
  return (
    <View style={s.statusCard}>
      <View style={s.statusCardHeader}>
        <Text style={s.statusCardHeaderText}>Application {index + 1}</Text>
        <Pressable style={s.statusViewBtn} onPress={onView}>
          <Text style={s.statusViewBtnText}>View →</Text>
        </Pressable>
      </View>
      <View style={s.statusCardBody}>
        <View style={s.statusMetaRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.statusMeta}>
              Applied:{" "}
              {new Date(app.created_at || Date.now()).toLocaleDateString(
                "en-PH",
                { year: "numeric", month: "long", day: "numeric" },
              )}
            </Text>
            <Text style={s.statusMeta}>Status: {app.status || "Pending"}</Text>
          </View>
          <Text style={s.statusId}>ID: {app.application_id || "—"}</Text>
        </View>
        <StatusStepper
          steps={["Submitted", "Under Review", "Resolved"]}
          current={currentStep}
        />
      </View>
    </View>
  );
}

// ── STEP 0: Applicant Info ────────────────────────────────────────────────────
function StepApplicantInfo({ data, onChange, errors }) {
  const set = (key) => (val) => onChange({ ...data, [key]: val });
  return (
    <View style={s.stepContainer}>
      <Text style={s.stepTitle}>
        <Text style={{ color: TEAL }}>Applicant's </Text>Information
      </Text>
      <Text style={s.stepDesc}>
        Please provide your personal details. All information is kept strictly
        confidential.
      </Text>

      <Field label="Name" required error={errors.name}>
        <StyledInput
          placeholder="Full name"
          value={data.name}
          onChangeText={set("name")}
          error={errors.name}
        />
      </Field>
      <Field label="Age" required error={errors.age}>
        <StyledInput
          placeholder="Age"
          value={data.age}
          onChangeText={set("age")}
          keyboardType="numeric"
          error={errors.age}
        />
      </Field>
      <Field label="Gender Identity" required error={errors.gender}>
        <SelectBox
          value={data.gender}
          placeholder="Select gender identity"
          options={["Male", "Female", "Non-binary", "Prefer not to say"]}
          onSelect={set("gender")}
          error={errors.gender}
        />
      </Field>
      <Field label="Organization" required error={errors.organization}>
        <SelectBox
          value={data.organization}
          placeholder="Select organization"
          options={["BSP", "GSP", "Other"]}
          onSelect={set("organization")}
          error={errors.organization}
        />
      </Field>

      <View style={s.divider} />
      <Text style={s.subSectionTitle}>Mode of Contact</Text>

      <Field label="Contact Number" required error={errors.contactNumber}>
        <StyledInput
          placeholder="09XX-XXX-XXXX"
          value={data.contactNumber}
          onChangeText={set("contactNumber")}
          keyboardType="phone-pad"
          error={errors.contactNumber}
        />
      </Field>
      <Field label="Email" required error={errors.email}>
        <StyledInput
          placeholder="sample@gmail.com"
          value={data.email}
          onChangeText={set("email")}
          keyboardType="email-address"
          error={errors.email}
        />
      </Field>

      <View style={s.divider} />
      <Text style={s.subSectionTitle}>Consent</Text>

      <Field
        label="Willingness to be interviewed by a SASHA Representative"
        required
        error={errors.interview}
      >
        <RadioGroup
          name="interview"
          options={["Yes", "No"]}
          value={data.interview}
          onChange={set("interview")}
          error={errors.interview}
        />
      </Field>
    </View>
  );
}

// ── STEP 1: Screening Questions ───────────────────────────────────────────────
function StepScreeningQuestions({ data, onChange, errors }) {
  const set = (key) => (val) => onChange({ ...data, [key]: val });
  const questions = [
    {
      key: "socialStance",
      label:
        "Do you actively follow and stay informed about current social and political affairs?",
    },
    {
      key: "shaKnowledge",
      label:
        "Are you familiar with SASHA's mission and concerns related to gender equality and harassment prevention?",
    },
    {
      key: "openToLearn",
      label:
        "Are you open to learning more about social advocacy and gender-related issues?",
    },
    {
      key: "enthusiasm",
      label:
        "Are you enthusiastic about actively contributing to the fight against gender-based discrimination and harassment?",
    },
    {
      key: "commitment",
      label:
        "Are you committed to dedicating time and effort as a SASHA volunteer?",
    },
  ];
  return (
    <View style={s.stepContainer}>
      <Text style={s.stepTitle}>
        <Text style={{ color: TEAL }}>Screening </Text>Questions
      </Text>
      <Text style={s.stepDesc}>
        Please answer the following questions truthfully and honestly.
      </Text>
      {questions.map((q) => (
        <Field key={q.key} label={q.label} required error={errors[q.key]}>
          <RadioGroup
            name={q.key}
            options={["Yes", "No"]}
            value={data[q.key]}
            onChange={set(q.key)}
            error={errors[q.key]}
          />
        </Field>
      ))}
    </View>
  );
}

// ── STEP 2: Essay ─────────────────────────────────────────────────────────────
function StepEssay({ data, onChange, errors }) {
  const set = (key) => (val) => onChange({ ...data, [key]: val });
  return (
    <View style={s.stepContainer}>
      <Text style={s.stepTitle}>
        <Text style={{ color: TEAL }}>Essay</Text>
      </Text>
      <Text style={s.stepDesc}>Please answer truthfully and honestly.</Text>
      <Field
        label="In a two to four paragraph essay, please tell us why do you want to join us and why you should be accepted?"
        required
        error={errors.description}
        hint="Please provide factual and clear information."
      >
        <StyledInput
          placeholder="Answer here..."
          value={data.description}
          onChangeText={set("description")}
          multiline
          numberOfLines={7}
          error={errors.description}
        />
      </Field>
    </View>
  );
}

// ── STEP 3: Supporting Credentials ───────────────────────────────────────────
function StepCredentials({ data, onChange }) {
  const pickFiles = async () => {
    Alert.alert(
      "Attach Credentials",
      "Choose where you want to select your documents or images from:",
      [
        {
          text: "🖼️ Photo Gallery",
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== "granted") {
                Alert.alert("Permission Denied", "We need permission to access your local gallery to attach credentials.");
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images', 'videos'],
                allowsMultipleSelection: true,
                quality: 1,
              });
              if (!result.canceled && result.assets) {
                const mappedAssets = result.assets.map((asset) => ({
                  name: asset.fileName || `gallery-item-${Date.now()}.${asset.uri.split(".").pop()}`,
                  size: asset.fileSize || 0,
                  uri: asset.uri,
                  mimeType: asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg"),
                }));
                onChange({ ...data, files: [...(data.files || []), ...mappedAssets] });
              }
            } catch (err) {
              Alert.alert("Error", "Could not pick images/videos from gallery.");
            }
          },
        },
        {
          text: "📄 Documents / Google Drive",
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: ["application/pdf", "image/jpeg", "image/png", "video/mp4"],
                multiple: true,
                copyToCacheDirectory: true,
              });
              if (!result.canceled && result.assets) {
                onChange({ ...data, files: [...(data.files || []), ...result.assets] });
              }
            } catch (e) {
              Alert.alert("Error", "Could not pick files.");
            }
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const removeFile = (idx) => {
    onChange({ ...data, files: data.files.filter((_, i) => i !== idx) });
  };

  return (
    <View style={s.stepContainer}>
      <Text style={s.stepTitle}>
        <Text style={{ color: TEAL }}>Supporting </Text>Credentials
      </Text>
      <Text style={s.stepDesc}>
        Please submit your Resume, Certificates, Recommendation letters, or any
        relevant files.
      </Text>

      <View style={s.credSection}>
        {/* Drop zone */}
        <Pressable style={s.dropZone} onPress={pickFiles}>
          <Ionicons
            name="cloud-upload-outline"
            size={32}
            color="rgba(255,255,255,0.9)"
          />
          <Text style={s.dropText}>Tap to upload files</Text>
          <View style={s.browseBtn}>
            <Text style={s.browseBtnText}>Browse</Text>
          </View>
          <Text style={s.dropHint}>Supported: PDF, JPG, PNG, MP4</Text>
        </Pressable>

        {/* File list */}
        <View style={s.fileList}>
          <Text style={s.fileListTitle}>Submitted Files</Text>
          {!data.files || data.files.length === 0 ? (
            <Text style={s.noFilesText}>No files uploaded yet.</Text>
          ) : (
            data.files.map((f, i) => (
              <View key={i} style={s.fileItem}>
                <Ionicons name="document-outline" size={14} color="#fff" />
                <Text style={s.fileName} numberOfLines={1}>
                  {f.name}
                </Text>
                <Pressable onPress={() => removeFile(i)}>
                  <Ionicons
                    name="close"
                    size={14}
                    color="rgba(255,255,255,0.7)"
                  />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
}

// ── STEP 4: Review & Submit ───────────────────────────────────────────────────
function StepReview({ applicant, screening, essay, credentials }) {
  const Row = ({ label, value }) => (
    <View style={s.reviewRow}>
      <Text style={s.reviewLabel}>{label}</Text>
      <Text style={s.reviewValue}>
        {value || <Text style={s.reviewEmpty}>Not provided</Text>}
      </Text>
    </View>
  );
  return (
    <View style={s.stepContainer}>
      <Text style={s.stepTitle}>
        <Text style={{ color: TEAL }}>Review </Text>& Submit
      </Text>
      <Text style={s.stepDesc}>
        Please review all information before submitting.
      </Text>

      <View style={s.reviewSection}>
        <Text style={s.reviewSectionTitle}>Applicant's Information</Text>
        <Row label="Name" value={applicant.name} />
        <Row label="Age" value={applicant.age} />
        <Row label="Gender Identity" value={applicant.gender} />
        <Row label="Organization" value={applicant.organization} />
        <Row label="Contact Number" value={applicant.contactNumber} />
        <Row label="Email" value={applicant.email} />
        <Row label="Willing to be interviewed" value={applicant.interview} />
      </View>

      <View style={s.reviewSection}>
        <Text style={s.reviewSectionTitle}>Screening Questions</Text>
        <Row label="Social affairs awareness" value={screening.socialStance} />
        <Row label="SASHA mission knowledge" value={screening.shaKnowledge} />
        <Row label="Open to learn" value={screening.openToLearn} />
        <Row label="Enthusiasm" value={screening.enthusiasm} />
        <Row label="Commitment" value={screening.commitment} />
      </View>

      <View style={s.reviewSection}>
        <Text style={s.reviewSectionTitle}>Essay</Text>
        <Row label="Response" value={essay.description} />
      </View>

      <View style={s.reviewSection}>
        <Text style={s.reviewSectionTitle}>Supporting Credentials</Text>
        <Row
          label="Files attached"
          value={
            credentials.files?.length > 0
              ? credentials.files.map((f) => f.name).join(", ")
              : "None"
          }
        />
      </View>
    </View>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────
function validateStep0(data) {
  const e = {};
  if (!data.name) e.name = "Name is required.";
  if (!data.age) e.age = "Age is required.";
  if (!data.gender) e.gender = "Gender identity is required.";
  if (!data.organization) e.organization = "Organization is required.";
  if (!data.contactNumber) e.contactNumber = "Contact number is required.";
  if (!data.email) e.email = "Email is required.";
  if (!data.interview) e.interview = "Consent to interview is required.";
  return e;
}
function validateStep1(data) {
  const e = {};
  if (!data.socialStance) e.socialStance = "Required.";
  if (!data.shaKnowledge) e.shaKnowledge = "Required.";
  if (!data.openToLearn) e.openToLearn = "Required.";
  if (!data.enthusiasm) e.enthusiasm = "Required.";
  if (!data.commitment) e.commitment = "Required.";
  return e;
}
function validateStep2(data) {
  const e = {};
  if (!data.description || data.description.trim().length < 50)
    e.description = "Please write at least a short paragraph (50+ characters).";
  return e;
}

// ── Landing / Hero Screen ─────────────────────────────────────────────────────
function LandingScreen({
  onApply,
  applications,
  loadingApps,
  notifCount,
  onBurger,
}) {
  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
      {/* Hero */}
      <View style={s.hero}>
        <View style={s.heroLabel}>
          <View style={s.heroLabelLine} />
          <Text style={s.heroLabelText}>Join Our Team</Text>
        </View>
        <Text style={s.heroTitle}>
          <Text style={{ color: TEAL }}>Volunteer </Text>
          <Text style={{ color: ORANGE }}>to Help</Text>
        </Text>
        <Text style={s.heroDesc}>
          Make a difference in the fight against gender-based discrimination and
          harassment. Join SASHA as a volunteer and help protect your community.
        </Text>

        {/* Info cards */}
        <View style={s.infoCards}>
          {[
            {
              icon: "people-outline",
              title: "Community",
              desc: "Join a network of passionate advocates",
            },
            {
              icon: "shield-checkmark-outline",
              title: "Impact",
              desc: "Make real change in your community",
            },
            {
              icon: "school-outline",
              title: "Learning",
              desc: "Grow your skills in advocacy & support",
            },
          ].map((card) => (
            <View key={card.title} style={s.infoCard}>
              <Ionicons name={card.icon} size={24} color={TEAL} />
              <Text style={s.infoCardTitle}>{card.title}</Text>
              <Text style={s.infoCardDesc}>{card.desc}</Text>
            </View>
          ))}
        </View>

        <Pressable style={s.applyNowBtn} onPress={onApply}>
          <Text style={s.applyNowBtnText}>Apply Now →</Text>
        </Pressable>
      </View>

      {/* Application Status */}
      <View style={s.statusSection}>
        <Text style={s.statusSectionTitle}>Your Application Status</Text>
        {loadingApps ? (
          <ActivityIndicator color={TEAL} style={{ marginTop: 20 }} />
        ) : applications.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="document-outline" size={40} color="#ccc" />
            <Text style={s.emptyStateText}>No applications submitted yet.</Text>
          </View>
        ) : (
          applications.map((app, i) => (
            <ApplicationStatusCard
              key={app.application_id || i}
              app={app}
              index={i}
              onView={() => {}}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function VolunteerApplicationScreen() {
  const [navOpen, setNavOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);

  const [applicant, setApplicant] = useState({
    name: "",
    age: "",
    gender: "",
    organization: "",
    contactNumber: "",
    email: "",
    interview: "",
  });
  const [screening, setScreening] = useState({
    socialStance: "",
    shaKnowledge: "",
    openToLearn: "",
    enthusiasm: "",
    commitment: "",
  });
  const [essay, setEssay] = useState({ description: "" });
  const [credentials, setCredentials] = useState({ files: [] });

  const totalSteps = STEPS.length;

  const fetchApplications = async () => {
    try {
      const res = await fetch(`${API_URL}/api/volunteer/my-applications`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      const { data } = await res.json();
      setApplications(data || []);
    } catch {
      /* silent */
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Notification count = number of applications
  const notifCount = applications.length;

  const clearError = (key) =>
    setErrors((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });

  const handleNext = () => {
    let errs = {};
    if (step === 0) errs = validateStep0(applicant);
    if (step === 1) errs = validateStep1(screening);
    if (step === 2) errs = validateStep2(essay);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      // 1. Upload files to your Supabase storage bucket first, get the public URLs
      const uploadedUrls = [];
      if (credentials.files?.length > 0) {
        for (const file of credentials.files) {
          const url = await uploadFileToSupabaseBucket(file); // helper function
          uploadedUrls.push(url);
        }
      }

      // 2. Assemble the backend-friendly payload
      const payload = {
        // Maps to the columns of your 'volunteer_applicants' table
        name: applicant.name,
        age: parseInt(applicant.age),
        gender: applicant.gender,
        organization: applicant.organization,
        contact_number: applicant.contactNumber,
        email: applicant.email,
        is_willing_to_be_interviewed: applicant.interview === "Yes",
        // Screening questionnaire
        screening_social_stance: screening.socialStance === "Yes",
        screening_sha_knowledge: screening.shaKnowledge === "Yes",
        screening_open_to_learn: screening.openToLearn === "Yes",
        screening_enthusiasm: screening.enthusiasm === "Yes",
        screening_commitment: screening.commitment === "Yes",

        // Essay
        essay_description: essay.description,

        // File paths stored as JSON or string array
        supporting_documents: uploadedUrls,
        status: "Pending",
      };

      const userToken = await AsyncStorage.getItem("user_token");

      const res = await fetch(`${API_URL}/api/volunteer_applicants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Server error (${res.status})`);
      }

      setSubmitted(true);
      fetchApplications();
    } catch (err) {
      setSubmitError(err.message || "Failed to submit application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartOver = () => {
    setSubmitted(false);
    setShowForm(false);
    setStep(0);
    setApplicant({
      name: "",
      age: "",
      gender: "",
      organization: "",
      contactNumber: "",
      email: "",
      interview: "",
    });
    setScreening({
      socialStance: "",
      shaKnowledge: "",
      openToLearn: "",
      enthusiasm: "",
      commitment: "",
    });
    setEssay({ description: "" });
    setCredentials({ files: [] });
  };

  return (
    <View style={s.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
      <Navbar onBurger={() => setNavOpen(true)} notifCount={notifCount} />

      {!showForm ? (
        <LandingScreen
          onApply={() => setShowForm(true)}
          applications={applications}
          loadingApps={loadingApps}
          notifCount={notifCount}
          onBurger={() => setNavOpen(true)}
        />
      ) : submitted ? (
        <ScrollView contentContainerStyle={s.successContainer}>
          <View style={s.successCard}>
            <View style={s.successIcon}>
              <Ionicons name="checkmark" size={36} color="#fff" />
            </View>
            <Text style={s.successTitle}>Application Submitted!</Text>
            <Text style={s.successDesc}>
              Your application has been received. We will review it and get back
              to you via your provided contact details. All information is
              handled with strict confidentiality.
            </Text>
            <Pressable style={s.submitBtn} onPress={handleStartOver}>
              <Text style={s.submitBtnText}>Back to Volunteer Page</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Form Card Header */}
          <View style={s.formCardHeader}>
            <Pressable
              onPress={() => {
                setShowForm(false);
                setStep(0);
              }}
              style={s.backToLanding}
            >
              <Ionicons name="arrow-back" size={18} color={TEAL} />
              <Text style={s.backToLandingText}>Back</Text>
            </Pressable>
            <Text style={s.formCardTitle}>Volunteer Application Form</Text>
          </View>

          {/* Wizard */}
          <WizardStepper current={step} />

          {/* Step content */}
          <ScrollView
            style={s.scroll}
            contentContainerStyle={[s.scrollContent, { paddingTop: 8 }]}
          >
            {step === 0 && (
              <StepApplicantInfo
                data={applicant}
                onChange={setApplicant}
                errors={errors}
              />
            )}
            {step === 1 && (
              <StepScreeningQuestions
                data={screening}
                onChange={setScreening}
                errors={errors}
              />
            )}
            {step === 2 && (
              <StepEssay data={essay} onChange={setEssay} errors={errors} />
            )}
            {step === 3 && (
              <StepCredentials data={credentials} onChange={setCredentials} />
            )}
            {step === 4 && (
              <StepReview
                applicant={applicant}
                screening={screening}
                essay={essay}
                credentials={credentials}
              />
            )}

            {submitError && (
              <View style={s.errorAlert}>
                <Ionicons name="alert-circle-outline" size={16} color={ERROR} />
                <Text style={s.errorAlertText}>{submitError}</Text>
              </View>
            )}
          </ScrollView>

          {/* Navigation */}
          <View style={s.formNav}>
            {step > 0 ? (
              <Pressable style={s.backBtn} onPress={handleBack}>
                <Text style={s.backBtnText}>← Back</Text>
              </Pressable>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            {step < totalSteps - 1 ? (
              <Pressable style={s.nextBtn} onPress={handleNext}>
                <Text style={s.nextBtnText}>Next →</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[s.submitBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.submitBtnText}>Submit Application</Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  // Navbar
  navbar: {
    backgroundColor: TEAL,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
  },
  navRight: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  notifBadge: {
    position: "absolute",
    top: -5,
    right: -6,
    backgroundColor: ORANGE,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  notifBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },

  // Hero / Landing
  hero: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
  },
  heroLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  heroLabelLine: {
    width: 24,
    height: 2,
    backgroundColor: ORANGE,
    borderRadius: 2,
  },
  heroLabelText: { fontSize: 13, color: "#6b7280", fontWeight: "600" },
  heroTitle: { fontSize: 28, fontWeight: "900", marginBottom: 12 },
  heroDesc: { fontSize: 13, color: "#555", lineHeight: 20, marginBottom: 20 },
  infoCards: { flexDirection: "row", gap: 8, marginBottom: 20 },
  infoCard: {
    flex: 1,
    backgroundColor: BG,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  infoCardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1a1a1a",
    textAlign: "center",
  },
  infoCardDesc: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 15,
  },
  applyNowBtn: {
    backgroundColor: TEAL,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  applyNowBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  // Wizard
  wizardRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  wizardItem: { flex: 1, alignItems: "center", position: "relative" },
  wizardLine: {
    position: "absolute",
    top: 12,
    right: "50%",
    left: "-50%",
    height: 2,
    backgroundColor: BORDER,
  },
  wizardLineDone: { backgroundColor: TEAL },
  wizardDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  wizardDotActive: { backgroundColor: ORANGE },
  wizardDotDone: { backgroundColor: TEAL },
  wizardDotText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  wizardLabel: {
    fontSize: 9,
    color: "#9ca3af",
    marginTop: 4,
    textAlign: "center",
    lineHeight: 12,
  },
  wizardLabelActive: { color: "#1a1a1a", fontWeight: "700" },
  wizardLabelDone: { color: TEAL },

  // Form Card header
  formCardHeader: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backToLanding: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  backToLandingText: { fontSize: 13, color: TEAL, fontWeight: "600" },
  formCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: TEAL,
    textAlign: "center",
  },

  // Step container
  stepContainer: { padding: 16, gap: 4 },
  stepTitle: { fontSize: 20, fontWeight: "900", marginBottom: 4 },
  stepDesc: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
    lineHeight: 18,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 8,
    marginTop: 4,
  },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },

  // Field
  field: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  fieldHint: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 3,
    fontStyle: "italic",
  },
  fieldError: { fontSize: 11, color: ERROR, marginTop: 3 },

  // Input
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: "#1a1a1a",
    backgroundColor: "#fafafa",
  },
  inputError: { borderColor: ERROR },

  // Select
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: "#fafafa",
  },
  selectBoxText: { fontSize: 13, color: "#aaa" },
  dropdown: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginTop: 2,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dropdownItemText: { fontSize: 13, color: "#1a1a1a" },

  // Radio
  radioRow: { flexDirection: "row", gap: 20 },
  radioItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#aaa",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: { borderColor: TEAL },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: TEAL },
  radioText: { fontSize: 14, color: "#1a1a1a" },

  // Credentials / File upload
  credSection: {
    backgroundColor: TEAL,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    gap: 10,
  },
  dropZone: {
    flex: 1,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    borderStyle: "dashed",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  dropText: { color: "#fff", fontSize: 12, textAlign: "center" },
  browseBtn: {
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 4,
  },
  browseBtnText: { color: TEAL, fontWeight: "700", fontSize: 12 },
  dropHint: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    textAlign: "center",
  },
  fileList: { flex: 1, gap: 6 },
  fileListTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 4,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 6,
    padding: 8,
  },
  fileName: { flex: 1, color: "#fff", fontSize: 11 },
  noFilesText: { color: "rgba(255,255,255,0.7)", fontSize: 12 },

  // Review
  reviewSection: {
    backgroundColor: BG,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  reviewSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: TEAL,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 6,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  reviewLabel: { fontSize: 12, color: "#6b7280", flex: 1 },
  reviewValue: {
    fontSize: 12,
    color: "#1a1a1a",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  reviewEmpty: { color: "#aaa", fontStyle: "italic" },

  // Navigation
  formNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    gap: 10,
  },
  backBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: TEAL,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  backBtnText: { color: TEAL, fontWeight: "700", fontSize: 14 },
  nextBtn: {
    flex: 1,
    backgroundColor: TEAL,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  submitBtn: {
    flex: 1,
    backgroundColor: ORANGE,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  // Error alert
  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorAlertText: { color: ERROR, fontSize: 13, flex: 1 },

  // Success
  successContainer: { flexGrow: 1, justifyContent: "center", padding: 24 },
  successCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1a1a1a",
    marginBottom: 12,
    textAlign: "center",
  },
  successDesc: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },

  // Status section
  statusSection: { marginHorizontal: 16, marginTop: 8, paddingBottom: 32 },
  statusSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    marginBottom: 12,
  },
  statusCardHeader: {
    backgroundColor: TEAL,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusCardHeaderText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  statusViewBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusViewBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  statusCardBody: { padding: 14 },
  statusMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statusMeta: { fontSize: 12, color: "#1a1a1a", marginBottom: 2 },
  statusId: { fontSize: 11, color: "#9ca3af" },

  // Stepper
  stepper: { flexDirection: "row", alignItems: "flex-start", marginTop: 12 },
  stepItem: { flex: 1, alignItems: "center", position: "relative" },
  stepLine: {
    position: "absolute",
    top: 10,
    right: "50%",
    left: "-50%",
    height: 2,
    backgroundColor: BORDER,
  },
  stepLineDone: { backgroundColor: TEAL },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BORDER,
    borderWidth: 2,
    borderColor: BORDER,
    zIndex: 1,
  },
  stepDotDone: { backgroundColor: TEAL, borderColor: TEAL },
  stepDotActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  stepLabel: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 4,
    textAlign: "center",
  },
  stepLabelActive: { color: "#1a1a1a", fontWeight: "700" },

  // Empty state
  emptyState: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyStateText: { fontSize: 14, color: "#aaa" },
});
