(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const assetBase = document.querySelector('script[src*="site.js"]')?.getAttribute("src")?.replace("site.js", "") || "assets/";
  const rootBase = assetBase.includes("../") ? "../" : "./";

  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80);
  }

  async function loadPosts() {
    try {
      const res = await fetch(`${assetBase}posts.json`, { cache: "force-cache" });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  function currentSlug() {
    const parts = location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }

  function initSearch() {
    const list = document.querySelector("[data-post-list]");
    const input = document.querySelector("[data-search]");
    const chips = document.querySelectorAll("[data-filter]");
    const empty = document.querySelector("[data-empty]");
    const count = document.querySelector("[data-count]");
    if (!list || !input) return;

    const items = [...list.querySelectorAll(".post-item")];
    let activeTag = "all";

    function apply() {
      const q = input.value.trim().toLowerCase();
      let visible = 0;
      items.forEach((item) => {
        const text = item.textContent.toLowerCase();
        const tags = (item.dataset.tags || "").toLowerCase().split(/\s+/);
        const matchQ = !q || text.includes(q);
        const matchTag = activeTag === "all" || tags.includes(activeTag.toLowerCase());
        const show = matchQ && matchTag;
        item.hidden = !show;
        if (show) visible += 1;
      });
      if (empty) empty.hidden = visible !== 0;
      if (count) count.textContent = `${visible} article${visible === 1 ? "" : "s"}`;
    }

    input.addEventListener("input", apply);
    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        activeTag = chip.dataset.filter || "all";
        chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
        apply();
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) return;
        if (document.querySelector(".cmdk.is-open")) return;
        e.preventDefault();
        input.focus();
      }
      if (e.key === "Escape" && document.activeElement === input) {
        input.value = "";
        apply();
        input.blur();
      }
    });

    apply();
  }

  function initReveal() {
    if (reduceMotion) return;
    const items = document.querySelectorAll(".post-item, .page-section, .about-intro, .spotlight");
    if (!items.length || !("IntersectionObserver" in window)) return;
    items.forEach((el) => el.classList.add("reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    items.forEach((el) => io.observe(el));
  }

  function wordCount(el) {
    return (el.textContent || "").trim().split(/\s+/).filter(Boolean).length;
  }

  function initHeadingAnchors(content) {
    const headings = [...content.querySelectorAll("h2[id], h3[id], h2:not([id]), h3:not([id])")];
    headings.forEach((h) => {
      if (!h.id) h.id = slugify(h.textContent || "section");
      if (h.querySelector(".heading-anchor")) return;
      const a = document.createElement("a");
      a.className = "heading-anchor";
      a.href = `#${h.id}`;
      a.setAttribute("aria-label", `Link to ${h.textContent}`);
      a.textContent = "#";
      h.appendChild(a);
    });
    return headings;
  }

  function initToc(article, content, headings) {
    const h2s = headings.filter((h) => h.tagName === "H2");
    if (h2s.length < 3) return;

    const wrap = document.createElement("nav");
    wrap.className = "toc";
    wrap.setAttribute("aria-label", "On this page");
    wrap.innerHTML = `<p class="toc__label">On this page</p><ol class="toc__list"></ol>`;
    const list = wrap.querySelector(".toc__list");
    h2s.forEach((h) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `#${h.id}`;
      a.textContent = h.textContent.replace(/\s*#$/, "").trim();
      a.dataset.tocFor = h.id;
      li.appendChild(a);
      list.appendChild(li);
    });

    const meta = article.querySelector(".meta");
    if (meta) meta.after(wrap);
    else content.before(wrap);

    const links = [...wrap.querySelectorAll("a[data-toc-for]")];
    const spy = () => {
      let active = h2s[0]?.id;
      h2s.forEach((h) => {
        if (h.getBoundingClientRect().top <= 120) active = h.id;
      });
      links.forEach((a) => a.classList.toggle("is-active", a.dataset.tocFor === active));
    };
    window.addEventListener("scroll", spy, { passive: true });
    spy();
  }

  function initCodeCopy(content) {
    content.querySelectorAll("pre").forEach((pre) => {
      if (pre.parentElement?.classList.contains("code-block")) return;
      const wrap = document.createElement("div");
      wrap.className = "code-block";
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "code-copy";
      btn.textContent = "Copy";
      wrap.appendChild(btn);
      btn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(pre.textContent || "");
          btn.textContent = "Copied";
          setTimeout(() => (btn.textContent = "Copy"), 1400);
        } catch {
          btn.textContent = "Failed";
          setTimeout(() => (btn.textContent = "Copy"), 1400);
        }
      });
    });
  }

  function initReaderMode(article) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reader-toggle";
    btn.setAttribute("aria-pressed", "false");
    btn.textContent = "Focus";
    btn.title = "Reader focus mode";
    document.body.appendChild(btn);

    btn.addEventListener("click", () => {
      const on = document.documentElement.classList.toggle("reader-mode");
      btn.setAttribute("aria-pressed", String(on));
      btn.textContent = on ? "Exit focus" : "Focus";
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.documentElement.classList.contains("reader-mode")) {
        document.documentElement.classList.remove("reader-mode");
        btn.setAttribute("aria-pressed", "false");
        btn.textContent = "Focus";
      }
    });
  }

  function initCompletionToast(article) {
    let shown = false;
    const toast = document.createElement("div");
    toast.className = "finish-toast";
    toast.hidden = true;
    toast.innerHTML = `
      <p><strong>Nice work.</strong> You finished this article.</p>
      <div class="finish-toast__actions">
        <a href="${rootBase}" data-more>More articles</a>
        <button type="button" data-dismiss>Dismiss</button>
      </div>
    `;
    document.body.appendChild(toast);
    toast.querySelector("[data-dismiss]").addEventListener("click", () => {
      toast.hidden = true;
    });

    window.addEventListener(
      "scroll",
      () => {
        if (shown) return;
        const rect = article.getBoundingClientRect();
        if (rect.bottom < window.innerHeight + 80) {
          shown = true;
          toast.hidden = false;
          requestAnimationFrame(() => toast.classList.add("is-visible"));
        }
      },
      { passive: true }
    );
  }

  async function initRelatedAndSeries(article) {
    const posts = await loadPosts();
    if (!posts.length) return;
    const slug = currentSlug();
    const idx = posts.findIndex((p) => p.slug === slug);
    if (idx < 0) return;
    const current = posts[idx];

    const scored = posts
      .filter((p) => p.slug !== slug)
      .map((p) => {
        const overlap = p.tags.filter((t) => current.tags.includes(t)).length;
        return { p, overlap };
      })
      .sort((a, b) => b.overlap - a.overlap || b.p.date.localeCompare(a.p.date));

    const related = scored.filter((x) => x.overlap > 0).slice(0, 3).map((x) => x.p);
    const fallback = scored.slice(0, 3).map((x) => x.p);
    const picks = related.length ? related : fallback;

    const prev = posts[idx + 1];
    const next = posts[idx - 1];

    const block = document.createElement("section");
    block.className = "related";
    block.innerHTML = `
      <div class="series-nav">
        ${
          prev
            ? `<a class="series-nav__link series-nav__link--prev" href="${rootBase}${prev.slug}/"><span>Older</span><strong>${prev.title}</strong></a>`
            : `<span></span>`
        }
        ${
          next
            ? `<a class="series-nav__link series-nav__link--next" href="${rootBase}${next.slug}/"><span>Newer</span><strong>${next.title}</strong></a>`
            : `<span></span>`
        }
      </div>
      <h2 class="related__title">Keep reading</h2>
      <ul class="related__list">
        ${picks
          .map(
            (p) => `<li>
          <a href="${rootBase}${p.slug}/">
            <span class="related__date">${p.date.slice(0, 7)}</span>
            <span class="related__name">${p.title}</span>
          </a>
        </li>`
          )
          .join("")}
      </ul>
    `;

    const actions = article.querySelector(".article-actions");
    const back = article.querySelector(".back-link");
    if (actions) actions.before(block);
    else if (back) back.before(block);
    else article.appendChild(block);
  }

  function initArticleExtras() {
    const article = document.querySelector("main.article");
    if (!article) return;

    const content = article.querySelector(".content");
    const meta = article.querySelector(".meta");
    if (content && meta && !meta.querySelector(".read-time")) {
      const minutes = Math.max(1, Math.round(wordCount(content) / 220));
      const read = document.createElement("span");
      read.className = "read-time";
      read.textContent = `${minutes} min read`;
      meta.appendChild(document.createTextNode(" · "));
      meta.appendChild(read);
    }

    const bar = document.createElement("div");
    bar.className = "read-progress";
    bar.setAttribute("aria-hidden", "true");
    bar.innerHTML = '<div class="read-progress__bar"></div>';
    document.body.prepend(bar);
    const fill = bar.querySelector(".read-progress__bar");

    const onScroll = () => {
      const rect = article.getBoundingClientRect();
      const total = article.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      const pct = total > 0 ? (scrolled / total) * 100 : 0;
      fill.style.width = `${pct}%`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (content) {
      const headings = initHeadingAnchors(content);
      initToc(article, content, headings);
      initCodeCopy(content);
    }

    initReaderMode(article);
    initCompletionToast(article);
    initRelatedAndSeries(article);

    if (!article.querySelector(".article-actions")) {
      const actions = document.createElement("div");
      actions.className = "article-actions";
      actions.innerHTML = `
        <button type="button" class="action-btn" data-copy-link>Copy link</button>
        <a class="action-btn" data-share-li href="#" rel="noopener">Share on LinkedIn</a>
        <button type="button" class="action-btn action-btn--ghost" data-top hidden>Back to top</button>
      `;
      const back = article.querySelector(".back-link");
      if (back) article.insertBefore(actions, back);
      else article.appendChild(actions);

      const copyBtn = actions.querySelector("[data-copy-link]");
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          copyBtn.textContent = "Copied";
          setTimeout(() => (copyBtn.textContent = "Copy link"), 1600);
        } catch {
          copyBtn.textContent = "Copy failed";
          setTimeout(() => (copyBtn.textContent = "Copy link"), 1600);
        }
      });

      const share = actions.querySelector("[data-share-li]");
      share.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;

      const topBtn = actions.querySelector("[data-top]");
      window.addEventListener(
        "scroll",
        () => {
          topBtn.hidden = window.scrollY < 500;
        },
        { passive: true }
      );
      topBtn.addEventListener("click", () =>
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })
      );
    }
  }

  function initCommandPalette(posts) {
    const pages = [
      { type: "page", title: "Home / Articles", href: rootBase, hint: "Browse writing" },
      { type: "page", title: "About", href: `${rootBase}about-us/`, hint: "Vibhor Sharma" },
      { type: "page", title: "Contact", href: `${rootBase}contact-us/`, hint: "Get in touch" },
      { type: "page", title: "RSS Feed", href: `${rootBase}feed.xml`, hint: "Subscribe" },
      ...posts.map((p) => ({
        type: "article",
        title: p.title,
        href: `${rootBase}${p.slug}/`,
        hint: p.tags.slice(0, 2).join(" · "),
      })),
    ];

    const overlay = document.createElement("div");
    overlay.className = "cmdk";
    overlay.innerHTML = `
      <div class="cmdk__panel" role="dialog" aria-modal="true" aria-label="Command palette">
        <div class="cmdk__search">
          <input type="search" placeholder="Jump to an article or page…" data-cmdk-input autocomplete="off" />
          <kbd>esc</kbd>
        </div>
        <ul class="cmdk__list" data-cmdk-list></ul>
        <p class="cmdk__hint">Navigate with ↑ ↓ · Enter to open · Esc to close</p>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector("[data-cmdk-input]");
    const list = overlay.querySelector("[data-cmdk-list]");
    let active = 0;
    let filtered = pages;

    function render() {
      const q = input.value.trim().toLowerCase();
      filtered = pages.filter(
        (p) => !q || p.title.toLowerCase().includes(q) || (p.hint || "").toLowerCase().includes(q)
      );
      active = 0;
      list.innerHTML = filtered.length
        ? filtered
            .map(
              (p, i) => `<li>
            <button type="button" class="cmdk__item${i === 0 ? " is-active" : ""}" data-href="${p.href}">
              <span class="cmdk__type">${p.type}</span>
              <span class="cmdk__title">${p.title}</span>
              <span class="cmdk__meta">${p.hint || ""}</span>
            </button>
          </li>`
            )
            .join("")
        : `<li class="cmdk__empty">No matches</li>`;
    }

    function open() {
      overlay.classList.add("is-open");
      input.value = "";
      render();
      input.focus();
      document.documentElement.classList.add("cmdk-open");
    }

    function close() {
      overlay.classList.remove("is-open");
      document.documentElement.classList.remove("cmdk-open");
    }

    function go(href) {
      close();
      location.href = href;
    }

    function setActive(i) {
      const items = [...list.querySelectorAll(".cmdk__item")];
      if (!items.length) return;
      active = (i + items.length) % items.length;
      items.forEach((el, idx) => el.classList.toggle("is-active", idx === active));
      items[active].scrollIntoView({ block: "nearest" });
    }

    list.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-href]");
      if (btn) go(btn.dataset.href);
    });

    input.addEventListener("input", render);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        overlay.classList.contains("is-open") ? close() : open();
        return;
      }
      if (!overlay.classList.contains("is-open")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive(active + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive(active - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const items = [...list.querySelectorAll(".cmdk__item")];
        if (items[active]) go(items[active].dataset.href);
      }
    });

    // Header trigger
    document.querySelectorAll("[data-cmdk-open]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        open();
      });
    });
  }

  function initNavEnhance() {
    document.querySelectorAll(".site-nav").forEach((nav) => {
      if (nav.querySelector("[data-cmdk-open]")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nav-cmdk";
      btn.setAttribute("data-cmdk-open", "");
      btn.innerHTML = `Search <kbd>⌘K</kbd>`;
      nav.appendChild(btn);
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    initSearch();
    initReveal();
    initArticleExtras();
    initNavEnhance();
    const posts = await loadPosts();
    initCommandPalette(posts);
  });
})();
