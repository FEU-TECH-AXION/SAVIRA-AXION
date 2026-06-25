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
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Calendar } from "react-native-calendars";

const TEAL = "#037F81";
const ORANGE = "#E96433";
const BORDER = "#e5e7eb";
const BG = "#f5f7f8";
const ERROR = "#dc2626";
const HISTORY_PAGE_SIZE = 5;
const MAX_EVIDENCE_FILE_SIZE = 50 * 1024 * 1024;
const MAX_EVIDENCE_FILE_SIZE_LABEL = "50 MB";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";

function formatErrorMessage(error, fallback = "Failed to submit report.") {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (Array.isArray(error)) {
    return error.map((item) => formatErrorMessage(item, "")).filter(Boolean).join("\n");
  }
  if (typeof error === "object") {
    const parts = [
      error.message,
      error.error,
      error.details,
      error.hint,
      error.description,
    ]
      .map((item) => formatErrorMessage(item, ""))
      .filter(Boolean);

    return parts.length > 0 ? parts.join("\n") : fallback;
  }
  return String(error);
}

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
  { id: 0, label: "Consent" },
  { id: 1, label: "Complainant's\nInfo" },
  { id: 2, label: "Incident\nDetails" },
  { id: 3, label: "Supporting\nEvidence" },
  { id: 4, label: "Review &\nSubmit" },
];

