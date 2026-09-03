import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function ImmersiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <div className="flex flex-1 flex-col">{children}</div>;
}
