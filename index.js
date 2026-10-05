// index.js - home page. Plans, work, reviews lazy load hote hain; FAQ content-driven hai.
import { boot, $, esc } from './common.js';
import { money, waLink } from './config.js';
import { getPlans, getProjects, getReviews, getContent, sb } from './supabase-client.js';
import { lazySection, skeleton, initReveal, initImages } from './lazy.js';

boot({ waMessage: 'Hi! I would like to get a portfolio website built.' });

/* Canvas - sirf desktop pe, aur page settle hone ke baad. Mobile pe battery bachate hain. */
if (window.matchMedia('(min-width: 768px)').matches) {
  const load = async () => {
    const { initCanvas } = await import('./canvas-bg.js');
    initCanvas('network');
  };
  if (window.requestIdleCallback) requestIdleCallback(load, { timeout: 1500 });
  else setTimeout(load, 600);
}



/* ---------------- Work ---------------- */
let renderHomeProjects = null;
lazySection($('#workSection'), async (sec) => {
  renderHomeProjects = async () => {
    const grid = sec.querySelector('#workGrid');
    grid.innerHTML = skeleton(3, 280);
  
    let list = await getProjects({ limit: 3, featuredOnly: true });
    if (!list.length) list = await getProjects({ limit: 3 });
  
    if (!list.length) {
      grid.innerHTML = `<div class="card">
        <h3>Demos coming soon</h3>
        <p style="color:var(--muted);font-size:.9rem">Request sample websites on WhatsApp in the meantime.</p>
        <a class="btn btn-sm" href="${waLink('Kuch sample websites dikhaiye')}" target="_blank" rel="noopener">Request samples</a>
      </div>`;
      return;
    }
  
    grid.innerHTML = list.map((p, i) => `
      <article class="card work reveal" data-d="${i + 1}">
        <div class="work-thumb">${p.thumbnail_url
          ? `<img data-src="${esc(p.thumbnail_url)}" alt="${esc(p.title)} website preview"
               loading="lazy" decoding="async" width="480" height="300">` : ''}</div>
        <div class="work-body">
          <h3>${esc(p.title)}</h3>
          <p>${esc((p.description || '').slice(0, 80))}</p>
          ${p.demo_url
            ? `<a class="text-link" href="${esc(p.demo_url)}" target="_blank" rel="noopener">View Project &rarr;</a>`
            : ''}
        </div>
      </article>`).join('');
    initImages(grid);
    initReveal('#workGrid .reveal');
  };
  await renderHomeProjects();
});

// Realtime updates for projects
sb.channel('public-projects-home')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, payload => {
    if (renderHomeProjects) renderHomeProjects();
  })
  .subscribe();

/* ---------------- Reviews ---------------- */
let renderHomeReviews = null;
lazySection($('#revSection'), async (sec) => {
  renderHomeReviews = async () => {
    const rail = sec.querySelector('#revRail');
    rail.innerHTML = skeleton(3, 180);
    const list = await getReviews({ limit: 6 });

    if (!list.length) {
      rail.innerHTML = `<div class="card">
        <h3>Your review could be first</h3>
        <p style="color:var(--muted);font-size:.9rem;margin:0">
          We'll ask for your feedback after your site goes live.</p></div>`;
      return;
    }

    rail.innerHTML = list.map(r => `
      <article class="card rev">
        <div class="stars" aria-label="${r.rating} out of 5">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        <p>${esc(r.comment)}</p>
        <div class="rev-who">
          <span class="avatar" aria-hidden="true">${esc((r.name || '?').trim()[0].toUpperCase())}</span>
          <span><b>${esc(r.name)}</b><small>${esc(r.plan_name || 'Portfolio website')}</small></span>
        </div>
      </article>`).join('');
  };
  await renderHomeReviews();
});

// Realtime updates
sb.channel('public-reviews-home')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, payload => {
    if (renderHomeReviews) renderHomeReviews();
  })
  .subscribe();

/* ---------------- FAQ ---------------- */
const FAQ_DEFAULT = [
  ['Do I need to pay anything to see the demo?',
   'No. Your total cost from ordering to seeing the demo is ₹0. First payment only after you see the demo and are satisfied.'],
  ['What if I don\'t like the demo?',
   'You pay nothing. We\'ll first make revisions; if it still doesn\'t work for you, we cancel the order - no charges at all.'],
  ['How many revisions can I request?',
   'Unlimited during the demo stage. After going live, minor text and photo changes are free for one year.'],
  ['What about domain and hosting costs?',
   'Domain at actual cost (~₹800/year). We add zero markup and set it up for free. Hosting is included in our plans.'],
  ['I don\'t have a CV - can you still build my site?',
   'Yes. The form has a "write content for me" option - we ask 2-3 questions and write it for you.'],
  ['Is my CV and photo safe with you?',
   'They are used only to build your website and never shared with anyone. Ask us and we\'ll delete them.'],
];

(async function faq() {
  const box = $('#faqList');
  if (!box) return;
  const c = await getContent('index');
  const items = Array.isArray(c.faq) && c.faq.length ? c.faq : FAQ_DEFAULT;

  box.innerHTML = items.map(it => {
    const [q, a] = Array.isArray(it) ? it : [it.q, it.a];
    return `<details><summary>${esc(q)}</summary><p class="ans">${esc(a)}</p></details>`;
  }).join('');

  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: items.map(it => {
      const [q, a] = Array.isArray(it) ? it : [it.q, it.a];
      return { '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } };
    }),
  });
  document.head.appendChild(ld);
})();
