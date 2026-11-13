-- ============================================================================
--  BLESS BOOKS — Database schema, Row Level Security, and Storage policies
--  Run this file in full inside the Supabase SQL Editor (Dashboard > SQL > New query).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- BOOKS (public, read-only catalog used by the storefront)
-- ---------------------------------------------------------------------------
create table if not exists public.books (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  title            text not null,
  author           text not null,
  description      text,
  cover_url        text,
  price_cents      bigint not null default 0,
  currency         text not null default 'GHS',  -- ISO 4217 code used for display and MoMo (Flutterwave) charges
  stripe_price_id  text not null,        -- the Stripe Price that Checkout actually charges
  file_path        text not null,        -- storage path inside the private 'ebooks' bucket, e.g. '<book-id>.pdf'
  created_at       timestamptz not null default now()
);

alter table public.books enable row level security;

-- The catalog itself is public so visitors can browse the storefront.
create policy "Anyone can browse the catalog"
  on public.books for select
  using (true);

-- ---------------------------------------------------------------------------
-- PROFILES (1:1 with auth.users, created by trigger on signup)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  phone       text,                      -- mobile money number, saved after first MoMo purchase
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create the profile row the moment a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- PURCHASES (the entitlement table — the heart of the DRM model)
-- ---------------------------------------------------------------------------
create table if not exists public.purchases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  book_id     uuid not null references public.books (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, book_id)   -- idempotency: at most one purchase per user per book
);

alter table public.purchases enable row level security;

-- A user can only ever see their OWN purchase records.
create policy "Users can view their own purchases"
  on public.purchases for select
  using (auth.uid() = user_id);

-- NOTE: rows are inserted by the Stripe webhook using the *service_role* key,
-- which bypasses RLS entirely. No INSERT/UPDATE/DELETE policies are granted
-- to end users on purpose.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- STORAGE — private bucket that physically holds the PDF files
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('ebooks', 'ebooks', false)
on conflict (id) do nothing;

-- THE core storage policy:
--   An authenticated user may only read an object inside 'ebooks' when a
--   matching purchase exists. Object names are expected to be '<book-id>.pdf',
--   so we derive book_id from the object name and require a purchases row for
--   (auth.uid(), book_id). Listing the bucket is equally blocked by this select
--   policy, so file names themselves are not enumerable by users.
create policy "Only owners of a purchase may read the matching ebook file"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'ebooks'
    and exists (
      select 1
      from public.purchases p
      where p.user_id = auth.uid()
        and p.book_id = (split_part(name, '.', 1))::uuid
    )
  );

-- Uploads/replacements/deletions inside 'ebooks' are only ever performed by
-- the server using the service_role key (which bypasses RLS), so no extra
-- storage policies are needed — users cannot upload anything.

-- Optional: public bucket for cover images served directly to the storefront.
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;