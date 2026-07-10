"use client";

import { Suspense } from "react";
import ViewChapter from "@/components/chapterBuilding/ViewChapter";

export default function ViewChapterPage() {
  return (
    <Suspense fallback={null}>
      <ViewChapter />
    </Suspense>
  );
}
