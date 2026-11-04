/* ============================================================ silk */
const SILK = 'rgba(255,255,255,0.75)';

function Rope(A, B, thick, opts) {
  opts = opts || {};
  this.n = 12;
  this.pts = [];
  for (let i = 0; i <= this.n; i++) {
    const t = i / this.n;
    const x = lerp(A.x, B.x, t), y = lerp(A.y, B.y, t);
    this.pts.push({ x, y, px: x, py: y, pin: (i === 0 || i === this.n) ? 1 : (opts.pinEnd === false && i === this.n ? 0 : 1) });
  }
  if (opts.freeEnd) this.pts[this.n].pin = 0;
  this.thick = thick;
  const d = hyp(B.x - A.x, B.y - A.y);
  this.rest = d / this.n * (1.01 + Math.random() * 0.005);
  this.phase = rand(TAU);
  this.age = 0;
  this.fade = 1;
  this.dying = 0;
  this.live = !!opts.live;
  this.dew = [];
  this.glint = rand(1);
  this.decor = null;
  this.decorDirty = true;
  this.decorT = 0;
  this.att = opts.att || null;
}
Rope.prototype.len = function () {
  let L = 0;
  for (let i = 1; i <= this.n; i++) L += hyp(this.pts[i].x - this.pts[i - 1].x, this.pts[i].y - this.pts[i - 1].y);
  return L;
};
Rope.prototype.step = function (dt) {
  const pts = this.pts, n = this.n;
  const dt2 = dt * dt;
  const B = ENG.t;
  for (let i = 0; i <= n; i++) {
    const p = pts[i];
    if (p.pin) continue;
    const vx = (p.x - p.px) * 0.975, vy = (p.y - p.py) * 0.975;
    const wind = (Math.sin(0.45 * B) * 0.6 + Math.sin(1.3 * B + 1.7) * 0.4) *
      (0.6 + 0.4 * Math.sin(1.1 * B + 0.012 * p.y + this.phase)) * 22 * dt2;
    p.px = p.x; p.py = p.y;
    p.x += vx + wind;
    p.y += vy + 110 * dt2;
  }
  /* pointer push */
  const pt = ENG.pointer;
  if (pt.has) {
    for (let i = 1; i < n; i++) {
      const p = pts[i];
      const dx = p.x - pt.x, dy = p.y - pt.y;
      const d = hyp(dx, dy);
      if (d < 36 && d > 0.001) {
        const f = (36 - d) / 36;
        p.x += dx / d * f * 2.2;
        p.y += dy / d * f * 2.2;
      }
    }
  }
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[i + 1];
      let dx = b.x - a.x, dy = b.y - a.y;
      let d = hyp(dx, dy) || 0.0001;
      const diff = (d - this.rest) / d;
      const ma = a.pin ? 0 : 0.5, mb = b.pin ? 0 : 0.5;
      const s = ma + mb || 1;
      a.x += dx * diff * (ma / s); a.y += dy * diff * (ma / s);
      b.x -= dx * diff * (mb / s); b.y -= dy * diff * (mb / s);
    }
    for (const p of pts) if (p.pin && p.fx !== undefined) { p.x = p.fx; p.y = p.fy; }
  }
};
Rope.prototype.vibrate = function (cx, cy, radius, strength) {
  let near = false;
  for (const p of this.pts) {
    const d = hyp(p.x - cx, p.y - cy);
    if (d < radius) {
      near = true;
      const f = strength * (1 - d / radius);
      p.px = p.x - (Math.random() - 0.5) * f * 6;
      p.py = p.y - (Math.random() - 0.5) * f * 6;
    }
  }
  if (near) {
    this.shake = 1;
    this.decorDirty = true;
    for (const dr of this.dew) {
      if (!dr.falling && Math.random() < 0.35) dr.sliding = true;
    }
  }
};

function webVibrate(x, y, radius, strength) {
  for (const r of ENG.ropes) r.vibrate(x, y, radius, strength);
  if (ENG.live) ENG.live.vibrate(x, y, radius, strength);
}

function addDew(rope) {
  const L = rope.len();
  const count = Math.max(0, Math.floor(L / 55 * (0.4 + Math.random())));
  for (let i = 0; i < count; i++) {
    rope.dew.push({ t: rand(0.08, 0.92), r: rand(1.6, 6.2), sliding: false, falling: false, vy: 0, fell: 0, x: 0, y: 0 });
  }
}

