import type { ScriptLine, ScriptToken } from "@/lib/script/parse";

/**
 * Renders a plain-text script: `# headings` as section titles (with ids the
 * jump menu scrolls to), `((notes))` dimmed in the theme's note colour, and
 * every spoken word in a `data-w` span so the voice follower can find it.
 */
export function ScriptText({
  lines,
  tokens,
  noteClass,
}: {
  lines: ScriptLine[];
  tokens: ScriptToken[][][];
  noteClass: string;
}) {
  return (
    <div>
      {lines.map((line, li) => {
        if (line.kind === "blank") return <div key={li} className="h-[1em]" />;
        if (line.kind === "heading") {
          return (
            <div
              key={li}
              id={line.id}
              className="mt-[0.6em] mb-[0.2em] text-[0.55em] font-semibold uppercase tracking-widest text-emerald-600 first:mt-0 dark:text-emerald-400"
            >
              {line.text}
            </div>
          );
        }
        return (
          <div key={li} className="whitespace-pre-wrap">
            {line.parts.map((part, pi) =>
              part.note ? (
                <span key={pi} className={`text-[0.7em] italic ${noteClass}`}>
                  (({part.text}))
                </span>
              ) : (
                tokens[li][pi].map((token, ti) =>
                  token.word === null ? (
                    <span key={ti}>{token.text}</span>
                  ) : (
                    <span key={ti} data-w={token.word} className="rounded-[0.1em] transition-colors">
                      {token.text}
                    </span>
                  ),
                )
              ),
            )}
          </div>
        );
      })}
    </div>
  );
}
