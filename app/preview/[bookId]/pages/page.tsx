import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEMO_BOOKS } from "@/lib/demo";
import { ReaderShell } from "@/app/reader/_components/reader-shell";
import { getPreviewRange } from "@/lib/reader/config";

export const instant = false;

export const metadata: Metadata = {
  title: "Sample pages",
  robots: { index: false, follow: false },
};

/**
 * /preview/<bookId>/pages
 *
 * The typeset sample: a server-sliced PDF containing only the pages selected
 * in lib/reader/config.ts. The full file never leaves the server. The written
 * excerpt at /preview/<bookId> is the primary sample; this page is for readers
 * who want to see the book as it was laid out.
 */
export default async function PreviewPages({ params }: PageProps<"/preview/[bookId]/pages">) {
  const { bookId } = await params;

  let title: string | null = null;

  if (!isSupabaseConfigured()) {
    title = DEMO_BOOKS.find((book) => book.id === bookId)?.title ?? null;
  } else {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("books")
      .select("title")
      .eq("id", bookId)
      .maybeSingle();
    title = data?.title ?? null;
  }

  if (!title) notFound();

  const range = getPreviewRange(bookId);

  return (
    <ReaderShell
      src={`/api/preview-book?bookId=${encodeURIComponent(bookId)}`}
      preview
      previewTitle={title}
      previewLabel={`Free sample · pages ${range.from}–${range.to}`}
      backHref={`/preview/${bookId}`}
      backLabel="Excerpt"
      purchaseHref={`/preview/${bookId}#get-the-book`}
      purchaseLabel="Get the full book"
    />
  );
}
