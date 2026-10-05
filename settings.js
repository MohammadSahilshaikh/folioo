// settings.js — business info, site behaviour (canvas/reduced-motion/maintenance),
// password change, activity log, JSON backup.
import { guard, $, esc, toast, fmtDateTime } from './shell.js';
import {
  sb, adminGetAllSettings, adminSetSetting, adminRecentActivity,
  adminListPlans, adminListProjects, adminGetAllContent,
} from './supabase-client.js';

const profile = await guard('Settings');
if (!profile) throw new Error('unauthorized');

/* ============================================================
   Toggle helper — small reusable on/off switch
   ============================================================ */
function wireToggle(el, initial, onChange) {
  let on = !!initial;
  const paint = () => el.classList.toggle('is-on', on);
  paint();
  el.addEventListener('click', () => { on = !on; paint(); onChange(on); });
  return { get: () => on, set: (v) => { on = v; paint(); } };
}

let canvasT, reducedT, maintT, maintTopT;

/* ============================================================
   Load current settings
   ============================================================ */
(async function init() {
  const rows = await adminGetAllSettings();
  const map = {};
  rows.forEach(r => { map[r.key] = r.value; });

  const business = map.business || {};
  $('#bWhatsapp').value = business.whatsapp || '';
  $('#bEmail').value = business.email || '';
  $('#bHours').value = business.hours || '';

  const theme = map.theme || { canvas: true, animations: 'full' };
  const maintenance = map.maintenance || { enabled: false, message: '' };
  $('#maintMessage').value = maintenance.message || '';

  canvasT = wireToggle($('#canvasToggle'), theme.canvas !== false, () => {});
  reducedT = wireToggle($('#reducedToggle'), theme.animations === 'reduced', () => {});
  maintT = wireToggle($('#maintToggle'), !!maintenance.enabled, syncMaintBanner);
  maintTopT = wireToggle($('#maintToggleTop'), !!maintenance.enabled, (v) => {
    maintT.set(v); syncMaintBanner(v);
  });
  syncMaintBanner(!!maintenance.enabled);

  loadActivity();
})();

function syncMaintBanner(on) {
  $('#maintBanner').style.display = on ? 'flex' : 'none';
  maintTopT?.set(on);
}

/* ============================================================
   Save: business info
   ============================================================ */
$('#saveBusinessBtn').addEventListener('click', async () => {
  const btn = $('#saveBusinessBtn');
  const whatsapp = $('#bWhatsapp').value.trim();
  if (whatsapp && !/^\d{10,15}$/.test(whatsapp.replace(/\D/g, ''))) {
    toast('Enter WhatsApp number in correct format (with country code, e.g., 919876543210)', 'err');
    return;
  }
  btn.disabled = true; btn.textContent = 'Saving...';
  const row = await adminSetSetting('business', {
    whatsapp, email: $('#bEmail').value.trim(), hours: $('#bHours').value.trim(),
  });
  btn.disabled = false; btn.textContent = 'Save business info';
  if (!row) { toast('Save failed', 'err'); return; }
  toast('Business info saved successfully', 'ok');
});

/* ============================================================
   Save: site behaviour (theme + maintenance)
   ============================================================ */
$('#saveBehaviourBtn').addEventListener('click', async () => {
  const btn = $('#saveBehaviourBtn');
  btn.disabled = true; btn.textContent = 'Saving...';

  const [r1, r2] = await Promise.all([
    adminSetSetting('theme', {
      canvas: canvasT.get(),
      animations: reducedT.get() ? 'reduced' : 'full',
    }),
    adminSetSetting('maintenance', {
      enabled: maintT.get(),
      message: $('#maintMessage').value.trim() || 'We are updating the site. Back in a bit.',
    }),
  ]);

  btn.disabled = false; btn.textContent = 'Save settings';
  if (!r1 || !r2) { toast('Save failed', 'err'); return; }
  syncMaintBanner(maintT.get());
  toast('Settings save ho gaye', 'ok');
});

/* ============================================================
   Change password
   ============================================================ */
$('#changePassBtn').addEventListener('click', async () => {
  const pass = $('#newPass').value;
  const confirm = $('#confirmPass').value;
  if (pass.length < 8) { toast('Password kam se kam 8 characters ka ho', 'err'); return; }
  if (pass !== confirm) { toast('Dono password match nahi karte', 'err'); return; }

  const btn = $('#changePassBtn');
  btn.disabled = true; btn.textContent = 'Update ho raha hai…';
  const { error } = await sb.auth.updateUser({ password: pass });
  btn.disabled = false; btn.textContent = 'Update password';

  if (error) { toast('Update nahi hua: ' + error.message, 'err'); return; }
  $('#newPass').value = ''; $('#confirmPass').value = '';
  toast('Password updated successfully', 'ok');
});

/* ============================================================
   Activity log
   ============================================================ */
async function loadActivity() {
  const box = $('#activityList');
  const rows = await adminRecentActivity(15);
  if (!rows.length) { box.innerHTML = `<p class="adm-muted">No recent activity</p>`; return; }
  box.innerHTML = rows.map(r => `
    <div class="activity-item">
      <b>${esc(r.profiles?.full_name || r.profiles?.email || 'Admin')} — ${esc(r.action || '')} ${esc(r.entity || '')}</b>
      <span>${fmtDateTime(r.created_at)}</span>
    </div>`).join('');
}

/* ============================================================
   Backup — plans + projects + content as one JSON file
   ============================================================ */
$('#backupBtn').addEventListener('click', async () => {
  toast('Backup taiyar ho raha hai…', 'info');
  const [plans, projects, faqContent, whyContent] = await Promise.all([
    adminListPlans(), adminListProjects(),
    adminGetAllContent('index'), Promise.resolve(null),
  ]);
  const backup = {
    exported_at: new Date().toISOString(),
    plans, projects,
    content: faqContent,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pixelforge-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Backup downloaded successfully', 'ok');
});
