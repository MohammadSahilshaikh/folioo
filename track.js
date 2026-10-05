// track.js — Tracking ID + email lookup via secure RPC (get_lead_status).
import { boot, $, esc, isEmail, toast } from './common.js';
import { money, waLink } from './config.js';
import { getLeadStatus } from './supabase-client.js';

boot({ waMessage: 'Hi! I want to check my order status.' });

const STAGES = [
  { key: 'new',          label: 'Order received',   desc: 'We have received your details' },
  { key: 'in_progress',  label: 'Designing',        desc: 'We are building your website' },
  { key: 'demo_sent',    label: 'Demo ready',       desc: 'Live demo link sent' },
  { key: 'advance_paid', label: '50% Advance Paid', desc: 'Half payment received' },
  { key: 'revisions',    label: 'Revisions',        desc: 'Making your requested changes' },
  { key: 'approved',     label: 'Approved',         desc: 'Final design approved' },
  { key: 'final_paid',   label: '50% Final Paid',   desc: 'Final payment received' },
  { key: 'live',         label: 'Live',             desc: 'Website is live on your domain' },
];

function stageIndex(status) {
  const map = {
    new: 0, 
    in_progress: 1,
    demo_sent: 2,
    advance_paid: 3, 
    revisions: 4,
    approved: 5,
    final_paid: 6,
    live: 7,
  };
  return map[status] ?? 0;
}

function statusLabel(status) {
  const map = {
    new: 'Order received', contacted: 'Contacted',
    in_progress: 'Designing', demo_sent: 'Demo sent',
    advance_paid: 'Advance received', revisions: 'Making revisions',
    approved: 'Approved', live: 'Live', cancelled: 'Cancelled',
  };
  return map[status] || status;
}

const form = $('#trackForm');
const btn = $('#trackBtn');
const result = $('#result');

function setErr(name, on) { form.querySelector(`[data-f="${name}"]`)?.classList.toggle('err', on); }

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const tid = form.tid.value.trim().toUpperCase();
  const email = form.temail.value.trim();

  let ok = true;
  if (!tid) { setErr('tid', true); ok = false; } else setErr('tid', false);
  if (!isEmail(email)) { setErr('temail', true); ok = false; } else setErr('temail', false);
  if (!ok) { toast('Please check the details', 'err'); return; }

  btn.disabled = true;
  btn.textContent = 'Searching...';
  result.innerHTML = '';

  const lead = await getLeadStatus(tid, email);

  btn.disabled = false;
  btn.textContent = 'Check status';

  if (!lead) {
    result.innerHTML = `<div class="card" style="margin-top:20px;text-align:center">
      <h3>Nothing found</h3>
      <p style="color:var(--muted);margin-top:8px">Please check both Tracking ID and email —
        must be the exact email used while ordering.</p>
      <a class="btn" href="${waLink('I cannot find my order, ID: ' + tid)}" target="_blank" rel="noopener"
        style="margin-top:14px">Ask on WhatsApp</a>
    </div>`;
    return;
  }

  if (lead.status === 'cancelled') {
    result.innerHTML = `<div class="card" style="margin-top:20px">
      <span class="status-badge">Order cancelled</span>
      <p style="color:var(--muted);margin-top:14px">If this was a mistake, let us know on WhatsApp.</p>
      <a class="btn" href="${waLink('My order shows cancelled, ID: ' + lead.tracking_id)}" target="_blank" rel="noopener">Ask on WhatsApp</a>
    </div>`;
    return;
  }

  const idx = stageIndex(lead.status);
  const stepsHtml = STAGES.map((s, i) => `
    <div class="pstep ${i < idx ? 'done' : i === idx ? 'now' : ''}">
      <span class="pdot">${i < idx ? '✓' : ''}</span>
      <div class="ptext"><b>${esc(s.label)}</b><span>${esc(s.desc)}</span></div>
    </div>`).join('');

  result.innerHTML = `
    <div class="card" style="margin-top:20px">
      <span class="status-badge">${esc(statusLabel(lead.status))}</span>
      <h3 style="margin-top:16px">${esc(lead.full_name)} — ${esc(lead.plan_name || 'Website')}</h3>
      <div class="progress-track">${stepsHtml}</div>

      ${lead.demo_url ? `<a class="btn btn-primary btn-full" href="${esc(lead.demo_url)}" target="_blank" rel="noopener" style="margin-top:20px">View live demo</a>` : ''}

      <div style="margin-top:20px">
        <div class="money-row"><span>After demo</span>
          <span class="${lead.advance_paid ? 'paid' : 'unpaid'}">${money(lead.advance_amount)} ${lead.advance_paid ? '· Paid' : '· Pending'}</span></div>
        <div class="money-row"><span>At hosting</span>
          <span class="${lead.final_paid ? 'paid' : 'unpaid'}">${money(lead.final_amount)} ${lead.final_paid ? '· Paid' : '· Pending'}</span></div>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px;">
        <a class="btn" href="${waLink('Need an update on order, ID: ' + lead.tracking_id)}" target="_blank" rel="noopener" style="width:100%">Chat on WhatsApp</a>
        
        ${idx === 4 ? `<a class="btn btn-primary" href="${waLink('Hi! I want to leave a review for my website (ID: ' + lead.tracking_id + '):\n\nMy Rating (out of 5): \nMy Review: ')}" target="_blank" rel="noopener" style="width:100%; background: linear-gradient(120deg, #F59E0B, #FBBF24); box-shadow: 0 10px 26px -14px #F59E0B; border:none; color:#12121B !important;">🌟 Write a Review</a>` : ''}
      </div>
    </div>`;
});
