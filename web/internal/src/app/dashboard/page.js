"use client";

import AdminDashboard from "@/components/dashboard/admin/AdminDashboard";
import StaffDashboard from "@/components/dashboard/staff/StaffDashboard";
import CaseOfficerDashboard from "@/components/dashboard/case-officer/CaseOfficerDashboard";
import LegalPersonnelDashboard from "@/components/dashboard/legal-personnel/LegalPersonnelDashboard";
import { useAuth } from "@/lib/AuthContext";
import { normalizeRole } from "@/lib/roles";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const role = normalizeRole(user?.role_name || user?.role);

  if (loading) return <main className="shell"><p>Loading...</p></main>;
  if (!user) return null;

  if (role === "admin") return <AdminDashboard />;
  if (role === "staff") return <StaffDashboard />;
  if (role === "case_officer") return <CaseOfficerDashboard />;
  if (role === "legal") return <LegalPersonnelDashboard />;

  return (
    <main className="shell">
      <section className="panel">
        <h1>Unauthorized</h1>
        <p>Your account does not have access to the internal dashboard.</p>
      </section>
    </main>
  );
}
