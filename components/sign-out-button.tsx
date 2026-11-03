"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { btnSecondary } from "@/lib/ui";

export function SignOutButton({ onDark = false }: { onDark?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError("");

    let client;
    try {
      client = createClient();
    } catch {
      // Local stub mode may have no Supabase browser configuration.
      router.replace("/login");
      router.refresh();
      return;
    }

    try {
      const result = await client.auth.signOut();
      if (result.error) throw result.error;
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Could not sign out. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-w-0 max-w-full flex-col items-end gap-3">
      <button
        type="button"
        disabled={busy}
        aria-busy={busy}
        onClick={signOut}
        className={`${btnSecondary} text-lg`}
        style={onDark ? { outlineColor: "var(--color-mustard)" } : undefined}
      >
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 shrink-0"
        >
          <path d="M9 4H4v16h5m5-4 4-4-4-4m-6 4h13" />
        </svg>
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {error && (
        <p
          role="alert"
          className="max-w-sm break-words rounded-xl border-2 border-brand-red-dark bg-paper px-4 py-3 text-left text-lg font-semibold leading-relaxed text-brand-red-dark"
        >
          {error}
        </p>
      )}
    </div>
  );
}
