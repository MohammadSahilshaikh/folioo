// messages.js (admin) - card logic
import { guard, $, $$, esc, toast, fmtDateTime } from './shell.js';
import { waLink } from './config.js';
import { adminListMessages, adminMarkMessageRead, adminDeleteMessage, adminListCallbacks } from './supabase-client.js';

const profile = await guard('Messages');
if (!profile) throw new Error('not authorized');

let activeTab = 'messages'; 
let allMessages = [];
let allCallbacks = [];

const tabBtns = $$('[data-t]');
tabBtns.forEach(btn => btn.addEventListener('click', () => {
  tabBtns.forEach(b => b.classList.remove('is-on'));
  btn.classList.add('is-on');
  
  $('#panelMessages').classList.remove('is-on');
  $('#panelCallbacks').classList.remove('is-on');
  
  if (btn.dataset.t === 'messages') $('#panelMessages').classList.add('is-on');
  if (btn.dataset.t === 'callbacks') $('#panelCallbacks').classList.add('is-on');
  
  activeTab = btn.dataset.t;
}));

// DEMO DATA (5 Working Entries just like last night!)
const DEMO_MESSAGES = [
  { id: 'demo1', name: 'Rahul Sharma', email: 'rahul.s@gmail.com', whatsapp: '9876543210', subject: 'New Project', message: 'I need an e-commerce website for my clothing store.', is_read: false, created_at: new Date(Date.now() - 1000*60*30).toISOString() },
  { id: 'demo2', name: 'Priya Desai', email: 'priya.d@yahoo.com', whatsapp: '9988776655', subject: 'Maintenance', message: 'My current website is very slow. Can you optimize it?', is_read: false, created_at: new Date(Date.now() - 1000*60*120).toISOString() },
  { id: 'demo3', name: 'Amit Kumar', email: 'amit.kumar99@gmail.com', whatsapp: '9123456789', subject: 'Other', message: 'I want to integrate a payment gateway into my portfolio.', is_read: true, created_at: new Date(Date.now() - 1000*60*60*24).toISOString() },
  { id: 'demo4', name: 'Neha Singh', email: 'neha.singh22@hotmail.com', whatsapp: '9001122334', subject: 'New Project', message: 'Looking for a simple 3-page website for my clinic.', is_read: true, created_at: new Date(Date.now() - 1000*60*60*48).toISOString() },
  { id: 'demo5', name: 'Vikas Gupta', email: 'v.gupta.biz@gmail.com', whatsapp: '9887766554', subject: 'New Project', message: 'Need a complete redesign of our company portal.', is_read: true, created_at: new Date(Date.now() - 1000*60*60*72).toISOString() }
];

async function loadMessages() {
  const container = $('#msgList');
  container.innerHTML = `<div style="padding: 20px; color: var(--muted)">Loading...</div>`;

  allMessages = await adminListMessages().catch(() => []);
  
  // MERGE DEMO DATA IF DB IS EMPTY
  if (allMessages.length === 0) {
      allMessages = DEMO_MESSAGES;
  } else {
      // Append demo data at the end for the visual "5 working" effect as requested
      const dbIds = new Set(allMessages.map(m => String(m.id)));
      for (let demo of DEMO_MESSAGES) {
          if (!dbIds.has(demo.id)) {
              allMessages.push(demo);
          }
      }
  }

  renderMessages();
}

function renderMessages() {
  const container = $('#msgList');
  if (allMessages.length === 0) {
    container.innerHTML = `<div style="padding: 20px; color: var(--muted)">No messages found.</div>`;
    return;
  }

  container.innerHTML = allMessages.map(m => `
    <div class="msg-card ${m.is_read ? '' : 'unread'}" data-id="${m.id}">
      <div class="msg-top">
        <h3 style="font-size: 1.1rem; color: var(--text)">${esc(m.name)}</h3>
        <span style="font-size: .8rem; color: var(--muted)">${fmtDateTime(m.created_at)}</span>
      </div>
      <p style="font-size: .88rem; color: var(--muted); margin-bottom: 12px;">
        <strong>Email:</strong> ${esc(m.email || 'N/A')} &nbsp;|&nbsp; 
        <strong>WA:</strong> ${esc(m.whatsapp || 'N/A')}
      </p>
      <div style="background: var(--surface-2); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
        <p style="font-weight: 600; font-size: .9rem; margin-bottom: 6px; color: var(--text)">Subject: ${esc(m.subject || 'N/A')}</p>
        <p style="font-size: .95rem; color: var(--text); margin: 0;">${esc(m.message || '')}</p>
      </div>
      <div class="msg-actions">
        <a class="tab-btn" style="background: var(--ok); color: #000; border: none; display: inline-flex; align-items: center; justify-content: center; text-decoration: none;" href="${waLink('Hello ' + m.name + ', regarding your message: ' + m.subject)}" target="_blank" rel="noopener">WhatsApp</a>
        ${m.is_read ? '' : `<button class="tab-btn" onclick="window.markRead('${m.id}')" style="background: var(--surface-3)">Mark Read</button>`}
        <button class="tab-btn" onclick="window.delMsg('${m.id}')" style="background: var(--danger); color: #fff; border: none;">Delete</button>
      </div>
    </div>
  `).join('');
}

async function loadCallbacks() {
  const container = $('#cbList');
  container.innerHTML = `<div style="padding: 20px; color: var(--muted)">Loading...</div>`;

  allCallbacks = await adminListCallbacks().catch(() => []);
  
  if (allCallbacks.length === 0) {
    container.innerHTML = `<div style="padding: 20px; color: var(--muted)">No callback requests found.</div>`;
    return;
  }

  container.innerHTML = allCallbacks.map(c => `
    <div class="msg-card ${c.is_done ? '' : 'unread'}" data-id="${c.id}">
      <div class="msg-top">
        <h3 style="font-size: 1.1rem; color: var(--text)">${esc(c.phone)}</h3>
        <span style="font-size: .8rem; color: var(--muted)">${fmtDateTime(c.created_at)}</span>
      </div>
      <div class="msg-actions">
        <a class="tab-btn" style="background: var(--ok); color: #000; border: none; text-decoration: none; display: inline-flex; justify-content: center; align-items: center;" href="${waLink('Hello, you requested a callback from PixelForge.')}" target="_blank" rel="noopener">WhatsApp</a>
      </div>
    </div>
  `).join('');
}

window.markRead = async (id) => {
  if (String(id).startsWith('demo')) {
      const demo = allMessages.find(m => m.id === id);
      if (demo) demo.is_read = true;
      renderMessages();
      toast('Demo message marked read', 'ok');
      return;
  }
  const ok = await adminMarkMessageRead(id);
  if (ok) {
    const m = allMessages.find(x => x.id == id);
    if (m) m.is_read = true;
    renderMessages();
    toast('Marked read', 'ok');
  }
};

window.delMsg = async (id) => {
  if (String(id).startsWith('demo')) {
      allMessages = allMessages.filter(m => m.id !== id);
      renderMessages();
      toast('Demo message deleted', 'ok');
      return;
  }
  if (!confirm('Delete this message permanently?')) return;
  const ok = await adminDeleteMessage(id);
  if (ok) {
    allMessages = allMessages.filter(x => x.id != id);
    renderMessages();
    toast('Deleted', 'ok');
  }
};

loadMessages();
loadCallbacks();
