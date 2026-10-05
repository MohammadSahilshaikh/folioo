// plans.js (admin) — CRUD for plans and add-ons.
import { guard, $, $$, esc, toast, confirmModal } from './shell.js';
import { money } from './config.js';
import {
  adminListPlans, adminUpsertPlan, adminDeletePlan,
  adminListAddons, adminUpsertAddon, adminDeleteAddon,
} from './supabase-client.js';

const profile = await guard('Plans');
if (!profile) throw new Error('not authorized');

let plans = [];
let addons = [];
let editingPlanId = null;
let editingAddonId = null;

/* ---------- tabs ---------- */
$$('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
  $$('.tab-btn').forEach(b => b.classList.remove('is-on'));
  btn.classList.add('is-on');
  $$('.tab-panel').forEach(p => p.classList.remove('is-on'));
  $(`#panel${btn.dataset.t === 'plans' ? 'Plans' : 'Addons'}`).classList.add('is-on');
}));

/* ============================================================
   PLANS
   ============================================================ */
async function loadPlans() {
  const box = $('#plansList');
  box.innerHTML = `<div class="adm-card skel" style="height:70px;margin-bottom:10px"></div>`;
  plans = await adminListPlans();
  box.innerHTML = plans.length ? plans.map(p => `
    <div class="plan-row" data-id="${p.id}">
      <div>
        <div class="pname">${esc(p.name)} ${p.is_popular ? '<span class="badge badge-yes">Popular</span>' : ''} ${!p.is_active ? '<span class="badge badge-no">Inactive</span>' : ''}</div>
        <div class="pmeta">${p.pages || 0} pages · ${p.delivery_days || 0} din · ${(p.features || []).length} features</div>
      </div>
      <div class="pprice">${money(p.price)}</div>
      <div class="plan-actions">
        <button class="adm-btn adm-btn-sm" data-act="edit">Edit</button>
        <button class="adm-btn adm-btn-sm adm-btn-danger" data-act="del">Delete</button>
      </div>
    </div>`).join('') : `<div class="adm-empty">No plans</div>`;

  $$('#plansList .plan-row').forEach(row => {
    const id = row.dataset.id;
    row.querySelector('[data-act="edit"]').addEventListener('click', () => openPlanDrawer(id));
    row.querySelector('[data-act="del"]').addEventListener('click', async () => {
      const ok = await confirmModal('Delete this plan?', 'Delete');
      if (!ok) return;
      const success = await adminDeletePlan(id);
      if (success) { toast('Deleted successfully', 'ok'); loadPlans(); } else toast('Action failed', 'err');
    });
  });
}

const planDrawerBack = $('#planDrawerBack');
function closePlanDrawer() { planDrawerBack.classList.remove('open'); }
$('#planDrawerClose').addEventListener('click', closePlanDrawer);
planDrawerBack.addEventListener('click', e => { if (e.target === planDrawerBack) closePlanDrawer(); });

function openPlanDrawer(id) {
  editingPlanId = id || null;
  $('#planDeleteBtn').style.display = id ? 'inline-flex' : 'none';

  if (id) {
    const p = plans.find(x => String(x.id) === String(id));
    $('#planDrawerTitle').textContent = 'Edit plan';
    $('#plName').value = p.name || '';
    $('#plPrice').value = p.price ?? '';
    $('#plOldPrice').value = p.old_price ?? '';
    $('#plDays').value = p.delivery_days ?? 3;
    $('#plPages').value = p.pages ?? 1;
    $('#plFeatures').value = (p.features || []).join('\n');
    $('#plOrder').value = p.sort_order ?? 0;
    $('#plPopular').checked = !!p.is_popular;
    $('#plActive').checked = !!p.is_active;
  } else {
    $('#planDrawerTitle').textContent = 'New plan';
    $('#plName').value = ''; $('#plPrice').value = ''; $('#plOldPrice').value = '';
    $('#plDays').value = 3; $('#plPages').value = 1; $('#plFeatures').value = '';
    $('#plOrder').value = 0; $('#plPopular').checked = false; $('#plActive').checked = true;
  }
  planDrawerBack.classList.add('open');
}
$('#addPlanBtn').addEventListener('click', () => openPlanDrawer(null));

$('#planSaveBtn').addEventListener('click', async () => {
  const name = $('#plName').value.trim();
  if (!name) { toast('Plan name zaroori hai', 'err'); return; }

  const btn = $('#planSaveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';

  const row = {
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40),
    price: Number($('#plPrice').value) || 0,
    old_price: $('#plOldPrice').value ? Number($('#plOldPrice').value) : null,
    delivery_days: Number($('#plDays').value) || 3,
    pages: Number($('#plPages').value) || 1,
    features: $('#plFeatures').value.split('\n').map(s => s.trim()).filter(Boolean),
    sort_order: Number($('#plOrder').value) || 0,
    is_popular: $('#plPopular').checked,
    is_active: $('#plActive').checked,
  };
  if (editingPlanId) row.id = editingPlanId;

  const saved = await adminUpsertPlan(row);
  btn.disabled = false; btn.textContent = 'Save';
  if (!saved) { toast('Save failed', 'err'); return; }
  toast('Plan saved successfully', 'ok');
  closePlanDrawer();
  loadPlans();
});

