// frontend/src/app/volunteer/page.js
//
// Routing logic:
//   admin       → VolunteerManagement
//   complainant → VolunteerLanding (with Apply Now button)
//   public/null → VolunteerLanding (with Log In to Apply button)
//   other roles → Unauthorized

import { getUserRole } from "@/lib/auth";
import VolunteerLanding from "@/components/volunteer/landing";
import VolunteerManagement from "@/components/volunteer/VolunteerManagement";
// import CaseOfficerDashboard from "@/components/dashboard/caseOfficer/CaseOfficerDashboard";
// import VolunteerDashboard from "@/components/dashboard/volunteer/VolunteerDashboard";

export default async function VolunteerPage() {
  const role = await getUserRole();

  // Admin sees the management view
  if (role === "admin") return <VolunteerManagement />;

  // Complainants see the landing page with "Apply Now" CTA
  if (role === "complainant") return <VolunteerLanding isComplainant={true} />;

  // Public visitors (not logged in) see the same landing, but with "Log In to Apply"
  if (!role) return <VolunteerLanding isComplainant={false} />;

  // Any other role (case officer, volunteer, etc.) — show unauthorized
  return <p>Unauthorized</p>;
}