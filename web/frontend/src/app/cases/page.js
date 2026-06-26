"use client";
import { useAuth } from "@/lib/AuthContext";
import CaseManagement from "@/components/cases/CaseManagement";
import CreateReport from "@/components/cases/CreateReport";

export default function CasesPage() {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return null;

  const role = user.role_name?.toLowerCase();

  if (role === "admin")           return <CaseManagement />;
  if (role === "case officer")    return <CaseManagement />;
  if (role === "legal personnel") return <CaseManagement />;
  if (role === "user")            return <CreateReport />;
  if (role === "complainant")     return <CreateReport />;

  return <p>Unauthorized</p>;
}