$('#planDeleteBtn').addEventListener('click', async () => {
  if (!editingPlanId) return;
  const ok = await confirmModal('Delete this plan?', 'Delete');
  if (!ok) return;
  const success = await adminDeletePlan(editingPlanId);
  if (success) { toast('Deleted successfully', 'ok'); closePlanDrawer(); loadPlans(); } else toast('Action failed', 'err');
});

/* ============================================================
   ADD-ONS
   ============================================================ */
async function loadAddons() {
  const box = $('#addonsList');
  box.innerHTML = `<div class="adm-card skel" style="height:70px;margin-bottom:10px"></div>`;
  addons = await adminListAddons();
  box.innerHTML = addons.length ? addons.map(a => `
    <div class="plan-row" data-id="${a.id}">
      <div>
        <div class="pname">${esc(a.name)} ${!a.is_active ? '<span class="badge badge-no">Inactive</span>' : ''}</div>
        <div class="pmeta">${esc(a.description || '')}</div>
      </div>
      <div class="pprice">${money(a.price)}</div>
      <div class="plan-actions">
        <button class="adm-btn adm-btn-sm" data-act="edit">Edit</button>
        <button class="adm-btn adm-btn-sm adm-btn-danger" data-act="del">Delete</button>
      </div>
    </div>`).join('') : `<div class="adm-empty">No add-ons</div>`;

  $$('#addonsList .plan-row').forEach(row => {
    const id = row.dataset.id;
    row.querySelector('[data-act="edit"]').addEventListener('click', () => openAddonDrawer(id));
    row.querySelector('[data-act="del"]').addEventListener('click', async () => {
      const ok = await confirmModal('Delete this add-on?', 'Delete');
      if (!ok) return;
      const success = await adminDeleteAddon(id);
      if (success) { toast('Deleted successfully', 'ok'); loadAddons(); } else toast('Action failed', 'err');
    });
  });
}

const addonDrawerBack = $('#addonDrawerBack');
function closeAddonDrawer() { addonDrawerBack.classList.remove('open'); }
$('#addonDrawerClose').addEventListener('click', closeAddonDrawer);
addonDrawerBack.addEventListener('click', e => { if (e.target === addonDrawerBack) closeAddonDrawer(); });

function openAddonDrawer(id) {
  editingAddonId = id || null;
  $('#addonDeleteBtn').style.display = id ? 'inline-flex' : 'none';

  if (id) {
    const a = addons.find(x => String(x.id) === String(id));
    $('#addonDrawerTitle').textContent = 'Edit add-on';
    $('#adName').value = a.name || '';
    $('#adPrice').value = a.price ?? '';
    $('#adDesc').value = a.description || '';
    $('#adOrder').value = a.sort_order ?? 0;
    $('#adActive').checked = !!a.is_active;
  } else {
    $('#addonDrawerTitle').textContent = 'New add-on';
    $('#adName').value = ''; $('#adPrice').value = ''; $('#adDesc').value = '';
    $('#adOrder').value = 0; $('#adActive').checked = true;
  }
  addonDrawerBack.classList.add('open');
}
$('#addAddonBtn').addEventListener('click', () => openAddonDrawer(null));

$('#addonSaveBtn').addEventListener('click', async () => {
  const name = $('#adName').value.trim();
  if (!name) { toast('Name is required', 'err'); return; }

  const btn = $('#addonSaveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';

  const row = {
    name, price: Number($('#adPrice').value) || 0,
    description: $('#adDesc').value.trim(),
    sort_order: Number($('#adOrder').value) || 0,
    is_active: $('#adActive').checked,
  };
  if (editingAddonId) row.id = editingAddonId;

  const saved = await adminUpsertAddon(row);
  btn.disabled = false; btn.textContent = 'Save';
  if (!saved) { toast('Save failed', 'err'); return; }
  toast('Add-on saved successfully', 'ok');
  closeAddonDrawer();
  loadAddons();
});

$('#addonDeleteBtn').addEventListener('click', async () => {
  if (!editingAddonId) return;
  const ok = await confirmModal('Delete this add-on?', 'Delete');
  if (!ok) return;
  const success = await adminDeleteAddon(editingAddonId);
  if (success) { toast('Deleted successfully', 'ok'); closeAddonDrawer(); loadAddons(); } else toast('Action failed', 'err');
});

loadPlans();
loadAddons();
