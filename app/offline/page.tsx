import { OfflineContent } from "@/components/offline/OfflineContent";

export const metadata = { title: "Sin conexión" };

// Precached by the service worker and served for any page that isn't saved.
export default function OfflinePage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-lg text-center">
        <div className="text-6xl">📡</div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Sin conexión</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Esta página no está guardada en el dispositivo. Puedes abrir lo que marcaste como
          “Disponible sin conexión”:
        </p>
      </div>
      <OfflineContent />
    </div>
  );
}
