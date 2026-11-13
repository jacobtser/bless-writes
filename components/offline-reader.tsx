"use client";

import Link from "next/link";
import { useCallback, useEffect } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, WifiOff } from "lucide-react";
import { useInterfaceLockdown } from "@/hooks/use-interface-lockdown";
import { useOfflineReader } from "@/hooks/use-offline-reader";

interface OfflineReaderProps {
  bookId: string;
  title: string;
  /** Server-issued key passphrase from `deriveOfflinePassphrase(user.id)`. */
  passphrase: string;
}

/**
 * Full-screen reader for a book saved to this device.
 *
 * The chapter text is decrypted one chapter at a time and painted as DOM text
 * nodes. Interface lockdown is installed on this surface, matching the online
 * reader. Rendered without any network access, so it works fully offline.
 */
export function OfflineReader({ bookId, title, passphrase }: OfflineReaderProps) {
  useInterfaceLockdown();

  const reader = useOfflineReader({ bookId, passphrase });

  const { next, prev, containerRef } = reader;
  const atStart = reader.chapterIndex <= 0;
  const atEnd = reader.totalChapters === 0 || reader.chapterIndex >= reader.totalChapters - 1;

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") void next();
      if (event.key === "ArrowLeft") void prev();
    },
    [next, prev],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return (
    <div className="reader-root fixed inset-0 flex flex-col bg-[#171512] text-neutral-200">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
          Store
        </Link>

        <h1 className="truncate font-display text-sm font-semibold text-neutral-100">
          {reader.title || title}
        </h1>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-neutral-400">
          <WifiOff aria-hidden className="h-3 w-3 text-brass" />
          Offline
        </span>
      </header>

      <main className="relative flex-1 overflow-y-auto">
        <article
          ref={containerRef}
          className="drm-locked mx-auto max-w-3xl px-6 py-10 font-serif text-[1.0625rem] leading-8 text-neutral-200 [&>p]:mb-6 [&>p]:whitespace-pre-wrap"
        />

        {reader.status === "loading" && (
          <p className="px-6 py-10 text-center text-sm text-neutral-400">
            Decrypting your saved copy…
          </p>
        )}

        {reader.status === "unavailable" && (
          <p className="mx-auto max-w-md px-6 py-10 text-center text-sm text-neutral-400">
            This book has not been saved to this device yet. Open it while online
            and choose “Save offline”.
          </p>
        )}

        {reader.status === "error" && (
          <p className="mx-auto max-w-md px-6 py-10 text-center text-sm text-red-300">
            {reader.error ?? "This offline copy could not be opened."}
          </p>
        )}
      </main>

      <footer className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={() => void prev()}
          disabled={atStart || reader.status !== "ready"}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-1.5 text-xs font-medium text-neutral-300 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft aria-hidden className="h-3.5 w-3.5" />
          Previous
        </button>

        <span className="text-xs tabular-nums text-neutral-500">
          {reader.totalChapters > 0
            ? `${reader.chapterIndex + 1} / ${reader.totalChapters}`
            : "—"}
        </span>

        <button
          type="button"
          onClick={() => void next()}
          disabled={atEnd || reader.status !== "ready"}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-1.5 text-xs font-medium text-neutral-300 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight aria-hidden className="h-3.5 w-3.5" />
        </button>
      </footer>
    </div>
  );
}
