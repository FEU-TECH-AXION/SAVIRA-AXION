"use client";

import { useEffect, useState } from "react";
import ComplainantDashboard from "@/components/dashboard/complainant/ComplainantDashboard";
import { authFetch, useAuth } from "@/lib/AuthContext";

export default function DashboardPage() {
  const [userReports, setUserReports] = useState([]);
  const [latestApplication, setLatestApplication] = useState(null);
  const { user, loading } = useAuth();
  const role = user?.role_name?.toLowerCase();

  useEffect(() => {
    if (role !== "user" && role !== "complainant") return;

    async function fetchLatestRecords() {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      const [reportsResult, applicationsResult] = await Promise.allSettled([
        authFetch(`${API_URL}/api/case_reports/my-reports`),
        authFetch(`${API_URL}/api/volunteer_applications/my_applications`),
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
  if (role !== "user" && role !== "complainant") return <p>Unauthorized</p>;

  return (
    <ComplainantDashboard
      userReports={userReports}
      applicationData={latestApplication}
    />
  );
}
