import Link from "next/link";
import { AuthShell } from "../../AuthShell";

export const metadata = { title: "Revisa tu correo" };

export default function VerifyRequestPage() {
  return (
    <AuthShell>
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-3xl">
          ✉️
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Revisa tu correo
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Te enviamos un enlace de acceso. Ábrelo desde este dispositivo para
          iniciar sesión. Si no lo ves, revisa la carpeta de spam.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          ← Usar otro correo
        </Link>
      </div>
    </AuthShell>
  );
}
