"use client";

import { useCallback, useState } from "react";
import { Check, CloudDownload, Loader2 } from "lucide-react";
import { downloadBookForOffline } from "@/lib/offline/engine";
import type { ChapterInput } from "@/lib/offline/types";

type SaveState = "idle" | "saving" | "saved" | "error";

interface SaveOfflineButtonProps {
  bookId: string;
  title: string;
  author?: string | null;
  /**
   * Secret used to derive the encryption key. Supply the server-issued value
   * from `deriveOfflinePassphrase(user.id)` so it matches the offline reader.
   */
  passphrase: string;
  /**
   * Provider that returns this book's chapters. This is the one seam that needs
   * wiring up per content pipeline — return the book's text split into chapters
   * (or a single `text` entry, which the engine will auto-chunk).
   */
  loadChapters: () => Promise<ChapterInput[]>;
  className?: string;
}

/**
 * "Save offline" control. Fetches chapter text via `loadChapters`, encrypts it
 * and persists it into IndexedDB for offline reading.
 */
export function SaveOfflineButton({
  bookId,
  title,
  author,
  passphrase,
  loadChapters,
  className,
}: SaveOfflineButtonProps) {
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const save = useCallback(async () => {
    setState("saving");
    setMessage(null);
    try {
      const chapters = await loadChapters();
      const count = await downloadBookForOffline({
        bookId,
        title,
        author,
        passphrase,
        chapters,
      });
      setState("saved");
      setMessage(`Saved ${count} chapter${count === 1 ? "" : "s"} for offline reading.`);
    } catch (cause) {
      setState("error");
      setMessage(cause instanceof Error ? cause.message : "Could not save this book offline.");
    }
  }, [author, bookId, loadChapters, passphrase, title]);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void save()}
        disabled={state === "saving"}
        className="inline-flex items-center gap-2 rounded-full bg-pine px-4 py-2 text-sm font-medium text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "saving" ? (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        ) : state === "saved" ? (
          <Check aria-hidden className="h-4 w-4" />
        ) : (
          <CloudDownload aria-hidden className="h-4 w-4" />
        )}
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved offline" : "Save offline"}
      </button>

      {message && (
        <p
          role="status"
          className={`mt-2 text-xs ${state === "error" ? "text-red-600" : "text-pine"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
