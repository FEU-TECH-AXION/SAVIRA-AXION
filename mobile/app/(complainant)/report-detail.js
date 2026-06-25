import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Image,
  Modal,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';

const TEAL = '#037F81';
const ORANGE = '#E96433';
const BORDER = '#e5e7eb';
const BG = '#f5f7f8';
const ERROR = '#dc2626';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

const STATUS_BY_ID = {
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

const STATUS_COPY = {
  Submitted: {
    title: 'Your report has been received',
    body: 'SASHA has received your report. An intake officer has logged your case and is checking the basic details, such as your identity, the nature of the incident, urgency, and available evidence. Your case is in the queue for initial screening. Your privacy and confidentiality are a priority at this stage.',
  },
  'For Verification': {
    title: 'Your report has been received',
    body: 'SASHA has received your report. An intake officer has logged your case and is checking the basic details, such as your identity, the nature of the incident, urgency, and available evidence. Your case is in the queue for initial screening. Your privacy and confidentiality are a priority at this stage.',
  },
  'Undergoing Review': {
    title: 'Your report is under review',
    body: 'The case team is reviewing the submitted details and any available evidence. You may be contacted if clarification or additional information is needed.',
  },
  'Verified - True': {
    title: 'Your report has been verified',
    body: 'The report has passed initial verification and will move forward for case evaluation and appropriate next steps.',
  },
  Resolved: {
    title: 'Your case has been resolved',
    body: 'The case team has completed the recorded action for this report. The case remains part of the protected audit record.',
  },
  Withdrawn: {
    title: 'This case has been withdrawn',
    body: 'The report has been archived after withdrawal. The withdrawal remains part of the case audit record.',
  },
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

const INTERVIEW_STATUS_COLORS = {
  Invited: { bg: '#fff7ed', fg: '#9a3412', border: '#fed7aa' },
  Scheduled: { bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe' },
  Confirmed: { bg: '#ecfdf5', fg: '#047857', border: '#bbf7d0' },
  Completed: { bg: '#ecfdf5', fg: '#047857', border: '#bbf7d0' },
  Cancelled: { bg: '#fef2f2', fg: '#b91c1c', border: '#fecaca' },
  Expired: { bg: '#f8fafc', fg: '#64748b', border: '#e2e8f0' },
  'Awaiting New Slots': { bg: '#fff7ed', fg: '#9a3412', border: '#fed7aa' },
};

function getFollowUpFieldLabels(selectedFields) {
  return FOLLOW_UP_FIELDS
    .filter((group) => group.fields.some((field) => selectedFields.includes(field)))
    .map((group) => group.label);
}

function getFollowUpGroupsForReason(reason) {
  const selectedReason = FOLLOW_UP_REASON_OPTIONS.find((option) => option.value === reason);
  return FOLLOW_UP_FIELDS.filter((group) => selectedReason?.groupIds.includes(group.id));
}

function valueOf(value) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Not provided';
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (value === null || value === undefined || value === '') return 'Not provided';
  return String(value);
}

function yesNo(value) {
  if (value === true || value === 'true' || value === 'Yes') return 'Yes';
  if (value === false || value === 'false' || value === 'No') return 'No';
  return valueOf(value);
}

function dateOf(value, short = false) {
  if (!value) return 'Not provided';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-PH', short
    ? { month: 'numeric', day: 'numeric', year: 'numeric' }
    : { year: 'numeric', month: 'long', day: 'numeric' });
}

function timeOf(value) {
  if (!value) return 'Not provided';
  const date = new Date(value);
  if (!Number.isNaN(date.getTime()) && String(value).includes('T')) {
    return date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  }
  const parts = String(value).split(':');
  if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
    const hour = Number(parts[0]);
    const minute = parts[1];
    const suffix = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${minute.padStart(2, '0')} ${suffix}`;
  }
  return String(value);
}

function parseMaybeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return value ? [value] : [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch (_) {
    return value ? [value] : [];
  }
}

function getEvidenceName(evidence, index) {
  return evidence?.original_name || evidence?.file_name || evidence?.name || evidence?.file_path || `Evidence file ${index + 1}`;
}

function getEvidenceUrl(evidence) {
  return evidence?.url || evidence?.file_url || evidence?.public_url || evidence?.uri || '';
}

function getEvidenceKind(evidence) {
  const type = String(evidence?.evidence_type || evidence?.mimeType || evidence?.mime_type || '').toLowerCase();
  const name = String(getEvidenceName(evidence, 0) || getEvidenceUrl(evidence)).toLowerCase();
  if (type.startsWith('image/') || type === 'photo' || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return 'image';
  if (type.startsWith('video/') || type === 'video' || /\.(mp4|mov|avi|webm|mkv)$/.test(name)) return 'video';
  if (type.includes('pdf') || type === 'document' || /\.(pdf|docx?|txt|rtf|odt)$/.test(name)) return 'document';
  return 'file';
}

function getStatusName(report) {
  return report?.case_status?.status_name || report?.status || STATUS_BY_ID[report?.case_status_id] || 'Submitted';
}

function formatInterviewStatus(status) {
  if (!status) return 'Scheduled';
  return String(status)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function parseInterviewNotes(notes) {
  if (!notes) return { venue: null, notes: null };
  const text = String(notes);
  const venueMatch = text.match(/Location \/ Platform:\s*([^\n]+)/i);
  const notesMatch = text.match(/Notes:\s*([\s\S]+)/i);
  return {
    venue: venueMatch?.[1]?.trim() || null,
    notes: notesMatch?.[1]?.trim() || text,
  };
}

function mapInterview(raw) {
  const parsedNotes = parseInterviewNotes(raw?.notes);
  return {
    ...raw,
    id: raw?.interview_id || raw?.id,
    interviewStatus: formatInterviewStatus(raw?.status),
    scheduledDate: raw?.slot?.slot_date || raw?.interview_date || null,
    scheduledTime: raw?.slot?.slot_time?.slice?.(0, 5) || raw?.interview_time?.slice?.(0, 5) || null,
    location: parsedNotes.venue || raw?.location || null,
    notes: parsedNotes.notes,
    meetingLink: raw?.meeting_link || raw?.meetingLink || null,
    expiresAt: raw?.slot_expires_at || raw?.expiresAt || null,
    availabilityRequest: raw?.availability_request_reason || raw?.availabilityRequest || null,
  };
}

function isInterviewWilling(report) {
  const value = report?.is_willing_for_interview ?? report?.is_willing_to_be_interviewed ?? report?.willing_for_interview;
  if (value === undefined || value === null || value === '') return true;
  if (typeof value === 'string') return !['false', 'no', '0'].includes(value.trim().toLowerCase());
  return Boolean(value);
}

function getReportId(report, paramId, caseId) {
  if (paramId) return paramId;
  const raw = report?.case_report_id || report?.id || caseId;
  const createdAt = report?.created_at || report?.incident_date;
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  return `${year}-${String(raw).padStart(3, '0')}`;
}

function getNameFromUser(user, fallback) {
  const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  return name || fallback || 'Unassigned';
}

function getAssignedOfficer(report) {
  return (
    report?.assigned_personnel ||
    report?.assigned_officer ||
    getNameFromUser(report?.assignedOfficer?.users) ||
    getNameFromUser(report?.case_officer?.users) ||
    getNameFromUser(report?.case_assignments?.find?.((item) => item?.is_active)?.case_officers?.users) ||
    'Unassigned'
  );
}

function getWithdrawalCopy(status) {
  if (status === 'Case Filed') {
    return {
      buttonLabel: 'Request Withdrawal',
      title: 'Request Case Withdrawal',
      description: 'This case has already been filed. Your request requires approval and an Affidavit of Desistance or equivalent official document.',
      requiresAffidavit: true,
      requiresApproval: true,
    };
  }
  if (status === 'Investigation Ongoing') {
    return {
      buttonLabel: 'Request Withdrawal',
      title: 'Request Case Withdrawal',
      description: 'An investigation is active. Explain why you are requesting withdrawal; an administrator or case officer must approve it.',
      requiresAffidavit: false,
      requiresApproval: true,
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

function DetailRow({ label, value }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{valueOf(value)}</Text>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ActionButton({ icon, label, tone = 'plain', disabled, onPress }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        s.actionButton,
        tone === 'danger' && s.actionDanger,
        tone === 'primary' && s.actionPrimary,
        disabled && s.actionDisabled,
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={disabled ? '#9ca3af' : tone === 'primary' ? '#fff' : tone === 'danger' ? ORANGE : TEAL}
      />
      <Text
        style={[
          s.actionText,
          tone === 'danger' && s.actionDangerText,
          tone === 'primary' && s.actionPrimaryText,
          disabled && s.actionDisabledText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function getRequestTitle(request) {
  return request?.type === 'officer_clarification_request' ? 'Clarification Request' : 'Change Request';
}

function getRequestStatusLabel(status) {
  if (status === 'resolved') return 'Resolved';
  if (status === 'rejected') return 'Rejected';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'responded') return 'Responded';
  return 'Open';
}

function getLatestFollowUpMessage(request) {
  const entries = request?.follow_up_messages || [];
  const latestEntry = entries[entries.length - 1];
  return latestEntry?.message || request?.message || 'No message provided.';
}

function getFollowUpEntries(request) {
  return [
    {
      id: `request-${request?.id}`,
      message: request?.message,
      created_at: request?.created_at,
      sender_user_id: request?.initiated_by_user_id,
      sender: request?.initiator,
    },
    ...(request?.follow_up_messages || []),
  ];
}

export default function ReportDetailScreen() {
  const router = useRouter();
  const { caseId, displayId } = useLocalSearchParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [historyOpen, setHistoryOpen] = useState(true);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpReason, setFollowUpReason] = useState('Correction needed');
  const [followUpReasonOpen, setFollowUpReasonOpen] = useState(false);
  const [followUpFields, setFollowUpFields] = useState([]);
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawFile, setWithdrawFile] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [followUpRequests, setFollowUpRequests] = useState([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [followUpsError, setFollowUpsError] = useState('');
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replySendingId, setReplySendingId] = useState(null);
  const [replyError, setReplyError] = useState('');
  const [interviews, setInterviews] = useState([]);
  const [interviewsLoading, setInterviewsLoading] = useState(false);
  const [interviewsChecked, setInterviewsChecked] = useState(false);
  const [interviewError, setInterviewError] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotSubmittingId, setSlotSubmittingId] = useState(null);
  const [availabilityOpenFor, setAvailabilityOpenFor] = useState(null);
  const [availabilityReason, setAvailabilityReason] = useState('');
  const [availabilityPreferredDate, setAvailabilityPreferredDate] = useState('');
  const [availabilityPreferredTime, setAvailabilityPreferredTime] = useState('');
  const [availabilitySubmitting, setAvailabilitySubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadReport() {
      try {
        const token = await AsyncStorage.getItem('user_token');
        const res = await fetch(`${API_URL}/api/case_reports/${caseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Failed to load report.');
        if (mounted) setReport(body.data || body);
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load report.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadReport();
    return () => {
      mounted = false;
    };
  }, [caseId]);

  async function loadFollowUps() {
    setFollowUpsLoading(true);
    setFollowUpsError('');
    try {
      const token = await AsyncStorage.getItem('user_token');
      const res = await fetch(`${API_URL}/api/case_reports/${caseId}/follow-ups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to load follow-ups.');
      setFollowUpRequests(body.data || []);
    } catch (err) {
      setFollowUpsError(err.message || 'Failed to load follow-ups.');
    } finally {
      setFollowUpsLoading(false);
    }
  }

  useEffect(() => {
    if (caseId) loadFollowUps();
  }, [caseId]);

  async function loadInterviews() {
    setInterviewsLoading(true);
    setInterviewError('');
    try {
      const token = await AsyncStorage.getItem('user_token');
      const res = await fetch(`${API_URL}/api/interviews?type=case_report&case_report_id=${caseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to load interview details.');
      setInterviews((body.data || []).map(mapInterview));
    } catch (err) {
      setInterviewError(err.message || 'Failed to load interview details.');
      setInterviews([]);
    } finally {
      setInterviewsLoading(false);
      setInterviewsChecked(true);
    }
  }

  async function loadSlots() {
    setSlotsLoading(true);
    try {
      const token = await AsyncStorage.getItem('user_token');
      const res = await fetch(`${API_URL}/api/interview_slots?slot_type=case_report&is_available=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to load available slots.');
      setSlots((body.data || []).map((slot) => ({
        ...slot,
        id: slot.slot_id || slot.id,
        date: slot.slot_date,
        time: slot.slot_time?.slice?.(0, 5) || slot.slot_time,
        duration: slot.duration_minutes,
      })));
    } catch (_) {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }

  useEffect(() => {
    if (caseId) loadInterviews();
  }, [caseId]);

  const statusName = getStatusName(report);
  const reportId = getReportId(report, displayId, caseId);
  const statusCopy = STATUS_COPY[statusName] || STATUS_COPY.Submitted;
  const location = [report?.incident_location || report?.incident_venue, report?.incident_city].filter(Boolean).join(', ');
  const requestedActions = parseMaybeArray(report?.action_requested || report?.requested_outcome || report?.outcome);
  const evidence = report?.evidences || report?.evidence || report?.files || [];
  const history = useMemo(() => {
    const rows = report?.case_status_history || report?.status_history || report?.caseStatusHistory || [];
    if (Array.isArray(rows) && rows.length) return rows;
    return [{
      id: 'current',
      status_name: statusName,
      created_at: report?.created_at,
      notes: 'Report received and logged.',
      officer_name: getAssignedOfficer(report),
    }];
  }, [report, statusName]);
  const followUps = followUpRequests.length ? followUpRequests : (report?.follow_ups || report?.followUpRequests || report?.follow_up_requests || []);
  const activeFollowUps = Array.isArray(followUps) ? followUps.filter((item) => ['open', 'responded'].includes(item.status)) : [];
  const pastFollowUps = Array.isArray(followUps) ? followUps.filter((item) => ['resolved', 'rejected', 'cancelled'].includes(item.status)) : [];
  const activeUserFollowUp = activeFollowUps.find((item) => item.type === 'user_change_request');
  const canFollowUp = !TERMINAL_STATUSES.includes(statusName) && !activeUserFollowUp;
  const canWithdraw = WITHDRAWAL_ALLOWED.includes(statusName) || WITHDRAWAL_REQUIRES_APPROVAL.includes(statusName);
  const withdrawalCopy = getWithdrawalCopy(statusName);
  const showInterviewTab = isInterviewWilling(report) && interviewsChecked && interviews.length > 0;
  const visibleTabs = [
    { id: 'details', label: 'Case Details' },
    ...(showInterviewTab ? [{ id: 'interview', label: 'Interview' }] : []),
    { id: 'followups', label: 'Follow-ups' },
  ];
  const displayedActiveTab = activeTab === 'interview' && !showInterviewTab ? 'details' : activeTab;
  const currentInterview = interviews[0] || null;

  const openFollowUp = () => {
    setActionError('');
    setFollowUpReason('Correction needed');
    setFollowUpReasonOpen(false);
    setFollowUpFields([]);
    setFollowUpMessage('');
    setFollowUpOpen(true);
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

  const submitFollowUp = async () => {
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
      const message = messageParts.join('\n\n');
      const form = new FormData();
      form.append('type', 'user_change_request');
      form.append('reason_category', followUpReason);
      form.append('message', message);
      form.append('fields_requested', JSON.stringify(followUpFields));
      form.append('message_only', 'true');
      const res = await fetch(`${API_URL}/api/case_reports/${caseId}/follow-ups`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to submit follow-up.');
      setReport((current) => ({
        ...current,
        follow_ups: [...(current?.follow_ups || []), body.data || { reason_category: followUpReason, message, created_at: new Date().toISOString(), status: 'open' }],
      }));
      await loadFollowUps();
      setFollowUpOpen(false);
      setFollowUpFields([]);
    } catch (err) {
      setActionError(err.message || 'Failed to submit follow-up.');
    } finally {
      setFollowUpSubmitting(false);
    }
  };

  const sendFollowUpReply = async (requestId) => {
    const reply = String(replyDrafts[requestId] || '').trim();
    if (!reply) {
      setReplyError('Write a reply before sending.');
      return;
    }
    setReplySendingId(requestId);
    setReplyError('');
    try {
      const token = await AsyncStorage.getItem('user_token');
      const form = new FormData();
      form.append('message', reply);
      const res = await fetch(`${API_URL}/api/follow-ups/${requestId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to send reply.');
      setReplyDrafts((current) => ({ ...current, [requestId]: '' }));
      await loadFollowUps();
    } catch (err) {
      setReplyError(err.message || 'Failed to send reply.');
    } finally {
      setReplySendingId(null);
    }
  };

  const selectInterviewSlot = async (interview, slot) => {
    setSlotSubmittingId(slot.id);
    setInterviewError('');
    try {
      const token = await AsyncStorage.getItem('user_token');
      const res = await fetch(`${API_URL}/api/interviews/${interview.id}/select-slot`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slot_id: slot.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to confirm interview slot.');
      await loadInterviews();
      await loadSlots();
    } catch (err) {
      setInterviewError(err.message || 'Failed to confirm interview slot.');
    } finally {
      setSlotSubmittingId(null);
    }
  };

  const openAvailabilityRequest = (interview) => {
    setAvailabilityOpenFor(interview);
    setAvailabilityReason('');
    setAvailabilityPreferredDate('');
    setAvailabilityPreferredTime('');
    setInterviewError('');
  };

  const submitAvailabilityRequest = async () => {
    const reason = availabilityReason.trim();
    if (!reason || !availabilityPreferredDate || !availabilityPreferredTime) {
      setInterviewError('Add your preferred date, time, and a short reason.');
      return;
    }
    setAvailabilitySubmitting(true);
    try {
      const token = await AsyncStorage.getItem('user_token');
      const res = await fetch(`${API_URL}/api/interviews/${availabilityOpenFor.id}/request-new-slots`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          reason,
          preferred_date: availabilityPreferredDate,
          preferred_time: availabilityPreferredTime,
          preferred_datetime: `${availabilityPreferredDate}T${availabilityPreferredTime}`,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to send availability request.');
      setAvailabilityOpenFor(null);
      await loadInterviews();
    } catch (err) {
      setInterviewError(err.message || 'Failed to send availability request.');
    } finally {
      setAvailabilitySubmitting(false);
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

  const openWithdraw = () => {
    setActionError('');
    setWithdrawReason('');
    setWithdrawFile(null);
    setWithdrawOpen(true);
  };

  const submitWithdrawal = async () => {
    if (!withdrawReason.trim()) {
      setActionError('Enter a reason for withdrawal.');
      return;
    }
    if (withdrawalCopy.requiresAffidavit && !withdrawFile) {
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
      const res = await fetch(`${API_URL}/api/case_reports/${caseId}/withdraw`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to withdraw case.');
      setReport((current) => withdrawalCopy.requiresApproval
        ? { ...current, withdrawal_request: body.withdrawal_request || { status: 'pending' } }
        : { ...current, case_status_id: 13, case_status: { status_name: 'Withdrawn' }, withdrawal_request: body.withdrawal_request || null }
      );
      setWithdrawOpen(false);
      setWithdrawReason('');
      setWithdrawFile(null);
    } catch (err) {
      setActionError(err.message || 'Failed to withdraw case.');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <Pressable style={s.backButton} onPress={() => router.push('/(complainant)/reports?tab=history')}>
          <Ionicons name="arrow-back" size={17} color="#fff" />
          <Text style={s.backText}>Back to Report History</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={s.centerState}>
          <ActivityIndicator color={TEAL} />
        </View>
      ) : error ? (
        <View style={s.centerState}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.hero}>
            <View>
              <Text style={s.reportId}>{reportId}</Text>
              <Text style={s.submittedText}>Submitted: {dateOf(report?.created_at || report?.incident_date)}</Text>
            </View>
            <View style={s.statusPill}>
              <Text style={s.statusText}>{statusName}</Text>
            </View>
          </View>

          <View style={s.actions}>
            <ActionButton
              icon="chatbubble-ellipses-outline"
              label="Follow Up"
              disabled={!canFollowUp}
              onPress={openFollowUp}
            />
            {canWithdraw && (
              <ActionButton
                icon="archive-outline"
                label={withdrawalCopy.buttonLabel}
                tone="danger"
                onPress={openWithdraw}
              />
            )}
          </View>

          <View style={s.tabs}>
            {visibleTabs.map((tab) => (
              <Pressable
                key={tab.id}
                style={[s.tab, displayedActiveTab === tab.id && s.tabActive]}
                onPress={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'interview' && currentInterview?.interviewStatus === 'Invited') loadSlots();
                }}
              >
                <Text style={[s.tabText, displayedActiveTab === tab.id && s.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            ))}
          </View>

          {displayedActiveTab === 'details' ? (
            <>
              <View style={s.infoPanel}>
                <Text style={s.infoTitle}>{statusCopy.title}</Text>
                <Text style={s.infoBody}>{statusCopy.body}</Text>
              </View>

              <Section title="Complainant Details">
                <DetailRow label="Name" value={report?.complainant_name || report?.name || getNameFromUser(report?.users, 'Not provided')} />
                <DetailRow label="Age" value={report?.age || report?.complainant_age} />
                <DetailRow label="Gender Identity" value={report?.gender || report?.gender_identity} />
                <DetailRow label="Email" value={report?.email} />
                <DetailRow label="Contact Number" value={report?.contact_number} />
                <DetailRow label="Willing for Interview?" value={yesNo(report?.is_willing_for_interview ?? report?.is_willing_to_be_interviewed ?? report?.willing_for_interview)} />
                <DetailRow label="Anonymous Report?" value={yesNo(report?.is_anonymous ?? report?.anonymous)} />
              </Section>

              <Section title="Incident Details">
                <DetailRow label="Location Type" value={report?.incident_location_type || report?.location_type} />
                <DetailRow label="Location" value={location} />
                <DetailRow label="Date" value={dateOf(report?.incident_date)} />
                <DetailRow label="Time" value={timeOf(report?.incident_time)} />
                <DetailRow label="Incident Description" value={report?.incident_description || report?.description} />
                <DetailRow label="Requested Action / Outcome" value={requestedActions} />
              </Section>

              <Section title="Supporting Evidence">
                {Array.isArray(evidence) && evidence.length > 0 ? (
                  evidence.map((item, index) => {
                    const kind = getEvidenceKind(item);
                    const url = getEvidenceUrl(item);
                    const name = getEvidenceName(item, index);
                    return (
                      <View key={item.id || item.evidence_id || url || index} style={kind === 'image' && url ? s.evidenceImageCard : s.evidenceItem}>
                        {kind === 'image' && url ? (
                          <>
                            <Image source={{ uri: url }} style={s.evidenceImage} resizeMode="cover" />
                            <Text style={s.evidenceImageName} numberOfLines={2}>{name}</Text>
                          </>
                        ) : (
                          <>
                            <Ionicons
                              name={kind === 'video' ? 'videocam-outline' : kind === 'document' ? 'document-text-outline' : 'document-attach-outline'}
                              size={16}
                              color={TEAL}
                            />
                            <Text style={s.evidenceText}>{name}</Text>
                          </>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <Text style={s.emptyText}>No evidence files submitted.</Text>
                )}
              </Section>

              <Section title="Perpetrator Information">
                <DetailRow label="Known to Complainant?" value={yesNo(report?.is_perpetrator_known ?? report?.perpetrator_known)} />
                <DetailRow label="Gender of Perpetrator (as perceived)" value={report?.perpetrator_gender || report?.perpetrator_unknown_gender} />
                <DetailRow label="Appearance or identifying details" value={report?.perpetrator_unknown_appearance} />
                <DetailRow label="Name" value={report?.perpetrator_name} />
                <DetailRow label="Relationship" value={report?.perpetrator_relationship} />
              </Section>

              <Section title="Witness Information">
                <DetailRow label="Are there witnesses?" value={yesNo(report?.has_witnesses ?? report?.witnesses)} />
                <DetailRow label="Witness Name" value={report?.witness_name} />
                <DetailRow label="Witness Contact" value={report?.witness_contact} />
                <DetailRow label="Relationship to Witness" value={report?.witness_relationship} />
              </Section>

              <Section title="Additional Context">
                <DetailRow label="Reported to Anyone Else?" value={yesNo(report?.reported_to_others ?? report?.told_anyone)} />
                <DetailRow label="Reported to Police?" value={yesNo(report?.reported_to_police ?? report?.told_police)} />
                <DetailRow label="Police Station" value={report?.police_station} />
              </Section>

              <Section title="Case Classification">
                <DetailRow label="Current Status" value={statusName} />
                <DetailRow label="Case Type" value={report?.case_type || 'Not yet classified'} />
                <DetailRow label="Case Categories" value={report?.case_categories || report?.primary_category || 'Not yet classified'} />
                <DetailRow label="Referral Required" value={yesNo(report?.referral_required || false)} />
                <DetailRow label="Referral Body" value={report?.referral_body || 'Unassigned'} />
                <DetailRow label="Assigned Officer" value={getAssignedOfficer(report)} />
                <DetailRow label="Endorsement" value={report?.endorsement || 'Unassigned'} />
              </Section>

              <Section title="Your Case History">
                <Text style={s.sectionIntro}>
                  Below is a timeline of your case's progress. Each entry shows what status your case moved to, when it changed, and any notes from the SASHA team.
                </Text>
                <Pressable style={s.historyToggleBtn} onPress={() => setHistoryOpen((open) => !open)}>
                  <Text style={s.historyToggle}>
                    {historyOpen ? 'Hide' : 'Show'} Status History ({history.length} {history.length === 1 ? 'entry' : 'entries'})
                  </Text>
                  <Ionicons name={historyOpen ? 'chevron-up' : 'chevron-down'} size={16} color={TEAL} />
                </Pressable>
                {historyOpen && (
                  <View style={s.timeline}>
                    {history.map((entry, index) => (
                      <View key={entry.id || index} style={s.timelineItem}>
                        <View style={s.timelineDot} />
                        <View style={s.timelineBody}>
                          <Text style={s.timelineStatus}>{entry.status_name || entry.status || statusName}</Text>
                          <Text style={s.timelineMeta}>
                            {dateOf(entry.created_at || entry.changed_at, true)} · {entry.officer_name || getNameFromUser(entry.users) || getAssignedOfficer(report)}
                          </Text>
                          <Text style={s.timelineNote}>{entry.notes || entry.note || 'Report received and logged.'}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </Section>
            </>
          ) : displayedActiveTab === 'interview' ? (
            <Section title="Interview">
              {interviewsLoading ? (
                <View style={s.followState}>
                  <ActivityIndicator color={TEAL} />
                  <Text style={s.emptyText}>Loading interview details...</Text>
                </View>
              ) : currentInterview ? (
                <>
                  <View style={s.interviewHero}>
                    <View style={s.interviewHeroIcon}>
                      <Ionicons name="calendar-outline" size={20} color={TEAL} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.interviewHeroTitle}>
                        {currentInterview.interviewStatus === 'Invited'
                          ? 'Select an Interview Slot'
                          : currentInterview.interviewStatus === 'Scheduled'
                          ? 'Waiting for Meeting Link'
                          : currentInterview.interviewStatus === 'Confirmed'
                          ? 'Your Interview is Confirmed'
                          : 'Interview Record'}
                      </Text>
                      <Text style={s.interviewHeroText}>
                        {currentInterview.interviewStatus === 'Invited'
                          ? 'You have been invited to an interview with your SASHA case officer. Please select a time slot that works for you.'
                          : currentInterview.interviewStatus === 'Scheduled'
                          ? 'Your slot has been reserved. Your case officer will confirm and send the meeting link shortly.'
                          : currentInterview.interviewStatus === 'Confirmed'
                          ? 'Everything is set. See the details below and join at the scheduled time.'
                          : 'This interview remains part of your case record.'}
                      </Text>
                    </View>
                    <View style={[
                      s.interviewStatus,
                      {
                        backgroundColor: (INTERVIEW_STATUS_COLORS[currentInterview.interviewStatus] || INTERVIEW_STATUS_COLORS.Scheduled).bg,
                        borderColor: (INTERVIEW_STATUS_COLORS[currentInterview.interviewStatus] || INTERVIEW_STATUS_COLORS.Scheduled).border,
                      },
                    ]}>
                      <Text style={[
                        s.interviewStatusText,
                        { color: (INTERVIEW_STATUS_COLORS[currentInterview.interviewStatus] || INTERVIEW_STATUS_COLORS.Scheduled).fg },
                      ]}>
                        {currentInterview.interviewStatus}
                      </Text>
                    </View>
                  </View>

                  {interviewError ? <Text style={s.followError}>{interviewError}</Text> : null}

                  {currentInterview.interviewStatus === 'Invited' && (
                    <View style={s.interviewBlock}>
                      {currentInterview.expiresAt ? (
                        <View style={s.interviewNotice}>
                          <Ionicons name="time-outline" size={16} color={ORANGE} />
                          <Text style={s.interviewNoticeText}>Select a slot before {dateOf(currentInterview.expiresAt)}.</Text>
                        </View>
                      ) : null}
                      <Pressable style={s.interviewOutlineBtn} onPress={() => openAvailabilityRequest(currentInterview)}>
                        <Ionicons name="create-outline" size={16} color={TEAL} />
                        <Text style={s.interviewOutlineText}>None of these slots work</Text>
                      </Pressable>
                      {slotsLoading ? (
                        <View style={s.followState}>
                          <ActivityIndicator color={TEAL} />
                          <Text style={s.emptyText}>Loading available slots...</Text>
                        </View>
                      ) : slots.length ? (
                        <View style={s.slotList}>
                          {slots.map((slot) => (
                            <Pressable
                              key={slot.id}
                              style={s.slotCard}
                              disabled={slotSubmittingId === slot.id}
                              onPress={() => selectInterviewSlot(currentInterview, slot)}
                            >
                              <View style={s.slotIcon}>
                                <Ionicons name="calendar-clear-outline" size={18} color={TEAL} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={s.slotDate}>{dateOf(slot.date)}</Text>
                                <Text style={s.slotTime}>
                                  {timeOf(slot.time)}{slot.duration ? ` · ${slot.duration} minutes` : ''}
                                </Text>
                              </View>
                              {slotSubmittingId === slot.id ? (
                                <ActivityIndicator color={TEAL} />
                              ) : (
                                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                              )}
                            </Pressable>
                          ))}
                        </View>
                      ) : (
                        <View style={s.followEmpty}>
                          <Ionicons name="calendar-outline" size={24} color="#9ca3af" />
                          <Text style={s.followEmptyTitle}>No slots available</Text>
                          <Text style={s.followEmptyText}>Request a different interview time so your case officer can offer new slots.</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'Expired', 'Awaiting New Slots'].includes(currentInterview.interviewStatus) && (
                    <View style={s.interviewDetailsCard}>
                      <DetailRow label="Date" value={dateOf(currentInterview.scheduledDate)} />
                      <DetailRow label="Time" value={timeOf(currentInterview.scheduledTime)} />
                      <DetailRow label="Location / Platform" value={currentInterview.location} />
                      <DetailRow label="Notes" value={currentInterview.notes} />
                      {currentInterview.interviewStatus === 'Awaiting New Slots' && (
                        <DetailRow label="Availability Request" value={currentInterview.availabilityRequest} />
                      )}
                      {currentInterview.meetingLink ? (
                        <Pressable style={s.meetingLinkBtn} onPress={() => Linking.openURL(currentInterview.meetingLink)}>
                          <Ionicons name="videocam-outline" size={17} color="#fff" />
                          <Text style={s.meetingLinkText}>Join Meeting</Text>
                        </Pressable>
                      ) : currentInterview.interviewStatus === 'Scheduled' ? (
                        <Text style={s.interviewWaitingText}>You will be notified once the meeting link is ready.</Text>
                      ) : null}
                      {['Scheduled', 'Confirmed'].includes(currentInterview.interviewStatus) && (
                        <Pressable style={s.interviewOutlineBtn} onPress={() => openAvailabilityRequest(currentInterview)}>
                          <Ionicons name="repeat-outline" size={16} color={TEAL} />
                          <Text style={s.interviewOutlineText}>Request a Different Time</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </>
              ) : (
                <Text style={s.emptyText}>No interview invitation yet.</Text>
              )}
            </Section>
          ) : (
            <Section title="Follow-up History">
              <View style={s.followHero}>
                <View style={s.followHeroIcon}>
                  <Ionicons name="chatbubbles-outline" size={20} color={TEAL} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.followHeroTitle}>Follow-up History</Text>
                  <Text style={s.followHeroText}>
                    Questions, corrections, replies, and resolutions are kept here as part of the case audit trail.
                  </Text>
                </View>
              </View>
              <Pressable
                style={[s.followCreateButton, !canFollowUp && s.followCreateDisabled]}
                disabled={!canFollowUp}
                onPress={openFollowUp}
              >
                <Ionicons name="add-circle-outline" size={17} color={canFollowUp ? '#fff' : '#9ca3af'} />
                <Text style={[s.followCreateText, !canFollowUp && s.actionDisabledText]}>
                  {activeUserFollowUp ? 'Follow-up Pending' : 'Follow Up'}
                </Text>
              </Pressable>
              {followUpsLoading && (
                <View style={s.followState}>
                  <ActivityIndicator color={TEAL} />
                  <Text style={s.emptyText}>Loading follow-ups...</Text>
                </View>
              )}
              {followUpsError ? <Text style={s.followError}>{followUpsError}</Text> : null}
              {!followUpsLoading && !followUpsError && Array.isArray(followUps) && followUps.length > 0 ? (
                <View style={{ marginTop: 12, gap: 12 }}>
                  {activeFollowUps.length > 0 && (
                    <View style={s.followGroup}>
                      <View style={s.followGroupHeader}>
                        <Text style={s.followGroupTitle}>Open Follow-ups</Text>
                        <Text style={s.followGroupCount}>{activeFollowUps.length}</Text>
                      </View>
                      {activeFollowUps.map((item, index) => (
                        <View key={item.id || index} style={s.followItem}>
                          <View style={s.followItemHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.followTitle}>{getRequestTitle(item)}</Text>
                              <Text style={s.followReason}>{item.reason_category || 'Follow-up request'}</Text>
                            </View>
                            <Text style={s.followStatus}>{getRequestStatusLabel(item.status)}</Text>
                          </View>
                          <View style={s.messageThread}>
                            {getFollowUpEntries(item).map((entry) => (
                              <View key={entry.id} style={s.threadMessage}>
                                <Text style={s.threadMessageText}>{entry.message || 'No message provided.'}</Text>
                                <Text style={s.threadMessageMeta}>{dateOf(entry.created_at, true)}</Text>
                              </View>
                            ))}
                          </View>
                          <Text style={s.followMeta}>Updated {dateOf(item.updated_at || item.created_at, true)}</Text>
                          <View style={s.replyBox}>
                            <TextInput
                              style={s.replyInput}
                              multiline
                              value={replyDrafts[item.id] || ''}
                              onChangeText={(text) => {
                                setReplyError('');
                                setReplyDrafts((current) => ({ ...current, [item.id]: text }));
                              }}
                              placeholder="Write a reply..."
                              placeholderTextColor="#9ca3af"
                            />
                            {replyError ? <Text style={s.followError}>{replyError}</Text> : null}
                            <Pressable
                              style={[s.replyButton, (!String(replyDrafts[item.id] || '').trim() || replySendingId === item.id) && s.replyButtonDisabled]}
                              disabled={!String(replyDrafts[item.id] || '').trim() || replySendingId === item.id}
                              onPress={() => sendFollowUpReply(item.id)}
                            >
                              {replySendingId === item.id ? (
                                <ActivityIndicator color="#fff" />
                              ) : (
                                <>
                                  <Ionicons name="send-outline" size={15} color="#fff" />
                                  <Text style={s.replyButtonText}>Reply</Text>
                                </>
                              )}
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  {pastFollowUps.length > 0 && (
                    <View style={s.followGroup}>
                      <View style={s.followGroupHeader}>
                        <Text style={s.followGroupTitle}>Past Follow-ups</Text>
                        <Text style={s.followGroupCount}>{pastFollowUps.length}</Text>
                      </View>
                      {pastFollowUps.map((item, index) => (
                        <View key={item.id || index} style={s.followItem}>
                          <View style={s.followItemHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.followTitle}>{getRequestTitle(item)}</Text>
                              <Text style={s.followReason}>{item.reason_category || 'Follow-up request'}</Text>
                            </View>
                            <Text style={s.followStatus}>{getRequestStatusLabel(item.status)}</Text>
                          </View>
                          <Text style={s.followMessage}>{getLatestFollowUpMessage(item)}</Text>
                          <Text style={s.followMeta}>Updated {dateOf(item.updated_at || item.created_at, true)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : !followUpsLoading && !followUpsError ? (
                <View style={s.followEmpty}>
                  <Ionicons name="chatbubble-ellipses-outline" size={28} color="#9ca3af" />
                  <Text style={s.followEmptyTitle}>No follow-up requests yet.</Text>
                  <Text style={s.followEmptyText}>When you or the case team sends a follow-up, the full thread will appear here.</Text>
                </View>
              ) : null}
            </Section>
          )}
        </ScrollView>
      )}

      <Modal visible={followUpOpen} transparent animationType="fade" onRequestClose={() => !followUpSubmitting && setFollowUpOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Follow Up</Text>
                <Text style={s.modalSubtitle}>Tell the case team what you need to correct or add.</Text>
              </View>
              <Pressable disabled={followUpSubmitting} onPress={() => setFollowUpOpen(false)}>
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
                <Pressable style={s.modalCancelBtn} disabled={followUpSubmitting} onPress={() => setFollowUpOpen(false)}>
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

      <Modal visible={Boolean(availabilityOpenFor)} transparent animationType="fade" onRequestClose={() => !availabilitySubmitting && setAvailabilityOpenFor(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Request Different Interview Slots</Text>
                <Text style={s.modalSubtitle}>Share the schedule that works best and a short note for your case officer.</Text>
              </View>
              <Pressable disabled={availabilitySubmitting} onPress={() => setAvailabilityOpenFor(null)}>
                <Ionicons name="close" size={22} color="#374151" />
              </Pressable>
            </View>
            <Text style={s.modalLabel}>Preferred date</Text>
            <TextInput
              style={s.modalInput}
              value={availabilityPreferredDate}
              onChangeText={(text) => {
                setInterviewError('');
                setAvailabilityPreferredDate(text);
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
            />
            <Text style={s.modalLabel}>Preferred time</Text>
            <TextInput
              style={s.modalInput}
              value={availabilityPreferredTime}
              onChangeText={(text) => {
                setInterviewError('');
                setAvailabilityPreferredTime(text);
              }}
              placeholder="HH:MM"
              placeholderTextColor="#9ca3af"
            />
            <Text style={s.modalLabel}>Reason</Text>
            <TextInput
              style={s.modalTextarea}
              multiline
              value={availabilityReason}
              onChangeText={(text) => {
                setInterviewError('');
                setAvailabilityReason(text);
              }}
              placeholder="Briefly explain your availability or why the offered slots do not work."
              placeholderTextColor="#9ca3af"
            />
            {interviewError ? <Text style={s.modalError}>{interviewError}</Text> : null}
            <View style={s.modalActions}>
              <Pressable style={s.modalCancelBtn} disabled={availabilitySubmitting} onPress={() => setAvailabilityOpenFor(null)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[s.modalPrimaryBtn, availabilitySubmitting && { opacity: 0.7 }]} disabled={availabilitySubmitting} onPress={submitAvailabilityRequest}>
                {availabilitySubmitting ? <ActivityIndicator color="#fff" /> : <Text style={s.modalPrimaryText}>Send Request</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={withdrawOpen} transparent animationType="fade" onRequestClose={() => !withdrawing && setWithdrawOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>{withdrawalCopy.title}</Text>
                <Text style={s.modalSubtitle}>{reportId} (report ID): {withdrawalCopy.description}</Text>
              </View>
              <Pressable disabled={withdrawing} onPress={() => setWithdrawOpen(false)}>
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
            {withdrawalCopy.requiresAffidavit && (
              <Pressable style={s.filePickBtn} onPress={pickWithdrawFile}>
                <Ionicons name="document-attach-outline" size={17} color={TEAL} />
                <Text style={s.filePickText}>{withdrawFile?.name || 'Attach withdrawal document'}</Text>
              </Pressable>
            )}
            {actionError ? <Text style={s.modalError}>{actionError}</Text> : null}
            <View style={s.modalActions}>
              <Pressable style={s.modalCancelBtn} disabled={withdrawing} onPress={() => setWithdrawOpen(false)}>
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  topBar: {
    backgroundColor: TEAL,
    paddingTop: 44,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
  },
  backText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: ERROR, textAlign: 'center', fontWeight: '700' },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  hero: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe7e7',
    padding: 18,
    gap: 12,
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  reportId: { color: '#111827', fontSize: 28, fontWeight: '900' },
  submittedText: { color: '#6b7280', fontSize: 12, fontWeight: '700', marginTop: 3 },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0fafb',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#cde8e8',
  },
  statusText: { color: TEAL, fontSize: 11, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 10 },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cde8e8',
    backgroundColor: '#f0fafb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  actionDanger: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  actionPrimary: { backgroundColor: TEAL, borderColor: TEAL, marginTop: 12, flex: 0 },
  actionDisabled: { backgroundColor: '#f9fafb', borderColor: BORDER },
  actionText: { color: TEAL, fontSize: 12, fontWeight: '900' },
  actionDangerText: { color: ORANGE },
  actionPrimaryText: { color: '#fff' },
  actionDisabledText: { color: '#9ca3af' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 4,
  },
  tab: { flex: 1, alignItems: 'center', borderRadius: 9, paddingVertical: 10 },
  tabActive: { backgroundColor: '#f0fafb' },
  tabText: { color: '#6b7280', fontSize: 12, fontWeight: '900' },
  tabTextActive: { color: TEAL },
  infoPanel: {
    backgroundColor: '#f0fafb',
    borderWidth: 1,
    borderColor: '#cde8e8',
    borderRadius: 16,
    padding: 16,
  },
  infoTitle: { color: '#111827', fontSize: 16, fontWeight: '900', marginBottom: 6 },
  infoBody: { color: '#374151', fontSize: 13, lineHeight: 20 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe7e7',
    padding: 15,
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
    paddingBottom: 10,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionIntro: { color: '#6b7280', fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 10 },
  detailRow: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginTop: 8,
    borderRadius: 11,
    backgroundColor: '#f9fafb',
  },
  detailLabel: { color: '#6b7280', fontSize: 11, fontWeight: '900', marginBottom: 4 },
  detailValue: { color: '#111827', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  emptyText: { color: '#6b7280', fontSize: 13, lineHeight: 20, marginTop: 10 },
  evidenceItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10 },
  evidenceText: { flex: 1, color: '#111827', fontSize: 13, fontWeight: '700' },
  evidenceImageCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f9fafb',
  },
  evidenceImage: {
    width: '100%',
    height: 190,
    backgroundColor: '#e5e7eb',
  },
  evidenceImageName: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  historyToggleBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  historyToggle: { color: TEAL, fontSize: 12, fontWeight: '900' },
  timeline: { borderLeftWidth: 2, borderLeftColor: '#cde8e8', marginLeft: 7, gap: 12 },
  timelineItem: { flexDirection: 'row', marginLeft: -8 },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: TEAL,
    borderWidth: 3,
    borderColor: '#fff',
    marginTop: 4,
  },
  timelineBody: { flex: 1, paddingLeft: 10, paddingBottom: 6 },
  timelineStatus: { color: '#111827', fontSize: 13, fontWeight: '900' },
  timelineMeta: { color: '#6b7280', fontSize: 11, marginTop: 3 },
  timelineNote: { color: '#374151', fontSize: 12, lineHeight: 18, marginTop: 7 },
  followItem: {
    borderWidth: 1,
    borderColor: '#dbe7e7',
    borderRadius: 15,
    padding: 13,
    backgroundColor: '#fbfdfd',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  followGroup: { gap: 10 },
  followGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  followGroupTitle: { color: '#111827', fontSize: 14, fontWeight: '900' },
  followGroupCount: {
    minWidth: 24,
    textAlign: 'center',
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#f0fafb',
    color: TEAL,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  followItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  followTitle: { color: '#111827', fontSize: 14, fontWeight: '900' },
  followReason: { color: '#6b7280', fontSize: 11, fontWeight: '700', marginTop: 2 },
  followStatus: {
    color: TEAL,
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: '#f0fafb',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  followMessage: { color: '#374151', fontSize: 12, lineHeight: 18, marginTop: 5 },
  followMeta: { color: '#6b7280', fontSize: 11, marginTop: 8 },
  followError: { color: ERROR, fontSize: 12, fontWeight: '700', marginTop: 10 },
  followHero: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#f0fafb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cde8e8',
    padding: 13,
    marginTop: 10,
  },
  followHeroIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followHeroTitle: { color: '#111827', fontSize: 14, fontWeight: '900', marginBottom: 3 },
  followHeroText: { color: '#4b5563', fontSize: 12, lineHeight: 18 },
  followCreateButton: {
    marginTop: 12,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: TEAL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  followCreateDisabled: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: BORDER },
  followCreateText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  followState: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  followEmpty: {
    alignItems: 'center',
    gap: 7,
    borderRadius: 14,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    marginTop: 12,
  },
  followEmptyTitle: { color: '#111827', fontSize: 14, fontWeight: '900' },
  followEmptyText: { color: '#6b7280', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  messageThread: { gap: 9, marginTop: 12 },
  threadMessage: {
    backgroundColor: '#fff',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#edf2f2',
    padding: 11,
  },
  threadMessageText: { color: '#374151', fontSize: 12, lineHeight: 18 },
  threadMessageMeta: { color: '#9ca3af', fontSize: 10, fontWeight: '800', marginTop: 6 },
  replyBox: {
    marginTop: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#edf2f2',
    borderRadius: 14,
    padding: 10,
  },
  replyInput: {
    minHeight: 76,
    borderWidth: 0,
    padding: 4,
    color: '#111827',
    fontSize: 13,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  replyButton: {
    alignSelf: 'flex-end',
    minHeight: 38,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: TEAL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  replyButtonDisabled: { backgroundColor: '#9ca3af' },
  replyButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  interviewHero: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#f8fbfb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe7e7',
    padding: 13,
  },
  interviewHeroIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f0fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  interviewHeroTitle: { color: '#111827', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  interviewHeroText: { color: '#4b5563', fontSize: 12, lineHeight: 18 },
  interviewStatus: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  interviewStatusText: { fontSize: 10, fontWeight: '900' },
  interviewBlock: { marginTop: 12, gap: 10 },
  interviewNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
    padding: 11,
  },
  interviewNoticeText: { flex: 1, color: '#9a3412', fontSize: 12, fontWeight: '800', lineHeight: 17 },
  interviewOutlineBtn: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cde8e8',
    backgroundColor: '#f0fafb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
  },
  interviewOutlineText: { color: TEAL, fontSize: 12, fontWeight: '900' },
  slotList: { gap: 9 },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe7e7',
    backgroundColor: '#fff',
    padding: 12,
  },
  slotIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fafb',
  },
  slotDate: { color: '#111827', fontSize: 13, fontWeight: '900' },
  slotTime: { color: '#6b7280', fontSize: 12, marginTop: 2, fontWeight: '700' },
  interviewDetailsCard: {
    marginTop: 12,
    gap: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe7e7',
    backgroundColor: '#fbfdfd',
    padding: 8,
  },
  meetingLinkBtn: {
    marginTop: 10,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: TEAL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  meetingLinkText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  interviewWaitingText: {
    marginTop: 10,
    color: '#4b5563',
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.55)',
    justifyContent: 'center',
    padding: 18,
  },
  modalBox: {
    maxHeight: '88%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 14,
  },
  modalTitle: { fontSize: 19, fontWeight: '900', color: '#111827' },
  modalSubtitle: { fontSize: 12, lineHeight: 18, color: '#6b7280', marginTop: 4 },
  modalLabel: { fontSize: 12, fontWeight: '900', color: '#374151', marginBottom: 8, marginTop: 10 },
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
  modalInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#111827',
    fontSize: 13,
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
