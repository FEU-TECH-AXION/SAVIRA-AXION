"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VolunteerManagement from "@/components/volunteer/VolunteerManagement";
import VolunteerLanding from "@/components/volunteer/VolunteerLanding";

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
};

export default function VolunteerPage() {
  const [role, setRole] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userCookie = getCookie('user');
    if (userCookie) {
      const user = JSON.parse(userCookie);
      setRole(user.role_name?.toLowerCase());
    }
    setLoaded(true);
  }, []);

  if (!loaded) return <p>Loading...</p>;
  if (role === "admin") return <VolunteerManagement />;
  if (role === "staff") return <VolunteerManagement />;
  if (role === "user") return <VolunteerLanding isComplainant={true} />;
  if (!role) return <VolunteerLanding isComplainant={false} />;

  return <p>Unauthorized</p>;
}