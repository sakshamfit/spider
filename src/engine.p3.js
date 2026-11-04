/* ============================================================ spider drawing */
function ensureOff(sp) {
  const span = Math.ceil(SPR * sp.K * 1.35);
  if (ENG.off.width !== span || ENG.off.height !== span) {
    ENG.off = mkCanvas(span, span);
    ENG.offX = ENG.off.getContext('2d');
  }
  ENG.spiderSpriteBox = span;
}

/* draw a strip sub-rect [sx0..sx1] stretched onto local x [dx0..dx1] along P0->P1 */
function drawLegBone(g, l, sx0, sx1, dx0, dx1, P0, P1, K) {
  const dx = P1.x - P0.x, dy = P1.y - P0.y;
  const ang = Math.atan2(dy, dx);
  const st = l.strip, PAD = l.PAD, LW = LEGW;
  g.save();
  g.translate(P0.x, P0.y);
  g.rotate(ang);
  g.scale(K, K);
  g.drawImage(st, sx0 + PAD, PAD, sx1 - sx0, LW, dx0, -LW / 2, dx1 - dx0, LW);
  g.restore();
}

function drawSpider() {
  const sp = ENG.spider;
  if (!sp) return;
  ensureOff(sp);
  const g = ENG.offX;
  const sw = ENG.off.width;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, sw, sw);
  const K = sp.K;

  /* draw legs back-to-front (index order), each: hip world, knee via IK, foot.
     Legs are drawn in world coords; shift so the spider sits centred in the
     offscreen (the composite blits ENG.off at sp.x - sw/2, sp.y - sw/2). */
  g.save();
  g.translate(sw / 2 - sp.x, sw / 2 - sp.y);
  for (const l of ENG.legs) {
    const H = bodyToWorld(sp, l.hip);
    const F = { x: l.foot.x, y: l.foot.y };
    const knee = solveKnee(H, F, l.a * K, l.b * K, l.sign);
    /* outward direction away from body centre */
    let ox = (H.x + F.x) / 2 - sp.x, oy = (H.y + F.y) / 2 - sp.y;
    const ol = hyp(ox, oy) || 1; ox /= ol; oy /= ol;
    /* lift while stepping */
    let liftK = 0, liftF = 0;
    if (l.stepping) {
      const s = Math.sin(Math.PI * clamp(l.st / l.stDur, 0, 1));
      liftK = s * (l.front ? 12 : 26) * K;
      liftF = s * 20 * K;
    }
    const Kw = { x: knee.x + ox * liftK, y: knee.y + oy * liftK };
    const Fw = { x: F.x + ox * liftF, y: F.y + oy * liftF };
    /* femur content [0..A] stretched to [0..a], tibia [A..L] to [a..a+b];
       generous overlap wedges past the knee so the joint stays covered */
    drawLegBone(g, l, 0, Math.min(l.A * 1.28, l.L), 0, l.a * 1.28, H, Kw, K);
    drawLegBone(g, l, Math.max(l.A - l.B * 0.22, 0), l.L, l.a - l.b * 0.22, l.a + l.b, Kw, Fw, K);
  }
  g.restore();

  /* body transform helper: sprite space -> offscreen, pivot + extra rot/scale */
  const rot = sp.ang - Math.PI / 2 + sp.sway;
  function bodyT(pivot, rz, sx, sy) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.translate(sw / 2, sw / 2);
    g.rotate(rot + (rz || 0));
    g.scale(K * (sx || 1), K * (sy || 1));
    g.translate(-pivot[0], -pivot[1]);
  }

  /* abdomen: pivot at waist, sway rotation, breathing + squash */
  const breath = 1 + Math.sin(sp.phase) * (0.025 + 0.03 * sp.sleep);
  const yq = 1 - 0.1 * sp.lt;
  const S = ENG.slices;
  bodyT(WAIST, 0, (2 - yq) * breath, yq * breath);
  const ar = S.abdRect;
  g.drawImage(S.abd, ar[0], ar[1]);

  /* head: photo, fading to 15% as the cute face arrives */
  bodyT(WAIST, 0, 1 - 0.03 * sp.sleep, 1 - 0.03 * sp.sleep);
  g.globalAlpha = 1 - 0.85 * sp.qt;
  const hr = S.headRect;
  g.drawImage(S.head, hr[0], hr[1]);
  g.globalAlpha = 1;

  /* idle face: mapped so the face's big eyes sit on the photo's eye line.
     Face big-eye midpoint (154, 131.5) -> sprite (513, 600); scale fs. */
  if (sp.qt > 0.01) {
    const fs = 1.28 * (0.92 + 0.08 * sp.qt);
    g.save();
    g.translate(511 - 154 * fs, 556 - 131.5 * fs);
    g.scale(fs, fs);
    g.globalAlpha = sp.qt;
    g.drawImage(ENG.faceImg, 0, 0);
    /* eyelids (face-canvas coords) */
    const asleep = sp.sleep > 0.5;
    let lidT = asleep ? 1 : 0;
    if (!asleep && sp.blinkT >= 0 && sp.blinkT < 0.2) lidT = Math.sin(Math.PI * sp.blinkT / 0.2);
    if (lidT > 0.02) drawEyelids(g, lidT);
    g.restore();
    g.globalAlpha = 1;
  }
  g.setTransform(1, 0, 0, 1, 0, 0);

  /* composite to main with shadow */
  const h = sp.h;
  const s = 1 + h / 260;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowColor = 'rgba(0,0,0,' + (0.42 - Math.min(0.24, h / 500)).toFixed(3) + ')';
  ctx.shadowBlur = 7 + 0.14 * h;
  ctx.shadowOffsetX = 5 + 0.35 * h;
  ctx.shadowOffsetY = 9 + 0.6 * h;
  ctx.translate(sp.x, sp.y);
  ctx.scale(s, s);
  ctx.drawImage(ENG.off, -sw / 2, -sw / 2);
  ctx.restore();
}

