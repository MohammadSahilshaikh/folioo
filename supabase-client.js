// supabase-client.js — ek hi shared client, plus chhote helpers.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CONFIG } from './config.js';

export const sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

/* ---------- localStorage cache (10 min) ---------- */
const TTL = 10 * 60 * 1000;

export function cacheGet(key) {
  try {
    const raw = localStorage.getItem('pf:' + key);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw);
    if (Date.now() - t > TTL) { localStorage.removeItem('pf:' + key); return null; }
    return v;
  } catch { return null; }
}

export function cacheSet(key, value) {
  try { localStorage.setItem('pf:' + key, JSON.stringify({ t: Date.now(), v: value })); } catch {}
}

/* ---------- Safe query wrapper ----------
   Har call try/catch me. Fail hone par [] ya null return, page kabhi crash nahi hota. */
export async function safe(promise, fallback = null) {
  try {
    const { data, error } = await promise;
    if (error) { console.warn('[supabase]', error.message); return fallback; }
    return data ?? fallback;
  } catch (e) {
    console.warn('[supabase] network', e);
    return fallback;
  }
}

/* ---------- Cached fetchers jo poori site use karti hai ---------- */

export async function getPlans() {
  return await safe(sb.from('plans').select('*').eq('is_active', true).order('sort_order'), []);
}

export async function getAddons() {
  return await safe(sb.from('addons').select('*').eq('is_active', true).order('sort_order'), []);
}

export async function getProjects({ limit = 6, featuredOnly = false } = {}) {
  let q = sb.from('projects').select('*').eq('is_published', true).order('sort_order');
  if (featuredOnly) q = q.eq('is_featured', true);
  if (limit) q = q.limit(limit);
  return await safe(q, []);
}

export async function getReviews({ offset = 0, limit = 12 } = {}) {
  return await safe(
    sb.from('reviews').select('*').eq('status', 'approved')
      .order('created_at', { ascending: false }).range(offset, offset + limit - 1), []
  );
}

/** site_content: page-wise editable text/images. Admin panel isi table ko likhta hai. */
export async function getContent(pageKey) {
  const hit = cacheGet('content:' + pageKey);
  if (hit) return hit;
  const rows = await safe(
    sb.from('site_content').select('section_key, content').eq('page_key', pageKey), []
  );
  const map = {};
  rows.forEach(r => { map[r.section_key] = r.content; });
  if (rows.length) cacheSet('content:' + pageKey, map);
  return map;
}

export async function getSettings() {
  const hit = cacheGet('settings');
  if (hit) return hit;
  const rows = await safe(sb.from('settings').select('key, value'), []);
  const map = {};
  rows.forEach(r => { map[r.key] = r.value; });
  if (rows.length) cacheSet('settings', map);
  return map;
}

/* ---------- Paginated + filtered projects (work.html "Load more") ---------- */
export async function getProjectsPage({ category = 'all', offset = 0, limit = 6 } = {}) {
  try {
    let q = sb.from('projects').select('*', { count: 'exact' })
      .eq('is_published', true).order('sort_order');
    if (category !== 'all') q = q.eq('category', category);
    q = q.range(offset, offset + limit - 1);
    const { data, error, count } = await q;
    if (error) { console.warn('[supabase]', error.message); return { items: [], total: 0 }; }
    return { items: data || [], total: count || 0 };
  } catch (e) {
    console.warn('[supabase] network', e);
    return { items: [], total: 0 };
  }
}

/* ---------- Paginated + filtered reviews (reviews.html) ---------- */
export async function getReviewsPage({ filter = 'all', offset = 0, limit = 9 } = {}) {
  try {
    let q = sb.from('reviews').select('*', { count: 'exact' })
      .eq('status', 'approved').order('created_at', { ascending: false });
    if (filter === '5') q = q.eq('rating', 5);
    else if (filter === '4') q = q.eq('rating', 4);
    else if (filter === 'photo') q = q.not('photo_url', 'is', null);
    q = q.range(offset, offset + limit - 1);
    const { data, error, count } = await q;
    if (error) { console.warn('[supabase]', error.message); return { items: [], total: 0 }; }
    return { items: data || [], total: count || 0 };
  } catch (e) {
    console.warn('[supabase] network', e);
    return { items: [], total: 0 };
  }
}

/** Average rating + 5-star distribution, computed from just the rating column. */
export async function getReviewStats() {
  const rows = await safe(sb.from('reviews').select('rating').eq('status', 'approved'), []);
  const total = rows.length;
  const avg = total ? rows.reduce((s, r) => s + r.rating, 0) / total : 0;
  const dist = [5, 4, 3, 2, 1].map(n => ({
    n, count: rows.filter(r => r.rating === n).length,
  }));
  return { total, avg, dist };
}

