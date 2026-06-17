import { getUserRole } from "@/lib/auth";
import CreateReport from "@/components/cases/CreateReport";

export default async function ReportPage() {
  const role = await getUserRole();

  if (role === "user") return <CreateReport />;
  if (role === "complainant") return <CreateReport />;

  return <p>Unauthorized</p>;
}
