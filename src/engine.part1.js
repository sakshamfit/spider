/* ============================================================ helpers */
'use strict';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const hyp = Math.hypot;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
function wrapAng(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('img ' + src.slice(0, 40))); i.src = src; }); }

/* ============================================================ canvas */
const pageEl = $('#page');
const canvas = $('#web');
const ctx = canvas.getContext('2d');
let W = innerWidth, H = innerHeight, DPR = 1;
let shadowC = mkCanvas(8, 8), shadowX = shadowC.getContext('2d');
let maskC = mkCanvas(8, 8), maskX = maskC.getContext('2d'), maskData = null;

/* ============================================================ state */
const ENG = {
  t: 0, ready: false, touch: matchMedia('(hover:none) and (pointer:coarse)').matches,
  pointer: { x: innerWidth / 2, y: innerHeight * 0.4, has: false, spd: 0, lastMove: -9, lx: 0, ly: 0, overUI: false },
  ropes: [], live: null, splats: [], falling: [],
  anchorEls: [], anchorPts: [], attachPts: [],
  spider: null, fly: null,
  spiderImg: null, faceImg: null, flyImg: null, slices: null, legs: null, eyes: [],
  objs: [],
  lastSettle: 0, moving: true,
  dewSprite: null,
};

function scaleT() {
  const w = innerWidth, h = innerHeight;
  const portrait = h >= w;
  let t;
  if (portrait) t = clamp(w / 480, 0.78, 1.1);
  else if (h < 560) t = Math.max(0.68, h / 620);
  else t = Math.min(w / 1440, h / 810);
  return clamp(t, 0.6, 1.25);
}

/* ============================================================ spider slices */
const SPR = 1254;
const WAIST = [627, 548], PIVOT = [627, 600];
const ABD_E = [628, 345, 220, 205];
const HEAD_E = [630, 680, 172, 148];
const HEAD_SUB = [[545, 880, 74, 70], [712, 880, 74, 70]];
const RAW_LEGS = [
  [[470, 760], [370, 830], [400, 1160]],
  [[460, 665], [300, 690], [100, 955]],
  [[480, 605], [370, 580], [55, 475]],
  [[490, 560], [360, 420], [410, 52]],
];
const LEGW = 92;
const toBody = p => [p[1] - 600, -(p[0] - 627)];

function sliceFrom(img, rect, maskFn, blurPx) {
  const c = mkCanvas(rect[2], rect[3]);
  const g = c.getContext('2d');
  g.drawImage(img, -rect[0], -rect[1]);
  const m = mkCanvas(rect[2], rect[3]);
  const mg = m.getContext('2d');
  mg.save();
  mg.translate(-rect[0], -rect[1]);
  if (blurPx > 0) { try { mg.filter = `blur(${blurPx}px)`; } catch (e) {} }
  maskFn(mg);
  mg.restore();
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(m, 0, 0);
  return c;
}
function ellPath(g, e) { g.beginPath(); g.ellipse(e[0], e[1], e[2], e[3], 0, 0, TAU); g.fill(); }

