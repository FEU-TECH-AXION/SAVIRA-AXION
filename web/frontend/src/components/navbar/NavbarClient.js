"use client";
import { useAuth } from "@/lib/AuthContext";
import Navbar from "./navbar";

export default function NavbarClient() {
  const { user } = useAuth();
  return <Navbar user={user ? {
    role: user.role_name,
    firstName: user.first_name,
    lastName: user.last_name,
  } : null} />;
}