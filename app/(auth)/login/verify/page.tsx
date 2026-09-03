export default function VerifyRequestPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Revisa tu correo
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Te enviamos un enlace de acceso. Ábrelo desde este dispositivo para
          iniciar sesión.
        </p>
      </div>
    </div>
  );
}