const EYES = window.__EYES__ || [
  [106.2, 131.5, 37.5], [202.0, 131.5, 37.5],
  [42.6, 115.9, 14], [265.1, 115.9, 14],
  [61.5, 84.7, 9], [246.0, 84.7, 9],
];
let eyeSkin = null;
function sampleEyeSkin() {
  const c = mkCanvas(308, 308), g = c.getContext('2d');
  g.drawImage(ENG.faceImg, 0, 0, 308, 308);
  const d = g.getImageData(0, 0, 308, 308).data;
  eyeSkin = EYES.map((e, i) => {
    const sx = clamp(Math.round(e[0]), 0, 307), sy = clamp(Math.round(e[1] - e[2] * 1.5), 0, 307);
    const o = (sy * 308 + sx) << 2;
    const dk = i < 2 ? 0.82 : i < 4 ? 0.78 : 0.75;
    return 'rgb(' + Math.round(d[o] * dk) + ',' + Math.round(d[o + 1] * dk) + ',' + Math.round(d[o + 2] * dk) + ')';
  });
}
function drawEyelids(g, lidT) {
  /* drawn in sprite space (body transform active) */
  EYES.forEach((e, i) => {
    const r = e[2];
    g.save();
    g.beginPath();
    g.arc(e[0], e[1], r, 0, TAU);
    g.clip();
    const top = e[1] - r + 2 * r * lidT;
    g.fillStyle = eyeSkin[i];
    g.beginPath();
    g.moveTo(e[0] - r * 1.1, e[1] - r * 1.1);
    g.lineTo(e[0] + r * 1.1, e[1] - r * 1.1);
    g.lineTo(e[0] + r * 1.1, top);
    g.quadraticCurveTo(e[0], top + r * 0.45, e[0] - r * 1.1, top);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(40,22,12,.7)';
    g.lineWidth = r * 0.12;
    g.beginPath();
    g.moveTo(e[0] - r, top + r * 0.1);
    g.quadraticCurveTo(e[0], top + r * 0.5, e[0] + r, top + r * 0.1);
    g.stroke();
    g.restore();
  });
}

function drawZs(dt) {
  const sp = ENG.spider;
  if (!sp || sp.sleep < 0.15) return;
  const o = bodyToWorld(sp, [-365, 105]);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const z of sp.zs) {
    z.c += dt / 2.4;
    if (z.c > 1) z.c -= 1;
    const c = z.c;
    const a = Math.sin(Math.PI * c) * Math.min(1, sp.sleep * 1.4);
    ctx.font = '700 ' + ((12 + 14 * c) * sp.t).toFixed(1) + 'px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,' + (a * 0.95).toFixed(3) + ')';
    ctx.shadowColor = 'rgba(0,0,0,.25)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText('z', o.x + c * 34 * sp.t, o.y - c * 70 * sp.t);
  }
  ctx.restore();
  /* landed fly snores at half size */
  const f = ENG.fly;
  if (f && f.landed > 0.5 && f.vis > 0.5) {
    ctx.save();
    ctx.font = '700 ' + ((6 + 7 * sp.zs[0].c) * sp.t).toFixed(1) + 'px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,' + (Math.sin(Math.PI * sp.zs[0].c) * 0.8).toFixed(3) + ')';
    ctx.fillText('z', f.x + 10, f.y - 14 - sp.zs[0].c * 34);
    ctx.restore();
  }
}
