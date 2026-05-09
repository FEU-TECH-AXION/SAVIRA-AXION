"use client";

// TODO: Replace localStorage with proper session management (e.g. cookies or Supabase Auth)
// TODO: Move role checking to middleware for better security

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import AdminDashboard from "@/components/dashboard/admin/AdminDashboard";
import StaffDashboard from "@/components/dashboard/staff/StaffDashboard";
import CaseOfficerDashboard from "@/components/dashboard/caseOfficer/CaseOfficerDashboard";
import LegalPersonnelDashboard from "@/components/dashboard/legalPersonnel/LegalPersonnelDashboard";
import ComplainantDashboard from "@/components/dashboard/complainant/ComplainantDashboard";

export default function DashboardPage() {
  const { user, loading } = useAuth();  // ✅ from context, not localStorage
  const router = useRouter();
 
  useEffect(() => {
    // Once loading is done, if no user → redirect to login
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user]);
 
  // Still checking session
  if (loading) return <p>Loading...</p>;
 
  // Not logged in (redirect is in progress)
  if (!user) return null;
 
  const role = user.role_name?.toLowerCase();
 
  if (role === "admin")            return <AdminDashboard />;
  if (role === "staff")            return <StaffDashboard />;
  if (role === "case officer")     return <CaseOfficerDashboard />;
  if (role === "legal personnel")  return <LegalPersonnelDashboard />;
  if (role === "user")             return <ComplainantDashboard />;
  if (role === "complainant")      return <ComplainantDashboard />;
 
  return <p>Unauthorized</p>;
}