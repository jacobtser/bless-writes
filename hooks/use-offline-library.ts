"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteOfflineBook, listOfflineBooks } from "@/lib/offline/idb";
import type { OfflineBookRecord } from "@/lib/offline/types";

/**
 * Lists and manages the books saved to this device for offline reading.
 *
 * Usage:
 *   const { books, loading, remove, refresh } = useOfflineLibrary();
 */
export function useOfflineLibrary() {
  const [books, setBooks] = useState<OfflineBookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBooks = useCallback(async () => {
    const records = await listOfflineBooks();
    return records.sort((a, b) => b.updatedAt - a.updatedAt);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setBooks(await loadBooks());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read offline library.");
    } finally {
      setLoading(false);
    }
  }, [loadBooks]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const records = await loadBooks();
        if (cancelled) return;
        setBooks(records);
        setError(null);
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Could not read offline library.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [loadBooks]);

  const remove = useCallback(
    async (bookId: string) => {
      await deleteOfflineBook(bookId);
      await refresh();
    },
    [refresh],
  );

  return { books, loading, error, refresh, remove };
}