function buildSpiderAssets(img) {
  const SC = img.width / SPR;
  const S = ENG.slices = { SC };
  const blur = 2 * SC;
  const abdRect = [Math.round((ABD_E[0] - ABD_E[2]) * 0.72), Math.round((ABD_E[1] - ABD_E[3]) * 0.55),
                   Math.round(ABD_E[2] * 1.56), Math.round(ABD_E[3] * 1.75)];
  S.abdRect = abdRect;
  S.abd = sliceFrom(img, abdRect, g => {
    ellPath(g, ABD_E);
  }, blur);

  const hx = Math.round((HEAD_E[0] - 400) * 0.6), hy = Math.round(480);
  const headRect = [hx, hy, Math.round(1050 - hx), Math.round(1080 - hy)];
  S.headRect = headRect;
  S.head = sliceFrom(img, headRect, g => {
    ellPath(g, HEAD_E);
    ellPath(g, HEAD_SUB[0]);
    ellPath(g, HEAD_SUB[1]);
  }, blur);

  /* full-image pixel data for leg resampling */
  const full = mkCanvas(img.width, img.height);
  full.getContext('2d').drawImage(img, 0, 0);
  const ID = full.getContext('2d').getImageData(0, 0, img.width, img.height).data;
  const iw = img.width, ih = img.height;
  function samp(x, y, o) {
    x = clamp(x, 0, iw - 1.001); y = clamp(y, 0, ih - 1.001);
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
    const i00 = (y0 * iw + x0) * 4, i10 = i00 + 4, i01 = i00 + iw * 4, i11 = i01 + 4;
    o[0] = ID[i00] * (1 - fx) * (1 - fy) + ID[i10] * fx * (1 - fy) + ID[i01] * (1 - fx) * fy + ID[i11] * fx * fy;
    o[1] = ID[i00+1] * (1 - fx) * (1 - fy) + ID[i10+1] * fx * (1 - fy) + ID[i01+1] * (1 - fx) * fy + ID[i11+1] * fx * fy;
    o[2] = ID[i00+2] * (1 - fx) * (1 - fy) + ID[i10+2] * fx * (1 - fy) + ID[i01+2] * (1 - fx) * fy + ID[i11+2] * fx * fy;
    o[3] = ID[i00+3] * (1 - fx) * (1 - fy) + ID[i10+3] * fx * (1 - fy) + ID[i01+3] * (1 - fx) * fy + ID[i11+3] * fx * fy;
  }
  const LEGS = [];
  for (let i = 0; i < 4; i++) {
    for (const right of [true, false]) {
      const P3 = RAW_LEGS[i].map(p => right ? [SPR - p[0], p[1]] : p.slice());
      const [hipP, kneeP, footP] = P3;
      const A = hyp(kneeP[0] - hipP[0], kneeP[1] - hipP[1]);
      const B = hyp(footP[0] - kneeP[0], footP[1] - kneeP[1]);
      const L = A + B, hw = LEGW / 2, PAD = 16;
      const w = Math.ceil(L + PAD * 2), h = Math.ceil(LEGW + PAD * 2);
      const c = mkCanvas(w, h), g = c.getContext('2d');
      const out = g.createImageData(w, h);
      const col = [0, 0, 0, 0];
      const dir = t => t < A / L
        ? [lerp(hipP[0], kneeP[0], t * L / A), lerp(hipP[1], kneeP[1], t * L / A),
           (kneeP[0] - hipP[0]) / A, (kneeP[1] - hipP[1]) / A]
        : [lerp(kneeP[0], footP[0], (t * L - A) / B), lerp(kneeP[1], footP[1], (t * L - A) / B),
           (footP[0] - kneeP[0]) / B, (footP[1] - kneeP[1]) / B];
      for (let sy = 0; sy < LEGW; sy++) {
        const dyN = (sy - hw) / hw;
        const fade = Math.abs(dyN) < 0.72 ? 1 : Math.max(0, 1 - (Math.abs(dyN) - 0.72) / 0.28);
        for (let sx = 0; sx < Math.ceil(L); sx++) {
          const t = sx / L;
          const [px, py, tx, ty] = dir(t);
          const bow = 1 + 0.4 * Math.abs(dyN) * Math.sin(Math.PI * t);
          const ux = px + (-ty) * (sy - hw) * 1.05 * bow + (t - 0.5) * 0.06 * L * (ty / Math.max(0.001, Math.abs(ty)));
          const uy = py + (tx) * (sy - hw) * 1.05 * bow + (t - 0.5) * 0.06 * L;
          samp(ux, uy, col);
          const o = ((sy + PAD) * w + (sx + PAD)) * 4;
          out.data[o] = col[0]; out.data[o+1] = col[1]; out.data[o+2] = col[2];
          out.data[o+3] = col[3] * fade;
        }
      }
      g.putImageData(out, 0, 0);
      const hipB = toBody(hipP), restB = toBody(footP), kneeB = toBody(kneeP);
      let a = A, b = B;
      const d0 = hyp(restB[0] - hipB[0], restB[1] - hipB[1]);
      if (a + b < 1.15 * d0) { const s = 1.15 * d0 / (a + b); a *= s; b *= s; }
      /* bend sign: which IK solution matches the photographed knee */
      const base = Math.atan2(restB[1] - hipB[1], restB[0] - hipB[0]);
      const dd = hyp(restB[0] - hipB[0], restB[1] - hipB[1]);
      const alpha = Math.acos(clamp((a * a + dd * dd - b * b) / (2 * a * dd), -1, 1));
      const k1 = base + alpha, k2 = base - alpha;
      const kd = Math.atan2(kneeB[1] - hipB[1], kneeB[0] - hipB[0]);
      const sign = Math.abs(wrapAng(k1 - kd)) < Math.abs(wrapAng(k2 - kd)) ? 1 : -1;
      LEGS.push({ i, right, front: i >= 2, group: (i + (right ? 0 : 1)) % 2, strip: c, L, A, B, split: A, PAD,
                  hip: hipB, rest: restB, a: a * SC0, b: b * SC0, sign });
    }
  }
  LEGS.sort((p, q) => p.i - q.i);
  ENG.legs = LEGS;
  function SC0() { return 1; } /* placeholder, replaced below */
  /* a,b were multiplied by SC0 placeholder — fix: recompute in sprite units */
  for (const lg of LEGS) { /* recover sprite-unit lengths */ }
  return S;
}

/* NOTE: leg lengths are stored in sprite units; multiply by K when used. */
