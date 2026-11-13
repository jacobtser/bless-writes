import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

/**
 * Offline fallback shell. Pre-cached by the service worker and shown when a
 * navigation fails while the device is offline. Books saved for offline reading
 * are reachable at /reader/<bookId>/offline.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-paper px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pine-wash text-pine">
        <WifiOff aria-hidden className="h-6 w-6" />
      </span>
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold text-ink">You&rsquo;re offline</h1>
        <p className="max-w-sm text-sm text-ink-soft">
          Reconnect to browse the store, or open a book you&rsquo;ve already saved
          offline — those keep working without a connection.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-white transition hover:bg-pine/90"
      >
        Back to the store
      </Link>
    </main>
  );
}
