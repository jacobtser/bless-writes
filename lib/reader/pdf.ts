import { PDFDocument } from "pdf-lib";
import type { PageRange } from "@/lib/reader/config";

/**
 * Copies only `range` (1-based, inclusive) out of a PDF into a brand-new
 * document. This is what keeps a free preview honest: the reader is handed a
 * file that physically contains just the sample pages, not the whole book with
 * a client-side page limit.
 */

// Sliced previews are small and expensive to build, so keep them in memory.
const previewCache = new Map<string, Uint8Array>();

export function getCachedPreview(key: string): Uint8Array | undefined {
  return previewCache.get(key);
}

export function cachePreview(key: string, bytes: Uint8Array): void {
  previewCache.set(key, bytes);
}

export async function slicePdf(bytes: Uint8Array, range: PageRange): Promise<Uint8Array> {
  const source = await PDFDocument.load(bytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  const total = source.getPageCount();
  const start = Math.max(0, range.from - 1);
  const end = Math.min(total, range.to);

  if (end <= start) {
    throw new Error(`Preview range ${range.from}-${range.to} is outside the ${total}-page document.`);
  }

  const indices: number[] = [];
  for (let i = start; i < end; i += 1) indices.push(i);

  const output = await PDFDocument.create();
  const pages = await output.copyPages(source, indices);
  for (const page of pages) output.addPage(page);

  const saved = await output.save();
  return saved instanceof Uint8Array ? saved : new Uint8Array(saved);
}
