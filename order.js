// order.js - 3-step wizard: plan → details+uploads → confirm.
import { boot, $, $$, esc, isEmail, isPhone, toast } from './common.js';
import { CONFIG, money, waLink } from './config.js';
import {
  getPlans, getAddons, uploadFile, insertLead, hasRecentLead, makeTrackingId,
} from './supabase-client.js';

boot({ waMessage: 'Hi! I need help with the order form.' });

/* ============================================================
   STATE
   ============================================================ */
let plans = [];
let addons = [];
let chosenPlanSlug = null;
const chosenAddons = new Set();
let resumeFile = null;
let avatarBlob = null;      // compressed
let avatarPreviewUrl = null;
let step = 1;
const TOTAL_STEPS = 3;

const AUTOSAVE_KEY = 'pf-order-draft';

/* ============================================================
   BOOT: load plans + addons, restore draft
   ============================================================ */
(async function init() {
  plans = await getPlans();
  addons = await getAddons();

  const params = new URLSearchParams(location.search);
  chosenPlanSlug = params.get('plan') || plans.find(p => p.is_popular)?.slug || plans[0]?.slug;
  (params.get('addons') || '').split(',').filter(Boolean).forEach(id => chosenAddons.add(id));

  restoreDraft();
  renderPlans();
  renderAddons();
  updateSplit();
  goToStep(1, true);
})();

/* ============================================================
   STEP 1 - PLAN + ADDONS
   ============================================================ */
function renderPlans() {
  const box = $('#planList');
  if (!plans.length) {
    box.innerHTML = `<p style="color:var(--muted)">Plans unavailable. Please refresh the page.</p>`;
    return;
  }
  box.innerHTML = plans.map(p => {
    const on = p.slug === chosenPlanSlug;
    return `<label class="plan-pick${on ? ' is-chosen' : ''}">
      <input type="radio" name="planPick" value="${esc(p.slug)}" ${on ? 'checked' : ''}>
      <div style="width:100%">
        <div style="display:flex; justify-content:space-between; align-items:center">
          <div>
            <div class="pname">${esc(p.name)}</div>
            <div class="pmeta">${p.pages ? esc(p.pages) + ' pages · ' : ''}${p.delivery_days ? esc(p.delivery_days) + ' days' : ''}</div>
          </div>
          <div class="pprice">${money(p.price)}</div>
        </div>
        <div class="pfeatures" style="display: ${on ? 'block' : 'none'}; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border)">
          <ul style="list-style:none; padding:0; margin:0; display:grid; gap:8px;">
            ${(p.features || []).map(f => `<li style="color:var(--muted); font-size:0.85rem; padding-left:18px; position:relative">
              <span style="position:absolute; left:0; top:1px; color:var(--accent); font-weight:bold;">✓</span>
              ${esc(f)}
            </li>`).join('')}
          </ul>
        </div>
      </div>
    </label>`;
  }).join('');

  $$('input[name="planPick"]').forEach(r => r.addEventListener('change', () => {
    chosenPlanSlug = r.value;
    $$('.plan-pick').forEach(el => {
      el.classList.remove('is-chosen');
      el.querySelector('.pfeatures').style.display = 'none';
    });
    r.closest('.plan-pick').classList.add('is-chosen');
    r.closest('.plan-pick').querySelector('.pfeatures').style.display = 'block';
    
    updateSplit();
    saveDraft();
  }));
}

function renderAddons() {
  const box = $('#addonList');
  if (!addons.length) { box.innerHTML = ''; return; }
  box.innerHTML = addons.map(a => `
    <div class="addon-row">
      <label for="oad-${a.id}">
        <input type="checkbox" id="oad-${a.id}" value="${a.id}" ${chosenAddons.has(a.id) ? 'checked' : ''}>
        ${esc(a.name)}
      </label>
      <span>+${money(a.price)}</span>
    </div>`).join('');

  $$('#addonList input[type="checkbox"]').forEach(cb =>
    cb.addEventListener('change', () => {
      cb.checked ? chosenAddons.add(cb.value) : chosenAddons.delete(cb.value);
      updateSplit();
      saveDraft();
    }));
}

function currentPlan() { return plans.find(p => p.slug === chosenPlanSlug); }
function currentTotal() {
  const p = currentPlan();
  if (!p) return 0;
  const addonTotal = addons.filter(a => chosenAddons.has(a.id)).reduce((s, a) => s + (a.price || 0), 0);
  return (p.price || 0) + addonTotal;
}
function updateSplit() {
  const total = currentTotal();
  const half = Math.round(total / 2);
  $('#splitBox').innerHTML = total
    ? `<span>Total <b>${money(total)}</b></span><span>${money(half)} after demo · ${money(total - half)} at hosting</span>`
    : `<span>Choose a plan to total dikhega</span>`;
}

