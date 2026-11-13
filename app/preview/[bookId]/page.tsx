import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Fragment, cache } from "react";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEMO_BOOKS } from "@/lib/demo";
import { getBookExcerpt } from "@/lib/excerpts";
import { formatPrice } from "@/lib/format";
import { BrandMark } from "@/components/brand-mark";
import { PurchaseActions } from "@/components/purchase-actions";
import type { CatalogBook } from "@/components/book-card";

export const instant = false;

const getBook = cache(async (bookId: string): Promise<CatalogBook | null> => {
  if (!isSupabaseConfigured()) {
    return DEMO_BOOKS.find((book) => book.id === bookId) ?? null;
  }

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("books")
    .select("id, slug, title, author, description, cover_url, price_cents, currency")
    .eq("id", bookId)
    .maybeSingle();

  return data ?? null;
});

export async function generateMetadata({
  params,
}: PageProps<"/preview/[bookId]">): Promise<Metadata> {
  const { bookId } = await params;
  const book = await getBook(bookId);
  if (!book) return { title: "Excerpt" };

  const excerpt = getBookExcerpt(book.slug);
  return {
    title: excerpt
      ? `Read “${excerpt.displayTitle}” from ${book.title}`
      : `Read an excerpt from ${book.title}`,
    description:
      excerpt?.lead ??
      book.description ??
      `Read a free excerpt from ${book.title} by ${book.author}.`,
  };
}

/**
 * /preview/<bookId>
 *
 * A public, editorial excerpt: real text from the book, set for reading on a
 * phone, with a quiet purchase path at the end. It deliberately does not start
 * with the cover, copyright page, or table of contents — the sample should
 * begin with the writing.
 *
 * The page-facsimile sample lives at /preview/<bookId>/pages for readers who
 * want to see the typeset pages as they appear in the book.
 */
