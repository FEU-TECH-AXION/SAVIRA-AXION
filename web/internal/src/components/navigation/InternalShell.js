"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/navbar/navbar";
import Footer from "@/components/footer/footer";
import { useAuth } from "@/lib/AuthContext";

const SHELLLESS_ROUTES = ["/login", "/forgotPassword", "/resetPassword", "/not-authorized"];

export default function InternalShell({ children }) {
  const pathname = usePathname();
  const { loading } = useAuth();
  const shellless = SHELLLESS_ROUTES.some((route) => (
    pathname === route || pathname.startsWith(`${route}/`)
  ));

  if (shellless) return children;
  if (loading) return null;

  return (
    <>
      <Navbar />
      <div className="internal-shell-content">{children}</div>
      <Footer />
    </>
  );
}