/* ---------- File upload (resume / avatar / extra images) ---------- */
export async function uploadFile(bucket, path, file, onProgress) {
  // Supabase JS v2 doesn't expose upload progress directly on storage.upload;
  // we fake a smooth progress bar so the UI still feels responsive.
  let t;
  if (onProgress) {
    let p = 0;
    t = setInterval(() => { p = Math.min(p + 12, 88); onProgress(p); }, 140);
  }
  try {
    const { error } = await sb.storage.from(bucket).upload(path, file, {
      cacheControl: '3600', upsert: false,
      contentType: file.type || 'application/octet-stream',
    });
    clearInterval(t);
    if (error) { onProgress?.(0); return { ok: false, error: error.message }; }
    onProgress?.(100);
    return { ok: true, path };
  } catch (e) {
    clearInterval(t);
    onProgress?.(0);
    return { ok: false, error: e.message || 'Upload failed' };
  }
}

/* ---------- Lead insert (order.html submit) ---------- */
export async function insertLead(payload) {
  return await safe(sb.from('leads').insert(payload).select().single(), null);
}

/* ---------- Contact message insert ---------- */
export async function insertMessage(payload) {
  return await safe(sb.from('messages').insert(payload).select().single(), null);
}

/* ---------- Review insert ---------- */
export async function insertReview(payload) {
  return await safe(sb.from('reviews').insert(payload).select().single(), null);
}

/* ---------- Simple duplicate-guard: same email/whatsapp in last 24h ---------- */
export async function hasRecentLead(email, whatsapp) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const rows = await safe(
    sb.from('leads').select('id').gte('created_at', since)
      .or(`email.eq.${email},whatsapp.eq.${whatsapp}`), []
  );
  return rows.length > 0;
}

/* ---------- Public order tracking (safe RPC, limited columns) ---------- */
export async function getLeadStatus(trackingId, email) {
  try {
    const { data, error } = await sb.rpc('get_lead_status', {
      p_tracking_id: trackingId.trim(),
      p_email: email.trim(),
    });
    if (error) { console.warn('[supabase]', error.message); return null; }
    return (data && data[0]) || null;
  } catch (e) {
    console.warn('[supabase] network', e);
    return null;
  }
}

/* ============================================================================
   ADMIN HELPERS — sab admin/*.js files yahi se data padhte-likhte hain.
   Ye sab authenticated admin session pe depend karte hain (RLS is_admin()).
   ============================================================================ */

/* ---------- Auth ---------- */
export async function adminSignIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, user: data.user };
}
export async function adminSignOut() { await sb.auth.signOut(); }

export async function adminCurrentProfile() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;
  const { data, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  if (error) return null;
  return data;
}

/* ---------- Dashboard stats ---------- */
export async function adminDashboardStats() {
  const [leadsAll, leadsWeek, pendingReviews, live] = await Promise.all([
    safe(sb.from('leads').select('id,total_amount,advance_amount,final_amount,advance_paid,final_paid,status', { count: 'exact' }), []),
    safe(sb.from('leads').select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 864e5).toISOString()), null),
    safe(sb.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'), null),
    safe(sb.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'live'), null),
  ]);
  const collected = leadsAll.reduce((s, l) =>
    s + (l.advance_paid ? l.advance_amount || 0 : 0) + (l.final_paid ? l.final_amount || 0 : 0), 0);
  const pending = leadsAll.reduce((s, l) =>
    s + (l.advance_paid ? 0 : l.advance_amount || 0) + (l.final_paid ? 0 : l.final_amount || 0), 0);
  return {
    totalLeads: leadsAll.length,
    weekLeads: leadsWeek ?? 0,
    pendingReviews: pendingReviews ?? 0,
    liveSites: live ?? 0,
    collected, pending,
  };
}

export async function adminRecentLeads(limit = 8) {
  return await safe(sb.from('leads').select('*').order('created_at', { ascending: false }).limit(limit), []);
}
export async function adminRecentMessages(limit = 5) {
  return await safe(sb.from('messages').select('*').order('created_at', { ascending: false }).limit(limit), []);
}

