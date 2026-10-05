// pricing.js - full plan grid + live add-on calculator.
import { boot, $, $$, esc } from './common.js';
import { money } from './config.js';
import { getPlans, getAddons } from './supabase-client.js';
import { skeleton, initReveal } from './lazy.js';

boot({ waMessage: 'Hi! I want to understand the pricing.' });

let plans = [];
let addons = [];
let chosenPlan = null;
const chosenAddons = new Set();

/* ---------------- Plans grid ---------------- */
async function renderPlans() {
  const grid = $('#plansGrid');
  grid.innerHTML = skeleton(3, 380);
  plans = await getPlans();

  if (!plans.length) {
    grid.innerHTML = `<div class="card"><h3>Plans unavailable</h3>
      <p style="color:var(--muted)">Please refresh the page.</p></div>`;
    return;
  }

  // URL se pre-select, warna popular plan default
  const params = new URLSearchParams(location.search);
  const preSlug = params.get('plan');
  chosenPlan = plans.find(p => p.slug === preSlug) || plans.find(p => p.is_popular) || plans[0];

  grid.innerHTML = plans.map((p, i) => {
    const half = Math.round((p.price || 0) / 2);
    const on = p.slug === chosenPlan.slug;
    return `<label class="card plan plan-select reveal${on ? ' is-chosen' : ''}${p.is_popular ? ' popular' : ''}" data-d="${i + 1}">
      <input type="radio" name="plan" value="${esc(p.slug)}" ${on ? 'checked' : ''}>
      ${p.is_popular ? '<span class="chip" style="margin-bottom:12px">Most popular</span>' : ''}
      <h3>${esc(p.name)}</h3>
      <div style="margin:12px 0 0">
        <span class="amt">${money(p.price)}</span>
        ${p.old_price ? `<span class="old">${money(p.old_price)}</span>` : ''}
      </div>
      <p class="meta">${p.pages ? esc(p.pages) + ' pages · ' : ''}${p.delivery_days ? esc(p.delivery_days) + ' days delivery' : ''}</p>
      <div class="split">${money(half)} after demo · ${money((p.price || 0) - half)} at hosting</div>
      <ul>${(p.features || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
    </label>`;
  }).join('');

  initReveal('#plansGrid .reveal');

  $$('input[name="plan"]').forEach(r => r.addEventListener('change', () => {
    chosenPlan = plans.find(p => p.slug === r.value);
    $$('.plan-select').forEach(el => el.classList.remove('is-chosen'));
    r.closest('.plan-select').classList.add('is-chosen');
    updateSummary();
  }));

  await renderAddons();
  updateSummary();
}

/* ---------------- Add-ons ---------------- */
async function renderAddons() {
  const list = $('#addonList');
  addons = await getAddons();

  if (!addons.length) {
    list.innerHTML = `<p style="color:var(--muted);font-size:.9rem">No add-ons available right now.</p>`;
    return;
  }

  list.innerHTML = addons.map(a => `
    <div class="addon-row">
      <div class="addon-left">
        <input type="checkbox" id="ad-${a.id}" value="${a.id}">
        <label for="ad-${a.id}">
          <div class="addon-name">${esc(a.name)}</div>
          ${a.description ? `<div class="addon-desc">${esc(a.description)}</div>` : ''}
        </label>
      </div>
      <div class="addon-price">+${money(a.price)}</div>
    </div>`).join('');

  $$('#addonList input[type="checkbox"]').forEach(cb =>
    cb.addEventListener('change', () => {
      cb.checked ? chosenAddons.add(cb.value) : chosenAddons.delete(cb.value);
      updateSummary();
    }));
}

/* ---------------- Live summary ---------------- */
function updateSummary() {
  if (!chosenPlan) return;
  const addonItems = addons.filter(a => chosenAddons.has(a.id));
  const addonTotal = addonItems.reduce((s, a) => s + (a.price || 0), 0);
  const total = (chosenPlan.price || 0) + addonTotal;
  const half = Math.round(total / 2);

  $('#sumPlanName').textContent = chosenPlan.name;
  $('#sumPlanPrice').textContent = money(chosenPlan.price);
  $('#sumAddons').innerHTML = addonItems.map(a =>
    `<div class="sum-row"><span>${esc(a.name)}</span><span>+${money(a.price)}</span></div>`).join('');
  $('#sumTotal').textContent = money(total);
  $('#sumSplit').textContent = `${money(half)} after demo · ${money(total - half)} at hosting`;

  const params = new URLSearchParams();
  params.set('plan', chosenPlan.slug);
  if (chosenAddons.size) params.set('addons', [...chosenAddons].join(','));
  $('#ctaOrder').href = 'order.html?' + params.toString();
}

renderPlans();
