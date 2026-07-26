(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
      if (e.key === "/" && document.activeElement !== input && !e.metaKey && !e.ctrlKey) {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
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
    const items = document.querySelectorAll(".post-item, .page-section, .about-intro");
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

  function initArticleExtras() {
    const article = document.querySelector("main.article");
    if (!article) return;

    const content = article.querySelector(".content");
    const meta = article.querySelector(".meta");
    if (content && meta) {
      const minutes = Math.max(1, Math.round(wordCount(content) / 220));
      const read = document.createElement("span");
      read.className = "read-time";
      read.textContent = `${minutes} min read`;
      meta.appendChild(document.createTextNode(" · "));
      meta.appendChild(read);
    }

    // Progress bar
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

    // Action row: copy link + LinkedIn share
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
    topBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));
  }

  document.addEventListener("DOMContentLoaded", () => {
    initSearch();
    initReveal();
    initArticleExtras();
  });
})();
