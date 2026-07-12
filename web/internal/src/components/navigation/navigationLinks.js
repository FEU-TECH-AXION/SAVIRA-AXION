export const ROLE_LABELS = {
  admin: "Admin",
  staff: "Staff",
  case_officer: "Case Officer",
  "case officer": "Case Officer",
  legal: "Legal Personnel",
  legal_personnel: "Legal Personnel",
  "legal personnel": "Legal Personnel",
};

export const INTERNAL_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  {
    label: "Cases",
    icon: "folder",
    children: [
      { href: "/cases", label: "Case Management" },
      { href: "/caseInterviews", label: "Case Interviews" },
    ],
  },
  {
    label: "Legal Reviews",
    icon: "gavel",
    children: [
      { href: "/legalReviews", label: "Review Management" },
      { href: "/legalReviews/calendar", label: "Legal Calendar" },
    ],
  },
  { href: "/users", label: "Users", icon: "people" },
  {
    label: "Projects",
    icon: "folder",
    children: [
      { href: "/projects", label: "Projects" },
      { href: "/projectTasks", label: "Project Tasks" },
      { href: "/projectTasks/admin", label: "Task Admin" },
    ],
  },
  { href: "/staffAvailability", label: "Staff Availability", icon: "calendar" },
  { href: "/volunteerRanking", label: "Volunteer Ranking", icon: "volunteer" },
  { href: "/volunteer/chapters", label: "Volunteer Chapters", icon: "handsHelping" },
  { href: "/reportGenerator", label: "Report Generator", icon: "assessment" },
];

export const FOOTER_QUICK_LINKS = INTERNAL_LINKS.flatMap((item) => (
  item.children ? item.children : [item]
));

export function getSidebarLinks() {
  return INTERNAL_LINKS;
}

export function getFooterQuickLinks() {
  return FOOTER_QUICK_LINKS;
}