/* ============================================================
   STEP 2 - STYLE SWATCHES
   ============================================================ */
$$('#styleSwatches .swatch').forEach(btn => btn.addEventListener('click', () => {
  $$('#styleSwatches .swatch').forEach(b => b.classList.remove('is-on'));
  btn.classList.add('is-on');
  $('#stylePref').value = btn.dataset.v;
  saveDraft();
}));

/* ============================================================
   STEP 2 - UPLOADS
   ============================================================ */
const MAX_RESUME = CONFIG.MAX_RESUME_MB * 1024 * 1024;
const MAX_IMAGE  = CONFIG.MAX_IMAGE_MB * 1024 * 1024;

function fmtSize(b) { return b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB'; }

/* -- resume -- */
function wireDrop(dropEl, inputEl, onFile) {
  dropEl.addEventListener('click', () => inputEl.click());
  dropEl.addEventListener('dragover', e => { e.preventDefault(); dropEl.classList.add('drag'); });
  dropEl.addEventListener('dragleave', () => dropEl.classList.remove('drag'));
  dropEl.addEventListener('drop', e => {
    e.preventDefault(); dropEl.classList.remove('drag');
    if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
  });
  inputEl.addEventListener('change', () => { if (inputEl.files[0]) onFile(inputEl.files[0]); });
}

wireDrop($('#resumeDrop'), $('#resumeInput'), (file) => {
  if (!/\.(pdf|docx?|PDF|DOCX?|DOC)$/.test(file.name)) { toast('Only PDF or Word files are allowed', 'err'); return; }
  if (file.size > MAX_RESUME) { toast(`File ${CONFIG.MAX_RESUME_MB}MB is larger than`, 'err'); return; }
  resumeFile = file;
  renderResumeChip();
});

function renderResumeChip() {
  const box = $('#resumeChip');
  if (!resumeFile) { box.innerHTML = ''; return; }
  box.innerHTML = `<div class="file-chip">
    <div><div class="fname">${esc(resumeFile.name)}</div><div class="fsize">${fmtSize(resumeFile.size)}</div></div>
    <button type="button" id="removeResume" aria-label="Remove">✕</button></div>`;
  $('#removeResume').addEventListener('click', () => { resumeFile = null; $('#resumeInput').value = ''; renderResumeChip(); });
}

/* -- avatar with client-side compression -- */
wireDrop($('#avatarDrop'), $('#avatarInput'), (file) => {
  if (!file.type.startsWith('image/')) { toast('Only image files are allowed', 'err'); return; }
  if (file.size > MAX_IMAGE) { toast(`Photo ${CONFIG.MAX_IMAGE_MB}MB is larger than`, 'err'); return; }
  compressImage(file, 1200).then(blob => {
    avatarBlob = blob;
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    avatarPreviewUrl = URL.createObjectURL(blob);
    renderAvatarChip();
  }).catch(() => toast('Photo could not be processed', 'err'));
});

function compressImage(file, maxDim) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale); height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('compress fail')), 'image/jpeg', 0.85);
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderAvatarChip() {
  const box = $('#avatarChip');
  if (!avatarBlob) { box.innerHTML = ''; return; }
  box.innerHTML = `<div class="file-chip">
    <img class="avatar-preview" src="${avatarPreviewUrl}" alt="Preview">
    <div style="flex:1"><div class="fname">Photo ready</div><div class="fsize">${fmtSize(avatarBlob.size)} (compressed)</div></div>
    <button type="button" id="removeAvatar" aria-label="Remove">✕</button></div>`;
  $('#removeAvatar').addEventListener('click', () => {
    avatarBlob = null; $('#avatarInput').value = '';
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    renderAvatarChip();
  });
}

/* ============================================================
   WIZARD NAVIGATION
   ============================================================ */
function fieldsFor(stepN) {
  return {
    1: [],
    2: ['full_name', 'email', 'whatsapp', 'profession_title', 'bio'],
    3: [],
  }[stepN];
}

function setErr(name, on) {
  const f = document.querySelector(`.step[data-step="${step}"] [data-f="${name}"]`);
  f?.classList.toggle('err', on);
}

