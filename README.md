# Bless Writes

A **100% free-to-host** eBook storefront built on Next.js (App Router), Supabase
(Auth + Postgres + Storage), Stripe (cards + Checkout), **Flutterwave
(Mobile Money — MTN / Vodafone / AirtelTigo)**, and PDF.js — with a locked-down,
anti-download, anti-print in-browser eReader.

---

## 1. Architecture in one picture

```
 Storefront ──> /api/checkout ────────> Stripe Checkout ────────┐
     │                                                        │ webhook
     │    "Pay with mobile money"                             ▼
     ├──> /api/momo/checkout ──> Flutterwave ──> /api/webhook ─┤
     │                                                ┌────────┘
     │                                webhook inserts into `purchases`
     ▼
 Reader (sandboxed iframe) ──> /api/view-book?bookId=…   (per-request)
                                    │ auth + purchase check (RLS)
                                    │ server signs URL (never sent to client)
                                    v
                              ebooks/… (private bucket)
```

**The core guarantee:** the client only ever talks to `/api/view-book`. The
private storage bucket URL never leaves the server, every request is
authenticated + authorized under Row Level Security, and the reader never has
print / download / save controls.

---

## 2. What you need (all free tiers)

| Thing            | Where                                   | Cost      |
| ---------------- | --------------------------------------- | --------- |
| Next.js app      | this repo                               | Free      |
| Hosting          | Vercel (Hobby)                          | Free      |
| Auth + DB + files| Supabase (Free plan)                    | Free      |
| Card payments    | Stripe (pay-as-you-go fees)             | Per sale  |
| Mobile money     | Flutterwave (pay-as-you-go fees)        | Per sale  |

Prerequisites: Node 20+, a Supabase account, a Stripe account, a Flutterwave
account, and a GitHub account for the Vercel import.

---

## 3. Supabase setup

