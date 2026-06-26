"use client";
import VolunteerManagement from "@/components/volunteer/VolunteerManagement";
import VolunteerLanding from "@/components/volunteer/VolunteerLanding";
import { useAuth } from "@/lib/AuthContext";

export default function VolunteerPage() {
  const { user, loading } = useAuth();
  const role = user?.role_name?.toLowerCase();

  if (loading) return <p>Loading...</p>;
  if (role === "admin") return <VolunteerManagement />;
  if (role === "staff") return <VolunteerManagement />;
  if (role === "user") return <VolunteerLanding isComplainant={true} />;
  if (!role) return <VolunteerLanding isComplainant={false} />;

  return <p>Unauthorized</p>;
}