function ropePointAt(rope, t) {
  const pts = rope.pts, n = rope.n;
  const f = clamp(t, 0, 1) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const u = f - i;
  return {
    x: lerp(pts[i].x, pts[i + 1].x, u),
    y: lerp(pts[i].y, pts[i + 1].y, u),
    slope: (pts[i + 1].y - pts[i].y) / Math.max(0.001, hyp(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)),
    seg: i,
  };
}

function updateSilk(dt) {
  const sp = ENG.spider;
  if (!sp) return;

  /* live thread management */
  const spin = spiderSpinneret(sp);
  if (!ENG.live) {
    const start = ENG.lastAnchor || (sp.intro.stage < 3 ? { x: W / 2, y: -2 } : { x: spin.x, y: spin.y });
    ENG.live = new Rope(start, spin, 1.25, { live: true });
    if (!ENG.lastAnchor && sp.intro.stage < 3) { ENG.live.pts[0].x = W / 2; ENG.live.pts[0].y = -2; }
  }
  const live = ENG.live;
  /* keep end on spinneret */
  const endP = live.pts[live.n];
  endP.x = spin.x; endP.y = spin.y; endP.px = spin.x; endP.py = spin.y;
  const dNow = hyp(spin.x - live.pts[0].x, spin.y - live.pts[0].y);
  const restT = dNow / live.n * 1.01;
  live.rest += (restT - live.rest) * 0.25;

  /* attach check */
  if (ENG.anchorPts.length && live.len() > 40) {
    let best = null, bestD = 70;
    for (const P of ENG.anchorPts) {
      const d = hyp(P.x - spin.x, P.y - spin.y);
      if (d < bestD) { bestD = d; best = P; }
    }
    if (best) {
      const startD = hyp(best.x - live.pts[0].x, best.y - live.pts[0].y);
      const lineD = distToRope(best, live);
      if (startD > 30 && lineD > 54) attachLive(best);
    }
  }
  /* free space: drop a point every 120px when there are no anchors */
  if (!ENG.anchorPts.length) {
    const sp2 = ENG.spider;
    if (!ENG._freeAcc) ENG._freeAcc = { x: sp2.x, y: sp2.y, d: 0 };
    const acc = ENG._freeAcc;
    acc.d += hyp(sp2.x - acc.x, sp2.y - acc.y);
    acc.x = sp2.x; acc.y = sp2.y;
    if (acc.d > 120) {
      acc.d = 0;
      const r = new Rope({ x: spin.x, y: spin.y }, { x: spin.x + rand(-14, 14), y: spin.y + rand(18, 40) }, 0.8, { freeEnd: true });
      r.rest = r.len() / r.n * 1.02;
      ENG.ropes.push(r);
    }
  }

  /* step all ropes */
  live.step(dt);
  live.decorDirty = true;
  for (let i = ENG.ropes.length - 1; i >= 0; i--) {
    const r = ENG.ropes[i];
    r.age += dt;
    r.fade = 1 - 0.5 * Math.min(1, r.age / 90);
    if (r.dying > 0) {
      r.fade *= Math.max(0, 1 - r.dying);
      r.dying += 2.6 * dt;
      if (r.dying >= 1.02) { ENG.ropes.splice(i, 1); continue; }
    }
    r.step(dt);
    r.shake = Math.max(0, (r.shake || 0) - 2.4 * dt);
    updateDew(r, dt);
  }
  /* falling drops */
  for (let i = ENG.fallingDrops.length - 1; i >= 0; i--) {
    const dr = ENG.fallingDrops[i];
    dr.vy += 1100 * dt;
    dr.y += dr.vy * dt;
    dr.fell += dr.vy * dt;
    if (dr.fell > 10 && maskAlphaAt(dr.x, dr.y) > 40) {
      if (ENG.splats.length < 400) ENG.splats.push({ x: dr.x, y: dr.y, r: dr.r, a: 1 });
      ENG.fallingDrops.splice(i, 1);
    } else if (dr.y > H + 60) ENG.fallingDrops.splice(i, 1);
  }
  /* cap threads */
  while (ENG.ropes.length > 140) ENG.ropes.shift();
}

