import { getUserRole } from "@/lib/auth";
import CaseManagement from "@/components/cases/CaseManagement";

export default async function DashboardPage() {
  const role = await getUserRole();

  if (role === "admin") return <CaseManagement />;

  return <p>Unauthorized</p>;
}