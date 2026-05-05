"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    localStorage.removeItem('user');
    router.push('/login');
  }, []);

  return <p>Logging out...</p>;
}