function distToRope(P, rope) {
  let best = 1e9;
  const pts = rope.pts;
  for (let i = 0; i < rope.n; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const L2 = dx * dx + dy * dy;
    let t = L2 ? ((P.x - a.x) * dx + (P.y - a.y) * dy) / L2 : 0;
    t = clamp(t, 0, 1);
    const d = hyp(P.x - (a.x + dx * t), P.y - (a.y + dy * t));
    if (d < best) best = d;
  }
  return best;
}

function trackFor(P, end) {
  /* element-relative pin descriptor so the pin follows the element on scroll */
  if (!P || !P.el) return null;
  const rc = P.el.getBoundingClientRect();
  if (!rc.width && !rc.height) return null;
  return { el: P.el, ox: P.x - rc.left, oy: P.y - rc.top, _end: end };
}

function attachLive(P) {
  const live = ENG.live;
  live.live = false;
  live.pts[live.n].pin = 1;
  addDew(live);
  ENG.ropes.push(live);
  const tA = trackFor(P, 'A');
  if (tA) { delete tA._end; live.trackA = tA; }

  /* radial thread to nearest earlier anchor */
  let bestQ = null, bestQD = 288;
  for (const Q of ENG.attachPts) {
    const d = hyp(Q.x - P.x, Q.y - P.y);
    if (d < bestQD) { bestQD = d; bestQ = Q; }
  }
  if (bestQ) {
    const rope = new Rope(P, bestQ, 0.7);
    if (tA) rope.trackA = { ...tA };
    const tB = trackFor(bestQ, 'B');
    if (tB) { delete tB._end; rope.trackB = tB; }
    ENG.ropes.push(rope);
  }
  /* extra thread to a nearby outline point */
  if (Math.random() < 0.75) {
    let bestR = null, bestRD = 204;
    for (const Q of ENG.anchorPts) {
      const d = hyp(Q.x - P.x, Q.y - P.y);
      if (d > 45 && d < bestRD) { bestRD = d; bestR = Q; }
    }
    if (bestR) {
      const rope = new Rope(P, bestR, 0.85);
      if (tA) rope.trackA = { ...tA };
      const tB = trackFor(bestR, 'B');
      if (tB) { delete tB._end; rope.trackB = tB; }
      ENG.ropes.push(rope);
    }
  }
  ENG.attachPts.push(P);
  ENG.lastAnchor = P;
  const s0 = spiderSpinneret(ENG.spider);
  ENG.live = new Rope(P, s0, 1.25, { live: true });
  if (tA) ENG.live.trackA = { ...tA };
  webVibrate(P.x, P.y, 60, 1.2);
  stampTufts(P);
  if (ENG.ropes.length > 140) pruneOldThreads();
}

function pruneOldThreads() {
  /* remove oldest finished ropes, keep structure reasonable */
  let removed = 0;
  while (ENG.ropes.length > 130 && removed < 12) { ENG.ropes.shift(); removed++; }
}

function updateDew(rope, dt) {
  for (let i = rope.dew.length - 1; i >= 0; i--) {
    const dr = rope.dew[i];
    if (dr.falling) continue; /* handled in falling pass */
    if (dr.sliding) {
      const P = ropePointAt(rope, dr.t);
      dr.du = (dr.du || 0) + P.slope * 9 * dt;
      dr.du *= 0.95;
      dr.t += dr.du * dt;
    }
    if (dr.t <= 0.02 || dr.t >= 0.98) { dropFall(rope, dr, i); continue; }
    const P = ropePointAt(rope, dr.t);
    if (Math.abs(P.slope) > 2.4 && Math.random() < 0.4 * dt) { dropFall(rope, dr, i); continue; }
    if (dr.r > 5 && Math.random() < 0.12 * dt) { dropFall(rope, dr, i); continue; }
    dr.x = P.x; dr.y = P.y;
  }
}
function dropFall(rope, dr, i) {
  dr.falling = true;
  dr.vy = 0; dr.fell = 0;
  ENG.fallingDrops.push(dr);
  rope.dew.splice(i, 1);
}

function maskAlphaAt(x, y) {
  if (!maskData) return 0;
  const xi = clamp(x | 0, 0, W - 1), yi = clamp(y | 0, 0, H - 1);
  return maskData[(yi * W + xi) << 2 | 3];
}

