/* ============================================================
   ARCHIVE & CO — create a Stripe Checkout Session
   ------------------------------------------------------------
   Runs on Vercel as a serverless function at  POST /api/checkout

   The browser sends only product IDs. Every price is looked up
   here, server-side, from products.js. A customer editing the
   request cannot change what they are charged.

   Requires one environment variable:
     STRIPE_SECRET_KEY   (sk_test_... or sk_live_...)

   That value must only ever exist in Vercel's environment
   settings and your local .env — never in a committed file,
   and never in anything the browser downloads.
   ============================================================ */

const { PRODUCTS } = require("../products.js");

const CURRENCY = "gbp";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error("STRIPE_SECRET_KEY is not set in the environment.");
    return res.status(500).json({ error: "Payments aren't configured yet." });
  }
  if (!secret.startsWith("sk_")) {
    console.error("STRIPE_SECRET_KEY does not look like a secret key.");
    return res.status(500).json({ error: "Payments aren't configured correctly." });
  }

  /* ---------- what the browser asked for ---------- */
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  const ids = body && Array.isArray(body.ids) ? body.ids : null;

  if (!ids || !ids.length) return res.status(400).json({ error: "No items given." });
  if (ids.length > 20) return res.status(400).json({ error: "Too many items." });

  /* ---------- resolve them against the real catalogue ---------- */
  const items = [];
  for (const rawId of ids) {
    if (typeof rawId !== "string") return res.status(400).json({ error: "Bad item." });
    const p = PRODUCTS.find((x) => x.id === rawId);
    if (!p) return res.status(404).json({ error: "That piece isn't in the archive." });
    if (p.status === "sold") {
      return res.status(409).json({ error: `"${p.name}" has already sold.` });
    }
    if (!Number.isFinite(p.price) || p.price <= 0) {
      console.error("Bad price on product", p.id);
      return res.status(500).json({ error: "That piece isn't priced correctly." });
    }
    if (items.some((i) => i.id === p.id)) continue;   // one of one, never twice
    items.push(p);
  }

  /* ---------- build the Stripe request ---------- */
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = `${proto}://${host}`;

  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url", `${origin}/clothing.html`);
  form.set("billing_address_collection", "required");
  form.append("shipping_address_collection[allowed_countries][]", "AE");
  form.append("shipping_address_collection[allowed_countries][]", "GB");
  form.append("shipping_address_collection[allowed_countries][]", "US");

  items.forEach((p, i) => {
    form.set(`line_items[${i}][quantity]`, "1");
    form.set(`line_items[${i}][price_data][currency]`, CURRENCY);
    form.set(`line_items[${i}][price_data][unit_amount]`, String(Math.round(p.price * 100)));
    form.set(`line_items[${i}][price_data][product_data][name]`, `${p.brand} — ${p.name}`);
    form.set(
      `line_items[${i}][price_data][product_data][description]`,
      `Size ${p.size} · ${p.cond} · Pre-owned`
    );
  });

  /* Carried through to the Stripe dashboard and any future webhook,
     so an order can always be traced back to exact pieces. */
  form.set("metadata[product_ids]", items.map((p) => p.id).join(","));
  if (body.email && typeof body.email === "string" && body.email.length < 200) {
    form.set("customer_email", body.email);
  }

  /* ---------- call Stripe ---------- */
  try {
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + secret,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: form.toString()
    });

    const session = await r.json();

    if (!r.ok) {
      /* Log the real reason for us; tell the customer something useful but plain. */
      console.error("Stripe error:", session && session.error);
      return res.status(502).json({
        error: (session && session.error && session.error.message) || "Couldn't start checkout."
      });
    }

    return res.status(200).json({ url: session.url, id: session.id });
  } catch (err) {
    console.error("Checkout failed:", err);
    return res.status(502).json({ error: "Couldn't reach the payment provider." });
  }
};
