"use client";

import { useEffect } from "react";
import { applyDisplayPrefs, readDisplayPrefs } from "@/lib/displayPreferences";

export default function DisplayPreferencesClient() {
  useEffect(() => {
    applyDisplayPrefs(readDisplayPrefs());
  }, []);

  return null;
}
