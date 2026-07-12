"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/navbar/navbar";
import Footer from "@/components/footer/footer";

const SHELLLESS_ROUTES = ["/login", "/not-authorized"];

export default function InternalShell({ children }) {
  const pathname = usePathname();
  const shellless = SHELLLESS_ROUTES.some((route) => (
    pathname === route || pathname.startsWith(`${route}/`)
  ));

  if (shellless) return children;

  return (
    <>
      <Navbar />
      <div className="internal-shell-content">{children}</div>
      <Footer />
    </>
  );
}
