"use client";

import { Suspense } from "react";
import ViewCase from "@/components/cases/ViewCase";

export default function ViewCasePage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>}>
      <ViewCase />
    </Suspense>
  );
}