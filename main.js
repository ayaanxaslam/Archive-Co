/* ============================================================
   ARCHIVE & CO — site behaviour
   ============================================================ */
(function () {
  "use strict";

  /* Tells the inline <head> failsafe that this file made it. Without this the
     page un-hides itself on load rather than sitting blank. Keep it first. */
  document.documentElement.dataset.revealReady = "1";

  /* ---- global switch -------------------------------------
     THE ONE PLACE ORDERING IS TURNED ON OR OFF.

     false -> every buy control is locked, the navbar pill reads
              "Orders Closed", and all closed-for-now copy shows.
     true  -> buy controls go live and the open-for-business copy
              replaces it, right across the site.

     Everything marked data-when="closed" / data-when="open" in
     the HTML is switched by this single value. Nothing else to
     change, and nothing can end up saying two different things.
     -------------------------------------------------------- */
  const ORDERING_OPEN = true;

  /* apply it before anything paints */
  (function applyOrderingState() {
    const state = ORDERING_OPEN ? "open" : "closed";
    document.documentElement.dataset.ordering = state;
    document.querySelectorAll("[data-when]").forEach((el) => {
      el.hidden = el.dataset.when !== state;
    });
  })();

  /* ---------- mobile nav ---------- */
  const burger = document.querySelector(".burger");
  const links = document.querySelector(".nav-links");
  if (burger && links) {
    burger.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
    });
    links.addEventListener("click", (e) => {
      if (e.target.tagName === "A") {
        links.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- mark current nav item ----------
     Normalised both sides so this holds up however the host serves the
     pages: "/clothing.html", "/clothing" (Vercel clean URLs) and "/" all
     resolve to the same key.                                            */
  const pageKey = (path) => {
    const last = path.split("/").pop().split("#")[0].split("?")[0].toLowerCase();
    return (last.replace(/\.html$/, "") || "index");
  };
  const here = pageKey(location.pathname);
  document.querySelectorAll(".nav-links a[href]").forEach((a) => {
    if (pageKey(a.getAttribute("href")) === here) a.setAttribute("aria-current", "page");
  });

  /* ---------- scroll reveal ----------
     A plain rAF-throttled sweep rather than IntersectionObserver: anchor jumps
     and fast scrolls can leave an observed element permanently un-revealed if
     it never actually intersects the viewport. This can't miss one.          */
  let ticking = false;
  function sweep() {
    ticking = false;
    const limit = window.innerHeight * 0.94;
    document.querySelectorAll(".rv:not(.in)").forEach((el) => {
      if (el.getBoundingClientRect().top < limit) el.classList.add("in");
    });
  }
  function queueSweep() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(sweep);
    }
  }
  document.querySelectorAll(".rv").forEach((el, i) => {
    el.style.transitionDelay = Math.min(i % 6, 5) * 60 + "ms";
  });
  window.addEventListener("scroll", queueSweep, { passive: true });
  window.addEventListener("resize", queueSweep);
  queueSweep();

  /* ---------- accordion ---------- */
  document.querySelectorAll(".acc-q").forEach((q) => {
    q.addEventListener("click", () => {
      const item = q.closest(".acc-item");
      const panel = item.querySelector(".acc-a");
      const open = item.classList.toggle("open");
      q.setAttribute("aria-expanded", String(open));
      panel.style.maxHeight = open ? panel.scrollHeight + "px" : 0;
    });
  });
  window.addEventListener("resize", () => {
    document.querySelectorAll(".acc-item.open .acc-a").forEach((p) => {
      p.style.maxHeight = p.scrollHeight + "px";
    });
  });

  /* linking straight to a policy item (e.g. returns.html#shipping) opens it */
  function openFromHash() {
    const id = (location.hash || "").replace("#", "");
    if (!id) return;
    const item = document.getElementById(id);
    if (item && item.classList.contains("acc-item") && !item.classList.contains("open")) {
      item.querySelector(".acc-q").click();
      setTimeout(() => item.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    }
  }
  openFromHash();
  window.addEventListener("hashchange", openFromHash);

  /* ---------- money ---------- */
  const gbp = (n) =>
    "£" + n.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  /* ---------- product card ---------- */
  function cardHTML(p) {
    const sold = p.status === "sold";
    const reserved = p.status === "reserved";

    const tags = [];
    if (p.grail) tags.push('<span class="tag grail">Archive Grail</span>');
    if (sold) tags.push('<span class="tag sold">Sold</span>');
    else if (reserved) tags.push('<span class="tag">Reserved</span>');
    if (p.era && p.era !== "—") tags.push(`<span class="tag">${p.era}</span>`);

    const media = p.img
      ? `<img src="${p.img}" alt="${p.brand} ${p.name}" loading="lazy">`
      : `<div class="ph"><b>${p.brand.split(" ")[0]}</b><i>${
          CATEGORY_META[p.cat] ? CATEGORY_META[p.cat].label : p.cat
        }</i></div>`;

    let action;
    if (sold) action = '<button class="enq" disabled>Archived</button>';
    else if (!ORDERING_OPEN) action = '<button class="enq" disabled>Orders Closed</button>';
    else action = '<a class="enq" href="contact.html" style="cursor:pointer">Enquire</a>';

    return `
      <article class="card rv" data-cat="${p.cat}" data-status="${p.status}">
        <div class="card-media">
          <div class="tags">${tags.join("")}</div>
          ${media}
        </div>
        <div class="card-body">
          <span class="card-brand">${p.brand}</span>
          <h3 class="card-name">${p.name}</h3>
          <span class="card-meta">Size ${p.size} · ${p.cond}</span>
          <div class="card-foot">
            <span class="price">${p.was ? `<s>${gbp(p.was)}</s>` : ""}${gbp(p.price)}</span>
            ${action}
          </div>
        </div>
      </article>`;
  }

  /* ---------- render a grid ---------- */
  function render(gridEl, list) {
    if (!list.length) {
      gridEl.innerHTML =
        '<div class="empty"><p>Nothing in this category right now — new drops land weekly.</p></div>';
      return;
    }
    gridEl.innerHTML = list.map(cardHTML).join("");
    gridEl.querySelectorAll(".rv").forEach((el, i) => {
      el.style.transitionDelay = Math.min(i, 8) * 45 + "ms";
    });
    queueSweep();
  }

  /* ---------- home page: featured strip ---------- */
  const feat = document.querySelector("[data-featured]");
  if (feat && typeof PRODUCTS !== "undefined") {
    const n = parseInt(feat.dataset.featured, 10) || 8;
    const picks = PRODUCTS.filter((p) => p.status !== "sold")
      .sort((a, b) => (b.grail === true) - (a.grail === true) || b.price - a.price)
      .slice(0, n);
    render(feat, picks);
  }

  /* ---------- clothing page: filterable grid ---------- */
  const shop = document.querySelector("[data-shop]");
  if (shop && typeof PRODUCTS !== "undefined") {
    const chips = document.querySelectorAll(".chip[data-filter]");
    const count = document.querySelector(".filter-count");
    const blurb = document.querySelector("[data-cat-blurb]");

    const apply = (cat) => {
      const list = cat === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.cat === cat);
      render(shop, list);
      if (count) {
        const live = list.filter((p) => p.status !== "sold").length;
        count.textContent = `${list.length} pieces · ${live} available`;
      }
      if (blurb && CATEGORY_META[cat]) blurb.textContent = CATEGORY_META[cat].blurb;
      chips.forEach((c) => c.classList.toggle("active", c.dataset.filter === cat));
      history.replaceState(null, "", cat === "all" ? location.pathname : "#" + cat);
    };

    chips.forEach((c) => c.addEventListener("click", () => apply(c.dataset.filter)));

    const initial = (location.hash || "").replace("#", "");
    apply(CATEGORY_META[initial] ? initial : "all");

    window.addEventListener("hashchange", () => {
      const h = (location.hash || "").replace("#", "");
      if (CATEGORY_META[h]) apply(h);
    });
  }

  /* ---------- contact form ----------
     There's no server behind this site, so the form composes the message and
     hands it to the visitor's mail app addressed to CONTACT_EMAIL. Nothing is
     sent silently — they see and press send themselves.
     To move to a hosted form service later, point the <form> at its endpoint
     and delete this block.                                                   */
  const CONTACT_EMAIL = "ayaanxaslam@gmail.com";

  const form = document.querySelector("[data-form]");
  if (form) {
    const out = form.querySelector("[data-form-msg]");
    const val = (n) => (form.elements[n] ? String(form.elements[n].value).trim() : "");

    const say = (title, html, isError) => {
      if (!out) return;
      out.hidden = false;
      out.classList.toggle("is-error", !!isError);
      out.innerHTML = "<b>" + title + "</b>" + html;
      out.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = val("name");
      const email = val("email");
      const msg = val("msg");
      const topic = val("topic");
      const piece = val("piece");

      const missing = [];
      if (!name) missing.push("your name");
      if (!email) missing.push("your email");
      if (!msg) missing.push("a message");

      if (missing.length) {
        say(
          "Almost there",
          "<p>Just add " + missing.join(", ").replace(/, ([^,]*)$/, " and $1") + ".</p>",
          true
        );
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        say("Check your email", "<p>That address doesn't look quite right — we can't reply without it.</p>", true);
        return;
      }

      const subject = "Archive & Co — " + topic + (piece ? " — " + piece : "");
      const body =
        "From: " + name + "\n" +
        "Email: " + email + "\n" +
        "About: " + topic + "\n" +
        (piece ? "Piece: " + piece + "\n" : "") +
        "\n" + msg + "\n";

      const href =
        "mailto:" + CONTACT_EMAIL +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);

      const link = document.createElement("a");
      link.href = href;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();

      say(
        "Opening your mail app",
        "<p>Your message is drafted and addressed to <strong>" + CONTACT_EMAIL +
          "</strong> — press send in your mail app to fire it off.</p>" +
          "<p style=\"margin-top:10px\">Nothing opened? Email us directly at " +
          "<a href=\"mailto:" + CONTACT_EMAIL + "\" style=\"color:var(--accent)\">" +
          CONTACT_EMAIL + "</a>.</p>",
        false
      );
    });
  }

  /* ---------- year ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();