export default async function PreviewPage({ params }: PageProps<"/preview/[bookId]">) {
  const { bookId } = await params;
  const book = await getBook(bookId);
  if (!book) notFound();

  const excerpt = getBookExcerpt(book.slug);
  if (!excerpt) redirect(`/preview/${bookId}/pages`);

  const demo = !isSupabaseConfigured();
  let alreadyOwned = false;

  if (!demo) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: purchase } = await supabase
        .from("purchases")
        .select("id")
        .eq("user_id", user.id)
        .eq("book_id", book.id)
        .maybeSingle();
      alreadyOwned = Boolean(purchase);
    }
  }

  return (
    <>
      <header className="border-b border-line/80 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <BrandMark />
          <div className="flex items-center gap-4 text-sm font-medium text-ink-soft">
            <Link href="/#books" className="transition hover:text-ink">
              All books
            </Link>
            <Link href="/library" className="transition hover:text-ink">Library</Link>
            <Link href="/reachout" className="transition hover:text-ink">Reach out</Link>
            <Link
              href={`/preview/${book.id}/pages`}
              className="hidden items-center gap-1.5 transition hover:text-ink sm:inline-flex"
            >
              Sample pages
              <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-5 pb-10 pt-14 sm:pt-20">
          <div className="max-w-4xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brass-deep">
              {excerpt.kicker} · Free excerpt
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-tight text-ink sm:text-6xl">
              {excerpt.displayTitle}
            </h1>
            <p className="mt-5 font-reading text-xl italic leading-relaxed text-ink-soft sm:text-2xl">
              {book.title}
            </p>
            <p className="mt-2 font-reading text-base text-ink-soft">
              {excerpt.chapterTitle}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              <span>By {book.author}</span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-brass" />
              <span className="inline-flex items-center gap-1.5">
                <Clock3 aria-hidden className="h-3 w-3" />
                {excerpt.readingTime}
              </span>
            </div>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 pb-24 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-16">
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <div className="relative overflow-hidden rounded-[3px] bg-paper-deep shadow-[0_28px_60px_-28px_rgba(34,31,27,0.55)] ring-1 ring-black/10">
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
                    <span className="font-display text-6xl font-semibold italic text-pine">
                      {book.title.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-brass-deep">
                Full edition
              </p>
              <p className="mt-1 font-display text-2xl font-semibold leading-tight text-ink">
                {book.title}
              </p>
              <p className="mt-1 text-sm italic text-ink-soft">by {book.author}</p>
              <p className="mt-4 font-display text-2xl font-semibold text-brass-deep">
                {formatPrice(book.price_cents, book.currency)}
              </p>

              <div className="mt-5">
                <PurchaseActions
                  bookId={book.id}
                  bookTitle={book.title}
                  priceCents={book.price_cents}
                  currency={book.currency}
                  alreadyOwned={alreadyOwned}
                  demo={demo}
                />
              </div>

              <Link
                href={`/preview/${book.id}/pages`}
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-pine transition hover:text-pine-deep"
              >
                Read the sample pages
                <ArrowRight aria-hidden className="h-3.5 w-3.5" />
              </Link>
            </div>
          </aside>

          <article className="mx-auto w-full max-w-2xl">
            <p className="font-reading text-xl leading-8 text-ink sm:text-2xl sm:leading-9">
              {excerpt.lead}
            </p>

            <div className="mt-9 font-reading text-[1.0625rem] leading-8 text-ink-soft sm:text-lg sm:leading-9">
              {excerpt.paragraphs.map((paragraph, index) => (
                <Fragment key={index}>
                  <p
                    className={
                      index === 0
                        ? "mb-6 first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-display first-letter:text-6xl first-letter:font-semibold first-letter:leading-[0.8] first-letter:text-brass-deep"
                        : "mb-6"
                    }
                  >
                    {paragraph}
                  </p>
                  {excerpt.pullQuoteAfter === index && (
                    <blockquote className="my-10 border-y border-line py-8 text-center">
                      <p className="font-reading text-2xl italic leading-relaxed text-ink sm:text-3xl">
                        &ldquo;{excerpt.pullQuote}&rdquo;
                      </p>
                    </blockquote>
                  )}
                </Fragment>
              ))}
            </div>

            <div id="get-the-book" className="mt-14 scroll-mt-28 border-t border-line pt-10">
              <div className="rounded-3xl border border-line bg-paper-soft p-6 shadow-sm sm:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brass-deep">
                  Continue reading
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
                  The chapter continues.
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-ink-soft">
                  Read the complete book, including the chapters that follow
                  this scene, in the protected reader.
                </p>
                <div className="mt-6 max-w-sm">
                  <PurchaseActions
                    bookId={book.id}
                    bookTitle={book.title}
                    priceCents={book.price_cents}
                    currency={book.currency}
                    alreadyOwned={alreadyOwned}
                    demo={demo}
                  />
                </div>
                <div className="mt-6 hidden border-t border-line pt-4 text-xs text-ink-soft sm:block">
                  <Link
                    href={`/preview/${book.id}/pages`}
                    className="inline-flex items-center gap-1.5 font-semibold text-pine transition hover:text-pine-deep"
                  >
                    Prefer the original pages? Read a page sample
                    <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              <p className="mt-6 text-xs leading-5 text-ink-faint">
                Excerpted from <em>{book.title}</em> by {book.author}. © 2026
                Bless Laweh Koranteng. All rights reserved.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
              <Link
                href="/#books"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink transition hover:text-pine"
              >
                <ArrowLeft aria-hidden className="h-4 w-4" />
                All books
              </Link>
              <Link
                href={`/preview/${book.id}/pages`}
                className="hidden items-center gap-1.5 text-sm font-semibold text-pine transition hover:text-pine-deep sm:inline-flex"
              >
                Sample pages
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </div>
          </article>
        </div>
      </main>

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 px-5 py-8 text-sm text-ink-soft sm:flex-row sm:items-center">
          <BrandMark />
          <p className="text-xs text-ink-faint">
            © 2026 Bless Writes. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
