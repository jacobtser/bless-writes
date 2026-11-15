import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AlertCircle, ArrowRight, ArrowUpRight, CircleAlert } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { DEMO_BOOKS } from "@/lib/demo";
import { BookCard, type CatalogBook } from "@/components/book-card";
import { AuthControls } from "@/components/auth-controls";
import { BrandMark } from "@/components/brand-mark";

// Reads session cookies + entitlements per request; not prerenderable.
export const instant = false;

export const metadata: Metadata = {
  title: "Books by Bless Laweh Koranteng",
  description:
    "Faith Beyond My Resources and From a Five-Cedi Mat to First Class — two memoirs of faith, work, and the long way forward, by Ghanaian author Bless Laweh Koranteng.",
};

export default async function Home({ searchParams }: PageProps<"/">) {
  await connection();
  const { canceled, need } = await searchParams;

  const demo = !isSupabaseConfigured();

  let userEmail: string | null = null;
  let displayName: string | null = null;
  let catalog: CatalogBook[] = DEMO_BOOKS;
  let owned: Record<string, boolean> = {};
  let phone: string | null = null;

  if (!demo) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
    displayName = (user?.user_metadata?.full_name as string | undefined) ?? null;

    const { data: books } = await supabase
      .from("books")
      .select("id, slug, title, author, description, cover_url, price_cents, currency")
      .order("created_at", { ascending: true });

    catalog = (books ?? []).filter(Boolean);

    if (user) {
      const [purchases, profile] = await Promise.all([
        supabase.from("purchases").select("book_id").eq("user_id", user.id),
        supabase.from("profiles").select("phone, full_name").eq("id", user.id).maybeSingle(),
      ]);
      owned = Object.fromEntries((purchases.data ?? []).map((p) => [p.book_id, true]));
      phone = profile.data?.phone ?? null;
      if (!displayName && profile.data?.full_name) displayName = profile.data.full_name;
    }
  }

  const heroBooks = catalog.slice(0, 2);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/90 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-5 px-5 py-4">
          <BrandMark showTagline />
          <div className="hidden items-center gap-7 text-sm font-medium text-ink-soft md:flex">
            <a href="#books" className="transition hover:text-ink">
              The books
            </a>
            <a href="#author" className="transition hover:text-ink">
              The author
            </a>
            <Link href="/reachout" className="transition hover:text-ink">Reach out</Link>
          </div>
          <AuthControls userEmail={userEmail} displayName={displayName} demo={demo} />
        </nav>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-line">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_65%_at_85%_0%,rgba(176,141,79,0.16),transparent_68%)]"
          />
          <div className="relative mx-auto grid w-full max-w-6xl gap-16 px-5 pb-16 pt-16 sm:pb-24 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:pb-28">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-brass-deep">
                <span className="h-px w-8 bg-brass/60" />
                Bless Laweh Koranteng · Memoir &amp; testimony
              </p>
              <h1 className="mt-6 font-display text-[2.75rem] font-semibold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-[4.2rem]">
                A difficult beginning does not have to decide{" "}
                <em className="italic text-pine">the ending.</em>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-ink-soft sm:text-lg sm:leading-8">
                The memoirs of a Ghanaian writer who carried a five-cedi mat
                to senior high school, knocked on closed doors, and graduated
                with First Class Honours from KNUST. These are stories about
                prayer, work, waiting, and the people who help a life move
                forward.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link
                  href={heroBooks[0] ? `/preview/${heroBooks[0].id}` : "#books"}
                  className="inline-flex items-center gap-2 rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-pine-deep"
                >
                  Read an excerpt
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
                <a
                  href="#author"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-pine"
                >
                  Meet the author
                  <ArrowUpRight aria-hidden className="h-4 w-4" />
                </a>
              </div>

              <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                Two books · Published in Ghana · 2026
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-lg lg:mx-0">
              <div
                aria-hidden
                className="absolute -inset-12 rounded-full bg-brass/10 blur-3xl"
              />
              <div className="relative grid grid-cols-2 items-end gap-3 sm:gap-6">
                {heroBooks.map((book, index) => (
                  <Link
                    key={book.id}
                    href={`/preview/${book.id}`}
                    className={`group relative block transition duration-500 hover:-translate-y-1 ${
                      index === 0
                        ? "-rotate-2 translate-y-4 sm:translate-y-6"
                        : "rotate-2"
                    }`}
                  >
                    <div className="overflow-hidden rounded-[3px] bg-paper-deep shadow-[0_30px_60px_-24px_rgba(34,31,27,0.6)] ring-1 ring-black/10">
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-2 bg-gradient-to-r from-black/25 to-transparent"
                      />
                      {book.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={book.cover_url}
                          alt={`Cover of ${book.title}`}
                          draggable={false}
                          className="aspect-[2/3] h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-[2/3] w-full items-center justify-center bg-pine-wash">
                          <span className="font-display text-5xl font-semibold italic text-pine">
                            {book.title.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              <div className="relative z-10 mx-auto mt-8 w-[92%] rounded-2xl border border-line bg-paper-soft/95 p-4 shadow-xl backdrop-blur sm:mt-10 sm:p-5">
                <p className="font-reading text-sm italic leading-relaxed text-ink sm:text-base">
                  &ldquo;A difficult beginning does not have to decide the
                  ending.&rdquo;
                </p>
                <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                  Bless Laweh Koranteng
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5">
          {(need || canceled) && (
            <div className="pt-8">
              {need && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-brass/30 bg-brass/10 px-4 py-3 text-sm text-brass-deep">
                  <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    That book is not in your library yet. Choose it below to
                    unlock the full reader.
                  </span>
                </div>
              )}
              {canceled && (
                <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-line bg-paper-soft px-4 py-3 text-sm text-ink-soft">
                  <CircleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Checkout was cancelled. Nothing was charged.</span>
                </div>
              )}
            </div>
          )}
        </section>

        <section id="books" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brass-deep">
                  The books
                </p>
                <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
                  Two journeys, written from the inside.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-ink-soft">
                Begin with the scenes that stayed with him. Read a free
                excerpt from either book, then continue in the full edition.
              </p>
            </div>

            {demo && (
              <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                Preview build · Checkout is not connected yet
              </p>
            )}

            {catalog.length === 0 ? (
              <div className="mt-14 rounded-3xl border border-dashed border-line bg-paper-soft p-14 text-center">
                <p className="font-display text-xl text-ink">
                  The books are being prepared.
                </p>
                <p className="mt-2 text-sm text-ink-soft">
                  Add the catalog entries to bring the shelf online.
                </p>
              </div>
            ) : (
              <div className="mt-14 space-y-20 sm:space-y-24">
                {catalog.map((book, index) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    index={index}
                    alreadyOwned={Boolean(owned[book.id])}
                    prefilledPhone={phone}
                    demo={demo}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="border-y border-line bg-paper-deep/60">
          <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:py-20">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brass-deep">
              From the books
            </p>
            <blockquote className="mt-4 font-reading text-2xl leading-relaxed text-ink sm:text-3xl">
              &ldquo;The only thing I can give you is God.&rdquo;
            </blockquote>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
              A mother to her son, the night before KNUST
            </p>
          </div>
        </section>

        <section id="author" className="scroll-mt-24 bg-pine text-paper">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20 lg:py-24">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brass">
                The author
              </p>
              <h2 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-tight text-paper sm:text-5xl">
                Bless Laweh Koranteng
              </h2>
              <p className="mt-5 max-w-md font-reading text-lg italic leading-relaxed text-paper/70">
                &ldquo;A difficult beginning does not have to decide the
                ending.&rdquo;
              </p>

              <div className="mt-10 space-y-5 border-l border-paper/20 pl-5">
                {[
                  ["Kasseh, Ada East", "The beginning"],
                  ["KNUST", "BSc Business Administration (Accounting)"],
                  ["First Class Honours", "Mastercard Foundation Scholar"],
                ].map(([title, detail]) => (
                  <div key={title}>
                    <p className="font-display text-lg font-semibold text-paper">
                      {title}
                    </p>
                    <p className="mt-0.5 text-xs uppercase tracking-[0.14em] text-paper/50">
                      {detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="max-w-2xl space-y-5 font-reading text-base leading-8 text-paper/85 sm:text-lg sm:leading-9">
              <p>
                Bless grew up in Kasseh, in the Ada East District of Ghana,
                where his parents worked as a commercial driver and a petty
                trader. He sold goods in the market, pushed commercial carts,
                and carried a five-cedi grass mat into senior high school.
              </p>
              <p>
                He went on to become a Mastercard Foundation Scholar at KNUST,
                graduating with First Class Honours in BSc Business
                Administration (Accounting). He now works in the financial
                sector, pursues his ICAG qualifications, and writes about
                faith, work, and the dignity of beginning small.
              </p>
              <p>
                His books are not success manuals. They are witnesses — to the
                people who prayed, the doors that closed, and the quiet work
                that kept a life moving.
              </p>

              <Link
                href="#books"
                className="inline-flex items-center gap-2 pt-2 text-sm font-sans font-semibold text-brass transition hover:text-white"
              >
                Read his books
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <BrandMark showTagline />
            <p className="mt-4 max-w-md text-sm leading-6 text-ink-soft">
              Two memoirs of faith, work, and the long way forward. Published
              in Ghana, 2026.
            </p>
          </div>
          <div className="text-sm text-ink-soft sm:text-right">
            <p>Card · MTN · Vodafone · AirtelTigo</p>
            <p className="mt-1 text-xs text-ink-faint">
              © 2026 Bless Writes. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
