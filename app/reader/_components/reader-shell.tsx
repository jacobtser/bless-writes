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

    const rect = stage.getBoundingClientRect();
    const stageW = rect.width || stage.clientWidth || window.innerWidth;
    const stageH = rect.height || stage.clientHeight || window.innerHeight;

    const isPhone = stageW < 640;
    const padX = isPhone ? 8 : 24;
    const padY = isPhone ? 8 : 24;
    const availableW = Math.max(240, stageW - padX * 2);
    const availableH = Math.max(280, stageH - padY * 2);

    const scale = Math.min(availableW / baseViewport.width, availableH / baseViewport.height, 3);
    const viewport = page.getViewport({ scale });
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    renderTaskRef.current?.cancel();
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const renderTask = page.render({ canvas, canvasContext: ctx ?? undefined, viewport });
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

  // Re-fit the current page after load, page turns, window resizes/orientation changes, and layout.
  useEffect(() => {
    let raf = 0;
    const bump = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setFitVersion((v) => v + 1));
    };
    window.addEventListener("resize", bump);
    window.addEventListener("orientationchange", bump);
    const ro = typeof ResizeObserver !== "undefined" && stageRef.current ? new ResizeObserver(bump) : null;
    if (ro && stageRef.current) ro.observe(stageRef.current);
    // ensure initial layout pass
    bump();
    return () => {
      window.removeEventListener("resize", bump);
      window.removeEventListener("orientationchange", bump);
      ro?.disconnect();
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
    <div className="reader-root fixed inset-0 flex flex-col bg-[#f6f4ef] text-neutral-900">
      {preview && (
        <header className="reader-hide-for-print grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-neutral-200/80 bg-[#f6f4ef]/95 px-3 py-2 backdrop-blur sm:gap-4 sm:px-5">
          <Link
            href={backHref}
            aria-label={backLabel}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-black/5"
          >
            <ChevronLeft aria-hidden className="h-4 w-4" />
            <span className="hidden sm:inline">{backLabel}</span>
          </Link>
          <div className="min-w-0 text-center">
            <p className="truncate font-display text-sm text-neutral-900">{previewTitle}</p>
            <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
              {previewLabel}
            </p>
          </div>
          <Link
            href={purchaseHref}
            className="inline-flex items-center gap-1.5 rounded-full bg-pine px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-pine-deep"
          >
            <span className="hidden sm:inline">{purchaseLabel}</span>
            <span className="sm:hidden">Full book</span>
            <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
        </header>
      )}

      <main className="reader-hide-for-print relative min-h-0 flex-1 overflow-hidden bg-[#eceae3]">
        <div ref={stageRef} className="absolute inset-0 flex items-center justify-center overflow-hidden p-2 sm:p-6">
          {status === "loading" && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-neutral-500">
              <Loader2 aria-hidden className="h-6 w-6 animate-spin" />
              <p className="text-sm font-medium">{preview ? "Opening sample…" : "Opening book…"}</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex h-full w-full items-center justify-center px-6">
              <div className="max-w-sm rounded-2xl border border-neutral-200 bg-white px-6 py-8 text-center shadow-sm">
                <p className="font-display text-lg text-neutral-900">
                  {preview ? "Sample unavailable" : "Unable to open book"}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {preview
                    ? "The preview could not be loaded right now. Please try again."
                    : "Please close and reopen the reader."}
                </p>
              </div>
            </div>
          )}

          {status === "ready" && (
            <div className="flex h-full w-full items-center justify-center">
              <canvas
                ref={canvasRef}
                className="block h-auto w-auto max-h-full max-w-full bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/5"
              />
            </div>
          )}

          {preview && status === "ready" && pageNumber >= numPages && (
            <div className="pointer-events-none absolute inset-x-0 bottom-20 flex justify-center px-4">
              <div className="pointer-events-auto max-w-md rounded-2xl border border-neutral-200 bg-white/95 px-5 py-4 text-center shadow-lg backdrop-blur">
                <p className="font-display text-base text-neutral-900">End of sample</p>
                <p className="mt-1 text-sm text-neutral-600">Continue with the full book to keep reading.</p>
                <Link
                  href={purchaseHref}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pine-deep"
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
        <div className="reader-hide-for-print flex items-center justify-center gap-4 border-t border-neutral-200/80 bg-[#f6f4ef]/95 px-4 py-2 backdrop-blur">
          <button
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-700 transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Previous page"
          >
            <ChevronLeft aria-hidden className="h-5 w-5" />
          </button>
          <span className="min-w-[4.5rem] text-center text-sm font-medium tabular-nums text-neutral-700" aria-live="polite">
            {pageNumber} <span className="text-neutral-400">/</span> {numPages}
          </span>
          <button
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-700 transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Next page"
          >
            <ChevronRight aria-hidden className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="print-block" role="alert">
        Printing is disabled for this eBook.
      </div>
    </div>
  );
}
