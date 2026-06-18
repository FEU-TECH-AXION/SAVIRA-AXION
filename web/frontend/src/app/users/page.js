"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserManagement from "@/components/users/UserManagement";

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
};

export default function UsersPage() {
  const [role, setRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const userCookie = getCookie('user');
    if (!userCookie) { router.push('/'); return; }
    const user = JSON.parse(userCookie);
    setRole(user.role_name?.toLowerCase());
  }, []);

  if (!role) return <p>Loading...</p>;
  if (role === "admin") return <UserManagement />;
  return <p>Unauthorized</p>;
}