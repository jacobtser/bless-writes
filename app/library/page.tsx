import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { BookOpen, ArrowRight } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { BrandMark } from "@/components/brand-mark";

export const instant = false;

export const metadata: Metadata = {
  title: "Your library",
};

export default async function LibraryPage() {
  await connection();
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/library");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = (profile?.full_name as string | null) || (user.user_metadata?.full_name as string | undefined) || user.email || "Account";

  const { data: purchases } = await supabase
    .from("purchases")
    .select("id, created_at, books(id, slug, title, author, cover_url)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items = (purchases ?? [])
    .map((p: any) => p.books)
    .filter(Boolean);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/90 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-5 px-5 py-4">
          <BrandMark showTagline />
          <div className="flex items-center gap-4 text-sm font-medium text-ink-soft">
            <Link href="/" className="transition hover:text-ink">Home</Link>
            <Link href="/reachout" className="transition hover:text-ink">Reach out</Link>
            <span className="rounded-full border border-line bg-paper-soft px-3 py-1.5 text-ink">{displayName}</span>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-pine" />
            <h1 className="font-display text-3xl font-semibold text-ink">{displayName}&apos;s library</h1>
          </div>
          <p className="mt-2 text-sm text-ink-soft">Signed in as {user.email}</p>
        </div>
        <p className="mb-8 text-sm text-ink-soft">
          Books you’ve purchased are saved to your account. Sign in on any device to recover and read them.
        </p>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-line bg-paper-soft p-8 text-center">
            <p className="text-ink-soft">No purchased books yet.</p>
            <Link href="/#books" className="mt-4 inline-flex items-center gap-2 font-semibold text-pine hover:text-pine-deep">
              Browse books <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((book: any) => (
              <Link
                key={book.id}
                href={`/reader/${book.id}`}
                className="group overflow-hidden rounded-3xl border border-line bg-paper-soft shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="aspect-[2/3] bg-paper-deep">
                  {book.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-5xl font-display text-pine/40">
                      {book.title?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-display text-lg font-semibold leading-tight text-ink group-hover:text-pine-deep">{book.title}</p>
                  <p className="mt-1 text-sm text-ink-soft">{book.author}</p>
                  <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-pine">
                    Read now <ArrowRight className="h-4 w-4" />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}