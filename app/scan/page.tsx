"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { ScanLine, Link as LinkIcon, CheckCircle, ExternalLink } from "lucide-react";

export default function ScanPage() {
  const [scanned, setScanned] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-reader";

  // The tunnel URL that appears when `npm run tunnel` runs
  const tunnelUrl = "http://localhost:3001"; // local server link shown immediately

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;

    const start = async () => {
      try {
        scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            setScanned(decodedText);
          },
          () => {}
        );
      } catch (e: any) {
        setError("Camera access needed. Allow permission and refresh.");
      }
    };

    start();

    return () => {
      if (scanner?.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-paper px-6 py-16 text-ink">
      <div className="mx-auto max-w-xl space-y-8">
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine uppercase tracking-wide">
            <ScanLine className="h-3 w-3" /> Barcode Scanner
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Scan to open</h1>
          <p className="text-sm text-ink-soft">Point your camera at a barcode. The link opens instantly.</p>
        </div>

        <div id={containerId} className="w-full rounded-2xl border border-line bg-paper-soft shadow-xl overflow-hidden" />

        {scanned && (
          <div className="rounded-2xl border border-pine/30 bg-pine-wash p-6 space-y-5 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 text-pine font-semibold">
              <CheckCircle className="h-5 w-5" />
              <span>Barcode scanned</span>
            </div>
            <div className="font-mono text-xs break-all text-ink-soft bg-paper rounded-lg px-3 py-2 border border-line">{scanned}</div>

            <a
              href={tunnelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full justify-center items-center gap-2 rounded-full bg-pine px-5 py-3.5 text-sm font-semibold text-white shadow hover:bg-pine-deep transition"
            >
              <ExternalLink className="h-4 w-4" />
              Open site now — localhost:3001
            </a>
            <p className="text-[11px] text-ink-faint leading-relaxed text-center">
              Use <code className="bg-paper border border-line px-1 rounded text-xs">npm run tunnel</code> to get a real Cloudflare public URL that works from any phone.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600 rounded-lg bg-red-50 px-4 py-3 border border-red-200">{error}</p>}
      </div>
    </main>
  );
}
