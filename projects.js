// projects.js (admin) — portfolio CRUD with thumbnail upload + compression.
import { guard, $, $$, esc, toast, confirmModal } from './shell.js';
import { CONFIG } from './config.js';
import {
  adminListProjects, adminUpsertProject, adminDeleteProject, uploadFile, getPublicUrl,
} from './supabase-client.js';

const profile = await guard('Portfolio');
if (!profile) throw new Error('not authorized');

let projects = [];
let editingId = null;
let pendingThumbBlob = null;
let pendingThumbUrl = null;

const grid = $('#projGrid');

function cardHtml(p) {
  return `<article class="proj-card" data-id="${p.id}">
    <div class="proj-thumb">${p.thumbnail_url ? `<img src="${esc(p.thumbnail_url)}" alt="">` : ''}</div>
    <div class="proj-body">
      <h3>${esc(p.title)}</h3>
      <div class="proj-meta">${esc(p.category || '—')} · order ${p.sort_order ?? 0}</div>
      <div class="proj-flags">
        <span class="badge ${p.is_published ? 'badge-yes' : 'badge-no'}">${p.is_published ? 'Published' : 'Draft'}</span>
        ${p.is_featured ? '<span class="badge badge-yes">Featured</span>' : ''}
      </div>
      <div class="proj-actions">
        <button class="adm-btn adm-btn-sm" data-act="edit">Edit</button>
        <button class="adm-btn adm-btn-sm adm-btn-danger" data-act="del">Delete</button>
      </div>
    </div>
  </article>`;
}

async function load() {
  grid.innerHTML = `<div class="adm-card skel" style="height:220px"></div><div class="adm-card skel" style="height:220px"></div><div class="adm-card skel" style="height:220px"></div>`;
  projects = await adminListProjects();
  grid.innerHTML = projects.length ? projects.map(cardHtml).join('')
    : `<div class="adm-empty" style="grid-column:1/-1">No projects yet — "+ New project" se shuru karein</div>`;

  $$('.proj-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('[data-act="edit"]').addEventListener('click', () => openDrawer(id));
    card.querySelector('[data-act="del"]').addEventListener('click', async () => {
      const ok = await confirmModal('Delete this project?', 'Delete');
      if (!ok) return;
      const success = await adminDeleteProject(id);
      if (success) { toast('Deleted successfully', 'ok'); load(); } else toast('Action failed', 'err');
    });
  });
}

/* ---------- drawer ---------- */
const drawerBack = $('#drawerBack');
function closeDrawer() { drawerBack.classList.remove('open'); }
$('#drawerClose').addEventListener('click', closeDrawer);
drawerBack.addEventListener('click', e => { if (e.target === drawerBack) closeDrawer(); });

function resetForm() {
  $('#pTitle').value = ''; $('#pCategory').value = 'student'; $('#pOrder').value = '0';
  $('#pDesc').value = ''; $('#pTech').value = ''; $('#pDemo').value = '';
  $('#pFeatured').checked = false; $('#pPublished').checked = true;
  $('#thumbPreview').style.display = 'none';
  pendingThumbBlob = null; pendingThumbUrl = null;
}

function openDrawer(id) {
  editingId = id || null;
  resetForm();
  $('#deleteBtn').style.display = id ? 'inline-flex' : 'none';

  if (id) {
    const p = projects.find(x => String(x.id) === String(id));
    $('#drawerTitle').textContent = 'Edit project';
    $('#pTitle').value = p.title || '';
    $('#pCategory').value = p.category || 'student';
    $('#pOrder').value = p.sort_order ?? 0;
    $('#pDesc').value = p.description || '';
    $('#pTech').value = (p.tech || []).join(', ');
    $('#pDemo').value = p.demo_url || '';
    $('#pFeatured').checked = !!p.is_featured;
    $('#pPublished').checked = !!p.is_published;
    if (p.thumbnail_url) {
      $('#thumbPreview').src = p.thumbnail_url;
      $('#thumbPreview').style.display = 'block';
      pendingThumbUrl = p.thumbnail_url;
    }
  } else {
    $('#drawerTitle').textContent = 'New project';
  }
  drawerBack.classList.add('open');
}
$('#addBtn').addEventListener('click', () => openDrawer(null));

/* ---------- thumbnail upload ---------- */
function compressImage(file, targetW = 800, targetH = 500) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = reject;
    img.onload = () => {
      // Auto-crop (Cover) to 16:10 aspect ratio for perfect UI fitting
      const scale = Math.max(targetW / img.width, targetH / img.height);
      const scaledW = img.width * scale;
      const scaledH = img.height * scale;
      const dx = (targetW - scaledW) / 2;
      const dy = (targetH - scaledH) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = targetW; canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, dx, dy, scaledW, scaledH);
      
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('compress fail')), 'image/jpeg', 0.85);
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

$('#thumbDrop').addEventListener('click', () => $('#thumbInput').click());
$('#thumbInput').addEventListener('change', async () => {
  const file = $('#thumbInput').files[0];
  if (!file) return;
  try {
    pendingThumbBlob = await compressImage(file, 800, 500);
    const url = URL.createObjectURL(pendingThumbBlob);
    $('#thumbPreview').src = url;
    $('#thumbPreview').style.display = 'block';
    toast('Thumbnail ready — Save dabayein', 'ok');
  } catch { toast('Image processing failed', 'err'); }
});

/* ---------- save / delete ---------- */
$('#saveBtn').addEventListener('click', async () => {
  const title = $('#pTitle').value.trim();
  if (!title) { toast('Title zaroori hai', 'err'); return; }

  const btn = $('#saveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';

  let thumbnailUrl = pendingThumbUrl;
  if (pendingThumbBlob) {
    const path = `${Date.now()}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.jpg`;
    const res = await uploadFile(CONFIG.BUCKETS.projectMedia, path, pendingThumbBlob);
    if (res.ok) thumbnailUrl = getPublicUrl(CONFIG.BUCKETS.projectMedia, path);
    else toast('Thumbnail upload failed, saving other details', 'err');
  }

  const row = {
    title,
    category: $('#pCategory').value,
    description: $('#pDesc').value.trim(),
    tech: $('#pTech').value.split(',').map(s => s.trim()).filter(Boolean),
    thumbnail_url: thumbnailUrl,
    demo_url: $('#pDemo').value.trim() || null,
    is_featured: $('#pFeatured').checked,
    is_published: $('#pPublished').checked,
    sort_order: Number($('#pOrder').value) || 0,
  };
  if (editingId) row.id = editingId;

  const saved = await adminUpsertProject(row);
  btn.disabled = false; btn.textContent = 'Save';

  if (!saved) { toast('Save failed', 'err'); return; }
  toast('Project saved successfully', 'ok');
  closeDrawer();
  load();
});

$('#deleteBtn').addEventListener('click', async () => {
  if (!editingId) return;
  const ok = await confirmModal('Delete this project?', 'Delete');
  if (!ok) return;
  const success = await adminDeleteProject(editingId);
  if (success) { toast('Deleted successfully', 'ok'); closeDrawer(); load(); } else toast('Action failed', 'err');
});

load();