/* ============================================================ dew bead sprite */
function makeDewSprite() {
  const c = mkCanvas(64, 64), g = c.getContext('2d');
  const r = 30, cx = 32, cy = 32;
  let gr = g.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
  gr.addColorStop(0, 'rgba(255,255,255,0.06)');
  gr.addColorStop(0.75, 'rgba(255,255,255,0.12)');
  gr.addColorStop(0.92, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0.15)');
  g.fillStyle = gr;
  g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
  /* warm caustic */
  gr = g.createRadialGradient(cx - r * 0.25, cy + r * 0.3, 1, cx - r * 0.25, cy + r * 0.3, r * 0.6);
  gr.addColorStop(0, 'rgba(255,210,150,.45)');
  gr.addColorStop(1, 'rgba(255,210,150,0)');
  g.fillStyle = gr;
  g.beginPath(); g.arc(cx, cy, r * 0.95, 0, TAU); g.fill();
  /* specular */
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.beginPath(); g.ellipse(cx - r * 0.34, cy - r * 0.4, r * 0.16, r * 0.1, -0.6, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,.5)';
  g.beginPath(); g.arc(cx + r * 0.3, cy + r * 0.42, r * 0.07, 0, TAU); g.fill();
  ENG.dewSprite = c;
}

/* ============================================================ anchor sampling */
const EDGE_CACHE = new Map();
const TEXT_CACHE = new WeakMap();
const IMGDEC_CACHE = new Map();
let _uProbe = null;
function unitU() {
  if (!_uProbe) {
    _uProbe = document.createElement('div');
    _uProbe.style.cssText = 'position:absolute;visibility:hidden;width:calc(100*var(--u));pointer-events:none';
    document.body.appendChild(_uProbe);
  }
  return (_uProbe.getBoundingClientRect().width || 1) / 100;
}

function imageEdgePixels(img) {
  if (EDGE_CACHE.has(img.src)) return EDGE_CACHE.get(img.src);
  const w = img.naturalWidth, h = img.naturalHeight;
  const s = Math.min(1, 220 / Math.max(w, h));
  const cw = Math.max(2, Math.round(w * s)), ch = Math.max(2, Math.round(h * s));
  const c = mkCanvas(cw, ch), g = c.getContext('2d');
  g.drawImage(img, 0, 0, cw, ch);
  const d = g.getImageData(0, 0, cw, ch).data;
  const pts = [];
  for (let y = 1; y < ch - 1; y++) {
    for (let x = 1; x < cw - 1; x++) {
      const a = d[(y * cw + x) << 2 | 3];
      if (a > 140) {
        if (d[(y * cw + x - 1) << 2 | 3] <= 140 || d[(y * cw + x + 1) << 2 | 3] <= 140 ||
            d[((y - 1) * cw + x) << 2 | 3] <= 140 || d[((y + 1) * cw + x) << 2 | 3] <= 140) {
          pts.push([x / s, y / s]); /* natural coords */
        }
      }
    }
  }
  EDGE_CACHE.set(img.src, { pts, nw: w, nh: h });
  return EDGE_CACHE.get(img.src);
}

/* rasterise a text element once per (font-size, line-height, width) and cache
   both the raster (for the mask) and its decimated edge points */
