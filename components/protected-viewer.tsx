"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Lock, WifiOff } from "lucide-react";
import { useInterfaceLockdown } from "@/hooks/use-interface-lockdown";

interface ProtectedViewerProps {
  bookId: string;
  title: string;
}

/**
 * Outer shell of the reader. It sandboxes the actual book inside an iframe
 * (no downloads, no top navigation) and layers the browser protections on the
 * parent document too, so Ctrl+P / Ctrl+S / right-click are neutralised
 * everywhere in the reader.
 */
export function ProtectedViewer({ bookId, title }: ProtectedViewerProps) {
  useInterfaceLockdown();

  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const beforePrint = () => setPrinting(true);
    const afterPrint = () => setPrinting(false);
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);

    const mql = window.matchMedia("print");
    const onChange = (e: MediaQueryListEvent) => setPrinting(e.matches);
    mql.addEventListener("change", onChange);

    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
      mql.removeEventListener("change", onChange);
    };
  }, []);

  return (
    <div className="reader-root fixed inset-0 flex flex-col bg-[#171512] text-neutral-200">
      <header className="reader-hide-for-print flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
          Store
        </Link>

        <h1 className="truncate font-display text-sm font-semibold text-neutral-100">
          {title}
        </h1>

        <div className="flex items-center gap-2">
          <Link
            href={`/reader/${bookId}/offline`}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-neutral-400 transition hover:bg-white/5 hover:text-white"
            title="Open the saved offline copy"
          >
            <WifiOff aria-hidden className="h-3 w-3" />
            Offline
          </Link>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-neutral-400">
            <Lock aria-hidden className="h-3 w-3 text-brass" />
            Protected reader
          </span>
        </div>
      </header>

      <main className="reader-hide-for-print relative flex-1 overflow-hidden">
        <iframe
          src={`/reader/${bookId}/frame`}
          title={`${title} — protected reader`}
          sandbox="allow-scripts allow-same-origin"
          className="h-full w-full border-0"
        />
      </main>

      <div aria-hidden={!printing} className="print-block" role="alert">
        Printing is disabled for this eBook.
      </div>
    </div>
  );
}