# ARCHIVE &amp; CO

Pre-owned designer wear and pre-owned sneakers. Dubai, ships worldwide.

A static site — plain HTML, CSS and JavaScript. No build step, no framework,
no dependencies. Open `index.html` in a browser and it runs.

---

## Pages

| File | Purpose |
|---|---|
| `index.html` | Home — hero, categories, featured pieces, story teaser, process |
| `clothing.html` | The archive — filterable grid, condition grading reference |
| `about.html` | The full story and what "care" means here |
| `contact.html` | Contact details, message form, quick answers |
| `returns.html` | Returns, shipping and policy detail |
| `terms.html` | Terms & Conditions |
| `account.html` | Signed-in account — cart and order history |
| `success.html` | Where Stripe returns after a completed payment |

```
style.css      all styling
products.js    THE INVENTORY — edit this to change stock
main.js        behaviour + the ordering switch
store.js       accounts, cart, orders — PASTE SUPABASE KEYS HERE
account.js     account UI: navbar control, sign-in modal, cart drawer
favicon.svg

api/checkout.js   Stripe Checkout — server-side, holds the secret key
```

Everything sits in one flat folder — no subdirectories. That is deliberate:
dragging files into GitHub's web uploader flattens folders, which silently
breaks any nested asset path. Keep all files side by side and it can't happen.

---

## Running it locally

Double-click `index.html`, or serve it properly:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

---

## Deploying to Vercel

Zero config — Vercel serves this as a static site as-is.

1. Push this folder to a GitHub repository.
2. On [vercel.com](https://vercel.com), **Add New → Project** and import that repo.
3. Framework Preset: **Other**. Leave Build Command and Output Directory empty.
4. **Deploy**.

Every push to `main` redeploys automatically.

---

## Two things you'll actually want to change

### 1. Opening and closing ordering

One value, at the top of `main.js`:

```js
const ORDERING_OPEN = true;   // false = closed
```

`true` puts the site in business: buy controls become live **Enquire** links,
the navbar pill turns green, and the open-for-business copy shows.
`false` locks every buy control and swaps in the closed messaging.

It drives the whole site from that one line. Every piece of ordering copy is
tagged `data-when="open"` or `data-when="closed"` in the HTML, so the pages can
never end up contradicting each other.

> **Note:** "open" means customers can enquire about a piece. There is no
> checkout or payment processing on this site — an enquiry sends them to the
> contact page to email you. Taking card payments needs a platform like
> Shopify or Stripe behind it.

### 2. The inventory

Everything on sale lives in `products.js` as one entry per piece:

```js
{ id:"s01", brand:"Nike", name:"Air Max 1 — Patta Waves", cat:"sneakers",
  size:"UK 9", cond:"VNDS", era:"2021", price:340, was:520,
  status:"available", grail:true, img:"air-max-1.jpg" },
```

| Field | Notes |
|---|---|
| `id` | unique, any string |
| `cat` | `tops` · `outerwear` · `trousers` · `sneakers` · `accessories` |
| `cond` | `VNDS` · `Excellent` · `Very Good` · `Good` |
| `price` / `was` | numbers, GBP. `was` shows as a strikethrough |
| `status` | `available` · `reserved` · `sold` |
| `grail` | `true` adds the gold ARCHIVE GRAIL tag |
| `img` | optional — omit it and a placeholder tile is drawn |

**Photography:** put image files in the same folder and point `img` at the
filename. Pieces without an `img` render a dark monogram tile, so the grid
never looks broken while you're still shooting.

---

---

## Accounts, cart and order history

Customers create an account with an email and password, must tick the Terms &
Conditions box to sign in or sign up, and get a cart tied to that account that
follows them between devices. Signing out is in the navbar dropdown.

**Accounts are optional.** Nobody needs one to buy — Buy now goes straight to
Stripe either way. Sales are recorded by Stripe, which also emails the receipt,
so the site keeps no order history of its own.

### ⚠️ Right now this is PREVIEW ONLY — do not take real passwords

With no Supabase credentials filled in, accounts are stored in the visitor's
own browser. Passwords are salted and SHA-256 hashed rather than stored in the
clear, but that is a courtesy, not protection:

- There is no server, so **nothing can actually be enforced.** Anyone can edit
  their own cart or account with browser devtools.
- Accounts exist only in the browser that created them. A customer signing in
  from their phone will not find the account they made on their laptop.
- Clearing site data deletes the account.

The sign-in box says this on screen, in red, so nobody enters a real password
by mistake. **Connect Supabase before launch.**

### Connecting Supabase

**1.** In your Supabase project, open the SQL editor and run:

```sql
create table public.carts (
  user_id    uuid references auth.users on delete cascade,
  product_id text not null,
  added_at   timestamptz default now(),
  primary key (user_id, product_id)
);

alter table public.carts enable row level security;

-- each customer can only ever see and touch their own cart
create policy "own cart" on public.carts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**2.** In `store.js`, fill in the config block at the top:

```js
const SUPABASE_CONFIG = {
  url:     "https://YOUR-PROJECT.supabase.co",
  anonKey: "YOUR-ANON-KEY"
};
```

Both are in **Project Settings → API**. The anon key is designed to be public —
it is safe in a client-side file, because the row-level-security policies above
are what actually protect the data. Never put the *service role* key here.

**3.** Deploy. That is the whole switch — every screen already talks through
one interface, so nothing else changes. The red preview warning disappears on
its own once the keys are present.

That row-level-security policy is not optional. Without it the anon key would
let anyone read and edit everyone else's cart.

---

## Payments (Stripe Checkout)

Clicking **Buy now** on a piece, or **Checkout** in the cart, posts the product
IDs to `/api/checkout`. That function runs on Vercel's server, looks up the real
prices from `products.js`, creates a Stripe Checkout Session and returns its URL.
The browser is redirected to Stripe's own hosted payment page.

**The browser never sends a price and never sees the secret key.** A customer who
edits the request to claim a £1,250 jacket costs £1 is still charged £1,250,
because the amount is read server-side from the catalogue. Sold pieces are
rejected before a session is created.

### Setting it up

**In Stripe** (dashboard.stripe.com):

1. Keep the **Test mode** toggle ON while you try it out.
2. **Developers → API keys → Secret key → Reveal.** Copy it — starts `sk_test_`.
3. Nothing else. No products or prices need creating; they're sent per session.

**In Vercel** (your project → Settings → Environment Variables):

| Name | Value | Environments |
|---|---|---|
| `STRIPE_SECRET_KEY` | your `sk_test_…` key | Production, Preview, Development |

Then **redeploy** — environment variables only apply to builds made after they
are added.

### Testing it

Use Stripe's test card on the checkout page: **4242 4242 4242 4242**, any future
expiry, any CVC, any postcode. No real money moves. Completed payments appear in
Stripe under **Payments**.

### Going live

1. Switch Stripe out of Test mode and complete business verification.
2. Copy the **live** secret key (`sk_live_…`).
3. Replace `STRIPE_SECRET_KEY` in Vercel with it, and redeploy.

---

## Known gaps

- **The contact form has no server.** It composes the message and hands it to
  the visitor's mail app, addressed to `ayaanxaslam@gmail.com`. That relies on
  them having mail set up. To send silently instead, sign up for a form service
  (Formspree or similar) and point the `<form>` at its endpoint — the block to
  replace is marked in `main.js`.
- **Prices are in GBP** while the business is based in Dubai. Worth deciding
  whether that should be AED.
- **The returns policy is written, not lawyered.** Read it properly before
  trading on it.
- **Product data is sample stock** — real brands and plausible prices, but not
  your actual inventory.
