/* ============================================================
   ARCHIVE & CO — account UI
   Navbar control, sign-in modal, cart drawer, account page.
   All markup is injected here so the five pages stay clean and
   can never drift out of sync with each other.
   ============================================================ */
(function () {
  "use strict";

  const gbp = (n) => "£" + Number(n).toLocaleString("en-GB", { maximumFractionDigits: 0 });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const findProduct = (id) =>
    (typeof PRODUCTS !== "undefined" ? PRODUCTS : []).find((p) => p.id === id);

  /* ============================================================
     NAVBAR CONTROL
     ============================================================ */
  function buildNav() {
    const right = document.querySelector(".nav-right");
    if (!right || right.querySelector(".acct")) return;

    const wrap = document.createElement("div");
    wrap.className = "acct";
    wrap.innerHTML = `
      <button class="acct-btn" data-acct-toggle aria-expanded="false" aria-haspopup="true">
        <span class="acct-label">Account</span>
        <span class="acct-count" data-cart-count hidden>0</span>
      </button>
      <div class="acct-menu" data-acct-menu hidden>
        <div class="acct-who" data-acct-who></div>
        <a class="acct-item" href="account.html">Your account</a>
        <button class="acct-item" data-open-cart>Cart <span data-cart-count-2>(0)</span></button>
        <button class="acct-item acct-out" data-sign-out>Log out</button>
      </div>`;
    right.insertBefore(wrap, right.querySelector(".burger") || null);

    wrap.querySelector("[data-acct-toggle]").addEventListener("click", () => {
      const user = Store.currentUser();
      if (!user) return openAuth("signin");
      const menu = wrap.querySelector("[data-acct-menu]");
      const btn = wrap.querySelector("[data-acct-toggle]");
      const open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
    });

    wrap.querySelector("[data-sign-out]").addEventListener("click", async () => {
      await Store.signOut();
      wrap.querySelector("[data-acct-menu]").hidden = true;
      toast("Logged out");
    });

    wrap.querySelector("[data-open-cart]").addEventListener("click", () => {
      wrap.querySelector("[data-acct-menu]").hidden = true;
      openCart();
    });

    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) {
        const m = wrap.querySelector("[data-acct-menu]");
        if (m && !m.hidden) {
          m.hidden = true;
          wrap.querySelector("[data-acct-toggle]").setAttribute("aria-expanded", "false");
        }
      }
    });
  }

  async function paintNav() {
    const user = Store.currentUser();
    const label = document.querySelector(".acct-label");
    const who = document.querySelector("[data-acct-who]");
    if (!label) return;

    if (user) {
      label.textContent = user.email.split("@")[0];
      if (who) who.textContent = user.email;
    } else {
      label.textContent = "Account";
    }

    const cart = user ? await Store.getCart() : [];
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      el.textContent = cart.length;
      el.hidden = cart.length === 0;
    });
    document.querySelectorAll("[data-cart-count-2]").forEach((el) => {
      el.textContent = "(" + cart.length + ")";
    });
  }

  /* ============================================================
     AUTH MODAL
     ============================================================ */
  let authMode = "signin";

  function buildAuth() {
    if (document.querySelector("[data-auth]")) return;
    const el = document.createElement("div");
    el.className = "modal";
    el.setAttribute("data-auth", "");
    el.hidden = true;
    el.innerHTML = `
      <div class="modal-bg" data-close-auth></div>
      <div class="modal-panel" role="dialog" aria-modal="true" aria-label="Account">
        <button class="modal-x" data-close-auth aria-label="Close">&times;</button>

        <div class="modal-brand">Archive <span class="amp">&amp;</span> Co</div>

        <div class="tabs">
          <button class="tab" data-mode="signin">Sign in</button>
          <button class="tab" data-mode="signup">Create account</button>
        </div>

        <form class="form auth-form" data-auth-form novalidate>
          <div class="field">
            <label for="ac-email">Email</label>
            <input id="ac-email" name="email" type="email" autocomplete="email"
                   placeholder="you@email.com" required>
          </div>
          <div class="field">
            <label for="ac-pass">Password</label>
            <input id="ac-pass" name="password" type="password"
                   autocomplete="current-password" placeholder="••••••••" required>
            <span class="field-hint" data-pass-hint hidden>At least 8 characters</span>
          </div>

          <label class="check">
            <input type="checkbox" name="terms" data-terms>
            <span class="check-box" aria-hidden="true"></span>
            <span class="check-text">
              I have read and accept the
              <a href="terms.html" target="_blank" rel="noopener">Terms &amp; Conditions</a>
              and <a href="returns.html" target="_blank" rel="noopener">Returns Policy</a>.
            </span>
          </label>

          <div class="note is-error" data-auth-error hidden></div>

          <button class="btn btn-accent auth-submit" type="submit">Sign in</button>

          <p class="auth-swap">
            <span data-swap-text>New here?</span>
            <button type="button" class="linkish" data-swap>Create an account</button>
          </p>
        </form>

        <div class="auth-warn" data-auth-warn hidden></div>
      </div>`;
    document.body.appendChild(el);

    el.querySelectorAll("[data-close-auth]").forEach((b) =>
      b.addEventListener("click", closeAuth));
    el.querySelectorAll(".tab").forEach((t) =>
      t.addEventListener("click", () => setMode(t.dataset.mode)));
    el.querySelector("[data-swap]").addEventListener("click", () =>
      setMode(authMode === "signin" ? "signup" : "signin"));
    el.querySelector("[data-auth-form]").addEventListener("submit", submitAuth);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !el.hidden) closeAuth();
    });

    if (!Store.isLive) {
      const warn = el.querySelector("[data-auth-warn]");
      warn.hidden = false;
      warn.innerHTML =
        "<b>Preview mode</b>Accounts are stored in this browser only, and are not " +
        "secure. Don't use a real password yet — this switches to proper server " +
        "accounts once Supabase is connected.";
    }
  }

  function setMode(mode) {
    authMode = mode;
    const el = document.querySelector("[data-auth]");
    el.querySelectorAll(".tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.mode === mode));
    el.querySelector(".auth-submit").textContent =
      mode === "signin" ? "Sign in" : "Create account";
    el.querySelector("[data-pass-hint]").hidden = mode !== "signup";
    el.querySelector("#ac-pass").setAttribute(
      "autocomplete", mode === "signin" ? "current-password" : "new-password");
    el.querySelector("[data-swap-text]").textContent =
      mode === "signin" ? "New here?" : "Already have an account?";
    el.querySelector("[data-swap]").textContent =
      mode === "signin" ? "Create an account" : "Sign in instead";
    showAuthError("");
  }

  function openAuth(mode) {
    buildAuth();
    setMode(mode || "signin");
    const el = document.querySelector("[data-auth]");
    el.hidden = false;
    document.body.classList.add("no-scroll");
    setTimeout(() => el.querySelector("#ac-email").focus(), 60);
  }

  function closeAuth() {
    const el = document.querySelector("[data-auth]");
    if (el) el.hidden = true;
    document.body.classList.remove("no-scroll");
  }

  function showAuthError(msg) {
    const box = document.querySelector("[data-auth-error]");
    if (!box) return;
    box.hidden = !msg;
    box.innerHTML = msg ? "<b>Hold on</b><p>" + esc(msg) + "</p>" : "";
  }

  async function submitAuth(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector(".auth-submit");
    const email = form.elements.email.value;
    const password = form.elements.password.value;
    const terms = form.elements.terms.checked;

    showAuthError("");
    btn.disabled = true;
    btn.textContent = authMode === "signin" ? "Signing in…" : "Creating…";

    try {
      const res = authMode === "signin"
        ? await Store.signIn(email, password, terms)
        : await Store.signUp(email, password, terms);

      if (res && res.pendingConfirmation) {
        showAuthError("Check your email to confirm the account, then sign in.");
        setMode("signin");
      } else {
        closeAuth();
        form.reset();
        toast(authMode === "signin" ? "Signed in" : "Account created");
      }
    } catch (err) {
      showAuthError(err.message || "Something went wrong. Try again.");
    } finally {
      btn.disabled = false;
      btn.textContent = authMode === "signin" ? "Sign in" : "Create account";
    }
  }

  /* ============================================================
     CART DRAWER
     ============================================================ */
  function buildCart() {
    if (document.querySelector("[data-cart]")) return;
    const el = document.createElement("div");
    el.className = "modal drawer";
    el.setAttribute("data-cart", "");
    el.hidden = true;
    el.innerHTML = `
      <div class="modal-bg" data-close-cart></div>
      <aside class="drawer-panel" role="dialog" aria-modal="true" aria-label="Your cart">
        <header class="drawer-head">
          <h3>Your cart</h3>
          <button class="modal-x" data-close-cart aria-label="Close">&times;</button>
        </header>
        <div class="drawer-body" data-cart-body></div>
        <footer class="drawer-foot" data-cart-foot hidden>
          <div class="drawer-total"><span>Total</span><b data-cart-total>£0</b></div>
          <button class="btn btn-accent" data-checkout>Checkout</button>
          <p class="drawer-note">One of one — secure payment is handled by Stripe.
             You'll be taken to their checkout page.</p>
        </footer>
      </aside>`;
    document.body.appendChild(el);

    el.querySelectorAll("[data-close-cart]").forEach((b) =>
      b.addEventListener("click", closeCart));
    el.querySelector("[data-checkout]").addEventListener("click", checkout);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !el.hidden) closeCart();
    });
  }

  async function paintCart() {
    const body = document.querySelector("[data-cart-body]");
    if (!body) return;
    const foot = document.querySelector("[data-cart-foot]");

    if (!Store.currentUser()) {
      body.innerHTML = `<p class="drawer-empty">Sign in to start a cart.</p>`;
      foot.hidden = true;
      return;
    }

    const ids = await Store.getCart();
    const items = ids.map(findProduct).filter(Boolean);

    if (!items.length) {
      body.innerHTML = `<p class="drawer-empty">Nothing here yet. Everything in the
        archive is one of one — when you find it, add it.</p>`;
      foot.hidden = true;
      return;
    }

    body.innerHTML = items.map((p) => `
      <div class="line">
        <div class="line-media">${p.img
          ? `<img src="${esc(p.img)}" alt="">`
          : `<span class="line-ph">${esc(p.brand.split(" ")[0])}</span>`}</div>
        <div class="line-info">
          <span class="line-brand">${esc(p.brand)}</span>
          <span class="line-name">${esc(p.name)}</span>
          <span class="line-meta">Size ${esc(p.size)} · ${esc(p.cond)}</span>
        </div>
        <div class="line-right">
          <b>${gbp(p.price)}</b>
          <button class="linkish" data-remove="${esc(p.id)}">Remove</button>
        </div>
      </div>`).join("");

    body.querySelectorAll("[data-remove]").forEach((b) =>
      b.addEventListener("click", async () => {
        await Store.removeFromCart(b.dataset.remove);
        toast("Removed from cart");
      }));

    document.querySelector("[data-cart-total]").textContent =
      gbp(items.reduce((s, p) => s + p.price, 0));
    foot.hidden = false;
  }

  function openCart() {
    buildCart();
    paintCart();
    const el = document.querySelector("[data-cart]");
    el.hidden = false;
    document.body.classList.add("no-scroll");
  }
  function closeCart() {
    const el = document.querySelector("[data-cart]");
    if (el) el.hidden = true;
    document.body.classList.remove("no-scroll");
  }

  async function checkout() {
    const btn = document.querySelector("[data-checkout]");
    const ids = await Store.getCart();
    if (!ids.length) { toast("Your cart is empty"); return; }
    goToCheckout(ids, btn);
  }


  /* ============================================================
     STRIPE CHECKOUT
     Sends product IDs only. The server looks up every price from
     products.js, so nothing here can influence what is charged.
     ============================================================ */
  async function goToCheckout(ids, btn) {
    const label = btn ? btn.textContent : null;
    if (btn) { btn.disabled = true; btn.textContent = "Redirecting…"; }
    try {
      const user = Store.currentUser();
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, email: user ? user.email : undefined })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Couldn't start checkout.");

      /* Remember what is being bought so the success page can record it. */
      try { sessionStorage.setItem("ac_pending", JSON.stringify(ids)); } catch (e) {}
      window.location.href = data.url;
    } catch (err) {
      toast(err.message || "Couldn't start checkout");
      if (btn) { btn.disabled = false; btn.textContent = label; }
    }
  }

  /* Buy now — straight to Stripe with that single piece. */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-buy]");
    if (!btn) return;
    e.preventDefault();
    goToCheckout([btn.dataset.buy], btn);
  });

  /* ============================================================
     ADD TO CART — wired to buttons main.js renders
     ============================================================ */
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    e.preventDefault();

    if (!Store.currentUser()) {
      openAuth("signin");
      return;
    }
    btn.disabled = true;
    try {
      await Store.addToCart(btn.dataset.add);
      toast("Added to cart");
    } catch (err) {
      toast(err.message || "Couldn't add that");
    } finally {
      btn.disabled = false;
    }
  });

  /* ============================================================
     ACCOUNT PAGE
     ============================================================ */
  async function paintAccountPage() {
    const root = document.querySelector("[data-account-page]");
    if (!root) return;

    const user = Store.currentUser();
    const who = document.querySelector("[data-account-email]");

    if (!user) {
      root.innerHTML = `
        <div class="note" style="max-width:52ch">
          <b>Not signed in</b>
          <p>Sign in to keep a cart that follows you between visits and devices.</p>
        </div>
        <button class="btn btn-accent" style="margin-top:22px" data-open-auth>
          Sign in <span class="arrow">→</span></button>`;
      root.querySelector("[data-open-auth]").addEventListener("click", () => openAuth("signin"));
      if (who) who.textContent = "";
      return;
    }

    if (who) who.textContent = user.email;

    const ids = await Store.getCart();
    const cartItems = ids.map(findProduct).filter(Boolean);

    const cartHTML = cartItems.length
      ? `<div class="grid">${cartItems.map(miniCard).join("")}</div>
         <div class="acct-actions">
           <b>${gbp(cartItems.reduce((s, p) => s + p.price, 0))}</b>
           <button class="btn btn-accent" data-page-checkout>Checkout</button>
         </div>`
      : `<p class="dim">Your cart is empty.</p>`;

    root.innerHTML = `
      <section class="acct-block">
        <div class="sec-head"><div>
          <span class="eyebrow">Your cart</span>
          <h2 class="h-sec" style="margin-top:12px">In your cart</h2>
        </div></div>
        ${cartHTML}
      </section>

      <section class="acct-block">
        <div class="sec-head"><div>
          <span class="eyebrow">Receipts</span>
          <h2 class="h-sec" style="margin-top:12px">Your purchases</h2>
        </div></div>
        <p class="dim" style="max-width:56ch">Stripe emails a receipt for every
          order and keeps the full record. Anything you need about a past purchase,
          <a href="contact.html" style="color:var(--accent)">get in touch</a> and
          we'll pull it up.</p>
      </section>`;

    const co = root.querySelector("[data-page-checkout]");
    if (co) co.addEventListener("click", () =>
      goToCheckout(cartItems.map((p) => p.id), co));
  }

  function miniCard(p) {
    return `
      <article class="card">
        <div class="card-media">${p.img
          ? `<img src="${esc(p.img)}" alt="">`
          : `<div class="ph"><b>${esc(p.brand.split(" ")[0])}</b></div>`}</div>
        <div class="card-body">
          <span class="card-brand">${esc(p.brand)}</span>
          <h3 class="card-name">${esc(p.name)}</h3>
          <span class="card-meta">Size ${esc(p.size)} · ${esc(p.cond)}</span>
          <div class="card-foot">
            <span class="price">${gbp(p.price)}</span>
            <button class="enq" data-remove-page="${esc(p.id)}">Remove</button>
          </div>
        </div>
      </article>`;
  }

  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-remove-page]");
    if (!b) return;
    await Store.removeFromCart(b.dataset.removePage);
    toast("Removed from cart");
  });

  /* ============================================================
     TOAST
     ============================================================ */
  let toastTimer;
  function toast(msg) {
    let t = document.querySelector("[data-toast]");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      t.setAttribute("data-toast", "");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function refresh() {
    paintNav();
    paintCart();
    paintAccountPage();
    document.documentElement.dataset.signedIn = Store.currentUser() ? "yes" : "no";
  }

  buildNav();
  buildAuth();
  buildCart();
  Store.onChange(refresh);
  refresh();

  window.ArchiveAccount = { openAuth, openCart, refresh, toast };
})();
