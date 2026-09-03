import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  async function signInWithEmail(formData: FormData) {
    "use server";
    const email = formData.get("email");
    if (typeof email !== "string" || !email) return;
    await signIn("resend", { email, redirectTo: "/dashboard" });
  }

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/dashboard" });
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Teleprompter
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Inicia sesión para acceder a tus guiones, partituras y setlists.
        </p>

        <form action={signInWithGoogle} className="mt-6">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/10 px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-black/[.03] dark:border-white/15 dark:text-zinc-50 dark:hover:bg-white/[.05]"
          >
            Continuar con Google
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
          <span className="text-xs text-zinc-500">o con tu correo</span>
          <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        </div>

        <form action={signInWithEmail} className="flex flex-col gap-3">
          <input
            type="email"
            name="email"
            required
            placeholder="tu@correo.com"
            className="rounded-lg border border-black/10 bg-transparent px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-white/15 dark:text-zinc-50"
          />
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-emerald-500 dark:text-black dark:hover:bg-emerald-400"
          >
            Enviarme un enlace de acceso
          </button>
        </form>
      </div>
    </div>
  );
}
