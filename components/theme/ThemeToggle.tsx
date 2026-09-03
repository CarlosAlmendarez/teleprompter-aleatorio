"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  // Reads DOM/localStorage state set by the inline anti-flash script in
  // layout.tsx, which cannot be known during server rendering.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setTheme(readTheme());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function toggle() {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Cambiar tema claro/oscuro"
      title="Cambiar tema"
      className={
        className ??
        "rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/[.03] dark:border-white/15 dark:hover:bg-white/[.05]"
      }
    >
      {theme === null ? "…" : theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
