import { getUserRole } from "@/lib/auth";
import UserManagement from "@/components/users/UserManagement";

export default async function DashboardPage() {
  const role = await getUserRole();

  if (role === "admin") return <UserManagement />;

  return <p>Unauthorized</p>;
}