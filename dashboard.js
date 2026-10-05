// dashboard.js — stats + recent leads + recent messages.
import { guard, esc, fmtDate } from './shell.js';
import { money } from './config.js';
import { adminDashboardStats, adminRecentLeads, adminRecentMessages } from './supabase-client.js';

const profile = await guard('Dashboard');
if (!profile) throw new Error('not authorized'); // guard already redirected

const STATS_META = [
  ['totalLeads', 'Total leads', 'inbox'],
  ['weekLeads', 'This week', 'cal'],
  ['pendingReviews', 'Pending reviews', 'star'],
  ['liveSites', 'Live sites', 'globe'],
];
const ICO = {
  inbox: '<path d="M3 12h4.5l1.5 3h6l1.5-3H21" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="3" y="6" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.7"/>',
  star: '<path d="M12 2.5 15 9l7 .9-5.2 4.9 1.4 6.9L12 18l-6.2 3.7 1.4-6.9L2 9.9 9 9l3-6.5Z"/>',
  globe: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" fill="none" stroke="currentColor" stroke-width="1.7"/>',
};

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

(async function load() {
  const [stats, leads, messages] = await Promise.all([
    adminDashboardStats(), adminRecentLeads(8), adminRecentMessages(5),
  ]);

  document.getElementById('statsGrid').innerHTML = STATS_META.map(([key, label, ic]) => `
    <div class="adm-card adm-stat">
      <div class="adm-stat-ico"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6">${ICO[ic]}</svg></div>
      <b>${stats[key]}</b>
      <span>${label}</span>
    </div>`).join('');

  document.getElementById('statCollected').textContent = money(stats.collected);
  document.getElementById('statPending').textContent = money(stats.pending);

  const body = document.getElementById('recentLeadsBody');
  body.innerHTML = leads.length ? leads.map(l => `
    <tr class="clickable" onclick="location.href='leads.html?id=${l.id}'">
      <td>${esc(l.full_name)}</td>
      <td>${esc(l.plan_snapshot?.name || '—')}</td>
      <td><span class="badge badge-${l.status}">${esc(STATUS_LABEL[l.status] || l.status)}</span></td>
      <td>${money(l.total_amount)}</td>
      <td>${fmtDate(l.created_at)}</td>
    </tr>`).join('') : `<tr><td colspan="5" class="adm-empty">No leads yet</td></tr>`;

  const msgBox = document.getElementById('recentMessages');
  msgBox.innerHTML = messages.length ? messages.map(m => `
    <div class="msg-item">
      <b>${esc(m.name)} — ${esc(m.subject || 'No subject')}</b>
      <span>${esc((m.message || '').slice(0, 90))}${m.message?.length > 90 ? '…' : ''} · ${fmtDate(m.created_at)}</span>
    </div>`).join('') : `<p class="adm-muted">No messages yet</p>`;
})();