function validateStep(stepN) {
  if (stepN === 1) {
    if (!chosenPlanSlug) { toast('Pehle ek plan chunein', 'err'); return false; }
    return true;
  }
  if (stepN === 2) {
    const form = $('#orderForm');
    const data = Object.fromEntries(new FormData(form).entries());
    const checks = {
      full_name: data.full_name?.trim().length > 1,
      email: isEmail(data.email || ''),
      whatsapp: isPhone(data.whatsapp || ''),
      profession_title: data.profession_title?.trim().length > 1,
      bio: data.bio?.trim().length > 4,
    };
    let ok = true;
    for (const [k, v] of Object.entries(checks)) { setErr(k, !v); if (!v) ok = false; }
    if (!ok) toast('Please check the highlighted fields', 'err');
    return ok;
  }
  return true;
}

function goToStep(n, silent = false) {
  if (!silent && n > step && !validateStep(step)) return;
  step = Math.min(Math.max(n, 1), TOTAL_STEPS);

  $$('.step').forEach(s => s.classList.toggle('is-on', Number(s.dataset.step) === step));
  $$('#stepper .sdot').forEach(d => {
    const s = Number(d.dataset.s);
    d.classList.toggle('now', s === step);
    d.classList.toggle('done', s < step);
  });

  $('#backBtn').style.display = step > 1 ? 'inline-flex' : 'none';
  $('#nextBtn').style.display = step < TOTAL_STEPS ? 'inline-flex' : 'none';
  $('#submitBtn').style.display = step === TOTAL_STEPS ? 'block' : 'none';

  if (step === TOTAL_STEPS) renderReview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('#nextBtn').addEventListener('click', () => goToStep(step + 1));
$('#backBtn').addEventListener('click', () => goToStep(step - 1, true));

/* live-clear errors */
$$('#orderForm input, #orderForm textarea, #orderForm select').forEach(el =>
  el.addEventListener('input', () => setErr(el.name, false)));

/* ============================================================
   STEP 3 - REVIEW
   ============================================================ */
function renderReview() {
  const form = $('#orderForm');
  const d = Object.fromEntries(new FormData(form).entries());
  const p = currentPlan();
  const total = currentTotal();
  const half = Math.round(total / 2);

  const addonNames = addons.filter(a => chosenAddons.has(a.id)).map(a => a.name).join(', ') || '-';

  $('#reviewBox').innerHTML = `
    <div class="rev-block">
      <h3>Plan <button type="button" data-goto="1">Edit</button></h3>
      <div class="rev-line"><b>Plan:</b> ${esc(p?.name || '-')} - ${money(p?.price || 0)}</div>
      <div class="rev-line"><b>Add-ons:</b> ${esc(addonNames)}</div>
      <div class="rev-line"><b>Total:</b> ${money(total)} (${money(half)} after demo, ${money(total - half)} at hosting)</div>
    </div>
    <div class="rev-block">
      <h3>Details <button type="button" data-goto="2">Edit</button></h3>
      <div class="rev-line"><b>Name:</b> ${esc(d.full_name || '-')}</div>
      <div class="rev-line"><b>Email:</b> ${esc(d.email || '-')}</div>
      <div class="rev-line"><b>WhatsApp:</b> ${esc(d.whatsapp || '-')}</div>
      <div class="rev-line"><b>Title:</b> ${esc(d.profession_title || '-')}</div>
      <div class="rev-line"><b>Resume:</b> ${resumeFile ? esc(resumeFile.name) : (d.needs_content ? 'Content aap likhenge' : 'Not provided')}</div>
      <div class="rev-line"><b>Photo:</b> ${avatarBlob ? 'Will be uploaded' : 'Not provided'}</div>
    </div>`;

  $$('#reviewBox [data-goto]').forEach(b => b.addEventListener('click', () => goToStep(Number(b.dataset.goto), true)));
}

/* ============================================================
   AUTOSAVE (form fields only - files kabhi localStorage me nahi jaate)
   ============================================================ */
function saveDraft() {
  try {
    const form = $('#orderForm');
    const data = Object.fromEntries(new FormData(form).entries());
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
      data, plan: chosenPlanSlug, addons: [...chosenAddons],
    }));
  } catch {}
}
$('#orderForm').addEventListener('input', debounceSave());
function debounceSave() { let t; return () => { clearTimeout(t); t = setTimeout(saveDraft, 500); }; }

