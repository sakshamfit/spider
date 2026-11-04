/* ============================================================ thread rendering */
function drawRopeDecor(r) {
  /* hairs + fluff cached per rope; rebuilt when dirty or the rope wandered */
  r.decorT = (r.decorT || 99) + 1;
  let cx = 0, cy = 0;
  for (const p of r.pts) { cx += p.x; cy += p.y; }
  cx /= r.pts.length; cy /= r.pts.length;
  const moved = r.decorCx === undefined ? 1e9 : hyp(cx - r.decorCx, cy - r.decorCy);
  if (r.decorDirty || !r.decor || moved > 6 || r.decorT > 300) {
    r.decorDirty = false;
    r.decorT = 0;
    r.decorCx = cx; r.decorCy = cy;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of r.pts) {
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    }
    const m = 8;
    x0 -= m; y0 -= m; x1 += m; y1 += m;
    const w = Math.max(2, Math.ceil(x1 - x0)), h = Math.max(2, Math.ceil(y1 - y0));
    if (!r.decor || r.decor.width !== w || r.decor.height !== h) r.decor = mkCanvas(w, h);
    const g = r.decor.getContext('2d');
    g.clearRect(0, 0, w, h);
    r.decorX0 = x0; r.decorY0 = y0;
    const th = r.thick;
    g.lineCap = 'round';
    /* micro-hairs */
    const L = r.len();
    const count = Math.min(ENG.touch ? 90 : 220, Math.floor(L * (ENG.touch ? 0.35 : 0.9)));
    for (let i = 0; i < count; i++) {
      const t = (i + Math.random()) / count;
      const P = ropePointAt(r, t);
      const a = rand(TAU);
      const l = rand(0.5, 2.7) * th;
      g.strokeStyle = 'rgba(255,255,255,.55)';
      g.lineWidth = 0.35;
      g.beginPath();
      g.moveTo(P.x - x0, P.y - y0);
      g.lineTo(P.x - x0 + Math.cos(a) * l, P.y - y0 + Math.sin(a) * l);
      g.stroke();
    }
    /* fluff clumps */
    if (Math.random() < 0.4) {
      const nC = 1 + (Math.random() < 0.5 ? 1 : 0);
      for (let c = 0; c < nC; c++) {
        const t = rand(0.15, 0.85);
        const P = ropePointAt(r, t);
        if (Math.random() < 0.5) {
          g.fillStyle = '#8a7a6a';
          for (let d = 0; d < 5; d++) {
            g.globalAlpha = rand(0.35, 0.8);
            g.beginPath();
            g.arc(P.x - x0 + rand(-2.4, 2.4), P.y - y0 + rand(-2.4, 2.4), rand(0.4, 1.1), 0, TAU);
            g.fill();
          }
          g.globalAlpha = 1;
        } else {
          g.strokeStyle = 'rgba(240,232,220,.6)';
          g.lineWidth = 0.5;
          for (let d = 0; d < 10; d++) {
            const a = rand(TAU), l = rand(1, 3);
            g.beginPath();
            g.moveTo(P.x - x0, P.y - y0);
            g.quadraticCurveTo(P.x - x0 + Math.cos(a) * l, P.y - y0 + Math.sin(a) * l - 1,
              P.x - x0 + Math.cos(a + 0.9) * l * 1.4, P.y - y0 + Math.sin(a + 0.9) * l * 1.4);
            g.stroke();
          }
        }
      }
    }
  }
  ctx.drawImage(r.decor, r.decorX0, r.decorY0);
}

