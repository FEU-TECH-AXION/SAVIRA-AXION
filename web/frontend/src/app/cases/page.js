"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CaseManagement from "@/components/cases/CaseManagement";
import CreateReport from "@/components/report/CreateReport";

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
};

export default function CasesPage() {
  const [role, setRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const userCookie = getCookie('user');
    if (!userCookie) { router.push('/login'); return; }
    const user = JSON.parse(userCookie);
    setRole(user.role_name?.toLowerCase());
  }, []);

  if (!role) return <p>Loading...</p>;
  if (role === "admin")          return <CaseManagement />;
  if (role === "case officer")   return <CaseManagement />;
  if (role === "legal personnel") return <CaseManagement />;
  if (role === "user") return <CreateReport />;
  if (role === "complainant") return <CreateReport />;

  return <p>Unauthorized</p>;
}