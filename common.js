// common.js - shared chrome.
// Mobile: neeche fixed tab bar (thumb ke paas, hamesha dikhta hai). Desktop/tablet: simple top nav.
// Koi hamburger nahi, koi custom cursor nahi - jitna simple ho sake.
import { CONFIG, waLink } from './config.js';
import { getSettings } from './supabase-client.js';
import { initReveal, initCounters, initPrefetch, initImages } from './lazy.js';

/* ================= Utils ================= */
export const $  = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/** XSS guard - user ka data kabhi raw innerHTML me na jaye. */
export function esc(str = '') {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const isEmail = v => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(v).trim());
export const isPhone = v => /^[0-9]{10}$/.test(String(v).replace(/\D/g, '').slice(-10));

export function debounce(fn, ms = 300) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export async function copy(text, msg = 'Copied successfully') {
  try { await navigator.clipboard.writeText(text); toast(msg, 'ok'); }
  catch { toast('Copy failed', 'err'); }
}

/* ================= Toast ================= */
export function toast(message, type = 'info', ms = 3600) {
  let box = $('#pf-toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'pf-toasts';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = `pf-toast pf-toast--${type}`;
  el.textContent = message;
  box.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, ms);
}

/* ================= Theme ================= */
export function initTheme() {
  document.documentElement.dataset.theme = 'light';
  localStorage.setItem('pf-theme', 'light');
}
function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('pf-theme', next);
}

const SUN = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
  stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/>
  <path d="M12 3.2V1.6M12 22.4v-1.6M20.8 12h1.6M1.6 12h1.6M18.2 5.8l1.1-1.1M4.7 19.3l1.1-1.1M18.2 18.2l1.1 1.1M4.7 4.7l1.1 1.1"/></svg>`;

/* ================= Icons ================= */
const ICON = {
  home:  '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z"/>',
  work:  '<rect x="3" y="4" width="8" height="7" rx="1.6"/><rect x="13" y="4" width="8" height="7" rx="1.6"/><rect x="3" y="13" width="8" height="7" rx="1.6"/><rect x="13" y="13" width="8" height="7" rx="1.6"/>',
    track: '<path d="M21 21l-4.35-4.35m-5.65 1.35a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',

  price: '<path d="M11.4 3H20a1 1 0 0 1 1 1v8.6a1 1 0 0 1-.3.7l-8 8a1 1 0 0 1-1.4 0l-8.6-8.6a1 1 0 0 1 0-1.4l8-8a1 1 0 0 1 .7-.3Z"/><circle cx="16.4" cy="7.6" r="1.5" fill="#0A0A0F"/>',
  start: '<path d="M12 4.5v15M4.5 12h15" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/>',
  whatsapp: '<path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.3 4.8 4.93-1.3A9.9 9.9 0 1 0 12.04 2Zm5.77 14.1c-.24.68-1.4 1.3-1.94 1.35-.5.05-1.13.07-1.82-.11a16.5 16.5 0 0 1-6.6-5.05c-.5-.68-1.16-1.8-1.16-3s.63-1.8.86-2.05a.9.9 0 0 1 .65-.3h.47c.15 0 .35-.06.55.42l.75 1.83c.06.13.1.28 0 .45l-.3.46-.44.48c-.14.14-.29.3-.12.58.16.28.73 1.2 1.56 1.95 1.08.96 1.98 1.26 2.26 1.4.28.15.45.12.61-.07l.88-1.02c.2-.24.37-.18.62-.09l1.76.83c.25.12.42.18.48.28.06.1.06.6-.18 1.28Z"/>',
  instagram: '<path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23.06 1.25.07 1.63.07 4.8s0 3.55-.07 4.8c-.05 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.25.06-1.63.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.42a3.8 3.8 0 0 1-1.38-.9 3.8 3.8 0 0 1-.9-1.38c-.17-.42-.37-1.06-.42-2.23C2.2 15.55 2.2 15.17 2.2 12s0-3.55.07-4.8c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.45 2.2 8.83 2.2 12 2.2Zm0 5.1a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Zm0 7.75a3.05 3.05 0 1 1 0-6.1 3.05 3.05 0 0 1 0 6.1Zm5.99-7.94a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0Z"/>',
  facebook: '<path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.25-1.5 1.55-1.5h1.65V4.63c-.29-.04-1.27-.13-2.41-.13-2.39 0-4.03 1.46-4.03 4.14v2.26H7.5V14h2.76v8h3.24Z"/>',
  github: '<path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/>',
  linkedin: '<path d="M6.94 8.5H3.56V21h3.38V8.5ZM5.25 3a1.96 1.96 0 1 0 0 3.92 1.96 1.96 0 0 0 0-3.92ZM20.44 21h-3.37v-6.1c0-1.45-.03-3.32-2.02-3.32-2.03 0-2.34 1.58-2.34 3.21V21H9.34V8.5h3.24v1.71h.05a3.55 3.55 0 0 1 3.2-1.76c3.42 0 4.05 2.25 4.05 5.18V21Z"/>',
};
export function icon(name, size = 20) {
  if (!ICON[name]) return '';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${ICON[name]}</svg>`;
}

/* ================= Nav model - sirf 4 core pages ================= */
const PAGES = [
    { href: 'index.html',   label: 'Home',    icon: 'home'     },
    { href: 'work.html',    label: 'Work',    icon: 'work'     },
    { href: 'track.html', label: 'Track', icon: 'track' },
    { href: 'contact.html', label: 'Contact', icon: 'whatsapp' }
  ];

function currentPage() {
  const f = location.pathname.split('/').pop();
  return !f ? 'index.html' : f;
}

