/**
 * Free-preview configuration.
 *
 * The preview reader lets a visitor sample a book before buying. The sample is
 * built SERVER-SIDE: only the pages in the range below are copied out of the
 * full PDF and streamed, so the rest of the book never reaches the browser.
 *
 * Change `DEFAULT_PREVIEW_RANGE` to taste, or add a per-book override to
 * `PREVIEW_RANGES` (keyed by book id) for a longer/shorter sample.
 */

export interface PageRange {
  /** 1-based, inclusive. */
  from: number;
  /** 1-based, inclusive. */
  to: number;
}

export const DEFAULT_PREVIEW_RANGE: PageRange = { from: 1, to: 6 };

const PREVIEW_RANGES: Record<string, PageRange> = {
  // Faith Beyond My Resources — open on the first prose page of Chapter One,
  // not the chapter divider or the front matter.
  "demo-1": { from: 10, to: 12 },
  "a1f7c2d4-5b6e-4c8a-9d3f-2e1b0c9a8f71": { from: 10, to: 12 },

  // From a Five-Cedi Mat to First Class — Chapter One, "The Village Boy",
  // starting on the first prose page and ending where the chapter ends.
  "demo-2": { from: 11, to: 13 },
  "b2e8d3c5-6c7f-4d9b-8e4a-3f2c1d0b9a82": { from: 11, to: 13 },
};

export function getPreviewRange(bookId: string): PageRange {
  return PREVIEW_RANGES[bookId] ?? DEFAULT_PREVIEW_RANGE;
}
