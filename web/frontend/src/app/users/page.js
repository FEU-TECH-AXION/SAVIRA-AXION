"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserManagement from "@/components/users/UserManagement";

export default function UsersPage() {
  const [role, setRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) { router.push('/login'); return; }
    setRole(user.roles?.role_name?.toLowerCase());
  }, []);

  if (!role) return <p>Loading...</p>;
  if (role === "admin") return <UserManagement />;
  return <p>Unauthorized</p>;
}