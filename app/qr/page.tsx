"use client";

import { useEffect, useState } from "react";

export default function QrPage() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tunnel-url", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setUrl(d.url ?? null))
      .catch(() => setUrl("https://reynolds-witness-affiliate-pine.trycloudflare.com"));
  }, []);

  const tunnelUrl = url ?? "https://reynolds-witness-affiliate-pine.trycloudflare.com";
  const encoded = encodeURIComponent(tunnelUrl);
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=16&data=${encoded}`;

  return (
    <main className="mx-auto max-w-md px-6 py-20 text-center font-sans text-ink">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Bless Writes — Phone Link</h1>
      <p className="mt-3 text-sm text-ink-soft">Scan to open the live storefront.</p>

      <a
        href={tunnelUrl}
        className="mt-8 inline-block rounded-2xl border border-line bg-paper-soft p-6 shadow-lg transition hover:border-pine hover:shadow-xl"
        aria-label="Open tunnel link"
      >
        <img
          src={qr}
          alt="QR code for Bless Writes tunnel"
          width={320}
          height={320}
          className="mx-auto rounded-xl"
        />
      </a>

      <p className="mt-6 text-xs font-mono text-ink-faint break-all">{tunnelUrl}</p>

      <a
        href={tunnelUrl}
        className="mt-3 inline-block rounded-full bg-pine px-6 py-3 text-sm font-semibold text-paper shadow transition hover:bg-pine-deep"
      >
        Open storefront
      </a>
    </main>
  );
}
