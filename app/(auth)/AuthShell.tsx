import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const HIGHLIGHTS = [
  "Teleprompter con modo espejo y control por teclado",
  "Acordes y letra sincronizados al tempo del MusicXML",
  "Partituras PDF en pantalla dividida",
];

/** Two-column auth layout: brand panel (desktop only) + form column. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid flex-1 bg-zinc-50 lg:grid-cols-2 dark:bg-zinc-950">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-zinc-900 p-12 text-white lg:flex lg:flex-col">
        <div className="bg-dots pointer-events-none absolute inset-0 text-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl" />
        <Link href="/" className="relative">
          <Logo />
        </Link>
        <div className="relative mt-auto">
          <p className="text-3xl font-bold leading-tight tracking-tight">
            Tu guion y tus acordes,
            <br />
            siempre al ritmo.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-emerald-50/90">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[11px]">
                  ✓
                </span>
                {h}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="relative flex flex-col px-4 py-8 sm:px-8">
        <div className="absolute right-6 top-6 hidden lg:block">
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">{children}</div>
      </div>
    </div>
  );
}
