import { NextResponse, type NextRequest, connection } from "next/server";
import { getPreviewRange } from "@/lib/reader/config";
import { cachePreview, getCachedPreview, slicePdf } from "@/lib/reader/pdf";
import { loadBookPdf } from "@/lib/reader/source";

export const maxDuration = 60;

/**
 * GET /api/preview-book?bookId=<id>
 *
 * Public, no purchase required. Returns a NEW pdf containing only the
 * configured preview pages (see lib/reader/config.ts), so a visitor can sample
 * the book without the full file ever leaving the server.
 */
export async function GET(request: NextRequest) {
  await connection();

  const bookId = request.nextUrl.searchParams.get("bookId");
  if (!bookId) {
    return NextResponse.json({ error: "Missing bookId." }, { status: 400 });
  }

  const range = getPreviewRange(bookId);
  const cacheKey = `${bookId}:${range.from}-${range.to}`;

  const cached = getCachedPreview(cacheKey);
  if (cached) return pdfResponse(cached);

  try {
    const source = await loadBookPdf(bookId);
    if (!source) {
      return NextResponse.json({ error: "Book not found." }, { status: 404 });
    }

    const bytes = await slicePdf(source.bytes, range);
    cachePreview(cacheKey, bytes);
    return pdfResponse(bytes);
  } catch (error) {
    console.error("[preview-book] error:", error);
    return NextResponse.json({ error: "Could not build the preview." }, { status: 500 });
  }
}

function pdfResponse(bytes: Uint8Array): Response {
  // Copy into a fresh ArrayBuffer-backed view so the DOM BodyInit typing is happy.
  const body = new Uint8Array(bytes);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="preview.pdf"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
