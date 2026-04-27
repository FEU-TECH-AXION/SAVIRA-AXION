"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CaseManagement from "@/components/cases/CaseManagement";

export default function CasesPage() {
  const [role, setRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) { router.push('/login'); return; }
    setRole(user.roles?.role_name?.toLowerCase());
  }, []);

  if (!role) return <p>Loading...</p>;
  if (role === "admin") return <CaseManagement />;
  return <p>Unauthorized</p>;
}