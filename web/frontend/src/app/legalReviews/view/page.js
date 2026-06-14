"use client";

import { Suspense } from "react";
import ViewLegalCase from "@/components/legalReviews/ViewLegalCase";

export default function LegalReviewViewPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>}>
      <ViewLegalCase />
    </Suspense>
  );
}