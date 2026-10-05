// content.js — homepage FAQ + "why us" cards (site_content table) + social links (settings table).
import { guard, $, $$, esc, toast } from './shell.js';
import { adminGetAllContent, adminSetContent, adminGetAllSettings, adminSetSetting } from './supabase-client.js';

const profile = await guard('Content & Settings');
if (!profile) throw new Error('unauthorized');

/* ============================================================
   Defaults — same as the public index.js fallback, so the
   editor always shows something even before first save.
   ============================================================ */
const FAQ_DEFAULT = [
  { q: 'Demo dekhne ke liye kuch dena padta hai?', a: 'Nahi. Order se demo milne tak aapka kharcha Rs.0 hai. Pehla payment tabhi jab aap demo dekh ke santusht ho jayein.' },
  { q: 'Demo pasand nahi aaya to?', a: 'To aap kuch nahi dete. Pehle hum changes karte hain; phir bhi baat na bane to order cancel - koi charge nahi.' },
  { q: 'How many changes are allowed?', a: 'Unlimited during the demo stage. Free minor text and photo changes for one year after going live.' },
  { q: 'What about domain and hosting costs?', a: 'Domain at actual cost. We add zero markup and set it up for free. Hosting is included in our plans.' },
  { q: "I don't have a CV, can you still build it?", a: 'Haan. Form me content aap likh dijiye option hai - hum pooch ke likh dete hain.' },
  { q: 'Are my CV and photo safe?', a: 'They are only used to build your website and are never shared. We delete them upon request.' }
];
const WHY_DEFAULT = [
  { icon: 'shield', title: 'Zero advance risk', body: 'You pay nothing until you see your website yourself.' },
  { icon: 'bolt', title: '3-5 din me demo', body: "Small team, so your work doesn't sit in a queue for months." },
  { icon: 'phone', title: 'Perfect on phones too', body: 'Har website pehle mobile pe design hoti hai - 80% log wahin dekhte hain.' },
  { icon: 'search', title: 'Search engine ready', body: 'Meta tags, sitemap, speed - sab set karke dete hain.' },
  { icon: 'chat', title: 'Direct chat on WhatsApp', body: 'No ticket system. You message us, we reply.' },
  { icon: 'heart', title: 'One year of support', body: 'Text ya photo badalni ho, bata dijiye - chhote changes free.' }
];
const ICON_OPTIONS = ['shield', 'bolt', 'phone', 'search', 'chat', 'heart'];

let faqList = [];
let whyList = [];

/* ============================================================
   Tabs
   ============================================================ */
$$('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
  $$('.tab-btn').forEach(b => b.classList.remove('is-on'));
  $$('.tab-panel').forEach(p => p.classList.remove('is-on'));
  btn.classList.add('is-on');
  const map = { faq: '#panelFaq', why: '#panelWhy', socials: '#panelSocials' };
  $(map[btn.dataset.t]).classList.add('is-on');
}));

/* ============================================================
   FAQ editor
   ============================================================ */
function renderFaq() {
  const box = $('#faqEditor');
  if (!faqList.length) { box.innerHTML = `<p class="adm-muted">No questions — "+ Add Question" dabayein.</p>`; return; }
  box.innerHTML = faqList.map((item, i) => `
    <div class="editor-row" data-i="${i}">
      <button type="button" class="rm" data-rm="${i}" aria-label="Remove">✕</button>
      <div class="adm-field"><label>Sawaal</label>
        <input type="text" data-faq-q="${i}" value="${esc(item.q)}"></div>
      <div class="adm-field" style="margin-bottom:0"><label>Jawaab</label>
        <textarea data-faq-a="${i}">${esc(item.a)}</textarea></div>
    </div>`).join('');

  $$('#faqEditor [data-rm]').forEach(b => b.addEventListener('click', () => {
    faqList.splice(Number(b.dataset.rm), 1);
    renderFaq();
  }));
  $$('#faqEditor [data-faq-q]').forEach(el => el.addEventListener('input', () => {
    faqList[Number(el.dataset.faqQ)].q = el.value;
  }));
  $$('#faqEditor [data-faq-a]').forEach(el => el.addEventListener('input', () => {
    faqList[Number(el.dataset.faqA)].a = el.value;
  }));
}

$('#addFaqBtn').addEventListener('click', () => {
  faqList.push({ q: '', a: '' });
  renderFaq();
});

$('#saveFaqBtn').addEventListener('click', async () => {
  const clean = faqList.filter(f => f.q.trim() && f.a.trim());
  const btn = $('#saveFaqBtn');
  btn.disabled = true; btn.textContent = 'Saving...';
  const row = await adminSetContent('index', 'faq', clean);
  btn.disabled = false; btn.textContent = 'Save FAQ';
  if (!row) { toast('Save failed', 'err'); return; }
  faqList = clean; renderFaq();
  toast('FAQ saved — will reflect immediately on website', 'ok');
});

