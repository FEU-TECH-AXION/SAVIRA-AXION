// src/app/logout/route.js
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function GET() {
  // clear your session cookie here, e.g.:
  cookies().delete("session");
  redirect("/");
}