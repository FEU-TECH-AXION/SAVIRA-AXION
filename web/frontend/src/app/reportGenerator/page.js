"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ReportGenerator from "@/components/reportGenerator/ReportGenerator";
import { useAuth } from "@/lib/AuthContext";

export default function ReportGeneratorPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const role = user?.role_name?.toLowerCase();

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [loading, router, user]);

  if (loading) return <p>Loading...</p>;
  if (!user) return null;
  if (role === "admin")          return <ReportGenerator />;

  return <p>Unauthorized</p>;
}
