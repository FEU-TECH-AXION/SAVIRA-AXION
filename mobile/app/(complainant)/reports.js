import { useState, useEffect } from "react";
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

const TEAL = "#037F81";
const ORANGE = "#E96433";
const BORDER = "#e5e7eb";
const BG = "#f5f7f8";
const ERROR = "#dc2626";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";

// ── NCR Cities ────────────────────────────────────────────────────────────────
const NCR_CITIES = [
  "Caloocan",
  "Las Piñas",
  "Makati",
  "Malabon",
  "Mandaluyong",
  "Manila",
  "Marikina",
  "Muntinlupa",
  "Navotas",
  "Parañaque",
  "Pasay",
  "Pasig",
  "Pateros",
  "Quezon City",
  "San Juan",
  "Taguig",
  "Valenzuela",
];

// ── Wizard steps ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 0, label: "Complainant's\nInfo" },
  { id: 1, label: "Incident\nDetails" },
  { id: 2, label: "Supporting\nEvidence" },
  { id: 3, label: "Review &\nSubmit" },
];

// ── Side Nav ──────────────────────────────────────────────────────────────────
function SideNav({ open, onClose }) {
  const router = useRouter();
  const links = [
    { label: "Home", href: "/(complainant)/dashboard", icon: "home-outline" },
    {
      label: "Report",
      href: "/(complainant)/reports",
      icon: "document-text-outline",
    },
    {
      label: "Volunteer",
      href: "/(complainant)/volunteer-application",
      icon: "people-outline",
    },
    {
      label: "About",
      href: "/(complainant)/about",
      icon: "information-circle-outline",
    },
    { label: "Contact", href: "/(complainant)/contact", icon: "call-outline" },
    {
      label: "Events",
      href: "/(complainant)/events",
      icon: "calendar-outline",
    },
  ];
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, flexDirection: "row" }}>
        <View style={nav.drawer}>
          <View style={nav.drawerHeader}>
            <Image
              source={require("../../assets/sasha-icon-teal.png")}
              style={nav.drawerLogo}
              resizeMode="contain"
            />
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>
          {links.map((l) => (
            <Pressable
              key={l.label}
              style={nav.drawerItem}
              onPress={() => {
                router.push(l.href);
                onClose();
              }}
            >
              <Ionicons name={l.icon} size={20} color={TEAL} />
              <Text style={nav.drawerItemText}>{l.label}</Text>
            </Pressable>
          ))}
          <Pressable
            style={nav.logoutBtn}
            onPress={() => {
              router.replace("/(auth)/login");
              onClose();
            }}
          >
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={nav.logoutText}>Log Out</Text>
          </Pressable>
        </View>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}
