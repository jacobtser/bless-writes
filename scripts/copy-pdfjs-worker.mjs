// Copies pdf.js's worker into /public/vendor so it can be served as a
// plain static asset. Runs automatically on `npm install` (see package.json
// "postinstall"). This keeps the eReader fully self-hosted — no CDN needed.
//
// We use the *legacy* worker because it ships the `Uint8Array.prototype.toHex`
// / `toBase64` polyfills that pdf.js 6.x needs on browsers predating those
// TC39 methods. The API-side import in reader-shell.tsx uses the matching
// legacy build so the two versions stay in lockstep.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(
  root,
  "..",
  "node_modules",
  "pdfjs-dist",
  "legacy",
  "build",
  "pdf.worker.min.mjs",
);
const outDir = join(root, "..", "public", "vendor");
const dest = join(outDir, "pdf.worker.min.mjs");

mkdirSync(outDir, { recursive: true });
copyFileSync(src, dest);
console.log("[pdfjs] worker copied to public/vendor/pdf.worker.min.mjs");