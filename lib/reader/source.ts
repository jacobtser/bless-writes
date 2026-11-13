import { readFile } from "node:fs/promises";
import path from "node:path";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_PDF_PATHS } from "@/lib/demo";

export interface BookPdfSource {
  bytes: Uint8Array;
  title: string | null;
}

/**
 * Resolves a book id to its PDF bytes. Server-only.
 *
 *  - Demo mode (no Supabase): reads the mapped file from the local BOOKS/
 *    folder, so previews work with zero setup.
 *  - Configured: looks the file up in the private `ebooks` bucket, signs a
 *    short-lived URL server-side, and pulls the bytes over the wire. The URL is
 *    never sent to the client.
 */
export async function loadBookPdf(bookId: string): Promise<{ bytes: Uint8Array; title: string | null } | null> {
  if (!isSupabaseConfigured()) {
    const relative = DEMO_PDF_PATHS[bookId];
    if (!relative) return null;
    const absolute = path.join(/* turbopackIgnore: true */ process.cwd(), relative);
    const bytes = await readFile(absolute);
    return { bytes: new Uint8Array(bytes), title: null };
  }

  const admin = createAdminClient();
  const { data: book } = await admin
    .from("books")
    .select("title, file_path")
    .eq("id", bookId)
    .maybeSingle();
  if (!book) return null;

  const { data: signed } = await admin.storage
    .from("ebooks")
    .createSignedUrl(book.file_path, 120, { download: false });
  if (!signed) return null;

  const response = await fetch(signed.signedUrl, { cache: "no-store" });
  if (!response.ok) return null;

  const bytes = new Uint8Array(await response.arrayBuffer());
  return { bytes, title: book.title };
}