function textRaster(el, rect) {
  const cs = getComputedStyle(el);
  const fs = parseFloat(cs.fontSize) || 16;
  const lhRaw = cs.lineHeight;
  const lh = lhRaw === 'normal' ? fs * 1.2 : (parseFloat(lhRaw) || fs * 1.2);
  const key = [fs.toFixed(1), lh.toFixed(1), Math.round(rect.width), document.fonts ? document.fonts.status : 'x'].join('/');
  const hit = TEXT_CACHE.get(el);
  if (hit && hit.key === key) return hit;
  const pad = 24;
  const cw = Math.ceil(rect.width) + pad * 2, ch = Math.ceil(rect.height) + pad * 2;
  if (cw < 4 || ch < 4 || cw > 4200 || ch > 4200) return null;
  const c = mkCanvas(cw, ch), g = c.getContext('2d');
  g.font = (cs.fontWeight || '400') + ' ' + fs + 'px Inter, system-ui, sans-serif';
  try { if ('letterSpacing' in g) g.letterSpacing = cs.letterSpacing; } catch (e) {}
  g.fillStyle = '#fff';
  g.textBaseline = 'alphabetic';
  const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
  const lines = el.innerText ? el.innerText.split('\n') : [txt];
  const indent = parseFloat(cs.textIndent) || 0;
  lines.forEach((ln, i) => {
    g.fillText(ln, pad + (i === 0 ? indent : 0), pad + lh * (i + 0.78));
  });
  const d = g.getImageData(0, 0, cw, ch).data;
  const pts = [];
  for (let y = 1; y < ch - 1; y++) {
    for (let x = 1; x < cw - 1; x++) {
      const a = d[(y * cw + x) << 2 | 3];
      if (a > 128) {
        if (d[(y * cw + x - 1) << 2 | 3] <= 128 || d[(y * cw + x + 1) << 2 | 3] <= 128 ||
            d[((y - 1) * cw + x) << 2 | 3] <= 128 || d[((y + 1) * cw + x) << 2 | 3] <= 128) {
          pts.push({ x, y });
        }
      }
    }
  }
  const out = { key, pad, cv: c, pts: decimate(pts, 6) };
  TEXT_CACHE.set(el, out);
  return out;
}

function roundedRectPoints(rect, r, step) {
  const pts = [];
  r = Math.min(r, rect.width / 2, rect.height / 2);
  const per = [
    ['line', { x: rect.left + r, y: rect.top }, { x: rect.right - r, y: rect.top }],
    ['arc', { x: rect.right - r, y: rect.top + r, a0: -Math.PI / 2, a1: 0 }],
    ['line', { x: rect.right, y: rect.top + r }, { x: rect.right, y: rect.bottom - r }],
    ['arc', { x: rect.right - r, y: rect.bottom - r, a0: 0, a1: Math.PI / 2 }],
    ['line', { x: rect.right - r, y: rect.bottom }, { x: rect.left + r, y: rect.bottom }],
    ['arc', { x: rect.left + r, y: rect.bottom - r, a0: Math.PI / 2, a1: Math.PI }],
    ['line', { x: rect.left, y: rect.bottom - r }, { x: rect.left, y: rect.top + r }],
    ['arc', { x: rect.left + r, y: rect.top + r, a0: Math.PI, a1: Math.PI * 1.5 }],
  ];
  for (const seg of per) {
    if (seg[0] === 'line') {
      const A = seg[1], B = seg[2];
      const L = hyp(B.x - A.x, B.y - A.y);
      const n = Math.max(1, Math.round(L / step));
      for (let i = 0; i < n; i++) {
        const t = i / n;
        pts.push({ x: lerp(A.x, B.x, t), y: lerp(A.y, B.y, t) });
      }
    } else {
      const C = seg[1];
      const n = Math.max(1, Math.round(r * Math.PI / 2 / step));
      for (let i = 0; i < n; i++) {
        const a = C.a0 + (C.a1 - C.a0) * i / n;
        pts.push({ x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r });
      }
    }
  }
  return pts;
}

function decimate(pts, minDist) {
  /* keep points >= minDist apart (greedy grid hash) */
  const cell = minDist;
  const grid = new Map();
  const out = [];
  for (const p of pts) {
    const gx = (p.x / cell) | 0, gy = (p.y / cell) | 0;
    let near = false;
    for (let dx = -1; dx <= 1 && !near; dx++) {
      for (let dy = -1; dy <= 1 && !near; dy++) {
        const arr = grid.get((gx + dx) + ',' + (gy + dy));
        if (arr) for (const q of arr) {
          if (hyp(q.x - p.x, q.y - p.y) < minDist) { near = true; break; }
        }
      }
    }
    if (!near) {
      out.push(p);
      const k = gx + ',' + gy;
      let arr = grid.get(k);
      if (!arr) { arr = []; grid.set(k, arr); }
      arr.push(p);
    }
  }
  return out;
}