/* ================= Top bar (tablet + desktop) ================= */
function buildTopBar() {
  const here = currentPage();
  const links = PAGES.map(p =>
    `<a href="${p.href}" class="nav-link${p.href === here ? ' is-active' : ''}">${p.label}</a>`
  ).join('');

  const header = document.createElement('header');
  header.className = 'pf-nav';
  header.innerHTML = `
    <div class="nav-inner">
      <a class="brand" href="index.html" aria-label="${CONFIG.BRAND} home">
        <span class="brand-mark" aria-hidden="true"></span>
        <span class="brand-text">${CONFIG.BRAND}</span>
      </a>
      <nav class="nav-links" aria-label="Main">${links}</nav>
      <div class="nav-actions">
        <a class="btn btn-primary btn-sm" href="order.html">Start your site</a>
      </div>
    </div>`;
  document.body.prepend(header);

  addEventListener('scroll', () => {
    header.classList.toggle('scrolled', scrollY > 20);
  }, { passive: true });
}

/* ================= Mobile: mini header + bottom tab bar ================= */
function buildMobileHeader() {
  const h = document.createElement('div');
  h.className = 'pf-mhead';
  h.innerHTML = `
    <a class="brand" href="index.html">
      <span class="brand-mark" aria-hidden="true"></span>
      <span class="brand-text">${CONFIG.BRAND}</span>
    </a>`;
  document.body.prepend(h);
}

function buildTabBar() {
  const here = currentPage();
  const startActive = ['order.html', 'track.html', 'thank-you.html'].includes(here);

  const tab = (p) => {
    const on = p.href === here;
    return `<a href="${p.href}" class="tab${on ? ' is-active' : ''}" ${on ? 'aria-current="page"' : ''}>
      ${icon(p.icon, 21)}<span>${p.label}</span></a>`;
  };

  const bar = document.createElement('nav');
  bar.className = 'pf-tabs';
  bar.setAttribute('aria-label', 'Main');
  bar.innerHTML =
    tab(PAGES[0]) +
    tab(PAGES[1]) +
    `<a href="order.html" class="tab tab-start${startActive ? ' is-active' : ''}" aria-label="Start your site">
       <span class="tab-fab">${icon('start', 22)}</span><span>Start</span></a>` +
    tab(PAGES[2]) +
    tab(PAGES[3]);

  document.body.appendChild(bar);
  document.body.classList.add('has-tabs');
}

/* ================= Footer ================= */
function buildFooter(socials) {
  if (currentPage() !== 'index.html') return;
  const s = { ...CONFIG.SOCIALS, ...(socials || {}) };
  const socialHtml = [['whatsapp', waLink()], ...Object.entries(s)]
    .filter(([k, v]) => v && ICON[k])
    .map(([k, v]) =>
      `<a class="soc" href="${esc(v)}" target="_blank" rel="noopener" aria-label="${k}">${icon(k, 18)}</a>`)
    .join('');

  const f = document.createElement('footer');
  f.className = 'pf-footer';
  f.innerHTML = `
    <div class="foot-inner">
      <div class="foot-brand">
        <a class="brand" href="index.html">
          <span class="brand-mark" aria-hidden="true"></span>
          <span class="brand-text">${CONFIG.BRAND}</span></a>
        <p class="foot-line">Portfolio and business websites. See the demo first, pay later.</p>
        <div class="socials">${socialHtml}</div>
      </div>
      <div class="foot-cols">
        <div>
          <h3 class="foot-h">Reach us</h3>
          <a href="${waLink()}" target="_blank" rel="noopener">WhatsApp</a>
          <a href="mailto:${CONFIG.EMAIL}">${CONFIG.EMAIL}</a>
          <span class="foot-muted">${CONFIG.HOURS}</span>
        </div>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© ${new Date().getFullYear()} ${CONFIG.BRAND}</span>
      <span><a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a></span>
    </div>`;
  document.body.appendChild(f);
}

/* ================= Desktop WhatsApp bubble ================= */
function buildWhatsApp(msg) {
  const a = document.createElement('a');
  a.className = 'wa-float';
  a.href = waLink(msg);
  a.target = '_blank'; a.rel = 'noopener';
  a.setAttribute('aria-label', 'Chat on WhatsApp');
  a.innerHTML = icon('whatsapp', 25) + '<span class="wa-tip">Chat on WhatsApp</span>';
  document.body.appendChild(a);
}

/* ================= Offline banner ================= */
function initOffline() {
  const show = () => {
    if (navigator.onLine) { $('#pf-offline')?.remove(); return; }
    if ($('#pf-offline')) return;
    const d = document.createElement('div');
    d.id = 'pf-offline';
    d.textContent = 'No internet connection.';
    document.body.appendChild(d);
  };
  addEventListener('online', show);
  addEventListener('offline', show);
  show();
}

/* ================= Boot ================= */
export async function boot({ waMessage, chrome = true } = {}) {
  initTheme();

  if (chrome) {
    const mq = matchMedia('(max-width: 767px)');
    if (mq.matches) { buildMobileHeader(); buildTabBar(); }
    else { buildTopBar(); buildWhatsApp(waMessage); }

    // phone ko landscape/rotate karne pe layout switch
    mq.addEventListener?.('change', () => location.reload());

    getSettings().then(s => {
      if (s.business && s.business.whatsapp) {
        const floatBtn = $('.wa-float');
        if (floatBtn) floatBtn.href = 'https://wa.me/' + s.business.whatsapp + '?text=' + encodeURIComponent(waMessage);
      }
      buildFooter(s.socials);
    }).catch(() => buildFooter(null));
  }

  initOffline();
  initPrefetch();
  initImages();
  initReveal();
  initCounters();
}