/* ---------- Leads (admin CRUD) ---------- */
export async function adminListLeads({ search = '', status = 'all', offset = 0, limit = 20 } = {}) {
  try {
    let q = sb.from('leads').select('*', { count: 'exact' }).order('created_at', { ascending: false });
    if (status !== 'all') q = q.eq('status', status);
    if (search.trim()) {
      const s = search.trim();
      q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,whatsapp.ilike.%${s}%,tracking_id.ilike.%${s}%`);
    }
    q = q.range(offset, offset + limit - 1);
    const { data, error, count } = await q;
    if (error) { console.warn('[supabase]', error.message); return { items: [], total: 0 }; }
    return { items: data || [], total: count || 0 };
  } catch (e) { console.warn(e); return { items: [], total: 0 }; }
}

export async function adminUpdateLead(id, patch) {
  return await safe(sb.from('leads').update(patch).eq('id', id).select().single(), null);
}

export async function adminAddLeadNote(id, currentNotes, text, author) {
  const notes = Array.isArray(currentNotes) ? [...currentNotes] : [];
  notes.unshift({ text, author: author || 'Admin', at: new Date().toISOString() });
  return await adminUpdateLead(id, { admin_notes: notes });
}

export async function adminDeleteLead(id) {
  const { error } = await sb.from('leads').delete().eq('id', id);
  return !error;
}

/** Private-bucket file ka temporary signed URL (1 hour). */
export async function getSignedUrl(bucket, path, expiresIn = 3600) {
  try {
    const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) { console.warn('[storage]', error.message); return null; }
    return data.signedUrl;
  } catch (e) { console.warn(e); return null; }
}

/** Public-bucket file ka direct URL (project-media, site-assets). */
export function getPublicUrl(bucket, path) {
  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
}

/* ---------- Messages / callbacks ---------- */
export async function adminListMessages({ onlyUnread = false } = {}) {
  let q = sb.from('messages').select('*').order('created_at', { ascending: false });
  if (onlyUnread) q = q.eq('is_read', false);
  return await safe(q, []);
}
export async function adminMarkMessageRead(id, read = true) {
  return await safe(sb.from('messages').update({ is_read: read }).eq('id', id).select().single(), null);
}
export async function adminDeleteMessage(id) {
  const { error } = await sb.from('messages').delete().eq('id', id);
  return !error;
}
export async function adminListCallbacks() {
  return await safe(sb.from('callbacks').select('*').order('created_at', { ascending: false }), []);
}
export async function adminListSubscribers() {
  return await safe(sb.from('subscribers').select('*').order('created_at', { ascending: false }), []);
}

/* ---------- Reviews (admin) ---------- */
export async function adminListReviews(status = 'pending') {
  let q = sb.from('reviews').select('*').order('created_at', { ascending: false });
  if (status !== 'all') q = q.eq('status', status);
  return await safe(q, []);
}
export async function adminSetReviewStatus(id, status) {
  const patch = { status };
  if (status === 'approved') patch.approved_at = new Date().toISOString();
  return await safe(sb.from('reviews').update(patch).eq('id', id).select().single(), null);
}
export async function adminSetReviewFeatured(id, featured) {
  return await safe(sb.from('reviews').update({ is_featured: featured }).eq('id', id).select().single(), null);
}
export async function adminDeleteReview(id) {
  const { error } = await sb.from('reviews').delete().eq('id', id);
  return !error;
}

/* ---------- Projects (portfolio manager) ---------- */
export async function adminListProjects() {
  return await safe(sb.from('projects').select('*').order('sort_order'), []);
}
export async function adminUpsertProject(row) {
  return await safe(sb.from('projects').upsert(row).select().single(), null);
}
export async function adminDeleteProject(id) {
  const { error } = await sb.from('projects').delete().eq('id', id);
  return !error;
}

/* ---------- Plans + addons ---------- */
export async function adminListPlans() {
  return await safe(sb.from('plans').select('*').order('sort_order'), []);
}
export async function adminUpsertPlan(row) {
  localStorage.removeItem('pf:plans');
  return await safe(sb.from('plans').upsert(row).select().single(), null);
}
export async function adminDeletePlan(id) {
  localStorage.removeItem('pf:plans');
  const { error } = await sb.from('plans').delete().eq('id', id);
  return !error;
}
export async function adminListAddons() {
  return await safe(sb.from('addons').select('*').order('sort_order'), []);
}
export async function adminUpsertAddon(row) {
  localStorage.removeItem('pf:addons');
  return await safe(sb.from('addons').upsert(row).select().single(), null);
}
export async function adminDeleteAddon(id) {
  localStorage.removeItem('pf:addons');
  const { error } = await sb.from('addons').delete().eq('id', id);
  return !error;
}

/* ---------- Site content + settings ---------- */
export async function adminGetAllContent(pageKey) {
  return await safe(sb.from('site_content').select('*').eq('page_key', pageKey), []);
}
export async function adminSetContent(pageKey, sectionKey, content) {
  return await safe(
    sb.from('site_content')
      .upsert({ page_key: pageKey, section_key: sectionKey, content }, { onConflict: 'page_key,section_key' })
      .select().single(), null
  );
}
export async function adminGetAllSettings() {
  return await safe(sb.from('settings').select('*'), []);
}
export async function adminSetSetting(key, value) {
  return await safe(
    sb.from('settings').upsert({ key, value }, { onConflict: 'key' }).select().single(), null
  );
}

/* ---------- Activity log ---------- */
export async function adminLog(adminId, action, entity, entityId, meta = {}) {
  try { await sb.from('activity_logs').insert({ admin_id: adminId, action, entity, entity_id: String(entityId), meta }); }
  catch (e) { console.warn('log fail', e); }
}
export async function adminRecentActivity(limit = 20) {
  return await safe(
    sb.from('activity_logs').select('*, profiles(full_name,email)').order('created_at', { ascending: false }).limit(limit), []
  );
}

/* ---------- Tracking ID ---------- */
export function makeTrackingId() {
  const y = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const t = Date.now().toString(36).slice(-3).toUpperCase();
  return `PF-${y}-${rand}${t}`;
}
