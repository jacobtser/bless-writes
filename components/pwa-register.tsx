"use client";

import { useEffect } from "react";

/**
 * Registers the service worker in production and reflects connectivity on the
 * document element (`data-online`), which CSS can use to show an offline badge.
 *
 * Mounted once from the root layout. In development the worker is skipped so it
 * never interferes with hot reload.
 */
export function PwaRegister() {
  useEffect(() => {
    const root = document.documentElement;

    const syncOnline = () => root.setAttribute("data-online", String(navigator.onLine));
    syncOnline();
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration is best-effort; the app still works without it */
      });
    }

    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  return null;
}
