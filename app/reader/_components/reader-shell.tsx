"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import { ArrowRight, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useInterfaceLockdown } from "@/hooks/use-interface-lockdown";

// Self-hosted worker (copied to /public/vendor by scripts/copy-pdfjs-worker.mjs).
pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";

interface ReaderShellProps {
  /** PDF source URL. Full reader: /api/view-book; preview: /api/preview-book. */
  src: string;
  userEmail?: string | null;
  /** Preview mode adds a sample banner and an end-of-sample purchase CTA. */
  preview?: boolean;
  /** Short line under the book title, e.g. "Free sample · pages 9–12". */
  previewLabel?: string;
  /** Book title shown in the preview header. */
  previewTitle?: string;
  /** Where the back control goes in preview mode. */
  backHref?: string;
  backLabel?: string;
  /** Where the purchase CTA goes in preview mode. */
  purchaseHref?: string;
  purchaseLabel?: string;
}

function isRenderCancellation(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "RenderingCancelledException" || /cancel/i.test(error.message))
  );
}

export function ReaderShell({
  src,
  userEmail,
  preview = false,
  previewLabel = "Free sample",
  previewTitle = "Free sample",
  backHref = "/",
  backLabel = "Store",
  purchaseHref = "/#books",
  purchaseLabel = "Get the full book",
}: ReaderShellProps) {
  useInterfaceLockdown();

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [fitVersion, setFitVersion] = useState(0);

  const renderPage = useCallback(async (number: number) => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!pdf || !canvas || !stage) return;

    const page = await pdf.getPage(number);
    const baseViewport = page.getViewport({ scale: 1 });

    const maxWidth = Math.max(260, stage.clientWidth - 48);
    const maxHeight = Math.max(320, stage.clientHeight - 96);
    const scale = Math.min(maxWidth / baseViewport.width, maxHeight / baseViewport.height, 1.6);
    const viewport = page.getViewport({ scale });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    renderTaskRef.current?.cancel();
    const renderTask = page.render({ canvas, viewport });
    renderTaskRef.current = renderTask;
    await renderTask.promise;
  }, []);

  // Open the document through the protected streaming API.
  useEffect(() => {
    let cancelled = false;

    async function openDocument() {
      try {
        const loadingTask = pdfjsLib.getDocument({ url: src });
        loadingTaskRef.current = loadingTask;
        const doc = await loadingTask.promise;
        if (cancelled) {
          await loadingTask.destroy();
          return;
        }
        pdfRef.current = doc;
        setNumPages(doc.numPages);
        setStatus("ready");
      } catch (error) {
        // A pending load is expected to abort during Strict Mode cleanup or
        // when the reader unmounts; only report genuine failures.
        if (cancelled) return;
        console.error("[reader] failed to open document:", error);
        const message = error instanceof Error ? error.message : String(error);
        setErrorDetail(message);
        setStatus("error");
      }
    }

    void openDocument();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      const task = loadingTaskRef.current;
      loadingTaskRef.current = null;
      pdfRef.current = null;
      void task?.destroy().catch(() => {});
    };
  }, [src]);

  // Re-fit the current page after load, page turns, and window resizes.
  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setFitVersion((v) => v + 1));
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    renderPage(pageNumber).catch((error) => {
      // Page turns cancel the previous canvas render. That is normal; only
      // surface genuine render failures.
      if (!isRenderCancellation(error)) {
        console.error("[reader] render failed:", error);
      }
    });
  }, [status, pageNumber, fitVersion, renderPage]);

  // Arrow keys / Page Up / Page Down for page turns.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") setPageNumber((p) => Math.min(numPages, p + 1));
      if (e.key === "ArrowLeft" || e.key === "PageUp") setPageNumber((p) => Math.max(1, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [numPages]);

  return (
    <div className="reader-root fixed inset-0 flex flex-col bg-[#171512] text-neutral-200">
      {preview && (
        <header className="reader-hide-for-print grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-white/10 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
          <Link
            href={backHref}
            aria-label={backLabel}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:bg-white/5 hover:text-white"
          >
            <ChevronLeft aria-hidden className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{backLabel}</span>
          </Link>
          <div className="min-w-0 text-center">
            <p className="truncate font-display text-sm text-neutral-100">{previewTitle}</p>
            <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-brass sm:text-[10px]">
              {previewLabel}
            </p>
          </div>
          <Link
            href={purchaseHref}
            className="inline-flex items-center gap-1.5 rounded-full bg-pine px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-pine-deep"
          >
            <span className="hidden sm:inline">{purchaseLabel}</span>
            <span className="sm:hidden">Full book</span>
            <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
        </header>
      )}

      <main className="reader-hide-for-print relative flex-1 overflow-hidden">
        <div ref={stageRef} className="relative h-full w-full">
          {status === "loading" && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-neutral-400">
              <Loader2 aria-hidden className="h-6 w-6 animate-spin" />
              <p className="text-sm">{preview ? "Building your sample…" : "Opening your book…"}</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex h-full w-full items-center justify-center px-6">
              <div className="max-w-sm rounded-2xl border border-white/10 bg-white/5 px-6 py-8 text-center">
                <p className="font-display text-lg text-neutral-100">
                  {preview ? "This sample cannot be opened" : "This book cannot be opened"}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  {preview
                    ? "The preview is unavailable right now. Please try again later."
                    : "Your purchase was verified, but the file could not be streamed. Please close and reopen the reader."}
                </p>
                {errorDetail && (
                  <p className="mt-3 break-all text-xs text-neutral-500">{errorDetail}</p>
                )}
              </div>
            </div>
          )}

          {status === "ready" && (
            <div className="flex h-full w-full items-center justify-center p-3 sm:p-6">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="rounded-sm bg-white shadow-2xl ring-1 ring-black/20"
                />
                {userEmail && <Watermark email={userEmail} />}
              </div>
            </div>
          )}

          {preview && status === "ready" && pageNumber >= numPages && (
            <div className="absolute inset-x-0 bottom-24 flex justify-center px-6">
              <div className="max-w-md rounded-2xl border border-white/10 bg-[#211d18]/95 px-6 py-5 text-center shadow-2xl backdrop-blur">
                <p className="font-display text-base text-neutral-100">That&apos;s the end of the sample</p>
                <p className="mt-1 text-sm text-neutral-400">
                  Continue with the full book to read every page.
                </p>
                <Link
                  href={purchaseHref}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pine-deep"
                >
                  {purchaseLabel}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {status === "ready" && (
        <div className="reader-hide-for-print flex items-center justify-center gap-3 border-t border-white/10 px-4 py-3">
          <button
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-neutral-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft aria-hidden className="h-4 w-4" />
            Prev
          </button>
          <span className="tabular-nums tracking-wide text-neutral-300" aria-live="polite">
            {pageNumber} <span className="text-neutral-500">/ {numPages}</span>
          </span>
          <button
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-neutral-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            Next
            <ChevronRight aria-hidden className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="print-block" role="alert">
        Printing is disabled for this eBook.
      </div>
    </div>
  );
}

function Watermark({ email }: { email: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 select-none"
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
          `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><text x='16' y='100' font-family='sans-serif' font-size='12' fill='rgba(0,0,0,0.10)' transform='rotate(-24 160 90)'>${email}</text></svg>`,
        )}")`,
        backgroundRepeat: "repeat",
      }}
    />
  );
}
