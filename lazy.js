// lazy.js - lazy loading engine.
// 1) scroll reveal  2) section-level data fetch  3) counters  4) link prefetch  5) skeletons

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 1. Scroll reveal ---------- */
export function initReveal(selector = '.reveal') {
  const els = document.querySelectorAll(selector);
  if (reduced || !('IntersectionObserver' in window)) {
    els.forEach(e => e.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  els.forEach(e => io.observe(e));
}

/* ---------- 2. Section data lazy-load ----------
   Section viewport se 250px door aate hi loader() chalega - ek hi baar. */
export function lazySection(el, loader) {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { loader(el); return; }
  let done = false;
  const io = new IntersectionObserver(async (entries) => {
    for (const en of entries) {
      if (!en.isIntersecting || done) continue;
      done = true;
      io.disconnect();
      try { await loader(el); } catch (e) { console.warn('lazySection', e); }
    }
  }, { rootMargin: '250px 0px' });
  io.observe(el);
}

/* ---------- 3. Count-up numbers ---------- */
export function initCounters(selector = '[data-count]') {
  const els = document.querySelectorAll(selector);
  if (!els.length) return;
  const run = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    if (reduced) { el.textContent = target + suffix; return; }
    const dur = 1100, start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target % 1 ? (target * eased).toFixed(1) : Math.round(target * eased);
      el.textContent = val + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((ents) => {
    ents.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.5 });
  els.forEach(e => io.observe(e));
}

/* ---------- 4. Prefetch next page on hover ---------- */
export function initPrefetch() {
  const seen = new Set();
  const add = (href) => {
    if (!href || seen.has(href)) return;
    if (!href.endsWith('.html') && href !== '/') return;
    seen.add(href);
    const l = document.createElement('link');
    l.rel = 'prefetch'; l.href = href; l.as = 'document';
    document.head.appendChild(l);
  };
  document.addEventListener('mouseover', e => {
    const a = e.target.closest('a[href]');
    if (a && a.origin === location.origin) add(a.getAttribute('href'));
  }, { passive: true });
  document.addEventListener('touchstart', e => {
    const a = e.target.closest('a[href]');
    if (a && a.origin === location.origin) add(a.getAttribute('href'));
  }, { passive: true });
}

/* ---------- 5. Skeleton helper ---------- */
export function skeleton(count = 3, height = 220) {
  return Array.from({ length: count }, () =>
    `<div class="skel" style="height:${height}px"></div>`).join('');
}

/* ---------- 6. Blur-up images ---------- */
export function initImages(root = document) {
  root.querySelectorAll('img[data-src]').forEach(img => {
    const io = new IntersectionObserver((ents) => {
      ents.forEach(en => {
        if (!en.isIntersecting) return;
        img.src = img.dataset.src;
        if (img.complete) {
          img.classList.add('img-ready');
        } else {
          img.addEventListener('load', () => img.classList.add('img-ready'), { once: true });
          img.addEventListener('error', () => img.classList.add('img-ready'), { once: true });
        }
        io.disconnect();
      });
    }, { rootMargin: '200px' });
    io.observe(img);
  });
}
