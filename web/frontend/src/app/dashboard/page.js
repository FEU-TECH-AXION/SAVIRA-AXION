"use client";

// TODO: Move role checking to middleware for better security

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminDashboard from "@/components/dashboard/admin/AdminDashboard";
import StaffDashboard from "@/components/dashboard/staff/StaffDashboard";
import CaseOfficerDashboard from "@/components/dashboard/caseOfficer/CaseOfficerDashboard";
import LegalPersonnelDashboard from "@/components/dashboard/legalPersonnel/LegalPersonnelDashboard";
import ComplainantDashboard from "@/components/dashboard/complainant/ComplainantDashboard";

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
}

export default function DashboardPage() {
  const [role, setRole] = useState(null);
  const [userReports, setUserReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userCookie = getCookie('user');
    if (!userCookie) { router.push('/login'); return; }
    const user = JSON.parse(userCookie);
    setRole(user.role_name?.toLowerCase());
  }, []);

  useEffect(() => {
    if (role === "user") {
      fetchUserReports();
    }
  }, [role]);

  const fetchUserReports = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/case_reports/my-reports`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch reports');
      const { data } = await res.json();
      setUserReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching user reports:', err);
      setUserReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  if (!role) return <p>Loading...</p>;
  if (role === "admin")           return <AdminDashboard />;
  if (role === "staff")           return <StaffDashboard />;
  if (role === "case officer")    return <CaseOfficerDashboard />;
  if (role === "legal personnel") return <LegalPersonnelDashboard />;
  if (role === "user")            return <ComplainantDashboard userReports={userReports} />;

  return <p>Unauthorized</p>;
}