// canvas-bg.js - reusable background canvas. Har page alag mode ke saath call karta hai.
// Modes: 'network' | 'blobs' | 'grid' | 'dots' | 'mesh' | 'bokeh' | 'waves' | 'glitch'
// Rules: pointer-events none, tab hidden par pause, reduced-motion par band, mobile par halka.

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initCanvas(mode = 'network', opts = {}) {
  if (reduced || document.body.dataset.canvas === 'off') return () => {};

  const accent  = opts.accent  || cssVar('--accent')   || '#00E5FF';
  const accent2 = opts.accent2 || cssVar('--accent-2') || '#7C3AED';

  const cv = document.createElement('canvas');
  cv.className = 'pf-canvas';
  cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);

  const ctx = cv.getContext('2d', { alpha: true });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0, raf = null, running = true, t = 0;
  const mouse = { x: -9999, y: -9999 };
  const isMobile = window.innerWidth < 768;
  const density = isMobile ? 0.4 : 1;

  let items = [];

  function resize() {
    W = cv.width  = Math.floor(innerWidth  * dpr);
    H = cv.height = Math.floor(innerHeight * dpr);
    cv.style.width  = innerWidth + 'px';
    cv.style.height = innerHeight + 'px';
    build();
  }

  const rnd = (a, b) => a + Math.random() * (b - a);

  function build() {
    items = [];
    const area = (W * H) / (dpr * dpr);
    if (mode === 'network' || mode === 'dots') {
      const n = Math.round(Math.min(90, area / 16000) * density);
      for (let i = 0; i < n; i++) items.push({
        x: rnd(0, W), y: rnd(0, H),
        vx: rnd(-.25, .25) * dpr, vy: rnd(-.25, .25) * dpr,
        r: rnd(1, 2.4) * dpr,
      });
    } else if (mode === 'blobs' || mode === 'mesh') {
      const n = Math.round((mode === 'mesh' ? 3 : 5) * (isMobile ? 0.6 : 1));
      for (let i = 0; i < n; i++) items.push({
        x: rnd(0, W), y: rnd(0, H),
        vx: rnd(-.18, .18) * dpr, vy: rnd(-.18, .18) * dpr,
        r: rnd(160, 300) * dpr,
        c: i % 2 ? accent2 : accent,
      });
    } else if (mode === 'bokeh') {
      const n = Math.round(26 * density);
      for (let i = 0; i < n; i++) items.push({
        x: rnd(0, W), y: rnd(0, H),
        vy: rnd(-.2, -.05) * dpr, r: rnd(6, 34) * dpr,
        a: rnd(.05, .18), c: Math.random() > .5 ? accent : accent2,
      });
    }
  }

  function draw() {
    if (!running) return;
    t += 0.006;
    ctx.clearRect(0, 0, W, H);

    switch (mode) {
      case 'network': drawNetwork(); break;
      case 'dots':    drawDots();    break;
      case 'blobs':
      case 'mesh':    drawBlobs();   break;
      case 'grid':    drawGrid();    break;
      case 'bokeh':   drawBokeh();   break;
      case 'waves':   drawWaves();   break;
      case 'glitch':  drawGlitch();  break;
    }
    raf = requestAnimationFrame(draw);
  }

  function step(p) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > W) p.vx *= -1;
    if (p.y < 0 || p.y > H) p.vy *= -1;
  }

  function drawNetwork() {
    const LINK = 130 * dpr;
    items.forEach(step);
    // lines
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK) {
          ctx.globalAlpha = (1 - d / LINK) * 0.28;
          ctx.strokeStyle = accent;
          ctx.lineWidth = 1 * dpr;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    // nodes + mouse repel
    items.forEach(p => {
      const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y);
      if (dm < 120 * dpr) {
        p.x += (p.x - mouse.x) / dm * 1.2;
        p.y += (p.y - mouse.y) / dm * 1.2;
      }
      ctx.globalAlpha = .75;
      ctx.fillStyle = dm < 160 * dpr ? accent2 : accent;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawDots() {
    const off = (window.scrollY || 0) * 0.15 * dpr;
    items.forEach((p, i) => {
      step(p);
      ctx.globalAlpha = .5;
      ctx.fillStyle = i % 3 ? accent : accent2;
      ctx.beginPath();
      ctx.arc(p.x, (p.y - off + H) % H, p.r, 0, 7);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawBlobs() {
    ctx.globalCompositeOperation = 'lighter';
    items.forEach(p => {
      step(p);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, hexA(p.c, .32));
      g.addColorStop(1, hexA(p.c, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawGrid() {
    const gap = 46 * dpr;
    ctx.lineWidth = 1 * dpr;
    ctx.strokeStyle = hexA(accent, .1);
    ctx.beginPath();
    for (let x = 0; x < W; x += gap) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y < H; y += gap) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    // sweeping light band
    const sx = ((t * 0.12) % 1.4 - 0.2) * W;
    const g = ctx.createLinearGradient(sx - 200 * dpr, 0, sx + 200 * dpr, 0);
    g.addColorStop(0, hexA(accent2, 0));
    g.addColorStop(.5, hexA(accent2, .12));
    g.addColorStop(1, hexA(accent2, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  function drawBokeh() {
    items.forEach(p => {
      p.y += p.vy;
      if (p.y < -p.r) { p.y = H + p.r; p.x = rnd(0, W); }
      ctx.globalAlpha = p.a;
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawWaves() {
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.strokeStyle = hexA(k % 2 ? accent2 : accent, .22 - k * .05);
      ctx.lineWidth = 1.4 * dpr;
      for (let x = 0; x <= W; x += 8 * dpr) {
        const y = H * (0.45 + k * 0.12)
          + Math.sin(x / (170 * dpr) + t * 2 + k) * 26 * dpr
          + Math.sin(x / (70 * dpr) - t * 1.4) * 8 * dpr;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function drawGlitch() {
    for (let i = 0; i < 14; i++) {
      const y = Math.random() * H;
      ctx.fillStyle = hexA(Math.random() > .5 ? accent : accent2, Math.random() * .12);
      ctx.fillRect(0, y, W, Math.random() * 3 * dpr);
    }
  }

  /* ---- events ---- */
  const onMove = e => { mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; };
  const onLeave = () => { mouse.x = mouse.y = -9999; };
  const onVis = () => {
    running = !document.hidden;
    if (running) raf = requestAnimationFrame(draw);
    else cancelAnimationFrame(raf);
  };

  addEventListener('resize', resize, { passive: true });
  if (!isMobile) {
    addEventListener('mousemove', onMove, { passive: true });
    addEventListener('mouseout', onLeave, { passive: true });
  }
  document.addEventListener('visibilitychange', onVis);

  resize();
  raf = requestAnimationFrame(draw);

  // cleanup function return karte hain
  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    removeEventListener('mousemove', onMove);
    removeEventListener('mouseout', onLeave);
    document.removeEventListener('visibilitychange', onVis);
    cv.remove();
  };
}

/* ---- helpers ---- */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function hexA(hex, a) {
  const h = (hex || '#00E5FF').replace('#', '');
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(f, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