/* ============================================================
   "Why us" cards editor
   ============================================================ */
function renderWhy() {
  const box = $('#whyEditor');
  if (!whyList.length) { box.innerHTML = `<p class="adm-muted">No cards — "+ Add Card" dabayein.</p>`; return; }
  box.innerHTML = whyList.map((item, i) => `
    <div class="editor-row" data-i="${i}">
      <button type="button" class="rm" data-rm="${i}" aria-label="Remove">✕</button>
      <div class="adm-row2">
        <div class="adm-field"><label>Icon</label>
          <select data-why-icon="${i}">
            ${ICON_OPTIONS.map(ic => `<option value="${ic}" ${ic === item.icon ? 'selected' : ''}>${ic}</option>`).join('')}
          </select></div>
        <div class="adm-field"><label>Title</label>
          <input type="text" data-why-title="${i}" value="${esc(item.title)}"></div>
      </div>
      <div class="adm-field" style="margin-bottom:0"><label>Description</label>
        <textarea data-why-body="${i}">${esc(item.body)}</textarea></div>
    </div>`).join('');

  $$('#whyEditor [data-rm]').forEach(b => b.addEventListener('click', () => {
    whyList.splice(Number(b.dataset.rm), 1);
    renderWhy();
  }));
  $$('#whyEditor [data-why-icon]').forEach(el => el.addEventListener('change', () => {
    whyList[Number(el.dataset.whyIcon)].icon = el.value;
  }));
  $$('#whyEditor [data-why-title]').forEach(el => el.addEventListener('input', () => {
    whyList[Number(el.dataset.whyTitle)].title = el.value;
  }));
  $$('#whyEditor [data-why-body]').forEach(el => el.addEventListener('input', () => {
    whyList[Number(el.dataset.whyBody)].body = el.value;
  }));
}

$('#addWhyBtn').addEventListener('click', () => {
  whyList.push({ icon: 'bolt', title: '', body: '' });
  renderWhy();
});

$('#saveWhyBtn').addEventListener('click', async () => {
  const clean = whyList.filter(w => w.title.trim() && w.body.trim());
  const btn = $('#saveWhyBtn');
  btn.disabled = true; btn.textContent = 'Saving...';
  const row = await adminSetContent('index', 'why', clean);
  btn.disabled = false; btn.textContent = 'Save cards';
  if (!row) { toast('Save failed', 'err'); return; }
  whyList = clean; renderWhy();
  toast('Cards saved — will reflect immediately on website', 'ok');
});

/* ============================================================
   Social links (settings table, key='socials')
   ============================================================ */
const SOCIAL_FIELDS = [
  ['sInsta', 'instagram'], ['sFb', 'facebook'], ['sGithub', 'github'],
  ['sLinkedin', 'linkedin'], ['sX', 'x'], ['sTelegram', 'telegram'], ['sYoutube', 'youtube'],
];

$('#saveSocialsBtn').addEventListener('click', async () => {
  const value = {};
  SOCIAL_FIELDS.forEach(([id, key]) => { value[key] = $('#' + id).value.trim(); });
  const btn = $('#saveSocialsBtn');
  btn.disabled = true; btn.textContent = 'Saving...';
  const row = await adminSetSetting('socials', value);
  btn.disabled = false; btn.textContent = 'Save social links';
  if (!row) { toast('Save failed', 'err'); return; }
  toast('Social links saved', 'ok');
});

/* ============================================================
   Load everything
   ============================================================ */
(async function init() {
  const [contentRows, settings] = await Promise.all([
    adminGetAllContent('index'),
    adminGetAllSettings(),
  ]);

  const faqRow = contentRows.find(r => r.section_key === 'faq');
  const whyRow = contentRows.find(r => r.section_key === 'why');
  faqList = (faqRow?.content?.length ? faqRow.content : FAQ_DEFAULT).map(x =>
    Array.isArray(x) ? { q: x[0], a: x[1] } : { q: x.q, a: x.a });
  whyList = (whyRow?.content?.length ? whyRow.content : WHY_DEFAULT).map(x =>
    Array.isArray(x) ? { icon: x[0], title: x[1], body: x[2] } : { icon: x.icon, title: x.title, body: x.body });
  renderFaq();
  renderWhy();

  const socialsRow = settings.find(s => s.key === 'socials');
  const socials = socialsRow?.value || {};
  SOCIAL_FIELDS.forEach(([id, key]) => { $('#' + id).value = socials[key] || ''; });
})();
