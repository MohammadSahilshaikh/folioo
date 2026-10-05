// admin-reviews.js — approve / feature / delete reviews.
import { guard, $, $$, esc, toast, fmtDate, confirmModal } from './shell.js';
import { adminListReviews, adminSetReviewStatus, adminSetReviewFeatured, adminDeleteReview } from './supabase-client.js';

const profile = await guard('Reviews');
if (!profile) throw new Error('not authorized');

let filter = 'all';
const tbody = $('#revBody');

function rowHtml(r) {
  const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
  
  let actions = '';
  if (r.status !== 'approved') {
    actions += `<button class="action-btn btn-approve" data-act="approve">Approve</button> `;
  }
  
  if (r.status === 'approved') {
    const featureText = r.is_featured ? '⭐ Unfeature' : '☆ Feature';
    actions += `<button class="action-btn btn-feature" data-act="feature">${featureText}</button> `;
  }
  
  actions += `<button class="action-btn btn-danger" data-act="delete">Delete</button>`;
  
  return `<tr data-id="${r.id}">
    <td style="color:var(--muted); font-size:.85rem;">${fmtDate(r.created_at)}</td>
    <td>
      <div style="font-weight:600;">${esc(r.name)}</div>
      <div style="font-size:.8rem; color:var(--muted);">${esc(r.email || '-')}</div>
    </td>
    <td class="stars">${stars}</td>
    <td class="review-comment" title="${esc(r.comment)}">${esc(r.comment)}</td>
    <td>
      <span class="badge badge-${r.status}">${esc(r.status)}</span>
      ${r.is_featured ? '<br><span style="font-size:.7rem; color:var(--warn); margin-top:4px; display:inline-block;">⭐ Featured</span>' : ''}
    </td>
    <td style="text-align:right; white-space:nowrap;">
      ${actions}
    </td>
  </tr>`;
}

async function load() {
  tbody.innerHTML = `<tr><td colspan="6" class="adm-empty">Loading...</td></tr>`;
  const items = await adminListReviews(filter);
  
  tbody.innerHTML = items.length
    ? items.map(rowHtml).join('')
    : `<tr><td colspan="6" class="adm-empty">No reviews found in this category.</td></tr>`;
    
  wireActions();
}

function wireActions() {
  $$('tr[data-id]').forEach(row => {
    const id = row.dataset.id;
    
    row.querySelector('[data-act="approve"]')?.addEventListener('click', async () => {
      const r = await adminSetReviewStatus(id, 'approved');
      if (r) { toast('Review approved', 'ok'); load(); } else toast('Action failed', 'err');
    });
    
    row.querySelector('[data-act="feature"]')?.addEventListener('click', async () => {
      const isFeatured = row.textContent.includes('Unfeature');
      const r = await adminSetReviewFeatured(id, !isFeatured);
      if (r) { toast(isFeatured ? 'Unfeatured' : 'Featured on homepage', 'ok'); load(); } else toast('Action failed', 'err');
    });
    
    row.querySelector('[data-act="delete"]')?.addEventListener('click', async () => {
      const ok = await confirmModal('Are you sure you want to delete this review?', 'Delete');
      if (!ok) return;
      const success = await adminDeleteReview(id);
      if (success) { toast('Deleted successfully', 'ok'); load(); } else toast('Action failed', 'err');
    });
  });
}

$$('#tabs .tab-btn').forEach(btn => btn.addEventListener('click', () => {
  $$('#tabs .tab-btn').forEach(b => b.classList.remove('is-active'));
  btn.classList.add('is-active');
  filter = btn.dataset.s;
  load();
}));

load();
