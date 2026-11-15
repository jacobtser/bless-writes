"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, WifiOff } from "lucide-react";
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
    <div className="reader-root fixed inset-0 flex flex-col bg-[#f6f4ef] text-neutral-900">
      <header className="reader-hide-for-print flex items-center justify-between gap-3 border-b border-neutral-200/80 bg-[#f6f4ef]/95 px-3 py-2 backdrop-blur sm:px-5">
        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-black/5"
          aria-label="Back to library"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          <span className="hidden sm:inline">Library</span>
        </Link>

        <h1 className="min-w-0 flex-1 truncate text-center font-display text-sm font-semibold text-neutral-900">
          {title}
        </h1>

        <Link
          href={`/reader/${bookId}/offline`}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-black/5"
          title="Open offline copy"
        >
          <WifiOff aria-hidden className="h-4 w-4" />
          <span className="hidden sm:inline">Offline</span>
        </Link>
      </header>

      <main className="reader-hide-for-print relative min-h-0 flex-1 overflow-hidden bg-[#eceae3]">
        <iframe
          src={`/reader/${bookId}/frame`}
          title={`${title} — reader`}
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