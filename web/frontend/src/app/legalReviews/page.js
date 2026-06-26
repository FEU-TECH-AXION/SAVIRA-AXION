"use client";
import { useAuth } from "@/lib/AuthContext";
import LegalReviewManagement from "@/components/legalReviews/LegalReviewManagement";

export default function LegalReviewPage() {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return null;

  const role = user.role_name?.toLowerCase();

  if (role === "admin") return <LegalReviewManagement />;
  if (
    role === "legal personnel" ||
    role === "legal_personnel" ||
    role === "paralegal" ||
    role === "legal_officer" ||
    role === "legal officer"
  ) return <LegalReviewManagement />;

  return <p>Unauthorized</p>;
}