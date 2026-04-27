"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LegalReviewManagement from "@/components/legalReviews/LegalReviewManagement";

export default function LegalReviewPage() {
  const [role, setRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      router.push('/login');
      return;
    }
    setRole(user.roles?.role_name?.toLowerCase());
  }, []);

  if (!role) return <p>Loading...</p>;
  if (role === "admin") return <LegalReviewManagement />;
  if (role === "case officer") return <LegalReviewManagement />;
  if (role === "legal personnel") return <LegalReviewManagement />;

  return <p>Unauthorized</p>;
}