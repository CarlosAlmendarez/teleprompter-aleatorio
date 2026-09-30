import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-4 py-20 text-center dark:bg-zinc-950">
      <div className="text-6xl">🎭</div>
      <h1 className="text-2xl font-bold tracking-tight">Esta página no está en el guion</h1>
      <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        El documento o la carpeta no existe, o no tienes acceso a ella.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-emerald-500 dark:text-black dark:hover:bg-emerald-400"
      >
        Volver a la biblioteca
      </Link>
    </div>
  );
}
