"use client";

import { Suspense } from "react";
import LegalCaseCalendar from "@/components/legalReviews/LegalCaseCalendar";

export default function LegalCalendarPage() {
  return (
    <Suspense fallback={<div style={{ padding: "6rem 2rem", textAlign: "center" }}>Loading calendar…</div>}>
      <LegalCaseCalendar />
    </Suspense>
  );
}
