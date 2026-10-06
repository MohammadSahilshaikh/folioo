// shell.js — sab admin pages ka common chrome: auth guard, sidebar, topbar, theme, logout.
import { CONFIG } from './config.js';
import { adminCurrentProfile, adminSignOut } from './supabase-client.js';

const NAV = [
  ['dashboard.html', 'Dashboard', 'grid'],
  ['leads.html',     'Leads',     'inbox'],
  ['projects.html',  'Portfolio', 'case'],
  ['admin-reviews.html',   'Reviews',   'star'],
  ['plans.html',     'Plans',     'tag'],
    ['messages.html',  'Messages',  'mail'],
  ['content.html',   'Content',   'edit'],
  ['settings.html',  'Settings',  'gear'],
];

const ICON = {
  grid:  '<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>',
  inbox: '<path d="M3 12h4.5l1.5 3h6l1.5-3H21" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="3" y="6" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/>',
  case:  '<rect x="3" y="7" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" fill="none" stroke="currentColor" stroke-width="1.7"/>',
  star:  '<path d="M12 2.5 15 9l7 .9-5.2 4.9 1.4 6.9L12 18l-6.2 3.7 1.4-6.9L2 9.9 9 9l3-6.5Z"/>',
  tag:   '<path d="M11.4 3H20a1 1 0 0 1 1 1v8.6a1 1 0 0 1-.3.7l-8 8a1 1 0 0 1-1.4 0l-8.6-8.6a1 1 0 0 1 0-1.4l8-8a1 1 0 0 1 .7-.3Z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="16.5" cy="7.5" r="1.4"/>',
  mail:  '<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.7"/>',
  edit:  '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
  gear:  '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1h-.2a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.1 8.6a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H8.7a1.7 1.7 0 0 0 1-1.6V2.3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V8.7a1.7 1.7 0 0 0 1.6 1h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z" fill="none" stroke="currentColor" stroke-width="1.3"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M16 17 21 12 16 7M21 12H9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  menu:  '<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  sun:   '<circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 3.2V1.6M12 22.4v-1.6M20.8 12h1.6M1.6 12h1.6M18.2 5.8l1.1-1.1M4.7 19.3l1.1-1.1M18.2 18.2l1.1 1.1M4.7 4.7l1.1 1.1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
};
function svg(name, size = 20) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${ICON[name] || ''}</svg>`;
}

export function initTheme() {
  const saved = localStorage.getItem('pf-theme');
  const sys = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.dataset.theme = saved || sys;
}
function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('pf-theme', next);
}

function here() {
  return location.pathname.split('/').pop() || 'dashboard.html';
}

function buildSidebar(profile) {
  const active = here();
  const items = NAV.map(([href, label, ic]) => `
    <a href="${href}" class="adm-nav-item${href === active ? ' is-active' : ''}">
      ${svg(ic, 19)}<span>${label}</span>
    </a>`).join('');

  const aside = document.createElement('aside');
  aside.className = 'adm-sidebar';
  aside.id = 'admSidebar';
  aside.innerHTML = `
    <div class="adm-brand">
      <span class="adm-brand-mark" aria-hidden="true"></span>
      <span>${CONFIG.BRAND} <span class="adm-brand-tag">admin</span></span>
    </div>
    <nav class="adm-nav">${items}</nav>
    <div class="adm-side-foot">
      <div class="adm-user">
        <span class="adm-avatar">${(profile?.full_name || profile?.email || '?').trim()[0].toUpperCase()}</span>
        <div>
          <b>${profile?.full_name || 'Admin'}</b>
          <small>${profile?.email || ''}</small>
        </div>
      </div>
      <button class="adm-logout" id="admLogout" type="button">${svg('logout', 17)} Logout</button>
    </div>`;
  document.body.prepend(aside);

  const overlay = document.createElement('div');
  overlay.className = 'adm-overlay';
  overlay.id = 'admOverlay';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', closeSidebar);
  $id('admLogout').addEventListener('click', async () => {
    await adminSignOut();
    location.href = 'login.html';
  });
}

function closeSidebar() { document.body.classList.remove('adm-sidebar-open'); }
function openSidebar() { document.body.classList.add('adm-sidebar-open'); }
function $id(id) { return document.getElementById(id); }

function buildTopbar(title) {
  const app = document.querySelector('.adm-main') || document.body;
  const bar = document.createElement('header');
  bar.className = 'adm-topbar';
  bar.innerHTML = `
    <button class="adm-icon-btn" id="admBurger" type="button" aria-label="Menu">${svg('menu', 20)}</button>
    <h1 class="adm-page-title">${title || ''}</h1>
    <div style="flex:1"></div>
    <button class="adm-icon-btn" id="admThemeBtn" type="button" aria-label="Theme">${svg('sun', 18)}</button>`;
  app.prepend(bar);

  $id('admBurger').addEventListener('click', openSidebar);
  $id('admThemeBtn').addEventListener('click', toggleTheme);
}

/**
 * guard(pageTitle) — call first thing on every admin page.
 * Checks Supabase session + admin role; redirects to login.html if not authorized.
 * On success builds sidebar/topbar and returns the profile.
 */
export async function guard(pageTitle) {
  initTheme();
  const profile = await adminCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    location.href = 'login.html' + (profile ? '?err=notadmin' : '');
    return null;
  }
  buildSidebar(profile);
  buildTopbar(pageTitle);
  return profile;
}

/* ---------- shared small utils re-exported for admin pages ---------- */
export const $  = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function esc(str = '') {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function toast(message, type = 'info', ms = 3600) {
  let box = $('#adm-toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'adm-toasts';
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = `adm-toast adm-toast--${type}`;
  el.textContent = message;
  box.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, ms);
}

export function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Simple confirm modal — resolves true/false. Reusable across pages. */
export function confirmModal(message, confirmLabel = 'Delete') {
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'adm-modal-back';
    wrap.innerHTML = `<div class="adm-modal">
      <p>${esc(message)}</p>
      <div class="adm-modal-actions">
        <button class="adm-btn" id="mCancel" type="button">Cancel</button>
        <button class="adm-btn adm-btn-danger" id="mOk" type="button">${esc(confirmLabel)}</button>
      </div></div>`;
    document.body.appendChild(wrap);
    const close = (val) => { wrap.remove(); resolve(val); };
    wrap.addEventListener('click', e => { if (e.target === wrap) close(false); });
    wrap.querySelector('#mCancel').addEventListener('click', () => close(false));
    wrap.querySelector('#mOk').addEventListener('click', () => close(true));
  });
}

/** CSV export helper — array of objects → downloadable file. */
export function exportCsv(filename, rows) {
  if (!rows.length) { toast('Export karne ke liye kuch nahi hai', 'err'); return; }
  const cols = Object.keys(rows[0]);
  const esc2 = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => esc2(r[c])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
