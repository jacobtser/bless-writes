import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { deriveOfflinePassphrase } from "@/lib/offline/key";
import { OfflineReader } from "@/components/offline-reader";

// Auth + entitlement checks run per request.
export const instant = false;

export const metadata: Metadata = {
  title: "Offline reading",
  robots: { index: false, follow: false },
};

/**
 * /reader/<bookId>/offline
 *
 * Server gate for the offline reader. Same entitlement check as the online
 * reader, but the page ships no book bytes — it renders a client reader that
 * decrypts the IndexedDB copy on the device. Because this route is pre-cached
 * by the service worker, it can be opened with no network connection.
 *
 * The decryption passphrase is issued by the server (`deriveOfflinePassphrase`),
 * an HMAC of the user id under OFFLINE_KEY_SECRET — so the key is deterministic
 * per user but not derivable from the user id alone.
 */
export default async function OfflineReaderPage({
  params,
}: PageProps<"/reader/[bookId]/offline">) {
  const { bookId } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/reader/${bookId}/offline`)}`);
  }

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

  return (
    <OfflineReader
      bookId={bookId}
      title={book.title}
      passphrase={deriveOfflinePassphrase(user.id)}
    />
  );
}
