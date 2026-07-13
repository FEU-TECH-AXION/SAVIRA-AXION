export const ROLE_LABELS = {
  admin: "navAdmin",
  staff: "navStaff",
  case_officer: "navCaseOfficer",
  "case officer": "navCaseOfficer",
  legal_personnel: "navLegalPersonnel",
  "legal personnel": "navLegalPersonnel",
  complainant: "navComplainant",
  user: "navUser",
};

export const SUPPORT_RESOURCE_LINKS = [
  { href: "/hospital", label: "Nearby Hospitals", labelKey: "navNearbyHospitals" },
  { href: "/police-station", label: "Nearby Police Stations", labelKey: "navNearbyPoliceStations" },
  { href: "/helplines", label: "Helplines", labelKey: "navHelplines" },
];

export const SETTINGS_LINKS = [
  { href: "/settings?tab=lock", label: "Account & Privacy", labelKey: "settingsAccountPrivacy" },
  { href: "/settings?tab=help", label: "Help Center", labelKey: "settingsHelpCenter" },
  { href: "/settings?tab=display", label: "Display & Accessibility", labelKey: "settingsDisplayAccessibility" },
  { href: "/settings?tab=report", label: "Report a Problem", labelKey: "settingsReportProblem" },
];

export const PUBLIC_LINKS = [
  { href: "/", label: "Home", labelKey: "navHome" },
  { href: "/about", label: "About", labelKey: "navAbout" },
  { href: "/events", label: "Events", labelKey: "navEvents" },
  { href: "/contact", label: "Contact", labelKey: "navContact" },
  { href: "/volunteer", label: "Volunteer", labelKey: "navVolunteer" },
  { href: "/heatmap", label: "Heatmap", labelKey: "navHeatmap" },
  {
    label: "Support & Resources",
    labelKey: "navSupportResources",
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
    { href: "/dashboard", label: "Home", labelKey: "navHome" },
    { href: "/about", label: "About", labelKey: "navAbout" },
    { href: "/cases", label: "Report", labelKey: "navReport" },
    { href: "/volunteer", label: "Volunteer", labelKey: "navVolunteer" },
    { href: "/contact", label: "Contact", labelKey: "navContact" },
    { href: "/events", label: "Events", labelKey: "navEvents" },
    { href: "/heatmap", label: "Heatmap", labelKey: "navHeatmap" },
    { href: "/hospital", label: "Nearby Hospitals", labelKey: "navNearbyHospitals" },
    { href: "/police-station", label: "Nearby Police Stations", labelKey: "navNearbyPoliceStations" },
    { href: "/helplines", label: "Helplines", labelKey: "navHelplines" },
  ],
  case_officer: [
    { href: "/dashboard", label: "Home", labelKey: "navHome" },
    { href: "/cases", label: "Cases", labelKey: "navCases" },
    { href: "/heatmap", label: "Heatmap", labelKey: "navHeatmap" },
  ],
  staff: [
    { href: "/dashboard", label: "Home", labelKey: "navHome" },
    { href: "/projects", label: "Projects", labelKey: "navProjects" },
    { href: "/projectTasks", label: "Project Tasks", labelKey: "navProjectTasks" },
    { href: "/volunteer", label: "Volunteers", labelKey: "navVolunteers" },
    { href: "/events", label: "Events", labelKey: "navEvents" },
    { href: "/heatmap", label: "Heatmap", labelKey: "navHeatmap" },
  ],
  legal_personnel: [
    { href: "/dashboard", label: "Home", labelKey: "navHome" },
    { href: "/legalReviews", label: "Legal Review", labelKey: "navLegalReview" },
    { href: "/heatmap", label: "Heatmap", labelKey: "navHeatmap" },
  ],
  admin: [
    { href: "/dashboard", label: "Home", labelKey: "navHome" },
    { href: "/users", label: "Users", labelKey: "navUsers" },
    { href: "/cases", label: "Cases", labelKey: "navCases" },
    { href: "/legalReviews", label: "Legal Review", labelKey: "navLegalReview" },
    { href: "/projects", label: "Projects", labelKey: "navProjects" },
    { href: "/projectTasks/admin", label: "Project Tasks", labelKey: "navProjectTasks" },
    { href: "/staffAvailability", label: "Staff Availability", labelKey: "navStaffAvailability" },
    { href: "/volunteer", label: "Volunteers", labelKey: "navVolunteers" },
    { href: "/heatmap", label: "Heatmap", labelKey: "navHeatmap" },
    { href: "/reportGenerator", label: "Report & Analysis", labelKey: "navReportAnalysis" },
  ],
};

