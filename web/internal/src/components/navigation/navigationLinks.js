export const ROLE_LABELS = {
  admin: "Admin",
  staff: "Staff",
  case_officer: "Case Officer",
  "case officer": "Case Officer",
  legal_personnel: "Legal Personnel",
  "legal personnel": "Legal Personnel",
};

export const SETTINGS_LINKS = [
  { href: "/settings?tab=profile", label: "Profile" },
  { href: "/settings?tab=lock", label: "Account & Privacy" },
  { href: "/settings?tab=help", label: "Help Center" },
  { href: "/settings?tab=display", label: "Display & Accessibility" },
  { href: "/settings?tab=report", label: "Report a Problem" },
];

const CASE_LINKS = [
  { href: "/cases", label: "Case Management" },
  { href: "/caseInterviews", label: "Case Interviews" },
];

const LEGAL_REVIEW_LINKS = [
  { href: "/legalReviews", label: "Legal Reviews" },
  { href: "/legalReviews/calendar", label: "Legal Calendar" },
];

const PROJECT_LINKS = [
  { href: "/projects", label: "Projects & Events" },
  { href: "/projectTasks", label: "Project Tasks" },
  { href: "/projectTasks/admin", label: "All Project Tasks" },
];

const VOLUNTEER_LINKS = [
  { href: "/volunteer", label: "Volunteer Applications" },
  { href: "/volunteerInterviews", label: "Volunteer Interviews" },
  { href: "/volunteer/screening-questions", label: "Screening Questions" },
  { href: "/volunteerRanking", label: "Volunteer Ranking" },
  { href: "/volunteer/chapters", label: "Chapters" },
];

export const FOOTER_QUICK_LINKS = {
  default: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/cases", label: "Cases" },
    { href: "/projects", label: "Projects" },
    { href: "/reportGenerator", label: "Reports" },
  ],
  case_officer: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/cases", label: "Cases" },
    { href: "/caseInterviews", label: "Interviews" },
    { href: "/heatmap", label: "Heatmap" },
  ],
  staff: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/volunteer", label: "Volunteers" },
    { href: "/events", label: "Events" },
    { href: "/heatmap", label: "Heatmap" },
  ],
  legal_personnel: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/legalReviews", label: "Legal Reviews" },
    { href: "/legalReviews/calendar", label: "Calendar" },
    { href: "/heatmap", label: "Heatmap" },
  ],
  admin: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/users", label: "Users" },
    { href: "/volunteer", label: "Volunteers" },
    { href: "/reportGenerator", label: "Reports" },
  ],
};

export const SIDEBAR_LINKS = {
  case_officer: [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    {
      label: "Cases",
      icon: "folder",
      children: CASE_LINKS,
    },
    { href: "/heatmap", label: "Heatmap", icon: "map" },
    {
      label: "Settings",
      icon: "settings",
      children: SETTINGS_LINKS,
    },
  ],
  staff: [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    {
      label: "Volunteers",
      icon: "volunteer",
      children: VOLUNTEER_LINKS,
    },
    {
      label: "Projects",
      icon: "folder",
      children: PROJECT_LINKS,
    },
    { href: "/staffAvailability", label: "Staff Availability", icon: "people" },
    { href: "/events", label: "Events", icon: "event" },
    { href: "/heatmap", label: "Heatmap", icon: "map" },
    {
      label: "Settings",
      icon: "settings",
      children: SETTINGS_LINKS,
    },
  ],
  legal_personnel: [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    {
      label: "Legal Reviews",
      icon: "gavel",
      children: LEGAL_REVIEW_LINKS,
    },
    { href: "/heatmap", label: "Heatmap", icon: "map" },
    {
      label: "Settings",
      icon: "settings",
      children: SETTINGS_LINKS,
    },
  ],
  admin: [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/users", label: "User Management", icon: "people" },
    {
      label: "Cases",
      icon: "folder",
      children: CASE_LINKS,
    },
    {
      label: "Legal Reviews",
      icon: "gavel",
      children: LEGAL_REVIEW_LINKS,
    },
    {
      label: "Volunteers",
      icon: "volunteer",
      children: VOLUNTEER_LINKS,
    },
    {
      label: "Projects",
      icon: "folder",
      children: PROJECT_LINKS,
    },
    { href: "/staffAvailability", label: "Staff Availability", icon: "people" },
    { href: "/reportGenerator", label: "Report Generator", icon: "assessment" },
    { href: "/events", label: "Events", icon: "event" },
    { href: "/heatmap", label: "Heatmap", icon: "map" },
    {
      label: "Settings",
      icon: "settings",
      children: SETTINGS_LINKS,
    },
  ],
};

const MEMBERSHIP_COMMITTEE_ID = 2;

export function normalizeRole(roleName) {
  const role = roleName?.toLowerCase();
  if (role === "case officer") return "case_officer";
  if (role === "legal personnel") return "legal_personnel";
  if (role === "user") return "complainant";
  return role || "public";
}

export function getSidebarLinks(user) {
  const role = normalizeRole(user?.role_name || user?.role);

  if (role === "staff") {
    const isMembershipCommittee = Number(user?.committee_id) === MEMBERSHIP_COMMITTEE_ID;
    if (!isMembershipCommittee) {
      return SIDEBAR_LINKS.staff.filter((link) => link.label !== "Volunteers");
    }
  }

  return SIDEBAR_LINKS[role] || [];
}

export function getFooterQuickLinks(user) {
  const role = normalizeRole(user?.role_name || user?.role);

  if (role === "staff") {
    const isMembershipCommittee = Number(user?.committee_id) === MEMBERSHIP_COMMITTEE_ID;
    if (!isMembershipCommittee) {
      return FOOTER_QUICK_LINKS.staff.filter((link) => link.href !== "/volunteer");
    }
  }

  return FOOTER_QUICK_LINKS[role] || FOOTER_QUICK_LINKS.default;
}