function drawThread(r) {
  const pts = r.pts, n = r.n, th = r.thick;
  const fade = r.fade;
  ctx.lineCap = 'round';
  /* halo */
  ctx.strokeStyle = 'rgba(255,255,255,' + (0.06 * fade).toFixed(3) + ')';
  ctx.lineWidth = th * 4;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i <= n; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  /* per-segment strand + iridescence + fibres */
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[i + 1];
    const wSeg = th * (0.9 - 0.35 * Math.sin(Math.PI * i / n));
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * fade).toFixed(3) + ')';
    ctx.lineWidth = Math.max(0.3, wSeg);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    /* iridescent overlay */
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const P = 0.5 + 0.5 * Math.sin(2 * ang + 0.3 * ENG.t + r.phase);
    ctx.strokeStyle = 'hsla(' + Math.round(190 + 150 * P) + ',100%,74%,' + ((0.12 + 0.3 * P * P * P) * fade).toFixed(3) + ')';
    ctx.lineWidth = Math.max(0.3, wSeg * 0.66);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    /* two wavy sub-fibres */
    const dx = b.x - a.x, dy = b.y - a.y;
    const L = hyp(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    for (const s of [-1.1, 0.9]) {
      const o = s * th;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.38 * fade).toFixed(3) + ')';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(a.x + nx * o, a.y + ny * o);
      ctx.quadraticCurveTo((a.x + b.x) / 2 + nx * o * 1.8 + Math.sin(ENG.t * 2 + r.phase + i) * 0.6,
        (a.y + b.y) / 2 + ny * o * 1.8,
        b.x + nx * o, b.y + ny * o);
      ctx.stroke();
    }
  }
  drawRopeDecor(r);
  /* glint travelling along the thread */
  r.glint = (r.glint + 0.6 * frameDt) % 1;
  const GP = ropePointAt(r, r.glint);
  ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * fade).toFixed(3) + ')';
  ctx.beginPath();
  ctx.arc(GP.x, GP.y, Math.max(0.7, th * 0.8), 0, TAU);
  ctx.fill();
  /* dew */
  if (ENG.dewSprite) {
    for (const dr of r.dew) {
      if (dr.x === undefined) continue;
      const d = dr.r * 2.4;
      ctx.drawImage(ENG.dewSprite, dr.x - d / 2, dr.y - d / 2, d, d);
    }
  }
}

function drawSilk() {
  /* 1. shadows: black ropes on a half-res offscreen, offset via shadowBlur,
     masked by the anchor silhouettes so they fall only on letters/objects */
  const HS = 0.5;
  shadowX.setTransform(HS, 0, 0, HS, 0, 0);
  shadowX.clearRect(0, 0, W, H);
  shadowX.save();
  shadowX.fillStyle = '#000';
  shadowX.strokeStyle = '#000';
  shadowX.lineCap = 'round';
  shadowX.shadowColor = 'rgba(8,14,70,.42)';
  shadowX.shadowBlur = 3.5 * HS;
  shadowX.shadowOffsetX = 7 * HS;
  shadowX.shadowOffsetY = 5011 * HS;
  shadowX.translate(0, -5000);
  const all = ENG.ropes.concat(ENG.live ? [ENG.live] : []);
  for (const r of all) {
    shadowX.lineWidth = Math.max(0.6, r.thick);
    shadowX.beginPath();
    shadowX.moveTo(r.pts[0].x, r.pts[0].y);
    for (let i = 1; i <= r.n; i++) shadowX.lineTo(r.pts[i].x, r.pts[i].y);
    shadowX.stroke();
    for (const dr of r.dew) {
      if (dr.x === undefined) continue;
      shadowX.beginPath();
      shadowX.arc(dr.x, dr.y, dr.r, 0, TAU);
      shadowX.fill();
    }
  }
  /* falling drops cast shadows too */
  for (const dr of ENG.fallingDrops) {
    shadowX.beginPath();
    shadowX.arc(dr.x, dr.y, dr.r * 0.8, 0, TAU);
    shadowX.fill();
  }
  shadowX.restore();
  shadowX.setTransform(1, 0, 0, 1, 0, 0);
  if (maskData) {
    shadowX.globalCompositeOperation = 'destination-in';
    shadowX.drawImage(maskC, 0, 0, W / 2, H / 2);
    shadowX.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(shadowC, 0, 0, W, H);

  /* 2. threads */
  for (const r of ENG.ropes) drawThread(r);
  if (ENG.live) drawLiveThread(ENG.live);

  /* splats */
  for (const s of ENG.splats) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(1, 0.55);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath();
    ctx.arc(0, 0, s.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(0, 0, s.r * 1.25, 0, TAU);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(8,14,70,.18)';
    ctx.beginPath();
    ctx.ellipse(s.x + 1.5, s.y + s.r * 0.55, s.r * 1.1, s.r * 0.4, 0, 0, TAU);
    ctx.fill();
  }
}

function drawLiveThread(r) {
  drawThread(r);
  /* spinneret bead */
  const e = r.pts[r.n];
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.beginPath();
  ctx.arc(e.x, e.y, 1.1, 0, TAU);
  ctx.fill();
}

function drawDebris() {
  ctx.drawImage(debrisC, 0, 0);
}
