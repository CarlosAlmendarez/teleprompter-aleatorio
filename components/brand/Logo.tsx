/**
 * App mark: a rounded "screen" with scrolling script lines and a reading guide.
 * The gradient lives in CSS rather than an SVG <linearGradient>: a shared
 * gradient id breaks every other instance when the first one sits inside a
 * `display:none` subtree (e.g. the auth brand panel on mobile).
 */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-[28%] bg-gradient-to-br from-emerald-400 to-teal-600 ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className="h-full w-full">
        <rect x="8" y="8" width="16" height="2.4" rx="1.2" fill="#fff" opacity="0.45" />
        <rect x="8" y="14.8" width="12" height="2.4" rx="1.2" fill="#fff" />
        <rect x="8" y="21.6" width="14" height="2.4" rx="1.2" fill="#fff" opacity="0.45" />
        <path d="M4.5 13.2 7 16l-2.5 2.8z" fill="#fff" />
      </svg>
    </span>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <LogoMark />
      <span>Teleprompter</span>
    </span>
  );
}
