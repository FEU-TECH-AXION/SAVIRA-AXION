import { getUserRole } from "@/lib/auth";
import LegalReviewManagement from "@/components/legalReviews/LegalReviewManagement";

export default async function DashboardPage() {
  const role = await getUserRole();

  if (role === "admin") return <LegalReviewManagement />;

  return <p>Unauthorized</p>;
}