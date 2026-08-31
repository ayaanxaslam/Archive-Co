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

```
style.css      all styling
products.js    THE INVENTORY — edit this to change stock
main.js        behaviour + the ordering switch
favicon.svg
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
