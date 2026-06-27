import { getLegalCaseDeadlines } from "@/components/legalReviews/legalReviewCalendar";
import { authFetch } from "@/lib/AuthContext";

export function unwrapList(payload, preferredKey) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  if (preferredKey && Array.isArray(payload[preferredKey])) {
    return payload[preferredKey];
  }

  const commonKeys = ["data", "items", "records", "results", "projects", "users", "cases", "volunteers"];
  const listKey = commonKeys.find((key) => Array.isArray(payload[key]));
  return listKey ? payload[listKey] : [];
}

export async function fetchList(url, preferredKey) {
  const response = await authFetch(url, { cache: "no-store" });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    console.error(`[dashboardDeadlines] Failed to fetch ${url}: ${response.status}`, message);
    return [];
  }

  const payload = await response.json().catch(() => null);
  return unwrapList(payload, preferredKey);
}

export function getActorName(user) {
  return `${user?.firstName || user?.first_name || ""} ${user?.lastName || user?.last_name || ""}`.trim();
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function samePerson(a, b) {
  return Boolean(normalizeText(a) && normalizeText(a) === normalizeText(b));
}

function toDateOnly(value) {
  if (!value) return "";
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  return String(value).split("T")[0];
}

export function parseDate(value) {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) return null;
  const date = new Date(`${dateOnly}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDeadlineDate(value, time) {
  const date = parseDate(value);
  if (!date) return String(value || "");
  const formatted = date.toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return time ? `${formatted} at ${String(time).slice(0, 5)}` : formatted;
}

export function isUpcoming(value) {
  const date = parseDate(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

export function makeDeadline({ icon, title, dateValue, time, type }) {
  const date = parseDate(dateValue);
  if (!date || !isUpcoming(dateValue)) return null;
  return {
    icon,
    title,
    date: formatDeadlineDate(dateValue, time),
    dateValue: toDateOnly(dateValue),
    sortTime: date.getTime(),
    type,
  };
}

export function limitUpcomingDeadlines(deadlines, limit = 3) {
  const seen = new Set();
  return deadlines
    .filter(Boolean)
    .sort((a, b) => a.sortTime - b.sortTime || a.title.localeCompare(b.title))
    .filter((deadline) => {
      const key = `${deadline.type || ""}-${deadline.title}-${deadline.dateValue}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export function isActiveTask(task) {
  const status = normalizeText(task?.status || task?.display_status);
  return status !== "completed" && status !== "cancelled" && status !== "canceled";
}

export function buildProjectTaskDeadlines(tasks, { userId, actorName, committeeName, includeCommittee = false, limit = 3 } = {}) {
  return limitUpcomingDeadlines(
    (tasks || [])
      .filter((task) => isActiveTask(task) && task.due_date)
      .filter((task) => {
        if (!userId && !actorName && !committeeName) return true;
        const assignee = task.assignee || {};
        const mine = assignee.user_id === userId || samePerson(assignee.name, actorName);
        const committeeMatch = includeCommittee && committeeName && normalizeText(assignee.committee_name) === normalizeText(committeeName);
        return mine || committeeMatch;
      })
      .map((task) => makeDeadline({
        icon: "task",
        title: task.project?.title ? `${task.title} (${task.project.title})` : task.title || "Project task",
        dateValue: task.due_date,
        type: "project-task",
      })),
    limit
  );
}

function listIncludesPerson(list, actorName) {
  const values = Array.isArray(list) ? list : (list ? [list] : []);
  return values.some((item) => samePerson(item, actorName));
}

export function buildProjectDeadlines(projects, { actorName, limit = 3 } = {}) {
  return limitUpcomingDeadlines(
    (projects || [])
      .filter((project) => project.dueDate || project.dateEnd)
      .filter((project) => !actorName || listIncludesPerson(project.projectOfficers, actorName) || listIncludesPerson(project.projectCommitteeMembers, actorName))
      .map((project) => makeDeadline({
        icon: "project",
        title: project.title || "Project deadline",
        dateValue: project.dueDate || project.dateEnd,
        type: "project",
      })),
    limit
  );
}

export function buildConfirmedInterviewDeadlines(interviews, { userId, actorName, limit = 3 } = {}) {
  return limitUpcomingDeadlines(
    (interviews || [])
      .filter((interview) => normalizeText(interview.status || interview.interviewStatus) === "confirmed")
      .filter((interview) => {
        if (!userId && !actorName) return true;
        const interviewerName = interview.interviewer
          ? `${interview.interviewer.first_name || ""} ${interview.interviewer.last_name || ""}`.trim()
          : interview.interviewerName;
        return interview.interviewer_user_id === userId || samePerson(interviewerName, actorName);
      })
      .map((interview) => {
        const slot = interview.slot || {};
        const caseId = interview.caseId || (interview.case_report_id ? `Case #${interview.case_report_id}` : "Case interview");
        return makeDeadline({
          icon: "interview",
          title: `Confirmed interview: ${caseId}`,
          dateValue: slot.slot_date || interview.scheduledDate || interview.slot_date,
          time: slot.slot_time || interview.scheduledTime || interview.slot_time,
          type: "interview",
        });
      }),
    limit
  );
}

export function buildLegalCaseDeadlines(legalDeadlines, { limit = 3 } = {}) {
  return limitUpcomingDeadlines(
    (legalDeadlines || []).map((deadline) => makeDeadline({
      icon: deadline.type || "legal",
      title: `${deadline.label}: ${deadline.caseId || deadline.caseReportId || "Case"}`,
      dateValue: deadline.value || deadline.dateKey || deadline.date,
      type: `legal-${deadline.type || "date"}`,
    })),
    limit
  );
}

export async function fetchLegalDeadlinesForCases(API_URL, cases) {
  const enriched = await Promise.all(
    (cases || []).map(async (caseItem) => {
      const id = caseItem.case_report_id || caseItem.id;
      if (!id) return null;
      const [reviewResponse, historyResponse] = await Promise.all([
        authFetch(`${API_URL}/api/legal_reviews/case/${id}`, { cache: "no-store" }),
        authFetch(`${API_URL}/api/case_status_history/${id}?staffView=true`, { cache: "no-store" }),
      ]);
      const reviewPayload = reviewResponse.ok ? await reviewResponse.json().catch(() => ({})) : {};
      const historyPayload = historyResponse.ok ? await historyResponse.json().catch(() => ({})) : {};
      return {
        id,
        caseId: caseItem.caseId || `${new Date(caseItem.created_at || Date.now()).getFullYear()}-${String(id).padStart(3, "0")}`,
        status: caseItem.status,
        endorsementDetails: reviewPayload.data?.endorsement_details || null,
        statusHistory: historyPayload.data || [],
      };
    })
  );

  return enriched.filter(Boolean).flatMap(getLegalCaseDeadlines);
}
