// leads.js — search/filter/paginate leads, detail drawer with full edit control.
import { guard, $, $$, esc, toast, fmtDate, fmtDateTime, confirmModal, exportCsv } from './shell.js';
import { CONFIG, money, waLink } from './config.js';
import {
    adminListLeads, adminUpdateLead, adminDeleteLead, adminAddLeadNote, getSignedUrl, sb
  } from './supabase-client.js';

const profile = await guard('Leads');
if (!profile) throw new Error('not authorized');

function debounce_(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

const STATUS_LABEL = {
    new: 'Order received', 
    in_progress: 'Designing', 
    demo_sent: 'Demo ready',
    advance_paid: '50% Advance Paid', 
    revisions: 'Revisions', 
    approved: 'Approved', 
    final_paid: '50% Final Paid',
    live: 'Live', 
    cancelled: 'Cancelled',
  };
const STATUS_OPTIONS = Object.keys(STATUS_LABEL);

const PAGE_SIZE = 20;
let search = '';
let status = 'all';
let offset = 0;
let total = 0;
let currentPageItems = [];
let activeLead = null;

const body = $('#leadsBody');
const pagWrap = $('#pagination');
const pageInfo = $('#pageInfo');

async function load() {
  body.innerHTML = `<tr><td colspan="7" class="adm-empty">Loading…</td></tr>`;
  const { items, total: t } = await adminListLeads({ search, status, offset, limit: PAGE_SIZE });
  currentPageItems = items;
  total = t;

  if (!items.length) {
    body.innerHTML = `<tr><td colspan="7" class="adm-empty">No leads found</td></tr>`;
  } else {
    body.innerHTML = items.map(l => `
      <tr class="clickable" data-id="${l.id}">
        <td><code>${esc(l.tracking_id)}</code></td>
        <td>${esc(l.full_name)}</td>
        <td>${esc(l.email)}</td>
        <td>${esc(l.plan_snapshot?.name || '—')}</td>
        <td>${esc(l.whatsapp)}</td>
        <td><span class="badge badge-${l.status}">${esc(STATUS_LABEL[l.status] || l.status)}</span></td>
        <td class="lead-amount">${money(l.total_amount)}</td>
        <td>${fmtDate(l.created_at)}</td>
      </tr>`).join('');
  }

  $$('#leadsBody tr[data-id]').forEach(tr =>
    tr.addEventListener('click', () => openDrawer(tr.dataset.id)));

  pagWrap.style.display = total > PAGE_SIZE ? 'flex' : 'none';
  const from = total ? offset + 1 : 0;
  const to = Math.min(offset + PAGE_SIZE, total);
  pageInfo.textContent = `${from}–${to} of ${total}`;
  $('#prevPage').disabled = offset === 0;
  $('#nextPage').disabled = offset + PAGE_SIZE >= total;
}

$('#searchInput').addEventListener('input', debounce_((e) => {
  search = e.target.value; offset = 0; load();
}, 350));
$('#statusFilter').addEventListener('change', (e) => { status = e.target.value; offset = 0; load(); });
$('#prevPage').addEventListener('click', () => { offset = Math.max(0, offset - PAGE_SIZE); load(); });
$('#nextPage').addEventListener('click', () => { offset += PAGE_SIZE; load(); });

$('#exportBtn').addEventListener('click', async () => {
  toast('Export taiyar kar rahe hain…', 'info');
  const { items } = await adminListLeads({ search, status, offset: 0, limit: 2000 });
  const rows = items.map(l => ({
    tracking_id: l.tracking_id, name: l.full_name, email: l.email, whatsapp: l.whatsapp,
    plan: l.plan_snapshot?.name || '', total: l.total_amount, advance_paid: l.advance_paid,
    final_paid: l.final_paid, status: l.status, created_at: l.created_at,
  }));
  exportCsv(`leads-${Date.now()}.csv`, rows);
});

/* ============================================================
   DRAWER
   ============================================================ */
const drawerBack = $('#drawerBack');
const drawerBody = $('#drawerBody');

function closeDrawer() { drawerBack.classList.remove('open'); activeLead = null; }
$('#drawerClose').addEventListener('click', closeDrawer);
drawerBack.addEventListener('click', e => { if (e.target === drawerBack) closeDrawer(); });

async function openDrawer(id) {
  const lead = currentPageItems.find(l => l.id === id);
  if (!lead) return;
  activeLead = lead;
  $('#drawerTitle').textContent = lead.full_name;
  renderDrawer(lead);
  drawerBack.classList.add('open');
}

function renderDrawer(l) {
  const notesHtml = (l.admin_notes || []).map(n => `
    <div class="adm-note">
      <div>${esc(n.text)}</div>
      <div class="meta">${esc(n.author || 'Admin')} · ${fmtDateTime(n.at)}</div>
    </div>`).join('') || `<p class="adm-muted" style="font-size:.85rem">No notes yet</p>`;

  drawerBody.innerHTML = `
    <div class="adm-detail-block">
      <h3>Contact</h3>
      <div class="adm-detail-line"><b>Email</b><span>${esc(l.email)}</span></div>
      <div class="adm-detail-line"><b>WhatsApp</b><span>${esc(l.whatsapp)}</span></div>
      <div class="adm-detail-line"><b>City</b><span>${esc(l.city || '—')}</span></div>
      <div class="adm-detail-line"><b>Tracking ID</b><span><code>${esc(l.tracking_id)}</code></span></div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <a class="adm-btn adm-btn-sm" href="${waLink('Hi ' + l.full_name + '! I wanted to discuss your order (' + l.tracking_id + ').')}" target="_blank" rel="noopener">WhatsApp</a>
        <a class="adm-btn adm-btn-sm" href="mailto:${esc(l.email)}?subject=${encodeURIComponent('Your order ' + l.tracking_id)}">Email</a>
      </div>
    </div>

    <div class="adm-detail-block">
      <h3>Portfolio content</h3>
      <div class="adm-detail-line"><b>Title</b><span>${esc(l.profession_title || '—')}</span></div>
      <div class="adm-detail-line"><b>Style</b><span>${esc(l.style_pref || '—')}</span></div>
      <div class="adm-detail-line"><b>Domain pref</b><span>${esc(l.domain_pref || '—')}</span></div>
      <p style="margin-top:10px;font-size:.85rem;color:var(--muted)">${esc(l.bio || '—')}</p>
      <div class="adm-chips" style="margin-top:8px">${(l.skills || []).map(s => `<span class="adm-chip">${esc(s)}</span>`).join('') || ''}</div>
      ${(l.projects || []).length ? `<div style="margin-top:10px;font-size:.83rem">${l.projects.map(p => `<div>• ${esc(p)}</div>`).join('')}</div>` : ''}
      ${l.notes ? `<p style="margin-top:10px;font-size:.83rem"><b>Notes:</b> ${esc(l.notes)}</p>` : ''}
    </div>

    <div class="adm-detail-block">
      <h3>Files</h3>
      <div class="adm-detail-line"><b>Resume</b>
        <span>${l.resume_url ? `<span class="file-link" id="resumeLink">Get link</span>` : (l.needs_content ? 'Content likhwana hai' : '—')}</span></div>
      <div class="adm-detail-line"><b>Photo</b>
        <span>${l.avatar_url ? `<span class="file-link" id="avatarLink">Get link</span>` : '—'}</span></div>
    </div>

    <div class="adm-detail-block">
      <h3>Status &amp; payment</h3>
      <div class="adm-field">
        <label for="statusSel">Order status</label>
        <select id="statusSel">
          ${STATUS_OPTIONS.map(s => `<option value="${s}" ${s === l.status ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}
        </select>
      </div>
      <div class="adm-field">
        <label for="demoUrlInput">Demo URL</label>
        <input id="demoUrlInput" type="url" value="${esc(l.demo_url || '')}" placeholder="https://...">
      </div>
      <label class="adm-check" style="margin-bottom:10px">
        <input type="checkbox" id="advancePaid" ${l.advance_paid ? 'checked' : ''}>
        Advance paid — ${money(l.advance_amount)} ${l.advance_paid_at ? '(' + fmtDate(l.advance_paid_at) + ')' : ''}
      </label>
      <label class="adm-check">
        <input type="checkbox" id="finalPaid" ${l.final_paid ? 'checked' : ''}>
        Final paid — ${money(l.final_amount)} ${l.final_paid_at ? '(' + fmtDate(l.final_paid_at) + ')' : ''}
      </label>
    </div>

    <div class="adm-detail-block">
      <h3>Internal notes</h3>
      <div id="notesList">${notesHtml}</div>
      <div class="adm-field" style="margin-top:12px">
        <textarea id="noteInput" placeholder="Naya note likhein…" style="min-height:60px"></textarea>
      </div>
      <button class="adm-btn adm-btn-sm" id="addNoteBtn" type="button">Add note</button>
    </div>`;

  $('#resumeLink')?.addEventListener('click', async () => {
    const url = await getSignedUrl(CONFIG.BUCKETS.resumes, l.resume_url);
    if (url) window.open(url, '_blank'); else toast('Link not generated', 'err');
  });
  $('#avatarLink')?.addEventListener('click', async () => {
    const url = await getSignedUrl(CONFIG.BUCKETS.avatars, l.avatar_url);
    if (url) window.open(url, '_blank'); else toast('Link not generated', 'err');
  });

  $('#addNoteBtn').addEventListener('click', async () => {
    const text = $('#noteInput').value.trim();
    if (!text) return;
    const updated = await adminAddLeadNote(l.id, l.admin_notes, text, profile.full_name || profile.email);
    if (updated) {
      Object.assign(l, updated);
      const idx = currentPageItems.findIndex(x => x.id === l.id);
      if (idx > -1) currentPageItems[idx] = updated;
      renderDrawer(l);
      toast('Note added successfully', 'ok');
    } else toast('Note save failed', 'err');
  });
}

$('#saveLeadBtn').addEventListener('click', async () => {
  if (!activeLead) return;
  const btn = $('#saveLeadBtn');
  btn.disabled = true; btn.textContent = 'Saving…';

  const newStatus = $('#statusSel').value;
    const demoUrl = $('#demoUrlInput').value.trim() || null;
    let advPaid = $('#advancePaid').checked;
    let finPaid = $('#finalPaid').checked;
    
    // Auto-sync logic so admin doesn't have to manually check the boxes if they change the status
    const statIdx = Object.keys(STATUS_LABEL).indexOf(newStatus);
    const advIdx = Object.keys(STATUS_LABEL).indexOf('advance_paid');
    const finIdx = Object.keys(STATUS_LABEL).indexOf('final_paid');
    
    if (statIdx >= advIdx) advPaid = true;
    if (statIdx >= finIdx) finPaid = true;
    
    // Reflect back to UI just in case
    $('#advancePaid').checked = advPaid;
    $('#finalPaid').checked = finPaid;
    

  const patch = { status: newStatus, demo_url: demoUrl, advance_paid: advPaid, final_paid: finPaid };
  if (advPaid && !activeLead.advance_paid) patch.advance_paid_at = new Date().toISOString();
  if (!advPaid) patch.advance_paid_at = null;
  if (finPaid && !activeLead.final_paid) patch.final_paid_at = new Date().toISOString();
  if (!finPaid) patch.final_paid_at = null;

  const updated = await adminUpdateLead(activeLead.id, patch);
  btn.disabled = false; btn.textContent = 'Save changes';

  if (!updated) { toast('Save failed, please try again', 'err'); return; }

  Object.assign(activeLead, updated);
  const idx = currentPageItems.findIndex(x => x.id === activeLead.id);
  if (idx > -1) currentPageItems[idx] = updated;
  toast('Changes save ho gaye', 'ok');
  load();
  renderDrawer(activeLead);
});

$('#deleteLeadBtn').addEventListener('click', async () => {
  if (!activeLead) return;
  const ok = await confirmModal(`"${activeLead.full_name}" Delete this order? This cannot be undone.`, 'Delete');
  if (!ok) return;
  const success = await adminDeleteLead(activeLead.id);
  if (!success) { toast('Delete failed', 'err'); return; }
  toast('Lead deleted successfully', 'ok');
  closeDrawer();
  load();
});

load();

// Realtime updates
sb.channel('admin-leads')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, payload => {
    load();
  })
  .subscribe();
