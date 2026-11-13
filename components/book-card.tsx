import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { getBookExcerpt } from "@/lib/excerpts";
import { PurchaseActions } from "@/components/purchase-actions";

export interface CatalogBook {
  id: string;
  slug: string;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
  price_cents: number;
  currency: string;
}

interface BookCardProps {
  book: CatalogBook;
  index: number;
  alreadyOwned: boolean;
  prefilledPhone?: string | null;
  demo?: boolean;
}

/**
 * A full-width editorial feature for one book. The covers carry the visual
 * weight; the copy is led by the book's own scenes and chapter titles rather
 * than generic storefront badges.
 */
export function BookCard({
  book,
  index,
  alreadyOwned,
  prefilledPhone,
  demo = false,
}: BookCardProps) {
  const excerpt = getBookExcerpt(book.slug);
  const reverse = index % 2 === 1;

  return (
    <article
      id={`book-${book.slug}`}
      className="scroll-mt-28 border-t border-line pt-12 first:border-t-0 first:pt-0 sm:pt-16"
    >
      <div className="grid items-center gap-10 lg:grid-cols-[0.42fr_0.58fr] lg:gap-16">
        <div className={reverse ? "lg:order-2" : ""}>
          <div className="relative mx-auto w-full max-w-[22rem] sm:max-w-[24rem]">
            <div
              aria-hidden
              className="absolute -inset-5 rounded-[2.5rem] bg-[radial-gradient(circle_at_30%_20%,rgba(176,141,79,0.18),transparent_65%)]"
            />
            <div className="relative overflow-hidden rounded-[3px] bg-paper-deep shadow-[0_32px_70px_-28px_rgba(34,31,27,0.55)] ring-1 ring-black/10">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 z-10 w-2.5 bg-gradient-to-r from-black/25 via-black/5 to-transparent"
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
            <p className="mt-5 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
              {index === 0 ? "Book one" : "Book two"} · Published 2026
            </p>
          </div>
        </div>

        <div className={reverse ? "lg:order-1" : ""}>
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl font-light italic text-brass">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="h-px w-10 bg-brass/50" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brass-deep">
              {index === 0 ? "Faith & provision" : "Work & becoming"}
            </span>
          </div>

          <h3 className="mt-4 max-w-xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
            {book.title}
          </h3>

          {excerpt && (
            <p className="mt-4 font-reading text-xl italic leading-relaxed text-ink-soft">
              {excerpt.bookSubtitle}
            </p>
          )}

          {book.description && (
            <p className="mt-5 max-w-xl text-base leading-7 text-ink-soft">
              {book.description}
            </p>
          )}

          {excerpt && (
            <blockquote className="mt-8 max-w-xl border-l-2 border-brass pl-5 sm:pl-6">
              <p className="font-reading text-xl leading-relaxed text-ink sm:text-2xl">
                &ldquo;{excerpt.pullQuote}&rdquo;
              </p>
            </blockquote>
          )}

          {excerpt && (
            <div className="mt-8 max-w-xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                Inside the book
              </p>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
                {excerpt.inside.map((chapter) => (
                  <li key={chapter} className="flex items-baseline gap-2">
                    <span aria-hidden className="text-brass">
                      &middot;
                    </span>
                    {chapter}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-9 flex flex-col gap-6 border-t border-line pt-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                {alreadyOwned ? "In your library" : "Full edition"}
              </p>
              <p className="mt-1 font-display text-3xl font-semibold text-brass-deep">
                {alreadyOwned ? "Purchased" : formatPrice(book.price_cents, book.currency)}
              </p>
              <p className="mt-1 text-xs text-ink-faint">
                {alreadyOwned ? "Open the protected reader" : "Read instantly in your browser"}
              </p>
            </div>

            <Link
              href={`/preview/${book.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper shadow-sm transition hover:bg-pine"
            >
              <BookOpen aria-hidden className="h-4 w-4" />
              Read an excerpt
              <ArrowUpRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 max-w-md">
            <PurchaseActions
              bookId={book.id}
              bookTitle={book.title}
              priceCents={book.price_cents}
              currency={book.currency}
              alreadyOwned={alreadyOwned}
              prefilledPhone={prefilledPhone}
              demo={demo}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
