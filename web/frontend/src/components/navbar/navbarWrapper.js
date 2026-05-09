"use client";

import { useAuth } from "@/lib/AuthContext";
import Navbar from "./navbar";

export default function NavbarWrapper() {
  const { user, logout } = useAuth();

  // Map DB fields → shape Navbar expects
  const navUser = user
    ? {
        role:      user.role_name,
        firstName: user.first_name,
        lastName:  user.last_name,
      }
    : null;

  return <Navbar user={navUser} onLogout={logout} />;
}