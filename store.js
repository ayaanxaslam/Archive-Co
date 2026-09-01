/* ============================================================
   ARCHIVE & CO — accounts and cart
   ------------------------------------------------------------
   One interface, two backends.

   * LocalBackend    — browser only. Runs with zero setup so the
                       flow can be reviewed. NOT SECURE. See the
                       warning below.
   * SupabaseBackend — real accounts, real server. Switches on
                       the moment you fill in SUPABASE_CONFIG.

   To go live: paste your project URL and anon key below. Nothing
   else changes — every screen already talks to this interface.
   ============================================================ */

/* ------------------------------------------------------------
   PASTE SUPABASE CREDENTIALS HERE
   Supabase dashboard -> Project Settings -> API
   The anon key is safe to ship publicly; it only works together
   with the row-level-security policies (SQL is in README.md).
   Leave blank and the site falls back to the local demo.
   ------------------------------------------------------------ */
const SUPABASE_CONFIG = {
  url: "https://itzbwwlfqmpoprefxbrp.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0emJ3d2xmcW1wb3ByZWZ4YnJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzM2OTksImV4cCI6MjEwMzc0OTY5OX0.05oDRQw_7Nns-Jy0h5203GzDjV1VtybuMW-hWKoSQwg"
};

const Store = (function () {
  "use strict";

  const LIVE = Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);

  /* ---------- tiny helpers ---------- */
  const read = (k, fallback) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? fallback; }
    catch (e) { return fallback; }
  };
  const write = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { return false; }
  };

  const listeners = [];
  const emit = () => listeners.forEach((fn) => { try { fn(); } catch (e) {} });

  const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

  class StoreError extends Error {}
  const fail = (msg) => { throw new StoreError(msg); };

  /* ============================================================
     LOCAL BACKEND — review only
     ------------------------------------------------------------
     Accounts live in this browser's localStorage. Anyone who opens
     devtools can read and edit them. Passwords are salted and
     hashed so they are not sitting in plain text, but that is a
     courtesy, not protection: there is no server, so nothing here
     can actually be enforced.

     DO NOT TAKE REAL CUSTOMER PASSWORDS ON THIS BACKEND.
     ============================================================ */
  const LocalBackend = {
    live: false,

    async hash(password, salt) {
      if (!(window.crypto && window.crypto.subtle)) {
        fail("This browser can't hash passwords here. Use https:// or localhost.");
      }
      const data = new TextEncoder().encode(salt + "::" + password);
      const buf = await crypto.subtle.digest("SHA-256", data);
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    },

    users() { return read("ac_users", {}); },

    async signUp(email, password) {
      email = email.trim().toLowerCase();
      const users = this.users();
      if (users[email]) fail("An account already exists for that email. Try signing in.");
      const salt = crypto.getRandomValues(new Uint8Array(16)).join("");
      users[email] = {
        id: "u_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        email,
        salt,
        hash: await this.hash(password, salt),
        createdAt: new Date().toISOString(),
        acceptedTermsAt: new Date().toISOString()
      };
      if (!write("ac_users", users)) fail("Couldn't save the account — browser storage is unavailable.");
      return this.startSession(users[email]);
    },

    async signIn(email, password) {
      email = email.trim().toLowerCase();
      const user = this.users()[email];
      const generic = "That email and password don't match an account.";
      if (!user) fail(generic);
      if ((await this.hash(password, user.salt)) !== user.hash) fail(generic);
      return this.startSession(user);
    },

    startSession(user) {
      write("ac_session", { userId: user.id, email: user.email });
      emit();
      return { id: user.id, email: user.email };
    },

    async signOut() { localStorage.removeItem("ac_session"); emit(); },

    currentUser() {
      const s = read("ac_session", null);
      return s && s.userId ? { id: s.userId, email: s.email } : null;
    },

    async getCart() {
      const u = this.currentUser();
      return u ? read("ac_cart_" + u.id, []) : [];
    },
    async setCart(ids) {
      const u = this.currentUser();
      if (!u) fail("Sign in to use a cart.");
      write("ac_cart_" + u.id, ids);
      emit();
    },
  };

  /* ============================================================
     SUPABASE BACKEND — real accounts
     Talks to the REST endpoints directly, so there is no SDK to
     load and the site keeps its zero-dependency build.
     ============================================================ */
  const SupabaseBackend = {
    live: true,
    base: SUPABASE_CONFIG.url.replace(/\/+$/, ""),
    key: SUPABASE_CONFIG.anonKey,

    session() { return read("ac_sb_session", null); },
    saveSession(s) { write("ac_sb_session", s); emit(); },

    headers(auth) {
      const h = { "Content-Type": "application/json", apikey: this.key };
      const s = this.session();
      h.Authorization = "Bearer " + (auth && s ? s.access_token : this.key);
      return h;
    },

    async call(path, opts = {}) {
      const res = await fetch(this.base + path, opts);
      const text = await res.text();
      let body = null;
      try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
      if (!res.ok) {
        const msg = (body && (body.error_description || body.msg || body.message || body.error)) ||
                    "Request failed (" + res.status + ")";
        fail(msg);
      }
      return body;
    },

    async signUp(email, password) {
      const body = await this.call("/auth/v1/signup", {
        method: "POST",
        headers: this.headers(false),
        body: JSON.stringify({ email, password })
      });
      /* Projects with email confirmation on return no session yet. */
      if (body && body.access_token) {
        this.saveSession(body);
        return { id: body.user.id, email: body.user.email };
      }
      return { pendingConfirmation: true, email };
    },

    async signIn(email, password) {
      const body = await this.call("/auth/v1/token?grant_type=password", {
        method: "POST",
        headers: this.headers(false),
        body: JSON.stringify({ email, password })
      });
      this.saveSession(body);
      return { id: body.user.id, email: body.user.email };
    },

    async signOut() {
      try {
        await this.call("/auth/v1/logout", { method: "POST", headers: this.headers(true) });
      } catch (e) { /* token already dead — clearing locally is enough */ }
      localStorage.removeItem("ac_sb_session");
      emit();
    },

    currentUser() {
      const s = this.session();
      return s && s.user ? { id: s.user.id, email: s.user.email } : null;
    },

    async getCart() {
      if (!this.currentUser()) return [];
      const rows = await this.call("/rest/v1/carts?select=product_id", { headers: this.headers(true) });
      return (rows || []).map((r) => r.product_id);
    },

    async setCart(ids) {
      const u = this.currentUser();
      if (!u) fail("Sign in to use a cart.");
      await this.call("/rest/v1/carts?user_id=eq." + u.id, {
        method: "DELETE", headers: this.headers(true)
      });
      if (ids.length) {
        await this.call("/rest/v1/carts", {
          method: "POST",
          headers: this.headers(true),
          body: JSON.stringify(ids.map((id) => ({ user_id: u.id, product_id: id })))
        });
      }
      emit();
    },

  };

  const backend = LIVE ? SupabaseBackend : LocalBackend;

  /* ============================================================
     PUBLIC INTERFACE — the only thing the rest of the site uses
     ============================================================ */
  return {
    StoreError,
    isLive: LIVE,
    onChange(fn) { listeners.push(fn); },
    currentUser() { return backend.currentUser(); },

    async signUp(email, password, acceptedTerms) {
      if (!validEmail(email)) fail("That email address doesn't look right.");
      if (!password || password.length < 8) fail("Password needs to be at least 8 characters.");
      if (!acceptedTerms) fail("Please accept the Terms & Conditions to continue.");
      return backend.signUp(email.trim().toLowerCase(), password);
    },

    async signIn(email, password, acceptedTerms) {
      if (!validEmail(email)) fail("That email address doesn't look right.");
      if (!password) fail("Enter your password.");
      if (!acceptedTerms) fail("Please accept the Terms & Conditions to continue.");
      return backend.signIn(email.trim().toLowerCase(), password);
    },

    signOut() { return backend.signOut(); },
    getCart() { return backend.getCart(); },

    async addToCart(productId) {
      const cart = await backend.getCart();
      if (cart.includes(productId)) return cart;          // one of one — never twice
      const next = cart.concat(productId);
      await backend.setCart(next);
      return next;
    },

    async removeFromCart(productId) {
      const next = (await backend.getCart()).filter((id) => id !== productId);
      await backend.setCart(next);
      return next;
    },

    async clearCart() { await backend.setCart([]); },

    /* Called once Stripe sends the customer back paid. Sales themselves are
       recorded by Stripe — we only tidy up the cart here. */
    async clearPurchased(ids) {
      const remaining = (await backend.getCart()).filter((id) => !ids.includes(id));
      await backend.setCart(remaining);
    }
  };
})();
