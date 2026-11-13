"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OfflineRuntime } from "@/lib/offline/runtime";
import type { OfflineReaderState } from "@/lib/offline/types";

/**
 * React entry point for offline reading.
 *
 * Usage:
 *   const reader = useOfflineReader({ bookId, passphrase });
 *   <div ref={reader.containerRef} />
 *
 * `containerRef` must be attached to the element that should receive the
 * painted chapter text. Navigation is exposed via `next`/`prev`/`goTo`.
 */

const INITIAL_STATE: OfflineReaderState = {
  status: "idle",
  title: "Protected reader",
  chapterIndex: 0,
  totalChapters: 0,
  error: null,
};

export interface UseOfflineReaderOptions {
  bookId: string;
  /** Secret used to derive the key. `null`/`undefined` keeps the reader idle. */
  passphrase: string | null | undefined;
  enabled?: boolean;
  onStateChange?: (state: OfflineReaderState) => void;
}

export function useOfflineReader({
  bookId,
  passphrase,
  enabled = true,
  onStateChange,
}: UseOfflineReaderOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<OfflineRuntime | null>(null);
  const [state, setState] = useState<OfflineReaderState>(INITIAL_STATE);

  const callbackRef = useRef(onStateChange);

  useEffect(() => {
    callbackRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    if (!enabled || !passphrase) return;

    const runtime = new OfflineRuntime({
      bookId,
      passphrase,
      onStateChange: (next) => {
        setState(next);
        callbackRef.current?.(next);
      },
    });
    runtimeRef.current = runtime;

    void runtime.open().then(() => {
      if (containerRef.current) runtime.attach(containerRef.current);
    });

    return () => {
      runtime.destroy();
      runtimeRef.current = null;
    };
  }, [bookId, passphrase, enabled]);

  const goTo = useCallback((order: number) => runtimeRef.current?.goTo(order), []);
  const next = useCallback(() => runtimeRef.current?.next(), []);
  const prev = useCallback(() => runtimeRef.current?.prev(), []);

  return { containerRef, ...state, goTo, next, prev };
}
