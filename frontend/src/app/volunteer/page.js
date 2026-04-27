"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VolunteerManagement from "@/components/volunteer/VolunteerManagement";
import VolunteerLanding from "@/components/volunteer/landing";

export default function VolunteerPage() {
  const [role, setRole] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      setRole(user.roles?.role_name?.toLowerCase());
    }
    setLoaded(true);
  }, []);

  if (!loaded) return <p>Loading...</p>;
  if (role === "admin") return <VolunteerManagement />;
  if (role === "staff") return <VolunteerManagement />;
  if (role === "complainant") return <VolunteerLanding isComplainant={true} />;
  if (!role) return <VolunteerLanding isComplainant={false} />;

  return <p>Unauthorized</p>;
}