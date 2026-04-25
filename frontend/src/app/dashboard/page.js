import { getUserRole } from "@/lib/auth";
import ComplainantDashboard from "@/components/dashboard/complainant/ComplainantDashboard";
import AdminDashboard from "@/components/dashboard/admin/AdminDashboard";
import CaseOfficerDashboard from "@/components/dashboard/caseOfficer/CaseOfficerDashboard";
import VolunteerDashboard from "@/components/dashboard/volunteer/VolunteerDashboard";

export default async function DashboardPage() {
  const role = await getUserRole();

  if (role === "admin") return <AdminDashboard />;
  if (role === "case_officer") return <CaseOfficerDashboard />;
  if (role === "volunteer") return <VolunteerDashboard />;
  if (role === "complainant") return <ComplainantDashboard />;

  return <p>Unauthorized</p>;
}