1. Create a project at [supabase.com](https://supabase.com). Note the
   **Project URL** and grab the **anon** + **service_role** keys from
   *Project Settings → API*.
2. Open **SQL Editor** and run everything in [`supabase/schema.sql`](supabase/schema.sql).
   This creates:
   - `books`, `profiles`, `purchases` tables with full Row Level Security,
   - a trigger that auto-creates a `profiles` row on signup,
   - the **private `ebooks` storage bucket** and the policy that a file can
     only be read if **your user has a matching `purchases` row**.
3. Upload the two book PDFs to the private `ebooks` bucket (the SQL already
   created it; make sure it shows **Public = off**). The storage names must
   match the fixed ids in the seed exactly:
   - `ebooks/a1f7c2d4-5b6e-4c8a-9d3f-2e1b0c9a8f71.pdf` — *Faith Beyond My Resources*
   - `ebooks/b2e8d3c5-6c7f-4d9b-8e4a-3f2c1d0b9a82.pdf` — *From a Five-Cedi Mat to First Class*

   The covers are already bundled in `public/covers/`, so there is nothing to
   upload for them.
4. Run [`supabase/seed.sql`](supabase/seed.sql) in the SQL Editor to add the two
   real books (`cover_url` points at the bundled covers).
5. (*Optional for faster testing*) *Authentication → Providers → Email*:
   disable "Confirm email" so test signups are instant.

> **Never** ship `SUPABASE_SERVICE_ROLE_KEY` to the browser — it bypasses RLS
> and is used only by server-side webhooks and URL signing.

---

## 4. Stripe setup

1. Create an account and a product with a **Price** for each book
   (*Products → Create product*, in GHS).
2. Copy each Price id (`price_xxx`) and run:

   ```sql
   update public.books set stripe_price_id = 'price_xxx'
   where slug = 'faith-beyond-my-resources';

   update public.books set stripe_price_id = 'price_yyy'
   where slug = 'from-a-five-cedi-mat-to-first-class';
   ```

3. Grab `STRIPE_SECRET_KEY` from *Developers → API keys* (test mode: `sk_test_…`).
4. After deploy (Section 7), create a webhook:
   *Developers → Webhooks → Add endpoint* → URL `https://<your-app>.vercel.app/api/webhook`,
   enable the **`checkout.session.completed`** event, and copy the signing secret
   (`whsec_…`).

---

## 5. Flutterwave setup (Mobile Money)

1. Register at [dashboard.flutterwave.com](https://dashboard.flutterwave.com),
   verify the business, and enable **Ghana** + **Mobile Money (GHS)**.
2. *Settings → API* → copy the **Secret Key** (`FLWSECK_TEST_…` for test mode).
3. *Settings → Webhooks* → set the Payload URL to
   `https://<your-app>.vercel.app/api/webhook` (same single endpoint as Stripe —
   the matching is automatic via the `verif-hash` header). Set an arbitrary
   "Secret hash" — that's `FLW_WEBHOOK_HASH`.
4. **Tip:** in test mode, Flutterwave lets you approve the payment from a
   simulated response; the library works as-is.

> The tx_ref we send encodes `user|book`, and both the webhook **and** the
> post-payment redirect re-verify the transaction against Flutterwave's API and
> confirm the amount/currency match the database before granting access.

---

## 6. Environment variables

Copy `.env.local.example` → `.env.local` and fill it in:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi…   # safe for the browser
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi…       # SECRET — server only

# Stripe
STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…               # from `stripe listen` locally

# Flutterwave
FLW_SECRET_KEY=FLWSECK_TEST_…               # SECRET — server only
FLW_WEBHOOK_HASH=bless-books-secret-hash    # must match the dashboard

# Offline reading — SECRET — server only, must stay stable across deploys
OFFLINE_KEY_SECRET=<long-random-string>
```

Then run:

```bash
npm install      # also copies the PDF.js worker into /public/vendor
npm run dev
```

Open http://localhost:3000 — you can browse the shelf, sign up, and buy.

**Local webhooks:**

- Stripe: `stripe login && stripe listen --forward-to localhost:3000/api/webhook`,
  then paste the printed `whsec_…` into `.env.local`.
- Flutterwave cannot send to `localhost`. For local MoMo tests, the **redirect
  verification** on `/reader/<bookId>` grants access instantly (the webhook is
  the primary path in production). You can also simulate the webhook with:

  ```bash
  curl -X POST http://localhost:3000/api/webhook \
    -H "verif-hash: bless-books-secret-hash" \
    -H "Content-Type: application/json" \
    -d '{ "event": "charge.completed", "data": {}}'
  ```

---

## 7. Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: *Add new → Project → Import* the repo. Framework preset auto-detects Next.js.
3. Add **every variable from Section 6** in *Settings → Environment Variables*
   (use `NEXT_PUBLIC_…` exactly as written).
4. Deploy.
5. Point the production webhooks at `https://<your-app>.vercel.app/api/webhook`:
   - Stripe (enable `checkout.session.completed`) → save the new `whsec_…` into
     Vercel's `STRIPE_WEBHOOK_SECRET`.
   - Flutterwave (same URL + the Secret hash).
6. Rebuild/redeploy after changing env variables.

---

## 8. How the content stays locked

| Layer | What it does |
| ----- | ------------ |
| Private bucket | `ebooks` is not public; only RLS-authorized reads |
| `purchases` + RLS | A file read requires `purchases.book_id` owned by `auth.uid()` |
| `/api/view-book` | Auth check → purchase check → **server-side** signed URL → byte-range streaming |
| No direct URL | Signed URLs are created and consumed only inside the serverless function |
| Referer + fetch-dest | Refuses top-level navigation and non-reader callers |
| Sandboxed iframe | `sandbox="allow-scripts allow-same-origin"` — no downloads, no top nav |
| pdf.js, controls stripped | Pages render to a bare canvas; there are no save/print buttons by design |
| Interface lockdown | `lib/drm/interface-lockdown.ts` blocks Ctrl/Cmd+P, S, U, C, X, A, F12, right-click, selection, drag; copy attempts write a decoy string |
| Print CSS | `@media print` blanks the whole page with a "Printing is disabled" overlay |
| Watermark | A faint per-user email is baked into every rendered page to deter screenshots |
| Offline copy | Encrypted at rest in IndexedDB: AES-256-CBC **and** HMAC-SHA256 (encrypt-then-MAC); one chapter decrypted at a time, in memory |
| HTTP headers | Global CSP (production), HSTS, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP — see `next.config.ts` |

**Honest limitation:** screenshots and camera photos can never be fully
prevented in a browser (user-controlled device). Nothing on the client is
uncrackable — the design removes the *convenient* paths (print, save, select,
copy, export) and never hands over the file URL. For hard DRM you would need
server-rendered watermarking sessions, per-session encrypted delivery, or a
non-web client.

---

## 9. Adding more books

```sql
-- 1. pick a new id, e.g. gen_random_uuid()
insert into public.books (slug, title, author, description, cover_url, price_cents, currency, stripe_price_id, file_path)
values (
  'my-second-book',
  'My Second Book',
  'You',
  'Short description.',
  'https://<ref>.supabase.co/storage/v1/object/public/covers/second.jpg',
  499,            -- GHS 4.99
  'GHS',
  'price_xxx',    -- a Stripe price in the same currency
  '<book-id>.pdf'
);
```

Upload the PDF to `ebooks/<book-id>.pdf` and the result appears in the store.

---

## 10. Installable app and offline reading (PWA)

### Install as an app

The storefront ships a web app manifest (`app/manifest.ts`), regular and
maskable PNG icons in `public/icons/`, iOS home-screen metadata, and a small
install prompt (`components/install-app.tsx`). Once deployed over HTTPS:

- **Android, Chrome, Edge** — accept the browser install prompt, or use the
  in-app **Install app** nudge. The app opens straight into `/` in a standalone
  window, without the browser chrome.
- **iPhone / iPad** — open the site in Safari, tap **Share**, then **Add to
  Home Screen**.
- **Desktop Safari** — **File → Add to Dock**.

The service worker (`public/sw.js`) precaches the app shell and icons, so the
installed app launches quickly and falls back to `/offline` when disconnected.

### Offline reading

Purchased books can be saved to the device and read with **no network
connection**. The offline copy is never written to disk as plaintext.

**How it works**

1. **Save** — a `<SaveOfflineButton>` calls `downloadBookForOffline()` with the
   book's chapters. Every chapter is encrypted independently with
   **encrypt-then-MAC** (AES-256-CBC + HMAC-SHA256, PBKDF2-SHA256 key split into
   an AES key and a MAC key, per-book random salt, per-chapter IV) and stored in
   the IndexedDB database `bless-books-offline`. The HMAC is verified
   (constant-time) before decryption, so tampering fails closed.
2. **Read** — `/reader/<bookId>/offline` renders `<OfflineReader>`, which opens
   the manifest, decrypts **one chapter at a time** into a volatile variable,
   and paints it as DOM text nodes (`textContent`, never `innerHTML`). The
   plaintext is overwritten on every page turn and on unmount.
3. **Service worker** — `public/sw.js` caches the app shell and assets
   (cache-first for `/_next/static`, network-first for navigations with an
   `/offline` fallback) and **never** caches `/api/*`. It is registered only in
   production.

**The one seam to wire up:** `SaveOfflineButton` takes a `loadChapters`
provider. Return the book's text as `{ title, text }[]` (or a single
`{ text }` entry, which the engine auto-chunks). The decryption passphrase is
**server-issued**: `deriveOfflinePassphrase(user.id)` (see `lib/offline/key.ts`)
HMACs the user id under the `OFFLINE_KEY_SECRET` env var, so the key is stable
per user but not derivable from the user id alone. Pass the same value to the
reader and to `SaveOfflineButton`.

> Offline reading only covers content that exists as text chapters. The current
> PDF products stream through `/api/view-book` and are **not** saved offline
> until a text pipeline feeds `loadChapters`.

---

## 11. Project layout

```
app/
  page.tsx                            Storefront
  login/                              Sign in / sign up
  offline/page.tsx                    Offline fallback shell (SW-cached)
  manifest.ts                         PWA manifest (/manifest.webmanifest)
  layout.tsx                          App metadata + install prompt mount
  reader/[bookId]/page.tsx            Server gate + MoMo redirect verification
  reader/[bookId]/frame/page.tsx      Sandboxed reader frame (server gate)
  reader/[bookId]/offline/page.tsx    Entitlement gate for the offline reader
  reader/_components/reader-shell.tsx PDF.js viewer (no controls, watermark)
  api/checkout/route.ts               Stripe Checkout session
  api/momo/checkout/route.ts          Flutterwave Mobile Money checkout
  api/webhook/route.ts                Dispatches Stripe + Flutterwave webhooks
  api/view-book/route.ts              Entitlement-checked byte-range stream
components/
  book cards, purchase actions, protected viewer
  offline-reader.tsx                  Full-screen offline reader
  save-offline-button.tsx             "Save offline" control (loadChapters seam)
  pwa-register.tsx                    Service-worker registration + online state
  install-app.tsx                     Install prompt (Chromium + iOS instructions)
lib/
  lib/
    offline/crypto.ts                   AES-256-CBC + HMAC-SHA-256 (encrypt-then-MAC)
    offline/key.ts                      deriveOfflinePassphrase() — server-issued key
    offline/{idb,engine,runtime}.ts     IndexedDB store, download pipeline, reader runtime
    rate-limit.ts                       in-memory fixed-window limiter (checkout)
  supabase/                           client/server/route/proxy/admin helpers
  purchases.ts, momo-verify.ts        Granting + payment-verification logic
  flutterwave.ts, stripe.ts           Payment providers
  drm/interface-lockdown.ts           Anti-copy / anti-print / anti-DevTools listeners
  offline/                            Encrypted IndexedDB engine (crypto, idb, engine, runtime)
hooks/
  use-interface-lockdown.ts           React binding for the lockdown module
  use-offline-reader.ts               Offline reader hook (decrypt + navigate)
  use-offline-library.ts              List / remove device-saved books
public/sw.js                          Service worker (app-shell cache, API bypass)
public/icons/                         Install + home-screen icons (regular/maskable)
public/icon.svg                       Vector source for the app icons
public/covers/                        Bundled cover images for the two books
supabase/schema.sql                   Tables, RLS, storage policies
supabase/seed.sql                     Real book catalog
proxy.ts                              Next 16 proxy (session refresh)
```