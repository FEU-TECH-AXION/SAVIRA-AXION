"use client";

import { Suspense } from "react";
import ViewApplication from "@/components/volunteer/ViewApplication";

export default function ViewApplicationPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>}>
      <ViewApplication />
    </Suspense>
  );
}