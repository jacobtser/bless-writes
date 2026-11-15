import path from "node:path";
import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const projectRoot = path.resolve(__dirname);

/**
 * Content-Security-Policy for production.
 *
 * Trade-offs:
 *  - `script-src`/`style-src` include `'unsafe-inline'`. A nonce-based policy that
 *    drops it is NOT possible here: Next.js documents that nonces require
 *    per-request rendering and are incompatible with Cache Components / PPR
 *    (Partial Prerendering), which this app enables. The rest of the policy still
 *    blocks external script origins, framing, object embeds, and cross-origin
 *    form posts.
 *  - `connect-src` is limited to our own origin (all `/api/*`) plus Supabase.
 *  - `frame-ancestors 'self'` + the global `X-Frame-Options: SAMEORIGIN`
 *    together allow the reader's same-origin iframe while blocking external
 *    framing everywhere.
 *  - Applied only in production, so dev-only tooling (HMR over ws, eval-based
 *    fast refresh) is unaffected.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "frame-src 'self'",
  "form-action 'self' https://checkout.stripe.com https://*.flutterwave.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "upgrade-insecure-requests",
].join("; ");

const baselineHeaders: { key: string; value: string }[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const productionHeaders: { key: string; value: string }[] = isProduction
  ? [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "Content-Security-Policy", value: CSP },
    ]
  : [];

const nextConfig: NextConfig = {
  cacheComponents: true,
  outputFileTracingRoot: projectRoot,
  partialPrefetching: true,
  experimental: {
    // Marks this app as upgraded via the agent security upgrade flow.
    agentUpgrade: "security",
  },
  turbopack: {
    root: projectRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        // Baseline hardening applied to every response.
        source: "/:path*",
        headers: [...baselineHeaders, ...productionHeaders],
      },
      {
        // Belt-and-suspenders on the streaming endpoint: never cache the bytes.
        source: "/api/view-book",
        headers: [
          { key: "Cache-Control", value: "private, no-store, no-transform" },
          { key: "Pragma", value: "no-cache" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        // The protected reader may only be framed on its own origin.
        // same-origin referrer is required so /api/view-book can verify requests come from the reader.
        source: "/reader/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
      {
        // Always revalidate the service worker so updates are picked up promptly,
        // and allow it to control the whole origin.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
