import { getUserRole } from "@/lib/auth";
import ProjectManagement from "@/components/projects/ProjectManagement";

export default async function DashboardPage() {
  const role = await getUserRole();

  if (role === "admin") return <ProjectManagement />;

  return <p>Unauthorized</p>;
}