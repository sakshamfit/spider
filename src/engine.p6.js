/* ============================================================ fly cursor */
const FLY_SPR = 512; /* sprite space of the prepared fly image */
const WING_L = [[200, 208], [170, 165], [125, 100], [75, 60], [37, 47], [27, 90], [30, 145], [55, 195], [100, 227], [150, 242], [165, 250], [127, 295], [82, 360], [62, 425], [67, 452], [100, 457], [135, 415], [170, 345], [187, 285], [197, 240]];
const WING_R = WING_L.map(p => [FLY_SPR - p[0], p[1]]).reverse();
const HINGE_L = { x: 200, y: 210 }, HINGE_R = { x: 312, y: 210 };

function polyPath(g, poly, ox, oy) {
  g.beginPath();
  poly.forEach((p, i) => i ? g.lineTo(p[0] + ox, p[1] + oy) : g.moveTo(p[0] + ox, p[1] + oy));
  g.closePath();
}

function buildFlySprites(img) {
  const S = {};
  function sprite(poly) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of poly) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    const m = 4;
    x0 -= m; y0 -= m; x1 += m; y1 += m;
    const c = mkCanvas(x1 - x0, y1 - y0), g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    g.save();
    g.translate(-x0, -y0);
    polyPath(g, poly, 0, 0);
    g.fill();
    g.restore();
    return { c, x: x0, y: y0 };
  }
  S.wingL = sprite(WING_L);
  S.wingR = sprite(WING_R);
  /* body: full image minus both wings */
  const c = mkCanvas(FLY_SPR, FLY_SPR), g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'destination-out';
  polyPath(g, WING_L, 0, 0); g.fill();
  polyPath(g, WING_R, 0, 0); g.fill();
  S.body = c;
  return S;
}

function newFly() {
  return {
    x: W / 2, y: H * 0.35, vx: 0, vy: 0, ang: 0,
    landed: 0, stillT: 0, vis: 0, visT: 1,
    caught: 0, catchT: 0, catchDur: 0,
    recoil: 0, buzzT: rand(100),
    cocoon: null, hasImg: true,
  };
}

function updateFly(dt) {
  const f = ENG.fly, pt = ENG.pointer;
  /* visibility over UI + pointer presence */
  const wantVis = (pt.has && !pt.overUI) ? 1 : 0;
  f.visT = wantVis;
  f.vis += (f.visT - f.vis) * (1 - Math.exp(-8 * dt));

  f.recoil = Math.max(0, f.recoil - 2.2 * dt);
  f.buzzT += dt;

  if (f.caught) {
    f.catchT += dt;
    if (f.catchT >= f.catchDur) {
      /* break free, flung away */
      f.caught = 0; f.cocoon = null;
      const sp = ENG.spider;
      const dx = f.x - (sp ? sp.x : 0), dy = f.y - (sp ? sp.y : 0);
      const d = hyp(dx, dy) || 1;
      f.x += dx / d * 150; f.y += dy / d * 150;
      pt.x = f.x; pt.y = f.y;
      f.landed = 0; f.stillT = 0;
    }
  }

  const ease = 1 - Math.exp(-(28 - 20 * f.recoil) * dt);
  const ox = pt.x - f.x, oy = pt.y - f.y;
  const jx = (Math.sin(23.1 * f.buzzT) + 0.6 * Math.sin(37.7 * f.buzzT + 1.3)) * 2.2 * (1 - f.landed);
  const jy = (Math.sin(29.3 * f.buzzT + 0.7) + 0.6 * Math.sin(41.9 * f.buzzT)) * 2.2 * (1 - f.landed);
  const nx = f.x + ox * ease, ny = f.y + oy * ease;
  f.vx = (nx - f.x) / Math.max(dt, 1e-4);
  f.vy = (ny - f.y) / Math.max(dt, 1e-4);
  f.x = nx + jx; f.y = ny + jy;
  const spd = hyp(f.vx, f.vy);
  if (spd > 60) {
    const ta = Math.atan2(f.vy, f.vx);
    f.ang += wrapAng(ta - f.ang) * (1 - Math.exp(-10 * dt));
  }
  /* landing: keyed on pointer stillness */
  const still = (ENG.t - pt.lastMove > 1.2) && !f.caught;
  if (still) f.stillT += dt; else f.stillT = 0;
  const landT = f.stillT > 1.2 ? 1 : 0;
  f.landed += (landT - f.landed) * (1 - Math.exp(-(landT ? 3 : 10) * dt));
}

