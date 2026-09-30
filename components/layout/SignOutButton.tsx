"use client";

import { clearOfflineContent } from "@/lib/offline/client";

/**
 * Sign-out form that first wipes this device's offline copies — they contain
 * the user's private documents and must not outlive the session.
 */
export function SignOutButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={async () => {
        await clearOfflineContent().catch(() => {});
        await action();
      }}
    >
      <button
        type="submit"
        title="Cerrar sesión"
        className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/[.03] dark:border-white/15 dark:hover:bg-white/[.05]"
      >
        Salir
      </button>
    </form>
  );
}