function restoreDraft() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return;
    const { data, plan, addons: ad } = JSON.parse(raw);
    if (plan) chosenPlanSlug = plan;
    (ad || []).forEach(id => chosenAddons.add(id));
    Object.entries(data || {}).forEach(([k, v]) => {
      const el = $(`#orderForm [name="${k}"]`);
      if (el && el.type !== 'checkbox') el.value = v;
    });
    if (data?.style_pref) {
      $$('#styleSwatches .swatch').forEach(b => b.classList.toggle('is-on', b.dataset.v === data.style_pref));
    }
  } catch {}
}

/* ============================================================
   SUBMIT
   ============================================================ */
const form = $('#orderForm');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (step !== TOTAL_STEPS) return;

  if (form.website.value) { toast('Order received!', 'ok'); return; } // honeypot
  if (!$('#agreeTerms').checked) { toast('Please accept the payment terms', 'err'); return; }

  const btn = $('#submitBtn');
  btn.disabled = true;
  btn.textContent = 'Submit ho raha hai…';

  const d = Object.fromEntries(new FormData(form).entries());
  const email = (d.email || '').trim();
  const whatsapp = (d.whatsapp || '').replace(/\D/g, '').slice(-10);

  const dup = await hasRecentLead(email, whatsapp);
  if (dup) {
    toast('We already received your order. We will contact you soon.', 'info');
    btn.disabled = false; btn.textContent = 'Confirm order';
    return;
  }

  const trackingId = makeTrackingId();
  const plan = currentPlan();
  const total = currentTotal();
  const half = Math.round(total / 2);

  let resumeUrl = null, avatarUrl = null;

  try {
    if (resumeFile) {
      const path = `${trackingId}/${Date.now()}-${resumeFile.name}`.replace(/\s+/g, '_');
      const res = await uploadFile(CONFIG.BUCKETS.resumes, path, resumeFile);
      if (res.ok) resumeUrl = res.path;
    }
    if (avatarBlob) {
      const path = `${trackingId}/${Date.now()}-avatar.jpg`;
      const res = await uploadFile(CONFIG.BUCKETS.avatars, path, avatarBlob);
      if (res.ok) avatarUrl = res.path;
    }
  } catch (err) {
    console.warn('upload error', err);
  }

  const payload = {
    tracking_id: trackingId,
    full_name: (d.full_name || '').trim(),
    email, whatsapp,
    city: (d.city || '').trim() || null,
    source: 'website',

    plan_id: plan?.id || null,
    plan_snapshot: plan || null,
    addons: addons.filter(a => chosenAddons.has(a.id)),
    total_amount: total,
    advance_amount: half,
    final_amount: total - half,

    profession_title: (d.profession_title || '').trim(),
    bio: (d.bio || '').trim(),
    skills: (d.skills || '').split(',').map(s => s.trim()).filter(Boolean),
    projects: (d.projects || '').split('\n').map(s => s.trim()).filter(Boolean),
    social_links: {
      github: d.github || null, linkedin: d.linkedin || null, instagram: d.instagram || null,
    },
    style_pref: d.style_pref || 'Minimal',
    domain_pref: d.domain_pref || null,
    notes: (d.notes || '').trim() || null,
    needs_content: !!d.needs_content,

    resume_url: resumeUrl,
    avatar_url: avatarUrl,

    status: 'new',
  };

  const row = await insertLead(payload);
  btn.disabled = false;
  btn.textContent = 'Confirm order';

  if (!row) {
    // DB not configured - store locally and go to thank-you, WhatsApp fallback
    localStorage.removeItem(AUTOSAVE_KEY);
    const msg = `Hi! My order is ready.\nTracking: ${trackingId}\nPlan: ${plan?.name || chosenPlanSlug}\nTotal: ${money(total)}\nName: ${payload.full_name}\nEmail: ${payload.email}\nWhatsApp: ${payload.whatsapp}`;
    sendEmails(payload).catch(() => {});
    // open WhatsApp in background so order reaches the business
    setTimeout(() => window.open(waLink(msg), '_blank'), 300);
    location.href = `thank-you.html?id=${encodeURIComponent(trackingId)}`;
    return;
  }

  localStorage.removeItem(AUTOSAVE_KEY);
  sendEmails(payload).catch(() => {}); // non-blocking, submission fail nahi honi chahiye

  location.href = `thank-you.html?id=${encodeURIComponent(trackingId)}`;
});


/* -----------------------------------------------------------
   EMAILJS
   Backend webhook now handles email delivery (schema.sql trigger)
   ----------------------------------------------------------- */
async function sendEmails(lead) {
  // Emails are now sent automatically by Supabase pg_net trigger on insert
  return;
}
