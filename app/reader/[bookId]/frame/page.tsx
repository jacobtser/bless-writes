import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ReaderShell } from "@/app/reader/_components/reader-shell";

// Auth + entitlement checks run per request.
export const instant = false;

export const metadata: Metadata = {
  title: " ",
  robots: { index: false, follow: false },
};

/**
 * /reader/<bookId>/frame
 *
 * Lives inside a `sandbox="allow-scripts allow-same-origin"` iframe rendered
 * by ProtectedViewer. Re-checks entitlement server-side (defense in depth —
 * the streaming API re-checks again on every byte-range request) so the frame
 * can never be opened on its own outside the protected shell.
 */
export default async function ReaderFramePage({
  params,
}: PageProps<"/reader/[bookId]/frame">) {
  await connection();
  const { bookId } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/reader/${bookId}`)}`);
  }

  const { data: book } = await supabase
    .from("books")
    .select("id")
    .eq("id", bookId)
    .maybeSingle();
  if (!book) redirect("/");

  const { data: purchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("book_id", bookId)
    .maybeSingle();
  if (!purchase) redirect("/?need=purchase");

  return (
    <ReaderShell
      src={`/api/view-book?bookId=${encodeURIComponent(bookId)}`}
      userEmail={user.email}
    />
  );
}