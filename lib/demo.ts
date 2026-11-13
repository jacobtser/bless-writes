import type { CatalogBook } from "@/components/book-card";

/**
 * Catalog shown when Supabase is not configured, so the storefront can be
 * previewed locally with zero setup. These entries map to the two real books
 * in the repo's `BOOKS/` folder (see `DEMO_PDF_PATHS`) so the sample reader
 * works out of the box.
 */
export const DEMO_BOOKS: CatalogBook[] = [
  {
    id: "demo-1",
    slug: "faith-beyond-my-resources",
    title: "Faith Beyond My Resources",
    author: "Bless Laweh Koranteng",
    description:
      "A journey through childhood prayer, closed doors, honest work, and the long wait for a scholarship that changed everything.",
    cover_url: "/covers/faith-beyond-my-resources.jpg",
    price_cents: 3000,
    currency: "GHS",
  },
  {
    id: "demo-2",
    slug: "from-a-five-cedi-mat-to-first-class",
    title: "From a Five-Cedi Mat to First Class",
    author: "Bless Laweh Koranteng",
    description:
      "A memoir of faith, resilience, and opportunity — from a five-cedi grass mat in senior high school to First Class Honours at KNUST. This edition also carries the 30-Day Challenge devotional.",
    cover_url: "/covers/from-a-five-cedi-mat-to-first-class.jpg",
    price_cents: 4500,
    currency: "GHS",
  },
];

/**
 * Demo-mode only: maps a demo book id to a PDF inside the repo (paths relative
 * to the project root). Used by the preview/download resolver when Supabase is
 * not configured. Server-side only — never imported by client components.
 *
 * Book two is a single file: the memoir followed by its 30-Day Challenge
 * companion section, so there is no separate challenge PDF to serve.
 */
export const DEMO_PDF_PATHS: Record<string, string> = {
  "demo-1": "BOOKS/Faith_Beyond_My_Resources.pdf",
  "demo-2": "BOOKS/From_a_Five-Cedi_Mat_to_First_Class_with_30-Day_Challenge.pdf",
};