const nav = StyleSheet.create({
  drawer: {
    width: 260,
    backgroundColor: "#fff",
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 32,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  drawerLogo: { width: 100, height: 36 },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  drawerItemText: { fontSize: 15, color: "#1a1a1a", fontWeight: "600" },
  logoutBtn: {
    marginTop: 32,
    backgroundColor: ORANGE,
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

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
        <View style={s.avatar}>
          <Text style={s.avatarText}>U</Text>
        </View>
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

// ── Select with modal picker ──────────────────────────────────────────────────
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
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
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
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function RadioGroup({ options, value, onChange, error }) {
  return (
    <View style={[s.radioRow, error && s.radioRowError]}>
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

// ── Report Status Card ────────────────────────────────────────────────────────
function ReportStatusCard({ report, index, onView }) {
  const STATUS_STEP = { Pending: 0, "Under Review": 1, Resolved: 2 };
  const currentStep = STATUS_STEP[report.case_status?.status_name] ?? 0;
  return (
    <View style={s.statusCard}>
      <View style={s.statusCardHeader}>
        <Text style={s.statusCardHeaderText}>Report {index + 1}</Text>
        <Pressable style={s.statusViewBtn} onPress={onView}>
          <Text style={s.statusViewBtnText}>View →</Text>
        </Pressable>
      </View>
      <View style={s.statusCardBody}>
        <View style={s.statusMetaRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.statusMeta} numberOfLines={2}>
              Description: {report.incident_description || "—"}
            </Text>
            <Text style={s.statusMeta}>
              Location: {report.incident_city || "—"}
            </Text>
            <Text style={s.statusMeta}>
              Date:{" "}
              {report.incident_date
                ? new Date(report.incident_date).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"}
            </Text>
          </View>
          <Text style={s.statusId}>ID: {report.case_report_id || "—"}</Text>
        </View>
        <StatusStepper
          steps={["Submitted", "Under Review", "Resolved"]}
          current={currentStep}
        />
      </View>
    </View>
  );
}

// ── STEP 0: Complainant Info ──────────────────────────────────────────────────
function StepComplainantInfo({ data, onChange, errors }) {
  const set = (key) => (val) => onChange({ ...data, [key]: val });
  const isScoutOrg =
    data.organization === "Boy Scouts of the Philippines (BSP)" ||
    data.organization === "Girl Scouts of the Philippines (GSP)";
  const hasAffiliation =
    data.organizationType &&
    data.organizationType !== "No Organization / Independent";

  return (
    <View style={s.stepContainer}>
      <Text style={s.stepTitle}>
        <Text style={{ color: TEAL }}>Complainant's </Text>Information
      </Text>
      <Text style={s.stepDesc}>
        Please provide your personal details. All information is kept strictly
        confidential.
      </Text>

      <Field
        label="Name"
        hint="Optional — you may leave this blank if you prefer."
      >
        <StyledInput
          placeholder="Full name"
          value={data.name}
          onChangeText={set("name")}
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
      <Field
        label="Gender Identity"
        required
        hint="How do you identify? This helps us serve you better."
        error={errors.gender}
      >
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
          options={[
            "Boy Scouts of the Philippines (BSP)",
            "Girl Scouts of the Philippines (GSP)",
            "Others",
          ]}
          onSelect={set("organization")}
          error={errors.organization}
        />
      </Field>

      {/* BSP / GSP extra fields */}
      {isScoutOrg && (
        <>
          <View style={s.divider} />
          <Text style={s.subSectionTitle}>Scout Organization Details</Text>
          <Field
            label="Council"
            required
            hint="e.g. Manila Council, Rizal Council"
            error={errors.council}
          >
            <StyledInput
              placeholder="Enter your council"
              value={data.council || ""}
              onChangeText={set("council")}
              error={errors.council}
            />
          </Field>
          <Field label="Region">
            <StyledInput
              value="National Capital Region (NCR)"
              editable={false}
              style={s.inputReadonly}
            />
          </Field>
        </>
      )}

      {/* Others extra fields */}
      {data.organization === "Others" && (
        <>
          <View style={s.divider} />
          <Text style={s.subSectionTitle}>Affiliation Details</Text>
          <Field
            label="Organization Type"
            required
            error={errors.organizationType}
          >
            <SelectBox
              value={data.organizationType || ""}
              placeholder="Select organization type"
              options={[
                "No Organization / Independent",
                "School / University",
                "Workplace / Company",
                "Government Agency",
                "Non-Governmental Organization",
                "Community / Youth Organization",
                "Religious Organization",
                "Online Community / Platform",
                "Other",
              ]}
              onSelect={set("organizationType")}
              error={errors.organizationType}
            />
          </Field>

          {hasAffiliation && (
            <>
              <Field
                label="Organization Name"
                required
                hint="Enter the full name of your organization."
                error={errors.orgName}
              >
                <StyledInput
                  placeholder="Organization name"
                  value={data.orgName || ""}
                  onChangeText={set("orgName")}
                  error={errors.orgName}
                />
              </Field>
              <Text style={s.subSectionTitle}>Organization Location</Text>
              <Field
                label="City / Municipality"
                required
                error={errors.orgCity}
              >
                <SelectBox
                  value={data.orgCity || ""}
                  placeholder="Select city / municipality"
                  options={NCR_CITIES}
                  onSelect={set("orgCity")}
                  error={errors.orgCity}
                />
              </Field>
              <Field label="Region">
                <StyledInput
                  value="National Capital Region (NCR)"
                  editable={false}
                  style={s.inputReadonly}
                />
              </Field>
            </>
          )}

          <View style={s.divider} />
          <Text style={s.subSectionTitle}>Your Location</Text>
          <Field label="City / Municipality" required error={errors.userCity}>
            <SelectBox
              value={data.userCity || ""}
              placeholder="Select city / municipality"
              options={NCR_CITIES}
              onSelect={set("userCity")}
              error={errors.userCity}
            />
          </Field>
          <Field label="Region">
            <StyledInput
              value="National Capital Region (NCR)"
              editable={false}
              style={s.inputReadonly}
            />
          </Field>
        </>
      )}

      <View style={s.divider} />
      <Text style={s.subSectionTitle}>Mode of Contact</Text>
      <Field
        label="Contact Number"
        required
        hint="We will use this to reach you regarding your report."
        error={errors.contactNumber}
      >
        <StyledInput
          placeholder="+639XXXXXXXXX"
          value={data.contactNumber}
          onChangeText={set("contactNumber")}
          keyboardType="phone-pad"
          error={errors.contactNumber}
        />
      </Field>
      <Field
        label="Email"
        required
        hint="A confirmation and updates will be sent here."
        error={errors.email}
      >
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
        label="Willingness to be interviewed by a SASHA Representative and a SASHA paralegal and/or lawyer"
        required
        error={errors.interview}
      >
        <RadioGroup
          options={["Yes", "No"]}
          value={data.interview}
          onChange={set("interview")}
          error={errors.interview}
        />
      </Field>
    </View>
  );
}

// ── STEP 1: Incident Details ──────────────────────────────────────────────────
function StepIncidentDetails({ data, onChange, errors }) {
  const set = (key) => (val) => onChange({ ...data, [key]: val });
  const setTxt = (key) => (e) => onChange({ ...data, [key]: e });

  return (
    <View style={s.stepContainer}>
      <Text style={s.stepTitle}>
        <Text style={{ color: TEAL }}>Incident </Text>Details
      </Text>
      <Text style={s.stepDesc}>
        Provide as much detail as possible. Accurate information helps us assist
        you better.
      </Text>

      <Text style={s.subSectionTitle}>Date and Time of Incident</Text>
      <Field
        label="Date"
        required
        hint="When did the incident happen?"
        error={errors.date}
      >
        <StyledInput
          placeholder="MM/DD/YYYY"
          value={data.date}
          onChangeText={set("date")}
          error={errors.date}
        />
      </Field>
      <Field
        label="Time"
        hint="Approximate time is fine if exact time is unknown."
        error={errors.time}
      >
        <StyledInput
          placeholder="e.g. 3:00 PM"
          value={data.time}
          onChangeText={set("time")}
          error={errors.time}
        />
      </Field>

      <View style={s.divider} />
      <Text style={s.subSectionTitle}>Location of Incident</Text>
      <Field
        label="City / Municipality"
        required
        hint="Select the city where the incident occurred."
        error={errors.incidentCity}
      >
        <SelectBox
          value={data.incidentCity || ""}
          placeholder="Select city / municipality"
          options={NCR_CITIES}
          onSelect={set("incidentCity")}
          error={errors.incidentCity}
        />
      </Field>
      <Field
        label="Specific Place / Venue"
        hint="e.g. school campus, community center, online — do not include your home address."
      >
        <StyledInput
          placeholder="e.g. Barangay hall, online platform, school"
          value={data.incidentVenue || ""}
          onChangeText={set("incidentVenue")}
        />
      </Field>

      <View style={s.divider} />
      <Text style={s.subSectionTitle}>Description of Incident</Text>
      <Field
        label="What happened?"
        required
        hint="Describe the sequence of events clearly and factually."
        error={errors.description}
      >
        <StyledInput
          placeholder="Describe what happened, including relevant details such as individuals involved and the sequence of events."
          value={data.description}
          onChangeText={set("description")}
          multiline
          numberOfLines={6}
          error={errors.description}
        />
      </Field>
      <Field
        label="What action or outcome are you seeking?"
        hint="Optional — let us know what resolution or support you are looking for."
      >
        <StyledInput
          placeholder="e.g. legal action, mediation, counseling support..."
          value={data.outcome || ""}
          onChangeText={set("outcome")}
          multiline
          numberOfLines={3}
        />
      </Field>

      <View style={s.divider} />
      <Text style={s.subSectionTitle}>Perpetrator Information</Text>
      <Field
        label="Is the perpetrator known to you?"
        required
        error={errors.perpetratorKnown}
      >
        <RadioGroup
          options={["Yes", "No"]}
          value={data.perpetratorKnown}
          onChange={set("perpetratorKnown")}
          error={errors.perpetratorKnown}
        />
      </Field>

      {data.perpetratorKnown === "Yes" && (
        <>
          <Field
            label="Name of Perpetrator"
            required
            hint="Full name if known."
            error={errors.perpetratorName}
          >
            <StyledInput
              placeholder="Full name"
              value={data.perpetratorName || ""}
              onChangeText={set("perpetratorName")}
              error={errors.perpetratorName}
            />
          </Field>
          <Field
            label="Occupation of Perpetrator"
            hint="What does the perpetrator do for a living?"
          >
            <StyledInput
              placeholder="e.g. teacher, coach, relative, stranger"
              value={data.perpetratorOccupation || ""}
              onChangeText={set("perpetratorOccupation")}
            />
          </Field>
          <Field
            label="Relationship to Perpetrator"
            hint="How do you know this person?"
          >
            <StyledInput
              placeholder="e.g. classmate, supervisor, partner, unknown"
              value={data.perpetratorRelationship || ""}
              onChangeText={set("perpetratorRelationship")}
            />
          </Field>
          <Field
            label="Gender of Perpetrator"
            required
            error={errors.perpetratorGender}
          >
            <SelectBox
              value={data.perpetratorGender || ""}
              placeholder="Select gender identity"
              options={[
                "Male",
                "Female",
                "Non-binary",
                "Unknown / Prefer not to say",
              ]}
              onSelect={set("perpetratorGender")}
              error={errors.perpetratorGender}
            />
          </Field>
        </>
      )}

      <View style={s.divider} />
      <Text style={s.subSectionTitle}>Witnesses</Text>
      <Field label="Are there any witnesses?" required error={errors.witnesses}>
        <RadioGroup
          options={["Yes", "No"]}
          value={data.witnesses}
          onChange={set("witnesses")}
          error={errors.witnesses}
        />
      </Field>
      {data.witnesses === "Yes" && (
        <>
          <Field
            label="Name of Witness"
            required
            hint="Full name if known."
            error={errors.witnessName}
          >
            <StyledInput
              placeholder="Full name"
              value={data.witnessName || ""}
              onChangeText={set("witnessName")}
              error={errors.witnessName}
            />
          </Field>
          <Field
            label="Contact Information of Witness"
            hint="Phone number or email."
            error={errors.witnessContact}
          >
            <StyledInput
              placeholder="e.g. phone number, email"
              value={data.witnessContact || ""}
              onChangeText={set("witnessContact")}
              error={errors.witnessContact}
            />
          </Field>
          <Field
            label="Relationship to Witness"
            hint="How do you know this person?"
          >
            <StyledInput
              placeholder="e.g. classmate, supervisor, partner, unknown"
              value={data.witnessRelationship || ""}
              onChangeText={set("witnessRelationship")}
            />
          </Field>
        </>
      )}

      <View style={s.divider} />
      <Text style={s.subSectionTitle}>Prior Disclosure</Text>
      <Field
        label="Have you told anyone about the incident?"
        required
        error={errors.toldAnyone}
      >
        <RadioGroup
          options={["Yes", "No"]}
          value={data.toldAnyone}
          onChange={set("toldAnyone")}
          error={errors.toldAnyone}
        />
      </Field>
      {data.toldAnyone === "Yes" && (
        <Field
          label="Who did you tell?"
          hint="e.g. family member, friend, school counselor"
        >
          <StyledInput
            placeholder="e.g. mother, friend, guidance counselor"
            value={data.toldAnyoneWho || ""}
            onChangeText={set("toldAnyoneWho")}
          />
        </Field>
      )}
      <Field
        label="Have you told the police?"
        required
        error={errors.toldPolice}
      >
        <RadioGroup
          options={["Yes", "No"]}
          value={data.toldPolice}
          onChange={set("toldPolice")}
          error={errors.toldPolice}
        />
      </Field>
      {data.toldPolice === "Yes" && (
        <Field
          label="Which police station?"
          hint="e.g. Quezon City Police District, Station 5"
        >
          <StyledInput
            placeholder="e.g. QCPD Station 5"
            value={data.policeStation || ""}
            onChangeText={set("policeStation")}
          />
        </Field>
      )}
    </View>
  );
}

// ── STEP 2: Supporting Evidence ───────────────────────────────────────────────
function StepEvidence({ data, onChange }) {
  const pickFiles = async () => {
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
      Alert.alert("Error", "Could not pick file.");
    }
  };

  const removeFile = (idx) => {
    onChange({ ...data, files: data.files.filter((_, i) => i !== idx) });
  };

  return (
    <View style={s.stepContainer}>
      <Text style={s.stepTitle}>
        <Text style={{ color: TEAL }}>Supporting </Text>Evidence
      </Text>
      <Text style={s.stepDesc}>
        Attach any files, photos, or documents relevant to the incident
        (optional).
      </Text>

      <View style={s.credSection}>
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

// ── STEP 3: Review & Submit ───────────────────────────────────────────────────
function StepReview({ complainant, incident, evidence }) {
  const Row = ({ label, value }) => (
    <View style={s.reviewRow}>
      <Text style={s.reviewLabel}>{label}</Text>
      <Text style={s.reviewValue}>
        {value || <Text style={s.reviewEmpty}>Not provided</Text>}
      </Text>
    </View>
  );
  const orgAddress = [complainant.orgCity, "National Capital Region (NCR)"]
    .filter(Boolean)
    .join(", ");
  const userAddress = [complainant.userCity, "National Capital Region (NCR)"]
    .filter(Boolean)
    .join(", ");
  const incidentLocation = [
    incident.incidentVenue,
    incident.incidentCity,
    "NCR",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <View style={s.stepContainer}>
      <Text style={s.stepTitle}>
        <Text style={{ color: TEAL }}>Review </Text>& Submit
      </Text>
      <Text style={s.stepDesc}>
        Please review all information before submitting.
      </Text>

      <View style={s.reviewSection}>
        <Text style={s.reviewSectionTitle}>Complainant's Information</Text>
        <Row label="Name" value={complainant.name} />
        <Row label="Age" value={complainant.age} />
        <Row label="Gender Identity" value={complainant.gender} />
        <Row label="Organization" value={complainant.organization} />
        {complainant.organization === "Others" && (
          <>
            <Row label="Organization Name" value={complainant.orgName} />
            <Row
              label="Organization Type"
              value={complainant.organizationType}
            />
            <Row label="Organization Address" value={orgAddress} />
            <Row label="Your Location" value={userAddress} />
          </>
        )}
        <Row label="Willing to be interviewed" value={complainant.interview} />
        <Row label="Contact Number" value={complainant.contactNumber} />
        <Row label="Email" value={complainant.email} />
      </View>

      <View style={s.reviewSection}>
        <Text style={s.reviewSectionTitle}>Incident Details</Text>
        <Row label="Date" value={incident.date} />
        <Row label="Time" value={incident.time} />
        <Row label="Location" value={incidentLocation} />
        <Row label="Description" value={incident.description} />
        <Row label="Outcome sought" value={incident.outcome} />
        <Row label="Perpetrator known" value={incident.perpetratorKnown} />
        {incident.perpetratorKnown === "Yes" && (
          <>
            <Row label="Perpetrator name" value={incident.perpetratorName} />
            <Row
              label="Perpetrator occupation"
              value={incident.perpetratorOccupation}
            />
            <Row
              label="Relationship"
              value={incident.perpetratorRelationship}
            />
            <Row
              label="Perpetrator gender"
              value={incident.perpetratorGender}
            />
          </>
        )}
        <Row label="Witnesses" value={incident.witnesses} />
        {incident.witnesses === "Yes" && (
          <>
            <Row label="Witness name" value={incident.witnessName} />
            <Row label="Witness contact" value={incident.witnessContact} />
            <Row
              label="Relationship to witness"
              value={incident.witnessRelationship}
            />
          </>
        )}
        <Row label="Told anyone" value={incident.toldAnyone} />
        {incident.toldAnyone === "Yes" && (
          <Row label="Who was told" value={incident.toldAnyoneWho} />
        )}
        <Row label="Told police" value={incident.toldPolice} />
        {incident.toldPolice === "Yes" && (
          <Row label="Police station" value={incident.policeStation} />
        )}
      </View>

      <View style={s.reviewSection}>
        <Text style={s.reviewSectionTitle}>Supporting Evidence</Text>
        <Row
          label="Files attached"
          value={
            evidence.files?.length > 0
              ? evidence.files.map((f) => f.name).join(", ")
              : "None"
          }
        />
      </View>
    </View>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────
const PHONE_REGEX = /^(?:\+63|0)9\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateStep0(data) {
  const e = {};
  if (!data.age) e.age = "Age is required.";
  if (!data.gender) e.gender = "Gender identity is required.";
  if (!data.organization) e.organization = "Organization is required.";
  if (!data.contactNumber) {
    e.contactNumber = "Contact number is required.";
  } else if (!PHONE_REGEX.test(data.contactNumber)) {
    e.contactNumber = "Enter a valid Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX).";
  }
  if (!data.email) {
    e.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(data.email)) {
    e.email = "Enter a valid email address.";
  }
  if (!data.interview) e.interview = "Consent to interview is required.";
  const isScoutOrg =
    data.organization === "Boy Scouts of the Philippines (BSP)" ||
    data.organization === "Girl Scouts of the Philippines (GSP)";
  if (isScoutOrg && !data.council) e.council = "Council is required.";
  if (data.organization === "Others") {
    if (!data.organizationType)
      e.organizationType = "Organization type is required.";
    const hasAffiliation =
      data.organizationType &&
      data.organizationType !== "No Organization / Independent";
    if (hasAffiliation) {
      if (!data.orgName) e.orgName = "Organization name is required.";
      if (!data.orgCity) e.orgCity = "Organization city is required.";
    }
    if (!data.userCity) e.userCity = "Your city/municipality is required.";
  }
  return e;
}

function validateStep1(data) {
  const e = {};
  if (!data.date) e.date = "Date is required.";
  if (!data.time) e.time = "Time is required.";
  if (!data.incidentCity) e.incidentCity = "Incident city is required.";
  if (!data.description) e.description = "Description of incident is required.";
  if (!data.perpetratorKnown)
    e.perpetratorKnown = "Please indicate if the perpetrator is known.";
  if (!data.witnesses) e.witnesses = "Please indicate if there are witnesses.";
  if (!data.toldAnyone) e.toldAnyone = "Please indicate if you told anyone.";
  if (!data.toldPolice)
    e.toldPolice = "Please indicate if you told the police.";
  if (data.perpetratorKnown === "Yes") {
    if (!data.perpetratorName)
      e.perpetratorName = "Perpetrator name is required.";
    if (!data.perpetratorGender)
      e.perpetratorGender = "Perpetrator gender is required.";
  }
  if (data.witnesses === "Yes") {
    if (!data.witnessName) e.witnessName = "Witness name is required.";
    if (!data.witnessContact) e.witnessContact = "Witness contact is required.";
  }
  return e;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ReportScreen() {
  const [navOpen, setNavOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const [complainant, setComplainant] = useState({
    name: "",
    age: "",
    gender: "",
    organization: "",
    council: "",
    region: "",
    orgName: "",
    organizationType: "",
    orgCity: "",
    userCity: "",
    contactNumber: "",
    email: "",
    interview: "",
  });
  const [incident, setIncident] = useState({
    date: "",
    time: "",
    incidentCity: "",
    incidentVenue: "",
    description: "",
    outcome: "",
    perpetratorKnown: "",
    perpetratorName: "",
    perpetratorOccupation: "",
    perpetratorRelationship: "",
    perpetratorGender: "",
    witnesses: "",
    witnessName: "",
    witnessContact: "",
    witnessRelationship: "",
    toldAnyone: "",
    toldAnyoneWho: "",
    toldPolice: "",
    policeStation: "",
  });
  const [evidence, setEvidence] = useState({ files: [] });

  const totalSteps = STEPS.length;

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_URL}/api/case_reports/my-reports`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      const { data } = await res.json();
      setReports(data || []);
    } catch {
      /* silent */
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Notification count = number of reports
  const notifCount = reports.length;

  const handleNext = () => {
    let errs = {};
    if (step === 0) errs = validateStep0(complainant);
    if (step === 1) errs = validateStep1(incident);
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
      // 1. If evidence files exist, upload them first (e.g. to Supabase Storage)
      // and grab their public URLs to include in the payload.
      const uploadedFileUrls = [];

      // 2. Format payload exactly as the backend's buildPayload expects
      const payload = {
        complainant: {
          name: complainant.name,
          age: complainant.age,
          gender: complainant.gender,
          organization: complainant.organization,
          council: complainant.council,
          organizationType: complainant.organizationType,
          orgName: complainant.orgName,
          orgCity: complainant.orgCity,
          userCity: complainant.userCity,
          contactNumber: complainant.contactNumber,
          email: complainant.email,
          interview: complainant.interview,
        },
        incident: {
          date: incident.date,
          time: incident.time,
          incidentCity: incident.incidentCity,
          incidentVenue: incident.incidentVenue,
          description: incident.description,
          outcome: incident.outcome,
          perpetratorKnown: incident.perpetratorKnown,
          perpetratorName: incident.perpetratorName,
          perpetratorOccupation: incident.perpetratorOccupation,
          perpetratorRelationship: incident.perpetratorRelationship,
          perpetratorGender: incident.perpetratorGender,
        },
        evidence: {
          anonymous: false, // Or dynamic choice
          files: uploadedFileUrls,
        },
      };

      // Retrieve user token from secure storage (e.g., AsyncStorage)
      const userToken = await AsyncStorage.getItem("user_token");

      const res = await fetch(`${API_URL}/api/case_reports/submit`, {
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
    } catch (err) {
      setSubmitError(err.message || "Failed to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setStep(0);
    setComplainant({
      name: "",
      age: "",
      gender: "",
      organization: "",
      council: "",
      region: "",
      orgName: "",
      organizationType: "",
      orgCity: "",
      userCity: "",
      contactNumber: "",
      email: "",
      interview: "",
    });
    setIncident({
      date: "",
      time: "",
      incidentCity: "",
      incidentVenue: "",
      description: "",
      outcome: "",
      perpetratorKnown: "",
      perpetratorName: "",
      perpetratorOccupation: "",
      perpetratorRelationship: "",
      perpetratorGender: "",
      witnesses: "",
      witnessName: "",
      witnessContact: "",
      witnessRelationship: "",
      toldAnyone: "",
      toldAnyoneWho: "",
      toldPolice: "",
      policeStation: "",
    });
    setEvidence({ files: [] });
  };

  return (
    <View style={s.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
      <Navbar onBurger={() => setNavOpen(true)} notifCount={notifCount} />

      {submitted ? (
        <ScrollView contentContainerStyle={s.successContainer}>
          <View style={s.successCard}>
            <View style={s.successIcon}>
              <Ionicons name="checkmark" size={36} color="#fff" />
            </View>
            <Text style={s.successTitle}>Report Submitted!</Text>
            <Text style={s.successDesc}>
              Your report has been received. We will review it and get back to
              you via your provided contact details. All information is handled
              with strict confidentiality.
            </Text>
            <Pressable style={s.submitBtn} onPress={handleReset}>
              <Text style={s.submitBtnText}>Submit Another Report</Text>
            </Pressable>
          </View>

          {/* Status after submit */}
          <View style={s.statusSection}>
            <Text style={s.statusSectionTitle}>Your Report Status</Text>
            {loadingReports ? (
              <ActivityIndicator color={TEAL} />
            ) : (
              reports.map((r, i) => (
                <ReportStatusCard
                  key={r.case_report_id || i}
                  report={r}
                  index={i}
                  onView={() => {}}
                />
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Page Header + Form Card Title */}
          <View style={s.formHeader}>
            <View style={s.heroLabel}>
              <View style={s.heroLabelLine} />
              <Text style={s.heroLabelText}>Submit a Report</Text>
            </View>
            <Text style={s.heroTitle}>
              <Text style={{ color: TEAL }}>We're Here </Text>
              <Text style={{ color: ORANGE }}>to Help</Text>
            </Text>
            <Text style={s.heroDesc}>
              Please provide accurate and detailed information. All reports are
              handled with strict confidentiality.
            </Text>
            <Text style={s.formCardTitle}>Report Submission Form</Text>
          </View>

          {/* Wizard stepper */}
          <WizardStepper current={step} />

          {/* Step content */}
          <ScrollView
            style={s.scroll}
            contentContainerStyle={[s.scrollContent, { paddingTop: 8 }]}
          >
            {step === 0 && (
              <StepComplainantInfo
                data={complainant}
                onChange={setComplainant}
                errors={errors}
              />
            )}
            {step === 1 && (
              <StepIncidentDetails
                data={incident}
                onChange={setIncident}
                errors={errors}
              />
            )}
            {step === 2 && (
              <StepEvidence data={evidence} onChange={setEvidence} />
            )}
            {step === 3 && (
              <StepReview
                complainant={complainant}
                incident={incident}
                evidence={evidence}
              />
            )}

            {/* Report Status below form */}
            {step === 0 && (
              <View style={s.statusSection}>
                <Text style={s.statusSectionTitle}>Your Report Status</Text>
                {loadingReports ? (
                  <ActivityIndicator
                    color={TEAL}
                    style={{ marginVertical: 20 }}
                  />
                ) : reports.length === 0 ? (
                  <View style={s.emptyState}>
                    <Ionicons name="document-outline" size={40} color="#ccc" />
                    <Text style={s.emptyStateText}>
                      No reports submitted yet.
                    </Text>
                  </View>
                ) : (
                  reports.map((r, i) => (
                    <ReportStatusCard
                      key={r.case_report_id || i}
                      report={r}
                      index={i}
                      onView={() => {}}
                    />
                  ))
                )}
              </View>
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
                  <Text style={s.submitBtnText}>Submit Report</Text>
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

  // Form Header
  formHeader: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  heroLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  heroLabelLine: {
    width: 24,
    height: 2,
    backgroundColor: ORANGE,
    borderRadius: 2,
  },
  heroLabelText: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  heroTitle: { fontSize: 22, fontWeight: "900", marginBottom: 4 },
  heroDesc: { fontSize: 12, color: "#555", lineHeight: 18, marginBottom: 8 },
  formCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: TEAL,
    textAlign: "center",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginTop: 4,
  },

  // Wizard
  wizardRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 10,
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

  // Step container
  stepContainer: { padding: 16, gap: 2 },
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
    marginTop: 8,
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
  inputReadonly: { backgroundColor: "#f0f0f0", color: "#888" },

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
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 999,
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
  radioRowError: {
    borderWidth: 1,
    borderColor: ERROR,
    borderRadius: 8,
    padding: 8,
  },
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

  // Credentials / Evidence
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
  successContainer: { flexGrow: 1, padding: 24 },
  successCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 24,
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
  statusSection: { marginHorizontal: 16, marginTop: 8, paddingBottom: 16 },
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
