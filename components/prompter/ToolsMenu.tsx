"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const MENU_WIDTH_PX = 256;

const BUTTON_CLASS =
  "rounded-lg border border-black/15 bg-black/5 px-3 py-1.5 text-sm dark:border-white/15 dark:bg-white/5";

export type ToolItem = {
  id: string;
  label: ReactNode;
  onSelect: () => void;
  active?: boolean;
  disabled?: boolean;
  hint?: string;
};

/** "Herramientas" dropdown for the prompter's less frequent controls. */
export function ToolsMenu({ items }: { items: ToolItem[] }) {
  const [open, setOpen] = useState(false);
  // Open towards the side with room: the button may sit anywhere in the
  // wrapping toolbar, and a menu anchored the wrong way runs off-screen.
  const [alignRight, setAlignRight] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  function toggle() {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) setAlignRight(rect.right > MENU_WIDTH_PX + 16);
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const anyActive = items.some((i) => i.active);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`${BUTTON_CLASS} ${anyActive ? "!border-emerald-500/60" : ""}`}
      >
        ⚙ Herramientas
      </button>
      {open && (
        <div
          role="menu"
          style={{ width: MENU_WIDTH_PX }}
          className={`absolute ${alignRight ? "right-0" : "left-0"} top-full z-40 mt-1 overflow-hidden rounded-xl border border-black/10 bg-white py-1 text-sm shadow-xl dark:border-white/10 dark:bg-zinc-900`}
        >
          {items.map((item) => (
            <button
              key={item.id}
              role="menuitemcheckbox"
              aria-checked={item.active ?? false}
              disabled={item.disabled}
              title={item.hint}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
            >
              <span>{item.label}</span>
              {item.active && <span className="text-emerald-600 dark:text-emerald-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
