export const ROLE_LABELS = {
  admin: "Admin",
  staff: "Staff",
  case_officer: "Case Officer",
  "case officer": "Case Officer",
  legal_personnel: "Legal Personnel",
  "legal personnel": "Legal Personnel",
  complainant: "Complainant",
  user: "User",
};

export const SUPPORT_RESOURCE_LINKS = [
  { href: "/hospital", label: "Nearby Hospitals" },
  { href: "/police-station", label: "Nearby Police Stations" },
  { href: "/helplines", label: "Helplines" },
];

export const SETTINGS_LINKS = [
  { href: "/settings?tab=lock", label: "Account & Privacy" },
  { href: "/settings?tab=help", label: "Help Center" },
  { href: "/settings?tab=display", label: "Display & Accessibility" },
  { href: "/settings?tab=report", label: "Report a Problem" },
];

export const PUBLIC_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Contact" },
  { href: "/volunteer", label: "Volunteer" },
  { href: "/heatmap", label: "Heatmap" },
  {
    label: "Support & Resources",
    icon: "handsHelping",
    children: SUPPORT_RESOURCE_LINKS,
  },
];

const PUBLIC_FOOTER_LINKS = [
  ...PUBLIC_LINKS.filter((link) => !link.children),
  ...SUPPORT_RESOURCE_LINKS,
];

