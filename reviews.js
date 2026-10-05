// reviews.js - Public reviews page
import { boot, $, esc } from './common.js';
import { getReviews, sb } from './supabase-client.js';
import { skeleton, initReveal } from './lazy.js';

boot({ waMessage: 'Hi! I want to get a website built.' });

const grid = $('#revGrid');
let offset = 0;
const limit = 12;

async function load() {
  if (offset === 0) grid.innerHTML = skeleton(6, 180);
  const list = await getReviews({ offset, limit });

  if (!list.length && offset === 0) {
    grid.innerHTML = `<div class="card" style="grid-column:1/-1;text-align:center;padding:40px 20px">
      <h3>No reviews yet</h3>
      <p style="color:var(--muted)">Check back later!</p></div>`;
    $('#loadMoreWrap').style.display = 'none';
    return;
  }

  const html = list.map(r => `
    <article class="card rev reveal">
      <div class="stars" aria-label="${r.rating} out of 5">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
      <p>${esc(r.comment)}</p>
      <div class="rev-who">
        <span class="avatar" aria-hidden="true">${esc((r.name || '?').trim()[0].toUpperCase())}</span>
        <span><b>${esc(r.name)}</b><small>${esc(r.plan_name || 'Portfolio website')}</small></span>
      </div>
    </article>
  `).join('');

  if (offset === 0) grid.innerHTML = html;
  else grid.insertAdjacentHTML('beforeend', html);

  initReveal('#revGrid .reveal');

  if (list.length < limit) {
    $('#loadMoreWrap').style.display = 'none';
  } else {
    $('#loadMoreWrap').style.display = 'flex';
  }
}

$('#loadMoreBtn').addEventListener('click', () => {
  offset += limit;
  load();
});

load();


// Realtime updates
sb.channel('public-reviews')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, payload => {
    offset = 0;
    load();
  })
  .subscribe();
