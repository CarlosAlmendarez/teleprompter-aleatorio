import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const DEMO_LINES = [
  "Buenas noches a todos,",
  "gracias por acompañarnos.",
  "[G] Esta canción la escribimos",
  "[Em] en una madrugada de gira,",
  "[C] cuando todo parecía",
  "[D] ir demasiado rápido.",
  "Respira. Mira a la cámara.",
  "Sonríe en la siguiente frase.",
  "El texto avanza a tu ritmo,",
  "tú solo te preocupas de contar",
  "la historia.",
];

const FEATURES = [
  {
    icon: "📜",
    title: "Teleprompter fluido",
    body: "Desplazamiento automático o manual, velocidad y tamaño ajustables, modo espejo y pantalla completa.",
  },
  {
    icon: "🎸",
    title: "Acordes desde MusicXML",
    body: "Importa tu partitura y obtén una tabla de acordes que avanza compás a compás al tempo de la canción.",
  },
  {
    icon: "🎤",
    title: "Letra sincronizada",
    body: "Marca con {m:N} dónde empieza cada frase y la letra aparece justo cuando toca, con sus acordes.",
  },
  {
    icon: "📄",
    title: "PDF en pantalla dividida",
    body: "Adjunta la partitura o el guion en PDF y míralo al lado, desplazándose al mismo ritmo.",
  },
  {
    icon: "🗂️",
    title: "Biblioteca organizada",
    body: "Carpetas anidadas para guiones, cifrados ChordPro, partituras y PDFs, siempre a mano.",
  },
  {
    icon: "⌨️",
    title: "Control con teclado",
    body: "Espacio para pausar, flechas para velocidad y posición, F para pantalla completa.",
  },
];

const STEPS = [
  { title: "Crea o importa", body: "Escribe un guion, pega un cifrado o sube un .musicxml / .pdf." },
  { title: "Ajusta", body: "Sincroniza la letra y el PDF con los compases, o elige tu velocidad." },
  { title: "Sal a escena", body: "Abre el reproductor inmersivo y deja que el texto te acompañe." },
];

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Ambient glow + dotted grid */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/15" />
        <div className="bg-dots absolute inset-0 text-black/[.06] [mask-image:linear-gradient(to_bottom,black,transparent_70%)] dark:text-white/[.06]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-black/[.04] dark:text-zinc-300 dark:hover:bg-white/[.06]"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Para músicos, presentadores y creadores
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Tu guion y tus acordes,{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                siempre al ritmo
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              Un teleprompter y una biblioteca de partituras en un solo lugar. Importa
              MusicXML o PDF, sincroniza la letra con los compases y sal a escena sin
              perder el hilo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-900/10 transition hover:-translate-y-0.5 hover:bg-zinc-700 dark:bg-emerald-500 dark:text-black dark:shadow-emerald-500/20 dark:hover:bg-emerald-400"
              >
                Empezar gratis →
              </Link>
              <a
                href="#funciones"
                className="rounded-xl border border-black/10 bg-white/60 px-5 py-3 text-sm font-semibold backdrop-blur transition hover:bg-white dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
              >
                Ver funciones
              </a>
            </div>
          </div>

          {/* Animated prompter preview */}
          <div className="animate-fade-up [animation-delay:150ms]">
            <div className="relative mx-auto max-w-md rounded-2xl border border-black/10 bg-zinc-900 p-2 shadow-2xl shadow-emerald-900/20 dark:border-white/10">
              <div className="flex items-center gap-1.5 px-2 pb-2 pt-1">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-auto rounded-md bg-emerald-400 px-2 py-0.5 text-[10px] font-semibold text-black">
                  ▶ Auto · 40 px/s
                </span>
              </div>
              <div className="relative h-80 overflow-hidden rounded-xl bg-black">
                <div className="animate-prompter-roll px-5 text-lg font-semibold sm:px-6 sm:text-2xl leading-relaxed text-zinc-100">
                  {[0, 1].map((copy) => (
                    <div key={copy} aria-hidden={copy === 1} className="py-4">
                      {DEMO_LINES.map((line, i) => {
                        const chord = line.match(/^\[(\w+)\]\s*/);
                        return (
                          <p key={i}>
                            {chord && (
                              <span className="mr-2 align-middle text-base font-bold text-emerald-400">
                                {chord[1]}
                              </span>
                            )}
                            {chord ? line.slice(chord[0].length) : line}
                          </p>
                        );
                      })}
                    </div>
                  ))}
                </div>
                {/* Reading guide + fades */}
                <div className="pointer-events-none absolute inset-x-0 top-[40%] h-px bg-emerald-400/60" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black to-transparent" />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="funciones" className="border-y border-black/5 bg-white/70 py-20 backdrop-blur dark:border-white/5 dark:bg-white/[.02]">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold tracking-tight">Todo lo que necesitas en escena</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-zinc-600 dark:text-zinc-400">
              Pensado para ensayos, directos, grabaciones y presentaciones.
            </p>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 dark:border-white/10 dark:bg-zinc-900"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-2xl transition group-hover:scale-110">
                    {f.icon}
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Cómo funciona</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl border border-black/10 p-6 dark:border-white/10">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-16 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 p-10 text-center text-white shadow-xl sm:p-14">
            <h2 className="text-3xl font-bold tracking-tight">¿Listo para tu próximo ensayo?</h2>
            <p className="mx-auto mt-3 max-w-xl text-emerald-50/90">
              Entra con Google o con un enlace a tu correo. Sin contraseñas.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-block rounded-xl bg-white px-6 py-3 text-sm font-semibold text-emerald-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
            >
              Crear mi biblioteca
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-black/5 py-6 text-center text-xs text-zinc-500 dark:border-white/5">
        Teleprompter · Hecho para quienes salen a escena
      </footer>
    </div>
  );
}
