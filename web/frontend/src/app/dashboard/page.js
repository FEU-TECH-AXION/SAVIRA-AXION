"use client";

// TODO: Move role checking to middleware for better security

import { useEffect, useState } from "react";
import AdminDashboard from "@/components/dashboard/admin/AdminDashboard";
import StaffDashboard from "@/components/dashboard/staff/StaffDashboard";
import CaseOfficerDashboard from "@/components/dashboard/caseOfficer/CaseOfficerDashboard";
import LegalPersonnelDashboard from "@/components/dashboard/legalPersonnel/LegalPersonnelDashboard";
import ComplainantDashboard from "@/components/dashboard/complainant/ComplainantDashboard";
import { useAuth } from "@/lib/AuthContext";

export default function DashboardPage() {
  const [userReports, setUserReports] = useState([]);
  const [latestApplication, setLatestApplication] = useState(null);
  const { user, loading } = useAuth();
  const role = user?.role_name?.toLowerCase();

  useEffect(() => {
    if (role !== "user") return;

    async function fetchLatestRecords() {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const [reportsResult, applicationsResult] = await Promise.allSettled([
        fetch(`${API_URL}/api/case_reports/my-reports`, { credentials: 'include' }),
        fetch(`${API_URL}/api/volunteer_applications/my_applications`, { credentials: 'include' }),
      ]);

      if (reportsResult.status === "fulfilled" && reportsResult.value.ok) {
        const body = await reportsResult.value.json();
        const reports = Array.isArray(body) ? body : body.data || [];
        reports.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        setUserReports(reports.slice(0, 1));
      } else {
        setUserReports([]);
      }

      if (applicationsResult.status === "fulfilled" && applicationsResult.value.ok) {
        const body = await applicationsResult.value.json();
        const applications = Array.isArray(body) ? body : body.data || [];
        applications.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        setLatestApplication(applications[0] || null);
      } else {
        setLatestApplication(null);
      }
    }

    fetchLatestRecords();
  }, [role]);

  if (loading) return <p>Loading...</p>;
  if (!role) return <p>Unauthorized</p>;
  if (role === "admin")           return <AdminDashboard />;
  if (role === "staff")           return <StaffDashboard />;
  if (role === "case officer")    return <CaseOfficerDashboard />;
  if (role === "legal personnel") return <LegalPersonnelDashboard />;
  if (role === "user")            return (
    <ComplainantDashboard
      userReports={userReports}
      applicationData={latestApplication}
    />
  );

  return <p>Unauthorized</p>;
}
