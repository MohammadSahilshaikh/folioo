// contact.js
import { boot, $, $$, esc, isEmail, isPhone, toast, icon } from './common.js';
import { CONFIG, waLink } from './config.js';
import { insertMessage, getSettings } from './supabase-client.js';

boot({ waMessage: 'Hi! I wanted to ask something.' });

$('#waBtn').href = waLink('Hi! I want to talk about a website.');
$('#infoEmail').textContent = CONFIG.EMAIL;
$('#infoHours').textContent = CONFIG.HOURS;

getSettings().then(s => {
  if (s.business) {
    if (s.business.email) $('#infoEmail').textContent = s.business.email;
    if (s.business.hours) $('#infoHours').textContent = s.business.hours;
    if (s.business.whatsapp) $('#waBtn').href = 'https://wa.me/' + s.business.whatsapp + '?text=' + encodeURIComponent('Hi! I want to talk about a website.');
  }
  const socials = { ...CONFIG.SOCIALS, ...(s.socials || {}) };
  const box = $('#socialsCard');
  box.innerHTML = Object.entries(socials)
    .filter(([k, v]) => v && ['instagram', 'facebook', 'github', 'linkedin'].includes(k))
    .map(([k, v]) => `<a class="soc2" href="${esc(v)}" target="_blank" rel="noopener" aria-label="${k}">${icon(k, 18)}</a>`)
    .join('');
}).catch(() => {});

const form = $('#contactForm');
const btn = $('#sendBtn');

function setErr(name, on) {
  const f = form.querySelector(`[data-f="${name}"]`);
  f?.classList.toggle('err', on);
}

function validate(data) {
  let ok = true;
  const checks = {
    name: data.name.trim().length > 1,
    email: isEmail(data.email),
    whatsapp: isPhone(data.whatsapp),
    subject: !!data.subject,
    message: data.message.trim().length > 4,
  };
  for (const [k, v] of Object.entries(checks)) { setErr(k, !v); if (!v) ok = false; }
  return ok;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (form.website.value) { toast('Message sent', 'ok'); form.reset(); return; }

  const data = Object.fromEntries(new FormData(form).entries());
  if (!validate(data)) { toast('Please check highlighted fields', 'err'); return; }

  btn.disabled = true;
  btn.textContent = 'Sending...';

  const row = await insertMessage({
    name: data.name.trim(),
    email: data.email.trim(),
    whatsapp: data.whatsapp.replace(/\D/g, '').slice(-10),
    subject: data.subject,
    message: data.message.trim(),
  });

  btn.disabled = false;
  btn.textContent = 'Send Message';

  if (!row) {
    toast('Error sending message - please try WhatsApp', 'err');
    return;
  }

  toast('Message received! We will reply soon.', 'ok');
  form.reset();
});

$$('#contactForm input, #contactForm select, #contactForm textarea').forEach(el =>
  el.addEventListener('input', () => setErr(el.name, false)));
