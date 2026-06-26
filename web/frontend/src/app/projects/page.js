"use client";
import { useAuth } from "@/lib/AuthContext";
import ProjectManagement from "@/components/projects/ProjectManagement";

export default function ProjectsPage() {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return null;

  const role = user.role_name?.toLowerCase();

  if (role === "admin") return <ProjectManagement />;
  if (role === "staff") return <ProjectManagement />;
  return <p>Unauthorized</p>;
}