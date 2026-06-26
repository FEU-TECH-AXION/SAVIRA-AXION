"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import UserManagement from "@/components/users/UserManagement";

export default function UsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [loading, user, router]);

  if (loading) return <p>Loading...</p>;
  if (!user) return null;

  const role = user.role_name?.toLowerCase();
  if (role === "admin") return <UserManagement />;
  return <p>Unauthorized</p>;
}