"use client";

import { useEffect, useState } from "react";
import { internalApiFetch } from "@/lib/internalApiFetch";

export default function BackendAuthCheck() {
  const [state, setState] = useState({
    status: "loading",
    message: "Checking backend session...",
  });

  useEffect(() => {
    let mounted = true;

    internalApiFetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!mounted) return;

        if (!response.ok) {
          setState({
            status: "error",
            message: data.error || "Backend authentication failed.",
          });
          return;
        }

        setState({
          status: "success",
          message: `Authenticated as ${data.user?.email || data.user?.role_name || "internal user"}.`,
        });
      })
      .catch((error) => {
        if (!mounted) return;
        setState({
          status: "error",
          message: error.message || "Backend authentication failed.",
        });
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="panel" aria-live="polite">
      <h2>Backend session</h2>
      <p data-status={state.status}>{state.message}</p>
    </section>
  );
}
