// work.js - filter chips + paginated grid + load more.
import { boot, $, $$, esc } from './common.js';
import { getProjectsPage, sb } from './supabase-client.js';
import { skeleton, initReveal, initImages } from './lazy.js';

boot({ waMessage: 'Hi! I want to see more sample websites.' });

const PAGE_SIZE = 6;
let category = 'all';
let offset = 0;
let total = 0;

const grid = $('#workGrid');
const loadWrap = $('#loadMoreWrap');
const loadBtn = $('#loadMoreBtn');

function cardHtml(p) {
  return `
    <article class="card work reveal">
      <div class="work-thumb">
        ${p.category ? `<span class="work-cat">${esc(p.category)}</span>` : ''}
        ${p.thumbnail_url
          ? `<img data-src="${esc(p.thumbnail_url)}" alt="${esc(p.title)} website preview"
               loading="lazy" decoding="async" width="480" height="300">` : ''}
      </div>
      <div class="work-body">
        <h3>${esc(p.title)}</h3>
        <p>${esc((p.description || '').slice(0, 90))}</p>
        <div class="tags">${(p.tech || []).slice(0, 4).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <div class="actions">
          ${p.demo_url
            ? `<a class="text-link" href="${esc(p.demo_url)}" target="_blank" rel="noopener">View Project &rarr;</a>`
            : `<span class="tag">Coming soon</span>`}
        </div>
      </div>
    </article>`;
}

async function loadPage(reset = false) {
  if (reset) { offset = 0; grid.innerHTML = skeleton(6, 260); }
  loadBtn.disabled = true;
  loadBtn.textContent = 'Load ho raha hai…';

  const { items, total: t } = await getProjectsPage({ category, offset, limit: PAGE_SIZE });
  total = t;

  if (reset) grid.innerHTML = '';
  if (!items.length && offset === 0) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <h3>No demos in this category right now</h3>
      <p>Try another category, or go back to "All".</p></div>`;
  } else {
    grid.insertAdjacentHTML('beforeend', items.map(cardHtml).join(''));
    initImages(grid);
    initReveal('#workGrid .reveal');
  }

  offset += items.length;
  loadBtn.disabled = false;
  loadBtn.textContent = 'Load more';
  loadWrap.style.display = offset < total ? 'block' : 'none';
}

$$('#filters .fchip').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('is-on')) return;
    $$('#filters .fchip').forEach(b => b.classList.remove('is-on'));
    btn.classList.add('is-on');
    category = btn.dataset.cat;
    loadPage(true);
  });
});

loadBtn.addEventListener('click', () => loadPage(false));

loadPage(true);

// Realtime updates
sb.channel('public-work')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, payload => {
    offset = 0;
    loadPage(true);
  })
  .subscribe();