function tryCatchFly() {
  const sp = ENG.spider, f = ENG.fly;
  if (!sp || !f || f.caught) return;
  const mouth = { x: sp.x + Math.cos(sp.ang) * 360 * sp.K, y: sp.y + Math.sin(sp.ang) * 360 * sp.K };
  if (hyp(f.x - mouth.x, f.y - mouth.y) < 55 * ENG.flySize) {
    f.caught = 1;
    f.catchT = 0;
    f.catchDur = rand(3, 4.2);
    f.cocoon = { fibres: [] };
    for (let i = 0; i < 70; i++) {
      f.cocoon.fibres.push({ a: rand(TAU), r: rand(0.7, 1.25), l: rand(3, 9), da: rand(-1, 1) });
    }
  }
}

function startPounce() {
  const sp = ENG.spider, f = ENG.fly;
  if (!sp || sp.jump || sp.intro.stage < 3) return;
  const mouth = 360 * sp.K;
  const fx = f.vis > 0.05 ? f.x : ENG.pointer.x;
  const fy = f.vis > 0.05 ? f.y : ENG.pointer.y;
  const dx = fx - sp.x, dy = fy - sp.y;
  const d = hyp(dx, dy);
  const ux = d > 0.001 ? dx / d : Math.cos(sp.ang);
  const uy = d > 0.001 ? dy / d : Math.sin(sp.ang);
  /* land so the mouth (360K ahead of the new centre) meets the fly,
     travelling at most 360K */
  const travel = clamp(d - mouth, 0, mouth);
  const L = {
    x: clamp(sp.x + ux * travel, 10, W - 10),
    y: clamp(sp.y + uy * travel, 10, H - 10),
  };
  const jd = hyp(L.x - sp.x, L.y - sp.y);
  sp.jump = {
    t: 0, dur: clamp(jd / 1100, 0.28, 0.6),
    x0: sp.x, y0: sp.y, x1: L.x, y1: L.y,
    h: Math.max(22, Math.min(0.3 * jd, 130)),
  };
}

let flySprites = null;
function drawFly() {
  const f = ENG.fly;
  if (!flySprites || f.vis < 0.02) return;
  const fs = ENG.flySize;
  const scale = 79 * fs / FLY_SPR;
  const y = 1 - f.landed; /* hover height */
  const bob = Math.sin(6 * f.buzzT) * 1.2 * y;
  ctx.save();
  ctx.globalAlpha = f.vis;
  /* shadow */
  ctx.save();
  ctx.translate(f.x + 3 + 14 * y, f.y + 5 + 26 * y + bob * 0.4);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(0,0,0,' + (0.2 + 0.18 * f.landed).toFixed(3) + ')';
  ctx.filter = 'blur(' + ((3 + 9 * y) * scale).toFixed(1) + 'px)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 180, 120, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  /* body + wings */
  ctx.translate(f.x, f.y + bob * 0.4);
  ctx.rotate(f.ang + Math.PI / 2);
  ctx.scale(scale, scale);
  ctx.drawImage(flySprites.body, -FLY_SPR / 2, -FLY_SPR / 2);
  /* wings */
  const caught = f.caught;
  const hz = caught ? 46 : 34;
  const q = Math.sin(TAU * hz * f.buzzT);
  const fold = f.landed;
  function wing(w, hinge, dir) {
    ctx.save();
    ctx.translate(hinge.x - FLY_SPR / 2, hinge.y - FLY_SPR / 2);
    const base = dir * 1.05 * fold;
    ctx.rotate(base + dir * 0.9 * q * (1 - fold));
    ctx.scale(1, 1 - 0.25 * Math.abs(q) * (1 - fold));
    ctx.drawImage(w.c, w.x - hinge.x, w.y - hinge.y);
    ctx.restore();
  }
  wing(flySprites.wingL, HINGE_L, -1);
  wing(flySprites.wingR, HINGE_R, 1);
  ctx.restore();
  /* cocoon */
  if (f.caught && f.cocoon) {
    const prog = clamp(f.catchT / 1.2, 0, 1); /* wraps over first 1.2s */
    const fade = f.catchDur > 0 ? clamp((f.catchDur - f.catchT) / 0.6, 0, 1) : 1;
    const R = 30 * fs;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.globalAlpha = f.vis * fade;
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2.2 * fs;
    const n = Math.floor(prog * 7);
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, R * (1 + i * 0.05), R * 0.7, i * 0.45 + f.buzzT * 0.2, 0, TAU);
      ctx.stroke();
    }
    ctx.lineWidth = 1 * fs;
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    for (const fb of f.cocoon.fibres) {
      if (fb.a / TAU > prog) continue;
      ctx.beginPath();
      ctx.moveTo(Math.cos(fb.a) * R * 0.7 * fb.r, Math.sin(fb.a) * R * 0.55 * fb.r);
      ctx.lineTo(Math.cos(fb.a + fb.da) * (R * 0.7 * fb.r + fb.l), Math.sin(fb.a + fb.da) * (R * 0.55 * fb.r + fb.l));
      ctx.stroke();
    }
    ctx.restore();
  }
}