function resampleAnchors() {
  const els = $$('[data-web-anchor]');
  ENG.anchorPts = [];
  ENG.attachPts = [];
  maskX.setTransform(1, 0, 0, 1, 0, 0);
  maskX.clearRect(0, 0, W, H);
  maskX.fillStyle = '#fff';
  const radius = 24 * unitU();
  for (const el of els) {
    let rect;
    try { rect = el.getBoundingClientRect(); } catch (e) { continue; }
    if (rect.width < 1 || rect.height < 1) continue;
    /* only elements in (or near) the viewport carry silk */
    if (rect.bottom < -80 || rect.top > H + 80 || rect.right < -80 || rect.left > W + 80) continue;
    const kind = el.dataset.anchor || (el.tagName === 'IMG' ? 'img' : el.id === 'player' ? 'box' : 'text');
    if (kind === 'img') {
      if (!el.naturalWidth) continue;
      const info = imageEdgePixels(el);
      const key = el.src + '|' + Math.round(rect.width) + 'x' + Math.round(rect.height);
      let rel = IMGDEC_CACHE.get(key);
      if (!rel) {
        rel = decimate(info.pts.map(p => ({ x: p[0] / info.nw * rect.width, y: p[1] / info.nh * rect.height })), 7);
        if (IMGDEC_CACHE.size > 60) IMGDEC_CACHE.clear();
        IMGDEC_CACHE.set(key, rel);
      }
      for (const p of rel) ENG.anchorPts.push({ x: rect.left + p.x, y: rect.top + p.y, el });
      maskX.drawImage(el, rect.left, rect.top, rect.width, rect.height);
    } else if (kind === 'box') {
      for (const p of roundedRectPoints(rect, radius, 7)) { p.el = el; ENG.anchorPts.push(p); }
      maskX.beginPath();
      maskX.roundRect(rect.left, rect.top, rect.width, rect.height, radius);
      maskX.fill();
    } else {
      const c = textRaster(el, rect);
      if (!c) continue;
      for (const p of c.pts) ENG.anchorPts.push({ x: rect.left - c.pad + p.x, y: rect.top - c.pad + p.y, el });
      maskX.drawImage(c.cv, rect.left - c.pad, rect.top - c.pad);
    }
  }
  try { maskData = maskX.getImageData(0, 0, W, H).data; } catch (e) { maskData = null; }
  /* object wobble rects */
  for (const w of ENG.objs) {
    const r = w.el.getBoundingClientRect();
    w.cx = r.left + r.width / 2; w.cy = r.top + r.height / 2;
    w.halfW = r.width / 2; w.halfH = r.height / 2;
    w.size = Math.max(r.width, r.height);
  }
}

/* keep silk pinned to the elements it was spun onto as the page scrolls */
function shiftPins() {
  for (const r of ENG.ropes) {
    if (r.trackA) {
      const rc = r.trackA.el.getBoundingClientRect();
      if (rc.width > 0) { r.pts[0].x = rc.left + r.trackA.ox; r.pts[0].y = rc.top + r.trackA.oy; }
    }
    if (r.trackB) {
      const rc = r.trackB.el.getBoundingClientRect();
      if (rc.width > 0) { r.pts[r.n].x = rc.left + r.trackB.ox; r.pts[r.n].y = rc.top + r.trackB.oy; }
    }
  }
}

let _resampleTimer = 0;
function scheduleResample(delay) {
  clearTimeout(_resampleTimer);
  _resampleTimer = setTimeout(resampleAnchors, delay === undefined ? 140 : delay);
}

/* tufts + bead at attachment points, stamped into a static debris layer */
function stampTufts(P) {
  debrisX.save();
  for (let i = 0; i < 30; i++) {
    const a = rand(TAU), l = rand(1, 3.4 * (ENG.spider ? ENG.spider.t : 1));
    debrisX.strokeStyle = 'rgba(255,255,255,.28)';
    debrisX.lineWidth = 0.4;
    debrisX.beginPath();
    debrisX.moveTo(P.x, P.y);
    debrisX.lineTo(P.x + Math.cos(a) * l, P.y + Math.sin(a) * l);
    debrisX.stroke();
  }
  debrisX.fillStyle = 'rgba(255,255,255,.5)';
  debrisX.beginPath();
  debrisX.arc(P.x, P.y, 1.5, 0, TAU);
  debrisX.fill();
  debrisX.restore();
}

function clearDebris() {
  debrisX.setTransform(1, 0, 0, 1, 0, 0);
  debrisX.clearRect(0, 0, W, H);
}
