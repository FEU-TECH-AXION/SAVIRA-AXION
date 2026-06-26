"use client";

import CreateReport from "@/components/cases/CreateReport";
import { useAuth } from "@/lib/AuthContext";

export default function ReportPage() {
  const { user, loading } = useAuth();
  const role = user?.role_name?.toLowerCase();

  if (loading) return <p>Loading...</p>;
  if (role === "user") return <CreateReport />;
  if (role === "complainant") return <CreateReport />;

  return <p>Unauthorized</p>;
}
