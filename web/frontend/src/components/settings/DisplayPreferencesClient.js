"use client";

import { useEffect } from "react";
import { applyDisplayPrefs, readDisplayPrefs } from "@/lib/displayPreferences";

export default function DisplayPreferencesClient() {
  useEffect(() => {
    const applySaved = () => applyDisplayPrefs(readDisplayPrefs());

    applySaved();
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener?.("change", applySaved);

    return () => media?.removeEventListener?.("change", applySaved);
  }, []);

  return null;
}
