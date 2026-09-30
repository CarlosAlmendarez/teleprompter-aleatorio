import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AuthShell } from "../AuthShell";

export const metadata = { title: "Iniciar sesión" };

// Auth.js redirects back here with ?error=<code> when sign-in fails.
const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "Ese correo ya está vinculado a otro método de acceso. Entra con el método que usaste la primera vez.",
  Verification: "El enlace de acceso caducó o ya se usó. Pide uno nuevo.",
  AccessDenied: "Acceso denegado.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/dashboard");
  const { error } = await searchParams;
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "No se pudo iniciar sesión. Inténtalo de nuevo.")
    : null;

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
    <AuthShell>
      <div className="flex items-center justify-between lg:hidden">
        <Link href="/">
          <Logo />
        </Link>
        <ThemeToggle />
      </div>

      <div className="mt-10 lg:mt-0">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Bienvenido de nuevo
        </h1>
        <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
          Inicia sesión para acceder a tus guiones, partituras y setlists.
        </p>
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
        >
          {errorMessage}
        </p>
      )}

      <form action={signInWithGoogle} className="mt-8">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-white/15 dark:bg-white/5 dark:text-zinc-50 dark:hover:bg-white/10"
        >
          <GoogleIcon className="h-4 w-4" />
          Continuar con Google
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        <span className="text-xs text-zinc-500">o con tu correo</span>
        <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
      </div>

      <form action={signInWithEmail} className="flex flex-col gap-3">
        <label htmlFor="email" className="sr-only">
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="tu@correo.com"
          className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-white/15 dark:bg-white/5 dark:text-zinc-50"
        />
        <button
          type="submit"
          className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-emerald-500 dark:text-black dark:hover:bg-emerald-400"
        >
          Enviarme un enlace de acceso
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-zinc-500">
        Sin contraseñas: te enviamos un enlace seguro de un solo uso.
      </p>
    </AuthShell>
  );
}
