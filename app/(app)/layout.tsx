import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Logo } from "@/components/brand/Logo";
import { MainNav } from "@/components/layout/MainNav";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { ServiceWorkerManager } from "@/components/offline/ServiceWorkerManager";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  const displayName = session.user.name ?? session.user.email ?? "";
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-6">
            <Link href="/dashboard" className="text-sm" aria-label="Inicio">
              <Logo className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
            </Link>
            <MainNav />
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <ThemeToggle />
            <div className="flex items-center gap-2 rounded-full border border-black/10 py-1 pl-1 pr-3 dark:border-white/10">
              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-xs font-bold text-white">
                  {initial}
                </span>
              )}
              <span className="hidden max-w-48 truncate text-xs sm:inline">{session.user.email}</span>
            </div>
            <SignOutButton action={handleSignOut} />
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <ServiceWorkerManager signedIn />
    </div>
  );
}