export const SIDEBAR_LINKS = {
  public: PUBLIC_LINKS.map((link) => ({
    ...link,
    icon: null,
  })),
  // USER
  complainant: [
    { href: "/dashboard", label: "Home", labelKey: "navHome", icon: "dashboard" },
    { href: "/about", label: "About", labelKey: "navAbout", icon: "ribbon" },
    {
      href: "/cases",
      label: "Report",
      labelKey: "navReport",
      icon: "folder",
      children: [
        { href: "/cases", label: "Report", labelKey: "navReport" },
        { href: "/cases/history", label: "Report History", labelKey: "navReportHistory" },
      ],
    },
    {
      href: "/volunteer",
      label: "Volunteer",
      labelKey: "navVolunteer",
      icon: "volunteer",
      children: [
        { href: "/volunteer", label: "Volunteering", labelKey: "navVolunteering" },
        { href: "/volunteer/apply", label: "Apply to volunteer", labelKey: "navApplyVolunteer" },
        { href: "/volunteer/history", label: "Application History", labelKey: "navApplicationHistory" },
      ],
    },
    { href: "/events", label: "Events", labelKey: "navEvents", icon: "interpreter" },
    { href: "/heatmap", label: "Heatmap", labelKey: "navHeatmap", icon: "map" },
    { href: "/contact", label: "Contact", labelKey: "navContact", icon: "contact" },
    {
      label: "Support & Resources",
      labelKey: "navSupportResources",
      icon: "handsHelping",
      children: SUPPORT_RESOURCE_LINKS,
    },
    {
      label: "Settings",
      labelKey: "navSettings",
      icon: "settings",
      children: SETTINGS_LINKS,
    },
  ],
  // CASE OFFICER
  case_officer: [
    { href: "/dashboard", label: "Home", labelKey: "navHome", icon: "dashboard" },
    { href: "/cases", label: "Cases", labelKey: "navCases", icon: "folder" },
    { href: "/caseInterviews", label: "Interviews", labelKey: "navInterviews", icon: "interpreter" },
    { href: "/heatmap", label: "Heatmap", labelKey: "navHeatmap", icon: "map" },
    {
      label: "Settings",
      labelKey: "navSettings",
      icon: "settings",
      children: SETTINGS_LINKS,
    },
  ],
  // STAFF
  staff: [
    { href: "/dashboard", label: "Home", labelKey: "navHome", icon: "dashboard" },
    {
      label: "Projects",
      labelKey: "navProjects",
      icon: "projects",
      children: [
        { href: "/projects", label: "All Projects", labelKey: "navAllProjects" },
        { href: "/projectTasks", label: "Project Tasks", labelKey: "navProjectTasks" },
      ],
    },
    {
      href: "/volunteer",
      label: "Volunteers",
      labelKey: "navVolunteers",
      icon: "volunteer",
      children: [
        { href: "/volunteer", label: "All Volunteers", labelKey: "navAllVolunteers" },
        { href: "/volunteerRanking", label: "Applicant Ranking", labelKey: "navApplicantRanking" },
        { href: "/volunteerInterviews", label: "Interviews", labelKey: "navInterviews" },
        { href: "/volunteer/screening-questions", label: "Screening Questions", labelKey: "navScreeningQuestions" },
      ],
    },
    { href: "/events", label: "Events", labelKey: "navEvents", icon: "event" },
    { href: "/heatmap", label: "Heatmap", labelKey: "navHeatmap", icon: "map" },
    {
      label: "Settings",
      labelKey: "navSettings",
      icon: "settings",
      children: SETTINGS_LINKS,
    },
  ],
  // LEGAL PERSONNEL
  legal_personnel: [
    { href: "/dashboard", label: "Home", labelKey: "navHome", icon: "dashboard" },
    { href: "/legalReviews", label: "Legal Review", labelKey: "navLegalReview", icon: "gavel" },
    { href: "/heatmap", label: "Heatmap", labelKey: "navHeatmap", icon: "map" },
    {
      label: "Settings",
      labelKey: "navSettings",
      icon: "settings",
      children: SETTINGS_LINKS,
    },
  ],
  // ADMIN
  admin: [
    { href: "/dashboard", label: "Home", labelKey: "navHome", icon: "dashboard" },
    {
      href: "/users",
      label: "Users",
      labelKey: "navUsers",
      icon: "people",
      children: [
        { href: "/users", label: "All Users", labelKey: "navAllUsers" },
        { href: "/staffAvailability", label: "Staff Availability", labelKey: "navStaffAvailability" },
      ],
    },
    {
      label: "Cases",
      labelKey: "navCases",
      icon: "folder",
      children: [
        { href: "/cases", label: "All Cases", labelKey: "navAllCases" },
        { href: "/caseInterviews", label: "Interviews", labelKey: "navInterviews" },
      ],
    },
    {
      label: "Legal",
      labelKey: "navLegal",
      icon: "gavel",
      children: [{ href: "/legalReviews", label: "All Legal Cases", labelKey: "navAllLegalCases" }],
    },
    {
      label: "Volunteers",
      labelKey: "navVolunteers",
      icon: "volunteer",
      children: [
        { href: "/volunteer", label: "All Volunteers", labelKey: "navAllVolunteers" },
        { href: "/volunteerRanking", label: "Applicant Ranking", labelKey: "navApplicantRanking" },
        { href: "/volunteerInterviews", label: "Interviews", labelKey: "navInterviews" },
        { href: "/volunteer/screening-questions", label: "Screening Questions", labelKey: "navScreeningQuestions" },
        { href: "/volunteer/chapters", label: "Chapters", labelKey: "navChapters" },
      ],
    },
    {
      label: "Projects",
      labelKey: "navProjects",
      icon: "projects",
      children: [
        { href: "/projects", label: "All Projects", labelKey: "navAllProjects" },
        { href: "/projectTasks/admin", label: "Project Tasks", labelKey: "navProjectTasks" },
      ],
    },
    { href: "/heatmap", label: "Heatmap", labelKey: "navHeatmap", icon: "map" },
    { href: "/support-messages", label: "Support Messages", icon: "contact" },
    { href: "/reportGenerator", label: "Reports & Analysis", labelKey: "navReportsAnalysis", icon: "assessment" },
    {
      label: "Settings",
      labelKey: "navSettings",
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
