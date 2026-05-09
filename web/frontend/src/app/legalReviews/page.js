"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LegalReviewManagement from "@/components/legalReviews/LegalReviewManagement";

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
};

export default function LegalReviewPage() {
  const [role, setRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const userCookie = getCookie('user');
    if (!userCookie) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(userCookie);
    setRole(user.role_name?.toLowerCase());
  }, []);

  if (!role) return <p>Loading...</p>;
  if (role === "admin") return <LegalReviewManagement />;
  if (role === "legal personnel") return <LegalReviewManagement />;

  return <p>Unauthorized</p>;
}