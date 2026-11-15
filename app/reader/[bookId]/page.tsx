import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { verifyPaymentRedirect } from "@/lib/momo-verify";
import { ProtectedViewer } from "@/components/protected-viewer";

// Auth + entitlement checks run per request.
export const instant = false;

export const metadata: Metadata = {
  title: "Reading…",
  robots: { index: false, follow: false },
};

/**
 * /reader/<bookId>
 *
 * Server gate + the moment a mobile-money purchase lands back here. When
 * Flutterwave redirects with ?status=successful&tx_ref=...&transaction_id=...,
 * we verify the transaction and grant access before rendering the reader.
 */
export default async function ReaderPage({
  params,
  searchParams,
}: PageProps<"/reader/[bookId]">) {
  await connection();
  const { bookId } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/reader/${bookId}`)}`);
  }

  // Safety net for MoMo redirects (the webhook is the primary path; this one
  // is idempotent and harmless when nothing is pending).
  const sp = await searchParams;
  await verifyPaymentRedirect({
    status: sp.status,
    txRef: sp.tx_ref,
    transactionId: sp.transaction_id,
    userId: user.id,
    bookId,
  });

  const { data: book } = await supabase
    .from("books")
    .select("id, title")
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

  return <ProtectedViewer bookId={bookId} title={book.title} />;
}