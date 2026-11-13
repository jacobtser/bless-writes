-- ============================================================================
--  BLESS WRITES — Seed data (the two real books)
--  Run AFTER schema.sql.
--
--  BEFORE GOING LIVE:
--   1. Upload each PDF to the private `ebooks` bucket using the exact
--      `<book-id>.pdf` names below.
--   2. Create a Stripe Price for each book in GHS and replace the
--      `price_REPLACE_...` values with the real `price_...` ids.
--   3. Adjust `price_cents` if the shelf prices change (minor units).
-- ============================================================================

insert into public.books (
  id, slug, title, author, description, cover_url, price_cents, currency, stripe_price_id, file_path
)
values
  (
    'a1f7c2d4-5b6e-4c8a-9d3f-2e1b0c9a8f71',
    'faith-beyond-my-resources',
    'Faith Beyond My Resources',
    'Bless Laweh Koranteng',
    'A journey through childhood prayer, closed doors, honest work, and the long wait for a scholarship that changed everything.',
    '/covers/faith-beyond-my-resources.jpg',
    3000,        -- GHS 30.00
    'GHS',
    'price_REPLACE_FAITH_BEYOND_MY_RESOURCES', -- <-- required for card checkout
    'a1f7c2d4-5b6e-4c8a-9d3f-2e1b0c9a8f71.pdf'
  ),
  (
    'b2e8d3c5-6c7f-4d9b-8e4a-3f2c1d0b9a82',
    'from-a-five-cedi-mat-to-first-class',
    'From a Five-Cedi Mat to First Class',
    'Bless Laweh Koranteng',
    'A memoir of faith, resilience, and opportunity — from a five-cedi grass mat in senior high school to First Class Honours at KNUST.',
    '/covers/from-a-five-cedi-mat-to-first-class.jpg',
    4500,        -- GHS 45.00
    'GHS',
    'price_REPLACE_FROM_A_FIVE_CEDI_MAT',       -- <-- required for card checkout
    'b2e8d3c5-6c7f-4d9b-8e4a-3f2c1d0b9a82.pdf'
  )
on conflict (id) do update set
  slug        = excluded.slug,
  title       = excluded.title,
  author      = excluded.author,
  description = excluded.description,
  cover_url   = excluded.cover_url,
  price_cents = excluded.price_cents,
  currency    = excluded.currency,
  file_path   = excluded.file_path;
-- NOTE: stripe_price_id is intentionally not overwritten, so re-running this
-- seed can never replace a real Stripe Price you have already configured.

-- Optional: once the real titles are live, remove the old placeholder book.
--   delete from public.books where slug = 'sample-ebook';
