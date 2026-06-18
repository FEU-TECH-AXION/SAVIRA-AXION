"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Call backend to clear httpOnly cookie
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).finally(() => {
      router.push('/');
    });
  }, []);

  return <p>Logging out...</p>;
}