export const FOOTER_QUICK_LINKS = {
  public: PUBLIC_FOOTER_LINKS,
  complainant: [
    { href: "/dashboard", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/cases", label: "Report" },
    { href: "/volunteer", label: "Volunteer" },
    { href: "/contact", label: "Contact" },
    { href: "/events", label: "Events" },
    { href: "/heatmap", label: "Heatmap" },
    { href: "/hospital", label: "Nearby Hospitals" },
    { href: "/police-station", label: "Nearby Police Stations" },
    { href: "/helplines", label: "Helplines" },
  ],
  case_officer: [
    { href: "/dashboard", label: "Home" },
    { href: "/cases", label: "Cases" },
    { href: "/heatmap", label: "Heatmap" },
  ],
  staff: [
    { href: "/dashboard", label: "Home" },
    { href: "/projects", label: "Projects" },
    { href: "/projectTasks", label: "Project Tasks" },
    { href: "/volunteer", label: "Volunteers" },
    { href: "/events", label: "Events" },
    { href: "/heatmap", label: "Heatmap" },
  ],
  legal_personnel: [
    { href: "/dashboard", label: "Home" },
    { href: "/legalReviews", label: "Legal Review" },
    { href: "/heatmap", label: "Heatmap" },
  ],
  admin: [
    { href: "/dashboard", label: "Home" },
    { href: "/users", label: "Users" },
    { href: "/cases", label: "Cases" },
    { href: "/legalReviews", label: "Legal Review" },
    { href: "/projects", label: "Projects" },
    { href: "/projectTasks/admin", label: "Project Tasks" },
    { href: "/staffAvailability", label: "Staff Availability" },
    { href: "/volunteer", label: "Volunteers" },
    { href: "/heatmap", label: "Heatmap" },
    { href: "/reportGenerator", label: "Report Generator" },
  ],
};

export const SIDEBAR_LINKS = {
  public: PUBLIC_LINKS.map((link) => ({
    ...link,
    icon: null,
  })),
  // USER
  complainant: [
    { href: "/dashboard", label: "Home", icon: "dashboard" },
    {
      href: "/cases",
      label: "Report",
      icon: "folder",
      children: [
        { href: "/cases", label: "Report" },
        { href: "/cases/history", label: "Report History" },
      ],
    },
    {
      href: "/volunteer",
      label: "Volunteer",
      icon: "volunteer",
      children: [
        { href: "/volunteer", label: "Volunteering" },
        { href: "/volunteer/apply", label: "Apply to volunteer" },
        { href: "/volunteer/history", label: "Application History" },
      ],
    },
    { href: "/events", label: "Events", icon: "interpreter" },
    { href: "/heatmap", label: "Heatmap", icon: "map" },
    {
      label: "Support & Resources",
      icon: "handsHelping",
      children: SUPPORT_RESOURCE_LINKS,
    },
    {
      label: "Settings",
      icon: "settings",
      children: SETTINGS_LINKS,
    },
  ],
  // CASE OFFICER
  case_officer: [
    { href: "/dashboard", label: "Home", icon: "dashboard" },
    { href: "/cases", label: "Cases", icon: "folder" },
    { href: "/caseInterviews", label: "Interviews", icon: "interpreter" },
    { href: "/heatmap", label: "Heatmap", icon: "map" },
    {
      label: "Settings",
      icon: "settings",
      children: SETTINGS_LINKS,
    },
  ],
  // STAFF
  staff: [
    { href: "/dashboard", label: "Home", icon: "dashboard" },
    {
      label: "Projects",
      icon: "folder",
      children: [
        { href: "/projects", label: "All Projects" },
        { href: "/projectTasks", label: "Project Tasks" },
      ],
    },
    {
      href: "/volunteer",
      label: "Volunteers",
      icon: "volunteer",
      children: [
        { href: "/volunteer", label: "All Volunteers" },
        { href: "/volunteerRanking", label: "Applicant Ranking" },
        { href: "/volunteerInterviews", label: "Interviews" },
        { href: "/volunteer/screening-questions", label: "Screening Questions" },
      ],
    },
    { href: "/events", label: "Events", icon: "event" },
    { href: "/heatmap", label: "Heatmap", icon: "map" },
    {
      label: "Settings",
      icon: "settings",
      children: SETTINGS_LINKS,
    },
  ],
  // LEGAL PERSONNEL
  legal_personnel: [
    { href: "/dashboard", label: "Home", icon: "dashboard" },
    { href: "/legalReviews", label: "Legal Review", icon: "gavel" },
    { href: "/heatmap", label: "Heatmap", icon: "map" },
    {
      label: "Settings",
      icon: "settings",
      children: SETTINGS_LINKS,
    },
  ],
  // ADMIN
  admin: [
    { href: "/dashboard", label: "Home", icon: "dashboard" },
    {
      href: "/users",
      label: "Users",
      icon: "people",
      children: [
        { href: "/users", label: "All Users" },
        { href: "/staffAvailability", label: "Staff Availability" },
      ],
    },
    {
      label: "Cases",
      icon: "folder",
      children: [
        { href: "/cases", label: "All Cases" },
        { href: "/caseInterviews", label: "Interviews" },
      ],
    },
    {
      label: "Legal",
      icon: "gavel",
      children: [{ href: "/legalReviews", label: "All Legal Cases" }],
    },
    {
      label: "Volunteers",
      icon: "volunteer",
      children: [
        { href: "/volunteer", label: "All Volunteers" },
        { href: "/volunteerRanking", label: "Applicant Ranking" },
        { href: "/volunteerInterviews", label: "Interviews" },
        { href: "/volunteer/screening-questions", label: "Screening Questions" },
        { href: "/volunteer/chapters", label: "Chapters" },
      ],
    },
    {
      label: "Projects",
      icon: "folder",
      children: [
        { href: "/projects", label: "All Projects" },
        { href: "/projectTasks/admin", label: "Project Tasks" },
      ],
    },
    { href: "/heatmap", label: "Heatmap", icon: "map" },
    { href: "/reportGenerator", label: "Report Generator", icon: "assessment" },
    {
      label: "Settings",
      icon: "settings",
      children: SETTINGS_LINKS,
    },
  ],
};

// ── Committee access control ──────────────────────────────────────────────────
const MEMBERSHIP_COMMITTEE_ID = 2;

export function normalizeRole(roleName) {
  const role = roleName?.toLowerCase();
  if (role === "case officer") return "case_officer";
  if (role === "legal personnel") return "legal_personnel";
  if (role === "user") return "complainant";
  return role || "public";
}

export function getSidebarLinks(user) {
  const role = normalizeRole(user?.role_name);

  if (role === "staff") {
    const isMembershipCommittee = user?.committee_id === MEMBERSHIP_COMMITTEE_ID;
    if (!isMembershipCommittee) {
      return SIDEBAR_LINKS.staff.filter((link) => link.label !== "Volunteers");
    }
    return SIDEBAR_LINKS.staff;
  }

  return SIDEBAR_LINKS[role] || [];
}

export function getFooterQuickLinks(user) {
  const role = normalizeRole(user?.role_name);

  if (role === "staff") {
    const isMembershipCommittee = user?.committee_id === MEMBERSHIP_COMMITTEE_ID;
    if (!isMembershipCommittee) {
      return FOOTER_QUICK_LINKS.staff.filter((link) => link.href !== "/volunteer");
    }
  }

  return FOOTER_QUICK_LINKS[role] || FOOTER_QUICK_LINKS.public;
}