import SideNav from '../../components/SideNav';
import HeaderAvatar from '../../components/HeaderAvatar';
import NavSearchButton from '../../components/NavSearchButton';

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onBurger, notifCount = 0 }) {
  return (
    <View style={s.navbar}>
      <Pressable onPress={onBurger} style={{ padding: 4 }}>
        <Ionicons name="menu" size={26} color="#fff" />
      </Pressable>
      <View style={s.navRight}>
        <NavSearchButton />
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

// ── Date Picker Field ─────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1899 }, (_, i) =>
  String(THIS_YEAR - i)
);

function DatePickerField({ value, onChange, error }) {
  const [open, setOpen] = useState(false);
  // current calendar page (YYYY-MM-DD)
  const today = new Date().toISOString().split("T")[0];
  const [calCurrent, setCalCurrent] = useState(today);
  // which dropdown is open: null | "month" | "year"
  const [dropOpen, setDropOpen] = useState(null);

  // Convert MM/DD/YYYY ↔ YYYY-MM-DD
  const toCalendarDate = (val) => {
    if (!val) return undefined;
    const parts = val.split("/");
    if (parts.length !== 3) return undefined;
    return `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
  };
  const fromCalendarDate = (dateStr) => {
    const [y, m, d] = dateStr.split("-");
    return `${m}/${d}/${y}`;
  };

  const calDate = toCalendarDate(value);

  const handleOpen = () => {
    setCalCurrent(calDate || today);
    setDropOpen(null);
    setOpen(true);
  };

  // current display month/year from calCurrent
  const [curYear, curMonthIdx] = calCurrent.split("-").map(Number);
  const curMonthName = MONTH_NAMES[curMonthIdx - 1] || "";

  const jumpTo = (year, month) => {
    const m = String(month).padStart(2, "0");
    setCalCurrent(`${year}-${m}-01`);
    setDropOpen(null);
  };

  const displayLabel = value
    ? (() => {
        const parts = value.split("/");
        if (parts.length === 3) {
          const mName = MONTH_NAMES[Number(parts[0]) - 1] || "";
          return `${mName} ${Number(parts[1])}, ${parts[2]}`;
        }
        return value;
      })()
    : "Select date";

  return (
    <View>
      <Pressable
        style={[s.pickerField, error && s.inputError]}
        onPress={handleOpen}
      >
        <Text style={[s.pickerFieldText, value && { color: "#1a1a1a" }]}>
          {displayLabel}
        </Text>
        <Feather name="calendar" size={20} color={TEAL} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={s.pickerOverlay} onPress={() => setOpen(false)}>
          <Pressable
            style={s.pickerModal}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <View style={s.pickerModalHeader}>
              <Text style={s.pickerModalTitle}>Select Date</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Feather name="x" size={22} color="#1a1a1a" />
              </Pressable>
            </View>

            {/* Month / Year quick-jump bar */}
            <View style={s.calJumpBar}>
              {/* Month selector */}
              <Pressable
                style={s.calJumpBtn}
                onPress={() => setDropOpen(dropOpen === "month" ? null : "month")}
              >
                <Text style={s.calJumpBtnText}>{curMonthName}</Text>
                <Feather
                  name={dropOpen === "month" ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={TEAL}
                />
              </Pressable>

              {/* Year selector */}
              <Pressable
                style={s.calJumpBtn}
                onPress={() => setDropOpen(dropOpen === "year" ? null : "year")}
              >
                <Text style={s.calJumpBtnText}>{curYear}</Text>
                <Feather
                  name={dropOpen === "year" ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={TEAL}
                />
              </Pressable>
            </View>

            {/* Inline dropdown lists */}
            {dropOpen === "month" && (
              <ScrollView
                style={s.calDropdown}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {MONTH_NAMES.map((m, i) => {
                  const isActive = i + 1 === curMonthIdx;
                  return (
                    <Pressable
                      key={m}
                      style={[s.calDropdownItem, isActive && s.calDropdownItemActive]}
                      onPress={() => jumpTo(curYear, i + 1)}
                    >
                      <Text style={[s.calDropdownText, isActive && s.calDropdownTextActive]}>
                        {m}
                      </Text>
                      {isActive && <Feather name="check" size={14} color={TEAL} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {dropOpen === "year" && (
              <ScrollView
                style={s.calDropdown}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {YEARS.map((y) => {
                  const isActive = Number(y) === curYear;
                  return (
                    <Pressable
                      key={y}
                      style={[s.calDropdownItem, isActive && s.calDropdownItemActive]}
                      onPress={() => jumpTo(Number(y), curMonthIdx)}
                    >
                      <Text style={[s.calDropdownText, isActive && s.calDropdownTextActive]}>
                        {y}
                      </Text>
                      {isActive && <Feather name="check" size={14} color={TEAL} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {/* Calendar grid (hidden while a dropdown is open) */}
            {!dropOpen && (
              <Calendar
                key={calCurrent}
                current={calCurrent}
                markedDates={
                  calDate
                    ? { [calDate]: { selected: true, selectedColor: TEAL } }
                    : {}
                }
                maxDate={today}
                onDayPress={(day) => {
                  onChange(fromCalendarDate(day.dateString));
                  setOpen(false);
                }}
                onMonthChange={(month) => {
                  setCalCurrent(`${month.year}-${String(month.month).padStart(2, "0")}-01`);
                }}
                hideExtraDays
                theme={{
                  todayTextColor: ORANGE,
                  selectedDayBackgroundColor: TEAL,
                  arrowColor: TEAL,
                  dotColor: TEAL,
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}


// ── Time Picker Field ─────────────────────────────────────────────────────────
const HOURS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0")
);
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0")
);
const PERIODS = ["AM", "PM"];

function TimePickerField({ value, onChange, error }) {
  const [open, setOpen] = useState(false);

  // Parse value like "03:00 PM" → {hour, minute, period}
  const parseTime = (val) => {
    if (!val) return { hour: "12", minute: "00", period: "AM" };
    const match = val.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return { hour: "12", minute: "00", period: "AM" };
    return {
      hour: match[1].padStart(2, "0"),
      minute: match[2],
      period: match[3].toUpperCase(),
    };
  };

  const parsed = parseTime(value);
  const [selHour, setSelHour] = useState(parsed.hour);
  const [selMin, setSelMin] = useState(parsed.minute);
  const [selPeriod, setSelPeriod] = useState(parsed.period);

  const handleOpen = () => {
    const p = parseTime(value);
    setSelHour(p.hour);
    setSelMin(p.minute);
    setSelPeriod(p.period);
    setOpen(true);
  };

  const handleConfirm = () => {
    onChange(`${selHour}:${selMin} ${selPeriod}`);
    setOpen(false);
  };

  return (
    <View>
      <Pressable
        style={[s.pickerField, error && s.inputError]}
        onPress={handleOpen}
      >
        <Text style={[s.pickerFieldText, value && { color: "#1a1a1a" }]}>
          {value || "Select time"}
        </Text>
        <Feather name="clock" size={20} color={TEAL} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={s.pickerOverlay} onPress={() => setOpen(false)}>
          <Pressable
            style={s.pickerModal}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={s.pickerModalHeader}>
              <Text style={s.pickerModalTitle}>Select Time</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Feather name="x" size={22} color="#1a1a1a" />
              </Pressable>
            </View>

            {/* Preview */}
            <Text style={s.timePreview}>
              {selHour}:{selMin} {selPeriod}
            </Text>

            {/* Drum pickers */}
            <View style={s.timeDrumRow}>
              {/* Hours */}
              <View style={s.timeDrumWrap}>
                <Text style={s.timeDrumLabel}>Hour</Text>
                <ScrollView
                  style={s.timeDrum}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {HOURS.map((h) => (
                    <Pressable
                      key={h}
                      style={[
                        s.timeDrumItem,
                        selHour === h && s.timeDrumItemActive,
                      ]}
                      onPress={() => setSelHour(h)}
                    >
                      <Text
                        style={[
                          s.timeDrumItemText,
                          selHour === h && s.timeDrumItemTextActive,
                        ]}
                      >
                        {h}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <Text style={s.timeSep}>:</Text>

              {/* Minutes */}
              <View style={s.timeDrumWrap}>
                <Text style={s.timeDrumLabel}>Min</Text>
                <ScrollView
                  style={s.timeDrum}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {MINUTES.map((m) => (
                    <Pressable
                      key={m}
                      style={[
                        s.timeDrumItem,
                        selMin === m && s.timeDrumItemActive,
                      ]}
                      onPress={() => setSelMin(m)}
                    >
                      <Text
                        style={[
                          s.timeDrumItemText,
                          selMin === m && s.timeDrumItemTextActive,
                        ]}
                      >
                        {m}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* AM/PM */}
              <View style={s.timeDrumWrap}>
                <Text style={s.timeDrumLabel}>AM/PM</Text>
                <View style={s.periodWrap}>
                  {PERIODS.map((p) => (
                    <Pressable
                      key={p}
                      style={[
                        s.periodBtn,
                        selPeriod === p && s.periodBtnActive,
                      ]}
                      onPress={() => setSelPeriod(p)}
                    >
                      <Text
                        style={[
                          s.periodBtnText,
                          selPeriod === p && s.periodBtnTextActive,
                        ]}
                      >
                        {p}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <Pressable style={s.pickerConfirmBtn} onPress={handleConfirm}>
              <Text style={s.pickerConfirmBtnText}>Confirm</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
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

function Checkbox({ label, value, onChange, error }) {
  return (
    <Pressable style={s.checkboxRow} onPress={() => onChange(!value)}>
      <View style={[s.checkboxOuter, error && { borderColor: ERROR }, value && s.checkboxOuterActive]}>
        {value && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <Text style={s.checkboxText}>{label}</Text>
    </Pressable>
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
  let currentStep = STATUS_STEP[report.case_status?.status_name];
  if (currentStep === undefined && report.case_status_id !== undefined) {
    currentStep = report.case_status_id - 1;
  }
  currentStep = currentStep >= 0 && currentStep <= 2 ? currentStep : 0;
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

// ── STEP 0: Consent ─────────────────────────────────────────────────────────────
function StepConsent({ complainant, onComplainantChange, consents, onConsentChange, errors }) {
  const setConsent = (key) => (val) => onConsentChange(key, val);

  return (
    <View style={s.stepContainer}>
      <Text style={s.stepTitle}>
        <Text style={{ color: TEAL }}>Consent, Authorization </Text>& Disclaimers
      </Text>
      <Text style={s.stepDesc}>
        Before continuing, please read and confirm the statements below. These steps are here to ensure your rights are protected, your privacy is safeguarded, and your report is handled with the utmost care and responsibility.
      </Text>

      <View style={s.noticePanel}>
        <Text style={s.subSectionTitle}>Important Notices</Text>
        <Text style={s.noticeItemTitle}>Response Time</Text>
        <Text style={s.noticeItemDesc}>To give every report careful attention, the review and verification process may take up to 72 hours.</Text>
        
        <Text style={[s.noticeItemTitle, { marginTop: 12 }]}>If You Need Immediate Help</Text>
        <Text style={s.noticeItemDesc}>
          This platform is for case management and is not monitored for immediate crisis intervention. Your safety and well-being matter deeply to us. If you are in immediate danger, need urgent medical care, or need crisis safety assistance, please seek trusted emergency contacts who can help you right now.
        </Text>
      </View>

      <View style={s.divider} />
      <Text style={s.subSectionTitle}>How Your Report Will Be Handled</Text>
      <Text style={s.stepDesc}>
        These confirmations help us protect your information and use only anonymized details when improving case handling.
      </Text>

      <View style={{ marginBottom: 16 }}>
        <Checkbox
          label="I understand and agree that the information I have provided in this report will be collected, stored, and processed by the institution solely for the purpose of case management and resolution. All data will be handled in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173) and the institution's privacy policy. My information will not be shared with unauthorized third parties without my consent."
          value={consents.dataPrivacy}
          onChange={setConsent("dataPrivacy")}
          error={errors.dataPrivacy}
        />
        {errors.dataPrivacy && <Text style={s.fieldError}>{errors.dataPrivacy}</Text>}
      </View>

      <View style={{ marginBottom: 16 }}>
        <Checkbox
          label="I agree that the narrative details of my report may be used to support ongoing efforts to improve case handling and outcomes. Any such use will be conducted on anonymized, de-identified data only. Personally identifiable information such as names, contact details, and age will be excluded and will not be retained or linked to any analysis."
          value={consents.caseAnalysis}
          onChange={setConsent("caseAnalysis")}
          error={errors.caseAnalysis}
        />
        {errors.caseAnalysis && <Text style={s.fieldError}>{errors.caseAnalysis}</Text>}
      </View>

      <View style={s.divider} />
      <Text style={s.subSectionTitle}>Your Communication Preferences</Text>
      <Text style={s.stepDesc}>
        Your comfort and safety are our priorities. Please let us know how you would like to proceed with your report.
      </Text>
      
      <Field
        label="Willingness to be interviewed"
        required
        hint="Would you be comfortable speaking with a SASHA Representative, together with a SASHA paralegal and/or lawyer, so your case can be reviewed with more care?"
        error={errors.interview}
      >
        <RadioGroup
          options={[
            "Yes, I am open to an interview.",
            "No, I prefer not to be interviewed at this time."
          ]}
          value={
            complainant.interview === "Yes"
              ? "Yes, I am open to an interview."
              : complainant.interview === "No"
              ? "No, I prefer not to be interviewed at this time."
              : ""
          }
          onChange={(v) => {
            onComplainantChange({
              ...complainant,
              interview: v.startsWith("Yes") ? "Yes" : "No",
            });
          }}
          error={errors.interview}
        />
      </Field>
      <Text style={s.fieldHint}>
        You are in control of what happens next. Choose the option that feels safest and most supportive for you right now; whatever you choose, SASHA will still review your report with care.
      </Text>
    </View>
  );
}

// ── STEP 1: Complainant Info ──────────────────────────────────────────────────
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
        label="Who is this report about?"
        required
        hint="Is this report about you, or someone else?"
        error={errors.reporteeType}
      >
        <RadioGroup
          options={["Me (Myself)", "Someone else"]}
          value={data.reporteeType}
          onChange={set("reporteeType")}
          error={errors.reporteeType}
        />
      </Field>

      <Field
        label="Name"
        hint="Optional — you may leave this blank if you prefer to remain anonymous."
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
    </View>
  );
}

// ── STEP 2: Incident Details ──────────────────────────────────────────────────
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
        <DatePickerField
          value={data.date}
          onChange={set("date")}
          error={errors.date}
        />
      </Field>
      <Field
        label="Time"
        hint="Approximate time is fine if exact time is unknown."
        error={errors.time}
      >
        <TimePickerField
          value={data.time}
          onChange={set("time")}
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

// ── STEP 3: Supporting Evidence ───────────────────────────────────────────────
function StepEvidence({ data, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const appendValidFiles = (files) => {
    const oversizedFiles = files.filter((file) => (file.size || 0) > MAX_EVIDENCE_FILE_SIZE);
    const validFiles = files.filter((file) => !file.size || file.size <= MAX_EVIDENCE_FILE_SIZE);

    if (oversizedFiles.length > 0) {
      Alert.alert(
        "File Too Large",
        `Each evidence file must be ${MAX_EVIDENCE_FILE_SIZE_LABEL} or smaller. Please choose a smaller file.`
      );
    }

    if (validFiles.length > 0) {
      onChange({ ...data, files: [...(data.files || []), ...validFiles] });
    }
  };

  const pickFiles = async () => {
    Alert.alert(
      "Attach Evidence",
      "Choose where you want to select your evidence files or media from:",
      [
        {
          text: "🖼️ Photo Gallery",
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== "granted") {
                Alert.alert("Permission Denied", "We need permission to access your local gallery to attach evidence.");
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
                appendValidFiles(mappedAssets);
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
                appendValidFiles(result.assets);
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

  const pickFromGallery = async () => {
    setPickerOpen(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "We need permission to access your local gallery to attach evidence.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
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
        appendValidFiles(mappedAssets);
      }
    } catch (err) {
      Alert.alert("Error", "Could not pick images/videos from gallery.");
    }
  };

  const pickFromFiles = async () => {
    setPickerOpen(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png", "video/mp4"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets) {
        appendValidFiles(result.assets);
      }
    } catch (e) {
      Alert.alert("Error", "Could not pick files.");
    }
  };

  const formatFileSize = (size) => {
    if (!size) return "";
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(size / 1024))} KB`;
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
        (optional). Each file must be {MAX_EVIDENCE_FILE_SIZE_LABEL} or smaller.
      </Text>

      <View style={s.credSection}>
        <Pressable style={s.dropZone} onPress={() => setPickerOpen(true)}>
          <View style={s.uploadIconWrap}>
            <Ionicons name="phone-portrait-outline" size={30} color={TEAL} />
          </View>
          <Text style={s.dropText}>Add evidence files</Text>
          <Text style={s.dropSubtext}>Photos, videos, PDFs, JPG, PNG, or MP4</Text>
          <View style={s.browseBtn}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={s.browseBtnText}>Choose Files</Text>
          </View>
          <Text style={s.dropHint}>Max {MAX_EVIDENCE_FILE_SIZE_LABEL} per file</Text>
        </Pressable>

        <View style={s.fileList}>
          <Text style={s.fileListTitle}>Attached Files</Text>
          {!data.files || data.files.length === 0 ? (
            <View style={s.noFilesBox}>
              <Ionicons name="document-attach-outline" size={18} color="#6b7280" />
              <Text style={s.noFilesText}>No files added yet.</Text>
            </View>
          ) : (
            data.files.map((f, i) => (
              <View key={i} style={s.fileItem}>
                <View style={s.fileIconBubble}>
                  <Ionicons name="document-outline" size={15} color={TEAL} />
                </View>
                <View style={s.fileMeta}>
                  <Text style={s.fileName} numberOfLines={1}>
                    {f.name}
                  </Text>
                  {!!formatFileSize(f.size) && (
                    <Text style={s.fileSize}>{formatFileSize(f.size)}</Text>
                  )}
                </View>
                <Pressable style={s.fileRemoveBtn} onPress={() => removeFile(i)}>
                  <Ionicons name="close" size={14} color="#6b7280" />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </View>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={s.uploadModalOverlay} onPress={() => setPickerOpen(false)}>
          <Pressable style={s.uploadModalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.uploadModalHandle} />
            <View style={s.uploadModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.uploadModalTitle}>Add Evidence</Text>
                <Text style={s.uploadModalSubtitle}>
                  Choose from your device. Up to {MAX_EVIDENCE_FILE_SIZE_LABEL} per file.
                </Text>
              </View>
              <Pressable style={s.uploadModalClose} onPress={() => setPickerOpen(false)}>
                <Ionicons name="close" size={18} color="#374151" />
              </Pressable>
            </View>

            <Pressable style={s.uploadOption} onPress={pickFromGallery}>
              <View style={s.uploadOptionIcon}>
                <Ionicons name="images-outline" size={22} color={TEAL} />
              </View>
              <View style={s.uploadOptionTextWrap}>
                <Text style={s.uploadOptionTitle}>Photo & Video Gallery</Text>
                <Text style={s.uploadOptionDesc}>
                  Select screenshots, photos, or recorded clips from this phone.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </Pressable>

            <Pressable style={s.uploadOption} onPress={pickFromFiles}>
              <View style={s.uploadOptionIcon}>
                <Ionicons name="folder-open-outline" size={22} color={TEAL} />
              </View>
              <View style={s.uploadOptionTextWrap}>
                <Text style={s.uploadOptionTitle}>Device Files</Text>
                <Text style={s.uploadOptionDesc}>
                  Attach PDFs or saved media using your phone's file picker.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── STEP 4: Review & Submit ───────────────────────────────────────────────────
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
        <Row label="Report Type" value={complainant.reporteeType} />
        <Row label="Name" value={complainant.name} />
        <Row label="Age" value={complainant.age} />
        <Row label="Gender Identity" value={complainant.gender} />
        <Row label="Organization" value={complainant.organization} />
        {(complainant.organization === "Boy Scouts of the Philippines (BSP)" ||
          complainant.organization === "Girl Scouts of the Philippines (GSP)") && (
          <>
            <Row label="Council" value={complainant.council} />
            <Row label="Region" value={complainant.region} />
          </>
        )}
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

function validateStep0(complainant, consents) {
  const e = {};
  if (!complainant.interview) e.interview = "Please select your interview preference.";
  if (!consents.dataPrivacy) e.dataPrivacy = "Please confirm the data privacy agreement.";
  if (!consents.caseAnalysis) e.caseAnalysis = "Please confirm the case analysis agreement.";
  return e;
}

function validateStep1(data) {
  const e = {};
  if (!data.reporteeType) e.reporteeType = "Report type is required.";
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

function validateStep2(data) {
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

// ── Status badge colours ─────────────────────────────────────────────────────
const STATUS_COLORS = {
  Submitted:    { bg: '#e0f2f1', text: '#037F81' },
  'For Verification': { bg: '#e0f2f1', text: '#037F81' },
  'Under Review': { bg: '#fff3e0', text: '#e96433' },
  'Undergoing Review': { bg: '#fff3e0', text: '#e96433' },
  'Verified - True': { bg: '#ecfdf5', text: '#047857' },
  'Verified - False': { bg: '#fef2f2', text: '#b91c1c' },
  'Under Case Evaluation': { bg: '#eff6ff', text: '#1d4ed8' },
  'Case Filed': { bg: '#f5f3ff', text: '#6d28d9' },
  'Investigation Ongoing': { bg: '#fff7ed', text: '#c2410c' },
  'Hearing Ongoing': { bg: '#fefce8', text: '#a16207' },
  Dismissed: { bg: '#f3f4f6', text: '#4b5563' },
  'Perpetrator Convicted': { bg: '#ecfdf5', text: '#047857' },
  Resolved:     { bg: '#e8f5e9', text: '#2e7d32' },
  Withdrawn: { bg: '#fef3c7', text: '#92400e' },
};

const STATUS_LABELS = {
  1: 'Submitted',
  2: 'For Verification',
  3: 'Undergoing Review',
  4: 'Verified - True',
  5: 'Verified - False',
  6: 'Under Case Evaluation',
  7: 'Case Filed',
  8: 'Investigation Ongoing',
  9: 'Hearing Ongoing',
  10: 'Dismissed',
  11: 'Perpetrator Convicted',
  12: 'Resolved',
  13: 'Withdrawn',
};

const STATUS_DISPLAY = {
  Submitted: { middle: 'For Verification', phase: 1 },
  'For Verification': { middle: 'For Verification', phase: 1 },
  'Undergoing Review': { middle: 'Undergoing Review', phase: 1 },
  'Verified - True': { middle: 'Verified', phase: 1 },
  'Verified - False': { middle: 'Verified', phase: 2 },
  'Under Case Evaluation': { middle: 'Under Case Evaluation', phase: 1 },
  'Case Filed': { middle: 'Case Filed', phase: 1 },
  'Investigation Ongoing': { middle: 'Investigation Ongoing', phase: 1 },
  'Hearing Ongoing': { middle: 'Hearing Ongoing', phase: 1 },
  Dismissed: { middle: null, phase: 2 },
  'Perpetrator Convicted': { middle: null, phase: 2 },
  Resolved: { middle: null, phase: 2 },
  Withdrawn: { middle: null, phase: 2 },
};

const TERMINAL_STATUSES = ['Dismissed', 'Perpetrator Convicted', 'Resolved', 'Withdrawn'];
const WITHDRAWAL_ALLOWED = ['For Verification', 'Undergoing Review', 'Verified - True', 'Under Case Evaluation'];
const WITHDRAWAL_REQUIRES_APPROVAL = ['Case Filed', 'Investigation Ongoing'];
const FOLLOW_UP_REASON_OPTIONS = [
  {
    value: 'Correction needed',
    label: 'Correct existing information',
    description: 'Choose this when information already recorded on the case is inaccurate.',
    groupIds: ['complainant_contact', 'incident_datetime', 'incident_location', 'incident_description', 'incident_outcome', 'perpetrator', 'witnesses', 'prior_disclosure'],
  },
  {
    value: 'Additional info',
    label: 'Add information or evidence',
    description: 'Choose this when the existing information is correct, but the case team needs new details or files.',
    groupIds: ['incident_description', 'incident_outcome', 'perpetrator', 'witnesses', 'prior_disclosure', 'evidence'],
  },
  {
    value: 'Other',
    label: 'Other request',
    description: 'Choose this for a request that does not change a case field, then explain it below.',
    groupIds: [],
  },
];

const FOLLOW_UP_FIELDS = [
  { id: 'complainant_contact', label: 'Complainant contact info', fields: ['complainant.contactNumber', 'complainant.email'] },
  { id: 'incident_datetime', label: 'Incident date/time', fields: ['incident.date', 'incident.time'] },
  { id: 'incident_location', label: 'Incident location', fields: ['incident.incidentCity', 'incident.incidentVenue'] },
  { id: 'incident_description', label: 'Incident description', fields: ['incident.description'] },
  { id: 'incident_outcome', label: 'Requested outcome', fields: ['incident.outcome'] },
  { id: 'perpetrator', label: 'Perpetrator details', fields: ['incident.perpetratorKnown', 'incident.perpetratorName', 'incident.perpetratorOccupation', 'incident.perpetratorRelationship', 'incident.perpetratorGender'] },
  { id: 'witnesses', label: 'Witness details', fields: ['incident.witnesses', 'incident.witnessName', 'incident.witnessContact', 'incident.witnessRelationship'] },
  { id: 'prior_disclosure', label: 'Prior disclosure/police report', fields: ['incident.toldAnyone', 'incident.toldAnyoneWho', 'incident.toldPolice', 'incident.policeStation'] },
  { id: 'evidence', label: 'Evidence/attachments', fields: ['evidence.files'] },
];

function getFollowUpFieldLabels(selectedFields) {
  return FOLLOW_UP_FIELDS
    .filter((group) => group.fields.some((field) => selectedFields.includes(field)))
    .map((group) => group.label);
}

function getFollowUpGroupsForReason(reason) {
  const selectedReason = FOLLOW_UP_REASON_OPTIONS.find((option) => option.value === reason);
  return FOLLOW_UP_FIELDS.filter((group) => selectedReason?.groupIds.includes(group.id));
}

function getStatusName(report) {
  return report.case_status?.status_name || report.statusName || report.status || STATUS_LABELS[report.case_status_id] || 'Submitted';
}

function getReportId(report, fallback = 1) {
  const raw = report.case_report_id || report.id;
  if (!raw) return `#${fallback}`;
  const createdAt = report.created_at || report.incident_date;
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  return `${year}-${String(raw).padStart(3, '0')}`;
}

function getWithdrawalCopy(status) {
  const requiresApproval = WITHDRAWAL_REQUIRES_APPROVAL.includes(status);
  if (status === 'Case Filed') {
    return {
      buttonLabel: 'Request Withdrawal',
      title: 'Request Case Withdrawal',
      description: 'This case has already been filed. Your request requires approval and an Affidavit of Desistance or equivalent official document.',
      requiresAffidavit: true,
      requiresApproval,
    };
  }
  if (status === 'Investigation Ongoing') {
    return {
      buttonLabel: 'Request Withdrawal',
      title: 'Request Case Withdrawal',
      description: 'An investigation is active. Explain why you are requesting withdrawal; an administrator or case officer must approve it.',
      requiresAffidavit: false,
      requiresApproval,
    };
  }
  if (status === 'Verified - True') {
    return {
      buttonLabel: 'Withdraw',
      title: 'Withdraw Validated Case',
      description: 'This case has already been verified as valid. Withdrawing it will archive the validated record and cannot be undone.',
      requiresAffidavit: false,
      requiresApproval: false,
    };
  }
  return {
    buttonLabel: 'Withdraw',
    title: 'Withdraw Case Report',
    description: 'This will archive the case and stop its current progress. The withdrawal is permanent and remains in the audit record.',
    requiresAffidavit: false,
    requiresApproval: false,
  };
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ReportScreen() {
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const { tab } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState(tab === 'history' ? 'history' : 'submit'); // 'submit' | 'history'
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // History search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterOpen, setFilterOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [withdrawReport, setWithdrawReport] = useState(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawFile, setWithdrawFile] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [followUpReport, setFollowUpReport] = useState(null);
  const [followUpReason, setFollowUpReason] = useState('Correction needed');
  const [followUpReasonOpen, setFollowUpReasonOpen] = useState(false);
  const [followUpFields, setFollowUpFields] = useState([]);
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const [consents, setConsents] = useState({
    dataPrivacy: false,
    caseAnalysis: false,
  });

  const [complainant, setComplainant] = useState({
    reporteeType: "",
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
      const token = await AsyncStorage.getItem("user_token");
      if (!token) {
        setLoadingReports(false);
        return;
      }
      const res = await fetch(`${API_URL}/api/case_reports/my-reports`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed");
      const { data } = await res.json();
      setReports(data || []);
    } catch (err) {
      console.error("[fetchReports]", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const toggleFollowUpField = (fieldGroup) => {
    setActionError('');
    setFollowUpFields((current) => {
      const hasGroup = fieldGroup.fields.every((field) => current.includes(field));
      return hasGroup
        ? current.filter((field) => !fieldGroup.fields.includes(field))
        : [...new Set([...current, ...fieldGroup.fields])];
    });
  };

  const openFollowUp = (report) => {
    setActionError('');
    setFollowUpReport(report);
    setFollowUpReason('Correction needed');
    setFollowUpReasonOpen(false);
    setFollowUpFields([]);
    setFollowUpMessage('');
  };

  const submitFollowUp = async () => {
    if (!followUpReport) return;
    if (followUpReason !== 'Other' && followUpFields.length === 0) {
      setActionError(followUpReason === 'Correction needed'
        ? 'Select at least one field that you want to correct.'
        : 'Select the information or evidence that you want to add.');
      return;
    }
    if (!followUpMessage.trim()) {
      setActionError('Please add a short note explaining your request.');
      return;
    }
    setFollowUpSubmitting(true);
    setActionError('');
    try {
      const token = await AsyncStorage.getItem('user_token');
      const selectedLabels = getFollowUpFieldLabels(followUpFields);
      const selectedReason = FOLLOW_UP_REASON_OPTIONS.find((option) => option.value === followUpReason);
      const messageParts = [
        selectedLabels.length ? `Selected: ${selectedLabels.join(', ')}` : '',
        followUpMessage.trim(),
      ].filter(Boolean);
      const form = new FormData();
      form.append('type', 'user_change_request');
      form.append('reason_category', followUpReason);
      form.append('message', messageParts.join('\n\n'));
      form.append('fields_requested', JSON.stringify(followUpFields));
      form.append('message_only', 'true');
      const id = followUpReport.case_report_id || followUpReport.id;
      const res = await fetch(`${API_URL}/api/case_reports/${id}/follow-ups`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to submit follow-up.');
      setReports((current) => current.map((report) =>
        (report.case_report_id || report.id) === id
          ? { ...report, follow_up_summary: body.data || { status: 'open', type: 'user_change_request' } }
          : report
      ));
      setFollowUpReport(null);
      setFollowUpFields([]);
    } catch (err) {
      setActionError(err.message || 'Failed to submit follow-up.');
    } finally {
      setFollowUpSubmitting(false);
    }
  };

  const pickWithdrawFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) setWithdrawFile(result.assets[0]);
    } catch (_) {
      Alert.alert('Error', 'Could not pick the withdrawal document.');
    }
  };

  const submitWithdrawal = async () => {
    if (!withdrawReport) return;
    const statusName = getStatusName(withdrawReport);
    const copy = getWithdrawalCopy(statusName);
    if (!withdrawReason.trim()) {
      setActionError('Enter a reason for withdrawal.');
      return;
    }
    if (copy.requiresAffidavit && !withdrawFile) {
      setActionError('Attach an Affidavit of Desistance or official withdrawal document.');
      return;
    }
    setWithdrawing(true);
    setActionError('');
    try {
      const token = await AsyncStorage.getItem('user_token');
      const form = new FormData();
      form.append('reason', withdrawReason.trim());
      if (withdrawFile) {
        form.append('affidavit', {
          uri: withdrawFile.uri,
          name: withdrawFile.name || 'withdrawal-document',
          type: withdrawFile.mimeType || 'application/octet-stream',
        });
      }
      const id = withdrawReport.case_report_id || withdrawReport.id;
      const res = await fetch(`${API_URL}/api/case_reports/${id}/withdraw`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to withdraw case.');
      setReports((current) => current.map((report) =>
        (report.case_report_id || report.id) === id
          ? copy.requiresApproval
            ? { ...report, withdrawal_request: body.withdrawal_request || { status: 'pending' } }
            : { ...report, case_status_id: 13, case_status: { status_name: 'Withdrawn' }, withdrawal_request: body.withdrawal_request || null }
          : report
      ));
      setWithdrawReport(null);
      setWithdrawReason('');
      setWithdrawFile(null);
    } catch (err) {
      setActionError(err.message || 'Failed to withdraw case.');
    } finally {
      setWithdrawing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Sync tab when navigated from sidenav with ?tab=history
  useEffect(() => {
    if (tab === 'history') setActiveTab('history');
    else if (tab === 'submit') setActiveTab('submit');
  }, [tab]);

  useEffect(() => {
    setHistoryPage(1);
  }, [searchQuery, filterStatus]);

  // Notification count = number of reports
  const notifCount = reports.length;

  const handleNext = () => {
    let errs = {};
    if (step === 0) errs = validateStep0(complainant, consents);
    if (step === 1) errs = validateStep1(complainant);
    if (step === 2) errs = validateStep2(incident);
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
    const oversizedFiles = (evidence.files || []).filter(
      (file) => (file.size || 0) > MAX_EVIDENCE_FILE_SIZE
    );
    if (oversizedFiles.length > 0) {
      setSubmitError(`Each evidence file must be ${MAX_EVIDENCE_FILE_SIZE_LABEL} or smaller.`);
      setStep(3);
      return;
    }
    setIsSubmitting(true);
    try {
      const userToken = await AsyncStorage.getItem("user_token");
      const formData = new FormData();
      formData.append("complainant", JSON.stringify(complainant));
      formData.append("incident", JSON.stringify(incident));
      formData.append("evidence", JSON.stringify({ anonymous: false }));
      (evidence.files || []).forEach((file) => {
        formData.append("files", {
          uri: file.uri,
          name: file.name || file.fileName || `evidence-${Date.now()}`,
          type: file.mimeType || file.type || "application/octet-stream",
        });
      });

      const res = await fetch(`${API_URL}/api/case_reports/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(formatErrorMessage(body?.error || body, `Server error (${res.status})`));
      }

      setSubmitted(true);
      fetchReports();
    } catch (err) {
      setSubmitError(formatErrorMessage(err, "Failed to submit report."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setStep(0);
    setConsents({
      dataPrivacy: false,
      caseAnalysis: false,
    });
    setComplainant({
      reporteeType: "",
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

  // ── Derived filtered reports for history tab ─────────────────────────────
  const filteredReports = reports.filter((r) => {
    const statusName = getStatusName(r);
    const matchesStatus = filterStatus === 'All' || statusName === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      (r.incident_description || '').toLowerCase().includes(q) ||
      (r.incident_city || '').toLowerCase().includes(q) ||
      (r.case_report_id ? String(r.case_report_id).toLowerCase().includes(q) : false);
    return matchesStatus && matchesSearch;
  });
  const historyTotalPages = Math.max(1, Math.ceil(filteredReports.length / HISTORY_PAGE_SIZE));
  const clampedHistoryPage = Math.min(historyPage, historyTotalPages);
  const paginatedReports = filteredReports.slice(
    (clampedHistoryPage - 1) * HISTORY_PAGE_SIZE,
    clampedHistoryPage * HISTORY_PAGE_SIZE
  );
  const historyStart = filteredReports.length === 0 ? 0 : (clampedHistoryPage - 1) * HISTORY_PAGE_SIZE + 1;
  const historyEnd = Math.min(clampedHistoryPage * HISTORY_PAGE_SIZE, filteredReports.length);

  useEffect(() => {
    if (historyPage > historyTotalPages) setHistoryPage(historyTotalPages);
  }, [historyPage, historyTotalPages]);

  return (
    <View style={s.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
      <Navbar onBurger={() => setNavOpen(true)} notifCount={notifCount} />

      {/* ── Tab Bar ── */}
      <View style={s.tabBar}>
        <Pressable
          style={[s.tabItem, activeTab === 'submit' && s.tabItemActive]}
          onPress={() => { setActiveTab('submit'); setSubmitted(false); setStep(0); }}
        >
          <Ionicons name="document-text-outline" size={16} color={activeTab === 'submit' ? TEAL : '#9ca3af'} />
          <Text style={[s.tabLabel, activeTab === 'submit' && s.tabLabelActive]}>Submit Report</Text>
        </Pressable>
        <Pressable
          style={[s.tabItem, activeTab === 'history' && s.tabItemActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons name="time-outline" size={16} color={activeTab === 'history' ? TEAL : '#9ca3af'} />
          <Text style={[s.tabLabel, activeTab === 'history' && s.tabLabelActive]}>Report History</Text>
          {reports.length > 0 && (
            <View style={s.tabBadge}><Text style={s.tabBadgeText}>{reports.length}</Text></View>
          )}
        </Pressable>
      </View>

      {/* ══════════════ SUBMIT TAB ══════════════ */}
      {activeTab === 'submit' && (
        submitted ? (
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
              <Pressable style={[s.backBtn, { marginTop: 10, borderColor: ORANGE }]} onPress={() => { handleReset(); setActiveTab('history'); }}>
                <Text style={[s.backBtnText, { color: ORANGE }]}>View Report History →</Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            <ScrollView style={s.scroll} contentContainerStyle={[s.scrollContent, { paddingTop: 0 }]}>
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

              <WizardStepper current={step} />

              {step === 0 && <StepConsent complainant={complainant} onComplainantChange={setComplainant} consents={consents} onConsentChange={(key, val) => setConsents((prev) => ({ ...prev, [key]: val }))} errors={errors} />}
              {step === 1 && <StepComplainantInfo data={complainant} onChange={setComplainant} errors={errors} />}
              {step === 2 && <StepIncidentDetails data={incident} onChange={setIncident} errors={errors} />}
              {step === 3 && <StepEvidence data={evidence} onChange={setEvidence} />}
              {step === 4 && <StepReview complainant={complainant} incident={incident} evidence={evidence} />}

              {submitError && (
                <View style={s.errorAlert}>
                  <Ionicons name="alert-circle-outline" size={16} color={ERROR} />
                  <Text style={s.errorAlertText}>{submitError}</Text>
                </View>
              )}
            </ScrollView>

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
                  {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Submit Report</Text>}
                </Pressable>
              )}
            </View>
          </View>
        )
      )}

      {/* ══════════════ HISTORY TAB ══════════════ */}
      {activeTab === 'history' && (
        <View style={{ flex: 1 }}>
          {/* Search + Filter bar */}
          <View style={s.historyToolbar}>
            <View style={s.historySearchWrap}>
              <Feather name="search" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
              <TextInput
                style={s.historySearchInput}
                placeholder="Search by description, city, ID…"
                placeholderTextColor="#aaa"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#aaa" />
                </Pressable>
              )}
            </View>
            <Pressable style={s.filterBtn} onPress={() => setFilterOpen(!filterOpen)}>
              <Ionicons name="filter" size={16} color={filterStatus !== 'All' ? TEAL : '#6b7280'} />
              <Text style={[s.filterBtnText, filterStatus !== 'All' && { color: TEAL }]}>
                {filterStatus}
              </Text>
            </Pressable>
          </View>

          {/* Filter dropdown */}
          {filterOpen && (
            <View style={s.filterDropdown}>
              {['All', 'Submitted', 'For Verification', 'Undergoing Review', 'Under Case Evaluation', 'Case Filed', 'Investigation Ongoing', 'Resolved', 'Withdrawn'].map((opt) => (
                <Pressable
                  key={opt}
                  style={[s.filterOption, filterStatus === opt && s.filterOptionActive]}
                  onPress={() => { setFilterStatus(opt); setFilterOpen(false); }}
                >
                  <Text style={[s.filterOptionText, filterStatus === opt && s.filterOptionTextActive]}>{opt}</Text>
                  {filterStatus === opt && <Ionicons name="checkmark" size={16} color={TEAL} />}
                </Pressable>
              ))}
            </View>
          )}

          {/* Results count */}
          <View style={s.historyCountRow}>
            <Text style={s.historyCount}>
              {loadingReports
                ? 'Loading…'
                : filteredReports.length
                  ? `${historyStart}-${historyEnd} of ${filteredReports.length} reports`
                  : '0 reports found'}
            </Text>
            {(searchQuery || filterStatus !== 'All') && (
              <Pressable onPress={() => { setSearchQuery(''); setFilterStatus('All'); }}>
                <Text style={s.historyClearText}>Clear filters</Text>
              </Pressable>
            )}
          </View>

          <ScrollView contentContainerStyle={s.historyList}>
            {loadingReports ? (
              <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
            ) : filteredReports.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="document-outline" size={48} color="#d1d5db" />
                <Text style={s.emptyStateText}>
                  {reports.length === 0 ? 'No reports submitted yet.' : 'No reports match your search.'}
                </Text>
              </View>
            ) : (
              paginatedReports.map((r, i) => {
                const statusName = getStatusName(r);
                const statusColor = STATUS_COLORS[statusName] || STATUS_COLORS['Submitted'];
                const displayId = getReportId(r, historyStart + i);
                const statusDisplay = STATUS_DISPLAY[statusName] || STATUS_DISPLAY.Submitted;
                const middle = statusDisplay.middle || r.previous_status_name || 'In Progress';
                const steps = ['Submitted', middle, TERMINAL_STATUSES.includes(statusName) ? statusName : 'Resolved'];
                const followUpAllowed = !TERMINAL_STATUSES.includes(statusName);
                const followUpActive = r.follow_up_summary?.type === 'user_change_request' && ['open', 'responded'].includes(r.follow_up_summary?.status);
                const canWithdraw = (WITHDRAWAL_ALLOWED.includes(statusName) || WITHDRAWAL_REQUIRES_APPROVAL.includes(statusName)) && r.withdrawal_request?.status !== 'pending';
                const withdrawalCopy = getWithdrawalCopy(statusName);
                return (
                  <View key={r.case_report_id || i} style={s.historyCard}>
                    <View style={[s.historyAccent, { backgroundColor: statusColor.text }]} />
                    <View style={s.historyCardHeader}>
                      <View style={s.historyIdentity}>
                        <Text style={s.historyEyebrow}>Report ID</Text>
                        <Text style={s.historyCardId}>{displayId}</Text>
                        <Text style={s.historyCardDate}>
                          {r.incident_date ? new Date(r.incident_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                        </Text>
                      </View>
                      <View style={[s.historyStatusBadge, { backgroundColor: statusColor.bg }]}>
                        <Text style={[s.historyStatusText, { color: statusColor.text }]}>{statusName}</Text>
                      </View>
                    </View>
                    <View style={s.historyCardDivider} />
                    <View style={s.historyCardBody}>
                      <View style={s.historyDetailRow}>
                        <Ionicons name="location-outline" size={14} color="#9ca3af" />
                        <Text style={s.historyDetailText}>{r.incident_city || '—'}</Text>
                      </View>
                      <View style={s.historyDetailRow}>
                        <Ionicons name="document-text-outline" size={14} color="#9ca3af" />
                        <Text style={s.historyDetailText} numberOfLines={2}>
                          {r.incident_description || '—'}
                        </Text>
                      </View>
                      <View style={s.historyDetailRow}>
                        <Ionicons name="person-outline" size={14} color="#9ca3af" />
                        <Text style={s.historyDetailText}>{r.assigned_personnel || r.assigned_officer || 'Unassigned'}</Text>
                      </View>
                      {r.follow_up_summary && (
                        <View style={s.followBadge}>
                          <View style={s.followBadgeDot} />
                          <Text style={s.followBadgeText}>
                            {r.follow_up_summary.awaiting_role === 'user' ? 'Action Needed' : 'Follow-up Pending'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <StatusStepper steps={steps} current={statusDisplay.phase} />
                    <View style={s.historyActions}>
                      <Pressable
                        style={[s.historyActionBtn, (!followUpAllowed || followUpActive) && s.historyActionDisabled]}
                        disabled={!followUpAllowed || followUpActive}
                        onPress={() => openFollowUp(r)}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={15} color={(!followUpAllowed || followUpActive) ? '#9ca3af' : TEAL} />
                        <Text style={[s.historyActionText, (!followUpAllowed || followUpActive) && s.historyActionTextDisabled]}>Follow Up</Text>
                      </Pressable>
                      {(WITHDRAWAL_ALLOWED.includes(statusName) || WITHDRAWAL_REQUIRES_APPROVAL.includes(statusName)) && (
                        <Pressable
                          style={[s.historyActionBtn, s.withdrawActionBtn, !canWithdraw && s.historyActionDisabled]}
                          disabled={!canWithdraw}
                          onPress={() => {
                            setActionError('');
                            setWithdrawReport(r);
                            setWithdrawReason('');
                            setWithdrawFile(null);
                          }}
                        >
                          <Ionicons name="archive-outline" size={15} color={!canWithdraw ? '#9ca3af' : ORANGE} />
                          <Text style={[s.historyActionText, s.withdrawActionText, !canWithdraw && s.historyActionTextDisabled]}>
                            {r.withdrawal_request?.status === 'pending' ? 'Pending' : withdrawalCopy.buttonLabel}
                          </Text>
                        </Pressable>
                      )}
                      <Pressable
                        style={[s.historyActionBtn, s.viewActionBtn]}
                        onPress={() => router.push({ pathname: '/(complainant)/report-detail', params: { caseId: r.case_report_id || r.id, displayId } })}
                      >
                        <Ionicons name="eye-outline" size={15} color="#fff" />
                        <Text style={s.viewActionText}>View</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
            {!loadingReports && filteredReports.length > HISTORY_PAGE_SIZE && (
              <View style={s.paginationBar}>
                <Pressable
                  style={[s.pageButton, clampedHistoryPage === 1 && s.pageButtonDisabled]}
                  disabled={clampedHistoryPage === 1}
                  onPress={() => setHistoryPage((page) => Math.max(1, page - 1))}
                >
                  <Ionicons name="chevron-back" size={16} color={clampedHistoryPage === 1 ? '#9ca3af' : TEAL} />
                  <Text style={[s.pageButtonText, clampedHistoryPage === 1 && s.pageButtonTextDisabled]}>Previous</Text>
                </Pressable>
                <Text style={s.pageIndicator}>Page {clampedHistoryPage} of {historyTotalPages}</Text>
                <Pressable
                  style={[s.pageButton, clampedHistoryPage === historyTotalPages && s.pageButtonDisabled]}
                  disabled={clampedHistoryPage === historyTotalPages}
                  onPress={() => setHistoryPage((page) => Math.min(historyTotalPages, page + 1))}
                >
                  <Text style={[s.pageButtonText, clampedHistoryPage === historyTotalPages && s.pageButtonTextDisabled]}>Next</Text>
                  <Ionicons name="chevron-forward" size={16} color={clampedHistoryPage === historyTotalPages ? '#9ca3af' : TEAL} />
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      <Modal visible={Boolean(followUpReport)} transparent animationType="fade" onRequestClose={() => !followUpSubmitting && setFollowUpReport(null)}>
        <View style={s.actionModalOverlay}>
          <View style={s.actionModal}>
            <View style={s.actionModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.actionModalTitle}>Follow Up</Text>
                <Text style={s.actionModalSubtitle}>Tell the case team what you need to correct or add.</Text>
              </View>
              <Pressable disabled={followUpSubmitting} onPress={() => setFollowUpReport(null)}>
                <Ionicons name="close" size={22} color="#374151" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 6 }}>
              <Text style={s.modalLabel}>Reason</Text>
              <Pressable style={s.reasonSelect} onPress={() => setFollowUpReasonOpen((open) => !open)}>
                <View style={{ flex: 1 }}>
                  <Text style={s.reasonTitle}>{FOLLOW_UP_REASON_OPTIONS.find((option) => option.value === followUpReason)?.label}</Text>
                  <Text style={s.reasonHelp}>{FOLLOW_UP_REASON_OPTIONS.find((option) => option.value === followUpReason)?.description}</Text>
                </View>
                <Ionicons name={followUpReasonOpen ? 'chevron-up' : 'chevron-down'} size={18} color={TEAL} />
              </Pressable>
              {followUpReasonOpen && (
                <View style={s.reasonDropdown}>
                  {FOLLOW_UP_REASON_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[s.reasonOption, followUpReason === option.value && s.reasonOptionActive]}
                      onPress={() => {
                        setFollowUpReason(option.value);
                        setFollowUpFields([]);
                        setFollowUpReasonOpen(false);
                        setActionError('');
                      }}
                    >
                      <Text style={[s.reasonOptionTitle, followUpReason === option.value && { color: TEAL }]}>{option.label}</Text>
                      <Text style={s.reasonOptionHelp}>{option.description}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {followUpReason !== 'Other' && (
                <>
                  <Text style={s.modalLabel}>
                    {followUpReason === 'Additional info' ? 'What information would you like to add?' : 'Which information would you like to correct?'} <Text style={{ color: ERROR }}>*</Text>
                  </Text>
                  <View style={s.checkList}>
                    {getFollowUpGroupsForReason(followUpReason).map((field) => {
                      const checked = field.fields.every((item) => followUpFields.includes(item));
                      return (
                        <Pressable key={field.label} style={s.checkRow} onPress={() => toggleFollowUpField(field)}>
                          <View style={[s.checkBox, checked && s.checkBoxActive]}>
                            {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
                          </View>
                          <Text style={s.checkText}>{field.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
              <Text style={s.modalLabel}>We're here to help. Please let us know what changed so we can support you. <Text style={{ color: ERROR }}>*</Text></Text>
              <TextInput
                style={s.modalTextarea}
                multiline
                value={followUpMessage}
                onChangeText={(text) => {
                  setActionError('');
                  setFollowUpMessage(text);
                }}
                placeholder="Describe the correction or additional information..."
                placeholderTextColor="#9ca3af"
              />
              {actionError ? <Text style={s.modalError}>{actionError}</Text> : null}
              <View style={s.modalActions}>
                <Pressable style={s.modalCancelBtn} disabled={followUpSubmitting} onPress={() => setFollowUpReport(null)}>
                  <Text style={s.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={[s.modalPrimaryBtn, followUpSubmitting && { opacity: 0.7 }]} disabled={followUpSubmitting} onPress={submitFollowUp}>
                  {followUpSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={s.modalPrimaryText}>Submit Follow-up</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(withdrawReport)} transparent animationType="fade" onRequestClose={() => !withdrawing && setWithdrawReport(null)}>
        <View style={s.actionModalOverlay}>
          <View style={s.actionModal}>
            <View style={s.actionModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.actionModalTitle}>{withdrawReport ? getWithdrawalCopy(getStatusName(withdrawReport)).title : 'Withdraw Case Report'}</Text>
                <Text style={s.actionModalSubtitle}>
                  {withdrawReport ? `${getReportId(withdrawReport)} (report ID): ${getWithdrawalCopy(getStatusName(withdrawReport)).description}` : ''}
                </Text>
              </View>
              <Pressable disabled={withdrawing} onPress={() => setWithdrawReport(null)}>
                <Ionicons name="close" size={22} color="#374151" />
              </Pressable>
            </View>
            <Text style={s.modalLabel}>Reason for withdrawal</Text>
            <TextInput
              style={s.modalTextarea}
              multiline
              value={withdrawReason}
              onChangeText={(text) => {
                setActionError('');
                setWithdrawReason(text);
              }}
              placeholder="Explain why you want to withdraw this case."
              placeholderTextColor="#9ca3af"
            />
            {withdrawReport && getWithdrawalCopy(getStatusName(withdrawReport)).requiresAffidavit && (
              <Pressable style={s.filePickBtn} onPress={pickWithdrawFile}>
                <Ionicons name="document-attach-outline" size={17} color={TEAL} />
                <Text style={s.filePickText}>{withdrawFile?.name || 'Attach withdrawal document'}</Text>
              </Pressable>
            )}
            {actionError ? <Text style={s.modalError}>{actionError}</Text> : null}
            <View style={s.modalActions}>
              <Pressable style={s.modalCancelBtn} disabled={withdrawing} onPress={() => setWithdrawReport(null)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[s.modalDangerBtn, withdrawing && { opacity: 0.7 }]} disabled={withdrawing} onPress={submitWithdrawal}>
                {withdrawing ? <ActivityIndicator color="#fff" /> : <Text style={s.modalDangerText}>Confirm Withdrawal</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    marginBottom: 8,
  },
  heroLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  heroLabelLine: {
    width: 32,
    height: 3,
    backgroundColor: ORANGE,
    borderRadius: 3,
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
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  stepContainer: {
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    gap: 2,
  },
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
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 14,
    color: "#1a1a1a",
    backgroundColor: "#fff",
  },
  inputError: { borderColor: ERROR },
  inputReadonly: { backgroundColor: "#f0f0f0", color: "#888" },

  // Picker trigger (shared by date & time)
  pickerField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    backgroundColor: "#fff",
  },
  pickerFieldText: { fontSize: 14, color: "#aaa", flex: 1 },

  // Modal overlay + card
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  pickerModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  pickerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  pickerModalTitle: { fontSize: 17, fontWeight: "800", color: "#1a1a1a" },

  // Date picker preview
  datePreview: {
    fontSize: 22,
    fontWeight: "900",
    color: TEAL,
    textAlign: "center",
    paddingVertical: 14,
    letterSpacing: 0.5,
  },

  // Time picker preview
  timePreview: {
    fontSize: 36,
    fontWeight: "900",
    color: TEAL,
    textAlign: "center",
    paddingVertical: 16,
    letterSpacing: 2,
  },


  // Drum row
  timeDrumRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  timeDrumWrap: { alignItems: "center", flex: 1 },
  timeDrumLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timeDrum: { maxHeight: 180, width: "100%" },
  timeDrumItem: {
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
    marginVertical: 2,
  },
  timeDrumItemActive: { backgroundColor: "#e6f5f5" },
  timeDrumItemText: { fontSize: 18, color: "#6b7280", fontWeight: "500" },
  timeDrumItemTextActive: { color: TEAL, fontWeight: "800" },
  timeSep: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1a1a1a",
    marginTop: 34,
  },

  // AM/PM toggle
  periodWrap: { gap: 8, marginTop: 2 },
  periodBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  periodBtnActive: { backgroundColor: TEAL, borderColor: TEAL },
  periodBtnText: { fontSize: 14, fontWeight: "700", color: "#9ca3af" },
  periodBtnTextActive: { color: "#fff" },

  // Confirm button
  pickerConfirmBtn: {
    backgroundColor: TEAL,
    margin: 16,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  pickerConfirmBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  // Calendar month/year jump bar
  calJumpBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  calJumpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fafb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#d1f0f0",
  },
  calJumpBtnText: { fontSize: 14, fontWeight: "700", color: TEAL },
  calDropdown: {
    maxHeight: 220,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  calDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  calDropdownItemActive: { backgroundColor: "#f0fafb" },
  calDropdownText: { fontSize: 14, color: "#374151" },
  calDropdownTextActive: { color: TEAL, fontWeight: "700" },


  // Select
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    backgroundColor: "#fff",
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
  radioRow: { flexDirection: "column", gap: 12 },
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
  radioText: { fontSize: 14, color: "#1a1a1a", flex: 1, flexWrap: "wrap", lineHeight: 20 },

  // Checkbox
  checkboxRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 4 },
  checkboxOuter: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#aaa",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxOuterActive: { borderColor: TEAL, backgroundColor: TEAL },
  checkboxText: { fontSize: 13, color: "#1a1a1a", flex: 1, lineHeight: 18 },

  // Notice Panel
  noticePanel: {
    backgroundColor: "rgba(3, 127, 129, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(3, 127, 129, 0.2)",
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  noticeItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: TEAL,
    marginBottom: 4,
  },
  noticeItemDesc: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 20,
  },

  // Credentials / Evidence
  credSection: {
    backgroundColor: "#f8fbfb",
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#dbe7e7",
  },
  dropZone: {
    borderWidth: 2,
    borderColor: "#8fd2d1",
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
  },
  uploadIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#f0fafb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#cde8e8",
  },
  dropText: { color: "#111827", fontSize: 16, fontWeight: "900", textAlign: "center" },
  dropSubtext: { color: "#6b7280", fontSize: 12, textAlign: "center", lineHeight: 17 },
  browseBtn: {
    backgroundColor: TEAL,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  browseBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  dropHint: {
    color: "#6b7280",
    fontSize: 11,
    textAlign: "center",
    fontWeight: "700",
  },
  fileList: { gap: 8 },
  fileListTitle: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 13,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  fileIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0fafb",
    alignItems: "center",
    justifyContent: "center",
  },
  fileMeta: { flex: 1 },
  fileName: { color: "#111827", fontSize: 12, fontWeight: "800" },
  fileSize: { color: "#6b7280", fontSize: 10, marginTop: 2 },
  fileRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  noFilesBox: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  noFilesText: { color: "#6b7280", fontSize: 12, fontWeight: "700" },
  uploadModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.55)",
    justifyContent: "flex-end",
  },
  uploadModalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
  },
  uploadModalHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#d1d5db",
    alignSelf: "center",
    marginBottom: 14,
  },
  uploadModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  uploadModalTitle: { fontSize: 19, fontWeight: "900", color: "#111827" },
  uploadModalSubtitle: { fontSize: 12, color: "#6b7280", lineHeight: 18, marginTop: 3 },
  uploadModalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  uploadOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0fafb",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadOptionTextWrap: { flex: 1 },
  uploadOptionTitle: { fontSize: 14, color: "#111827", fontWeight: "900" },
  uploadOptionDesc: { fontSize: 12, color: "#6b7280", lineHeight: 17, marginTop: 2 },

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
    padding: 20,
    backgroundColor: "transparent",
    gap: 12,
  },
  backBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: TEAL,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  backBtnText: { color: TEAL, fontWeight: "700", fontSize: 14 },
  nextBtn: {
    flex: 1,
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    elevation: 3,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  submitBtn: {
    flex: 1,
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    elevation: 3,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
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

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: TEAL },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  tabLabelActive: { color: TEAL },
  tabBadge: {
    backgroundColor: ORANGE,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  // History toolbar
  historyToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  historySearchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  historySearchInput: { flex: 1, fontSize: 13, color: '#1a1a1a', padding: 0 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterBtnText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  filterDropdown: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    zIndex: 100,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterOptionActive: { backgroundColor: '#f0fafb' },
  filterOptionText: { fontSize: 13, color: '#1a1a1a' },
  filterOptionTextActive: { color: TEAL, fontWeight: '700' },

  // History results info
  historyCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  historyCount: { fontSize: 12, color: '#6b7280' },
  historyClearText: { fontSize: 12, color: ORANGE, fontWeight: '600' },

  // History list
  historyList: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  paginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
    paddingVertical: 6,
  },
  pageButton: {
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cde8e8',
    backgroundColor: '#f0fafb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
  },
  pageButtonDisabled: { backgroundColor: '#f9fafb', borderColor: BORDER },
  pageButtonText: { color: TEAL, fontSize: 12, fontWeight: '900' },
  pageButtonTextDisabled: { color: '#9ca3af' },
  pageIndicator: { flex: 1, textAlign: 'center', color: '#6b7280', fontSize: 12, fontWeight: '800' },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe7e7',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  historyAccent: {
    height: 4,
    width: '100%',
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 12,
  },
  historyIdentity: { flex: 1, paddingRight: 10 },
  historyEyebrow: { fontSize: 10, fontWeight: '900', color: '#6b7280', textTransform: 'uppercase', marginBottom: 2 },
  historyCardId: { fontSize: 18, fontWeight: '900', color: '#111827' },
  historyCardDate: { fontSize: 11, color: '#6b7280', marginTop: 3, fontWeight: '700' },
  historyStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    maxWidth: 150,
  },
  historyStatusText: { fontSize: 10, fontWeight: '900', textAlign: 'center' },
  historyCardDivider: { height: 1, backgroundColor: '#edf2f2', marginHorizontal: 15 },
  historyCardBody: { padding: 15, gap: 8 },
  historyDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  historyDetailText: { flex: 1, fontSize: 12, color: '#374151', lineHeight: 18, fontWeight: '600' },
  followBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff7ed',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  followBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ORANGE },
  followBadgeText: { fontSize: 11, fontWeight: '800', color: '#9a3412' },
  historyActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 15,
  },
  historyActionBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cde8e8',
    backgroundColor: '#f0fafb',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 6,
  },
  historyActionDisabled: { backgroundColor: '#f9fafb', borderColor: BORDER },
  historyActionText: { fontSize: 11, fontWeight: '800', color: TEAL },
  historyActionTextDisabled: { color: '#9ca3af' },
  withdrawActionBtn: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  withdrawActionText: { color: ORANGE },
  viewActionBtn: { backgroundColor: TEAL, borderColor: TEAL },
  viewActionText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.55)',
    justifyContent: 'center',
    padding: 18,
  },
  actionModal: {
    maxHeight: '88%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 14,
  },
  actionModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 14,
  },
  actionModalTitle: { fontSize: 19, fontWeight: '900', color: '#111827' },
  actionModalSubtitle: { fontSize: 12, lineHeight: 18, color: '#6b7280', marginTop: 4 },
  modalLabel: { fontSize: 12, fontWeight: '800', color: '#374151', marginBottom: 8, marginTop: 10 },
  reasonBox: {
    borderWidth: 1,
    borderColor: '#cde8e8',
    backgroundColor: '#f0fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  reasonSelect: {
    borderWidth: 1,
    borderColor: '#cde8e8',
    backgroundColor: '#f0fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reasonDropdown: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  reasonOption: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  reasonOptionActive: { backgroundColor: '#f0fafb' },
  reasonOptionTitle: { color: '#111827', fontSize: 13, fontWeight: '900', marginBottom: 3 },
  reasonOptionHelp: { color: '#6b7280', fontSize: 12, lineHeight: 16 },
  reasonTitle: { fontSize: 13, fontWeight: '900', color: TEAL, marginBottom: 3 },
  reasonHelp: { fontSize: 12, color: '#4b5563', lineHeight: 17 },
  checkList: { gap: 8, marginBottom: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: { backgroundColor: TEAL, borderColor: TEAL },
  checkText: { flex: 1, fontSize: 13, color: '#1f2937', lineHeight: 18 },
  modalTextarea: {
    minHeight: 106,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    color: '#111827',
    fontSize: 13,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  modalError: { color: ERROR, fontSize: 12, fontWeight: '700', marginTop: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: { color: '#374151', fontSize: 13, fontWeight: '800' },
  modalPrimaryBtn: {
    flex: 1.4,
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  modalDangerBtn: {
    flex: 1.4,
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalDangerText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  filePickBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#cde8e8',
    backgroundColor: '#f0fafb',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filePickText: { flex: 1, color: TEAL, fontSize: 13, fontWeight: '800' },
});
