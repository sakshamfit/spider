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
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('img load failed')); i.src = src; }); }

/* ============================================================ canvas */
const pageEl = $('#page');
const canvas = $('#web');
const ctx = canvas.getContext('2d');
let W = innerWidth, H = innerHeight, DPR = 1;
let shadowC = mkCanvas(8, 8), shadowX = shadowC.getContext('2d');
let maskC = mkCanvas(8, 8), maskX = maskC.getContext('2d'), maskData = null;
let debrisC = mkCanvas(8, 8), debrisX = debrisC.getContext('2d');

/* ============================================================ global state */
const ENG = {
  t: 0, ready: false,
  touch: matchMedia('(hover:none) and (pointer:coarse)').matches,
  pointer: { x: innerWidth / 2, y: innerHeight * 0.4, has: false, spd: 0, lastMove: -9, lx: 0, ly: 0, overUI: false },
  ropes: [], live: null, splats: [], fallingDrops: [],
  anchorPts: [], attachPts: [],
  spider: null, fly: null,
  slices: null, legs: null, eyes: [],
  objs: [],
  settleTimer: 0,
  spiderSpriteBox: 300,
  off: mkCanvas(8, 8), offX: null,
  jumpPounce: null,
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

/* ============================================================ spider rig */
/* Sprite space 1017x1017 (spider.webp is a 560x560 rescale of the same crop).
   Rig = spec geometry (1254 base) scaled by 1017/1254; the photo was generated
   against that exact guide. Head points DOWN in the image:
   body x = image y - pivot y (toward head), body y = -(image x - pivot x). */
const SPR = 1017;
const RIG_S = 1017 / 1254;
const PIVOT = [627 * RIG_S, 600 * RIG_S];
const WAIST = [627 * RIG_S, 548 * RIG_S];
const ABD_E = [628 * RIG_S, 345 * RIG_S, 220 * RIG_S, 205 * RIG_S];
const HEAD_E = [630 * RIG_S, 680 * RIG_S, 172 * RIG_S, 148 * RIG_S];
const HEAD_SUB = [[545 * RIG_S, 880 * RIG_S, 74 * RIG_S, 70 * RIG_S], [712 * RIG_S, 880 * RIG_S, 74 * RIG_S, 70 * RIG_S]];
const RAW_LEGS = [
  [[470, 760], [370, 830], [400, 1160]],
  [[460, 665], [300, 690], [100, 955]],
  [[480, 605], [370, 580], [55, 475]],
  [[490, 560], [360, 420], [410, 52]],
].map(l => l.map(p => [p[0] * RIG_S, p[1] * RIG_S]));
const LEGW = Math.round(92 * RIG_S);
const SPIN_BODY = [150 * RIG_S - PIVOT[1], -(627 * RIG_S - PIVOT[0])];
const toBody = p => [p[1] - PIVOT[1], -(p[0] - PIVOT[0])];

function sliceFrom(img, rect, maskFn, blurPx) {
  const c = mkCanvas(rect[2], rect[3]);
  const g = c.getContext('2d');
  g.drawImage(img, -rect[0], -rect[1]);
  const m = mkCanvas(rect[2], rect[3]);
  const mg = m.getContext('2d');
  mg.save();
  mg.translate(-rect[0], -rect[1]);
  if (blurPx > 0) { try { mg.filter = 'blur(' + blurPx + 'px)'; } catch (e) {} }
  maskFn(mg);
  mg.restore();
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(m, 0, 0);
  return c;
}
function ellFill(g, e) { g.beginPath(); g.ellipse(e[0], e[1], e[2], e[3], 0, 0, TAU); g.fill(); }

function buildSpiderAssets(img) {
  const SC = img.width / SPR;
  const S = { SC };
  ENG.slices = S;
  /* sprite-space base: photo scaled up to rig coordinates */
  const base = mkCanvas(SPR, SPR);
  base.getContext('2d').drawImage(img, 0, 0, SPR, SPR);
  const blur = 2 * SC;
  const abdRect = [Math.round(ABD_E[0] - ABD_E[2] * 1.16), Math.round(ABD_E[1] - ABD_E[3] * 1.16),
                   Math.ceil(ABD_E[2] * 2.32), Math.ceil(ABD_E[3] * 2.32)];
  S.abdRect = abdRect;
  S.abd = sliceFrom(base, abdRect, g => ellFill(g, ABD_E), blur);

  const headRect = [Math.round(HEAD_E[0] - HEAD_E[2] - 116), Math.round(HEAD_E[1] - HEAD_E[3] - 20),
                    Math.ceil(2 * (HEAD_E[2] + 116)), Math.ceil(HEAD_E[1] + HEAD_SUB[0][1] + HEAD_SUB[0][3] - (HEAD_E[1] - HEAD_E[3] - 20) + 9)];
  S.headRect = headRect;
  S.head = sliceFrom(base, headRect, g => {
    ellFill(g, HEAD_E);
    ellFill(g, HEAD_SUB[0]);
    ellFill(g, HEAD_SUB[1]);
  }, blur);

  /* pixel data for leg resampling */
  const full = base;
  const ID = full.getContext('2d').getImageData(0, 0, SPR, SPR).data;
  const iw = SPR, ih = SPR;
  const col = [0, 0, 0, 0];
  function samp(x, y) {
    x = clamp(x, 0, iw - 1.001);
    y = clamp(y, 0, ih - 1.001);
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
    const i00 = (y0 * iw + x0) << 2, i10 = i00 + 4, i01 = i00 + (iw << 2), i11 = i01 + 4;
    const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
    col[0] = ID[i00] * w00 + ID[i10] * w10 + ID[i01] * w01 + ID[i11] * w11;
    col[1] = ID[i00 + 1] * w00 + ID[i10 + 1] * w10 + ID[i01 + 1] * w01 + ID[i11 + 1] * w11;
    col[2] = ID[i00 + 2] * w00 + ID[i10 + 2] * w10 + ID[i01 + 2] * w01 + ID[i11 + 2] * w11;
    col[3] = ID[i00 + 3] * w00 + ID[i10 + 3] * w10 + ID[i01 + 3] * w01 + ID[i11 + 3] * w11;
  }

  const LEGS = [];
  for (let i = 0; i < 4; i++) {
    for (const right of [false, true]) {
      const P3 = RAW_LEGS[i].map(p => right ? [SPR - p[0], p[1]] : p.slice());
      const hipP = P3[0], kneeP = P3[1], footP = P3[2];
      const A = hyp(kneeP[0] - hipP[0], kneeP[1] - hipP[1]);
      const B = hyp(footP[0] - kneeP[0], footP[1] - kneeP[1]);
      const L = A + B, hw = LEGW / 2, PAD = 16;
      const w = Math.ceil(L + PAD * 2), h = Math.ceil(LEGW + PAD * 2);
      const c = mkCanvas(w, h), g = c.getContext('2d');
      const out = g.createImageData(w, h);
      for (let sy = 0; sy < LEGW; sy++) {
        const dyN = (sy - hw) / hw, ady = Math.abs(dyN);
        const fade = ady < 0.72 ? 1 : Math.max(0, 1 - (ady - 0.72) / 0.28);
        for (let sx = 0; sx < Math.ceil(L); sx++) {
          const t = sx / L;
          let px, py, tx, ty;
          if (t < A / L) {
            const lt = t * L / A;
            px = lerp(hipP[0], kneeP[0], lt); py = lerp(hipP[1], kneeP[1], lt);
            tx = (kneeP[0] - hipP[0]) / A; ty = (kneeP[1] - hipP[1]) / A;
          } else {
            const lt = (t * L - A) / B;
            px = lerp(kneeP[0], footP[0], lt); py = lerp(kneeP[1], footP[1], lt);
            tx = (footP[0] - kneeP[0]) / B; ty = (footP[1] - kneeP[1]) / B;
          }
          const off = (sy - hw) * 1.05 + (t - 0.5) * 0.05 * L;
          samp(px - ty * off, py + tx * off);
          const o = ((sy + PAD) * w + (sx + PAD)) << 2;
          out.data[o] = col[0]; out.data[o + 1] = col[1]; out.data[o + 2] = col[2];
          out.data[o + 3] = col[3] * fade;
        }
      }
      g.putImageData(out, 0, 0);
      const hipB = toBody(hipP), restB = toBody(footP), kneeB = toBody(kneeP);
      let a = A, b = B;
      const d0 = hyp(restB[0] - hipB[0], restB[1] - hipB[1]);
      if (a + b < 1.15 * d0) { const s = 1.15 * d0 / (a + b); a *= s; b *= s; }
      /* bend sign: pick IK solution matching the photographed knee */
      const base = Math.atan2(restB[1] - hipB[1], restB[0] - hipB[0]);
      const alpha = Math.acos(clamp((a * a + d0 * d0 - b * b) / (2 * a * d0), -1, 1));
      const kd = Math.atan2(kneeB[1] - hipB[1], kneeB[0] - hipB[0]);
      const sign = Math.abs(wrapAng(base + alpha - kd)) < Math.abs(wrapAng(base - alpha - kd)) ? 1 : -1;
      LEGS.push({ i, right, front: i < 2, group: (i + (right ? 0 : 1)) % 2,
                  strip: c, L, A, B, split: A, PAD, a, b, sign,
                  hip: hipB, rest: restB,
                  foot: { x: 0, y: 0, init: false },
                  stepping: false, st: 0, stDur: 0.12, from: null, to: null });
    }
  }
  ENG.legs = LEGS;
  return S;
}

/* body-space point -> world. Body slices are drawn with rotate(ang - PI/2),
   so body x (toward the head) maps to canvas +y when ang = PI/2 (head down).
   Equivalent: sprite = (513 - by, 545 + bx), world = centre + R(ang-PI/2)*sprite_offset*K */
function bodyToWorld(sp, bp) {
  const r = sp.ang - Math.PI / 2;
  const c = Math.cos(r), s = Math.sin(r);
  const qx = -bp[1], qy = bp[0];
  return { x: sp.x + (qx * c - qy * s) * sp.K, y: sp.y + (qx * s + qy * c) * sp.K };
}
/* leg rest foot position in world; tuck 1 = full reach, <1 pulls toward hip */
function legRest(l, sp, tuck) {
  const t = tuck || 1;
  return bodyToWorld(sp, [lerp(l.hip[0], l.rest[0], t), lerp(l.hip[1], l.rest[1], t)]);
}
