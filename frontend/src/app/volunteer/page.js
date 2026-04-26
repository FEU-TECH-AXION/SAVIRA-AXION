import { getUserRole } from "@/lib/auth";
import Volunteer from "@/components/volunteer/landing";
import VolunteerManagement from "@/components/volunteer/VolunteerManagement";
import CaseOfficerDashboard from "@/components/dashboard/caseOfficer/CaseOfficerDashboard";
import VolunteerDashboard from "@/components/dashboard/volunteer/VolunteerDashboard";

// VolunteerApplication-related pages (you can rename based on your structure)
import ApplyApplicationForm from "@/components/volunteer/ApplyApplicationForm";
// import ApplicationStatus from "@/components/volunteer/ApplicationStatus";
// import ApplicationManagement from "@/components/volunteer/ApplicationManagement";

export default async function DashboardPage() {
  const role = await getUserRole();

  // Main system roles
  if (role === "admin") return <VolunteerManagement />;
//   if (role === "case_officer") return <CaseOfficerDashboard />;
//   if (role === "volunteer") return <VolunteerDashboard />;
  if (role === "complainant") return <ApplyApplicationForm />;

  return <p>Unauthorized</p>;
}