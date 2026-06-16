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

export const PUBLIC_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Contact" },
  { href: "/volunteer", label: "Volunteer" },
  { href: "/heatmap", label: "Heatmap" },
  { href: "/hospitals", label: "Hospitals Near Me" },
  { href: "/police-stations", label: "Police Stations Near Me" },
];

export const FOOTER_QUICK_LINKS = {
  public: PUBLIC_LINKS,
  complainant: [
    { href: "/dashboard", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/cases", label: "Report" },
    { href: "/volunteer", label: "Volunteer" },
    { href: "/contact", label: "Contact" },
    { href: "/events", label: "Events" },
    { href: "/heatmap", label: "Heatmap" },
    { href: "/hospitals", label: "Hospitals Near Me" },
    { href: "/police-stations", label: "Police Stations Near Me" },
  ],
  case_officer: [
    { href: "/dashboard", label: "Home" },
    { href: "/cases", label: "Cases" },
    { href: "/heatmap", label: "Heatmap" },
  ],
  staff: [
    { href: "/dashboard", label: "Home" },
    { href: "/projects", label: "Projects" },
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
    { href: "/volunteer", label: "Volunteers" },
    { href: "/heatmap", label: "Heatmap" },
    { href: "/reportGenerator", label: "Report Generator" },
  ],
};

export const SIDEBAR_LINKS = {
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
    { href: "/hospitals", label: "Hospitals Near Me", icon: "hospital" },
    { href: "/police-stations", label: "Police Stations Near Me", icon: "police" },
  ],
  // CASE OFFICER
  case_officer: [
    { href: "/dashboard", label: "Home", icon: "dashboard" },
    { href: "/cases", label: "Cases", icon: "folder" },
    { href: "/caseInterviews", label: "Interviews", icon: "interpreter" },
    { href: "/heatmap", label: "Heatmap", icon: "map" },
  ],
  // STAFF
  staff: [
    { href: "/dashboard", label: "Home", icon: "dashboard" },
    { href: "/projects", label: "Projects", icon: "folder" },
    {
      href: "/volunteer",
      label: "Volunteers",
      icon: "volunteer",
      children: [
        { href: "/volunteer", label: "All Volunteers" },
        { href: "/volunteerInterviews", label: "Interviews" },
        { href: "/volunteerRanking", label: "Applicant Ranking" },
      ],
    },
    { href: "/events", label: "Events", icon: "event" },
    { href: "/heatmap", label: "Heatmap", icon: "map" },
  ],
  // LEGAL PERSONNEL
  legal_personnel: [
    { href: "/dashboard", label: "Home", icon: "dashboard" },
    { href: "/legalReviews", label: "Legal Review", icon: "gavel" },
    { href: "/heatmap", label: "Heatmap", icon: "map" },
  ],
  // ADMIN
  admin: [
    { href: "/dashboard", label: "Home", icon: "dashboard" },
    { href: "/users", label: "Users", icon: "people" },
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
        { href: "/volunteerInterviews", label: "Interviews" },
        { href: "/volunteerRanking", label: "Applicant Ranking" },
        { href: "/volunteer/chapters", label: "Chapters" },
      ],
    },
    {
      label: "Projects",
      icon: "folder",
      children: [{ href: "/projects", label: "All Projects" }],
    },
    { href: "/heatmap", label: "Heatmap", icon: "map" },
    { href: "/reportGenerator", label: "Report Generator", icon: "assessment" },
  ],
};

export const SIDEBAR_FOOTER_LINKS = [
  { href: "/profile?tab=security", label: "Settings & privacy", icon: "settings" },
  { href: "/help", label: "Help & support", icon: "help" },
  { href: "/display", label: "Display & accessibility", icon: "accessibility" },
  { href: "/report", label: "Report a problem", icon: "flag" },
];

export function normalizeRole(roleName) {
  const role = roleName?.toLowerCase();
  if (role === "case officer") return "case_officer";
  if (role === "legal personnel") return "legal_personnel";
  if (role === "user") return "complainant";
  return role || "public";
}

export function getFooterQuickLinks(user) {
  const role = normalizeRole(user?.role_name);
  return FOOTER_QUICK_LINKS[role] || FOOTER_QUICK_LINKS.public;
}

export function getSidebarLinks(user) {
  const role = normalizeRole(user?.role_name);
  return SIDEBAR_LINKS[role] || [];
}
