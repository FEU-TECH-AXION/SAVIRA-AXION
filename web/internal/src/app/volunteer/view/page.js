import { Suspense } from "react";
import ViewApplication from "@/components/volunteer/ViewApplication";

export default function ViewVolunteerApplicationPage() {
  return (
    <Suspense fallback={null}>
      <ViewApplication />
    </Suspense>
  );
}
