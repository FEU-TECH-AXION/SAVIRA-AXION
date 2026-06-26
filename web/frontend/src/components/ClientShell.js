"use client";
import { useAuth } from "@/lib/AuthContext";

export default function ClientShell({ children }) {
  const { loading } = useAuth();
  if (loading) return null;
  return children;
}