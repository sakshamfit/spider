/* ============================================================ spider */
function newSpider() {
  const t = scaleT(), size = 1.85 * t, K = size * 0.12;
  const sp = {
    x: W / 2, y: 60 - 395 * K, ang: Math.PI / 2, prevAng: Math.PI / 2,
    angVel: 0, sway: 0, speed: 0, vx: 0, vy: 0,
    K, size, t,
    phase: rand(TAU), qt: 0, blinkNext: 1.5, blinkT: -1, blinkN: 0,
    sleep: 0, restT: 0, stillT: 0,
    h: 0, lt: 0, jump: null,
    intro: { stage: 0, t: 0 },
    zs: [{ c: rand(1) }, { c: rand(1) }, { c: rand(1) }],
    drawn: false,
  };
  for (const l of ENG.legs) { l.foot.init = false; l.stepping = false; l.st = 0; }
  return sp;
}

function spiderSpinneret(sp) {
  return bodyToWorld(sp, SPIN_BODY);
}

/* two-bone IK: knee position for hip H, foot F, lengths a b (world), bend sign */
function solveKnee(H, F, a, b, sign) {
  const dx = F.x - H.x, dy = F.y - H.y;
  let d = hyp(dx, dy);
  d = clamp(d, Math.abs(a - b) + 0.01, a + b - 0.01);
  const base = Math.atan2(dy, dx);
  const alpha = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const ang = base + alpha * sign;
  return { x: H.x + Math.cos(ang) * a, y: H.y + Math.sin(ang) * a };
}

function updateSpider(dt) {
  const sp = ENG.spider;
  if (!sp) return;
  sp.prevAng = sp.ang;

  /* ---- intro ---- */
  const it = sp.intro;
  if (it.stage === 0) {
    it.t += dt;
    sp.x = W / 2; sp.y = 60 - 395 * sp.K; sp.ang = Math.PI / 2;
    if (it.t >= 3) { it.stage = 1; it.t = 0; }
  } else if (it.stage === 1) {
    it.t += dt;
    const u = clamp(it.t / 2.3, 0, 1);
    const e = 1 - Math.pow(1 - u, 2.4);
    sp.x = W / 2 + Math.sin(1.8 * u) * 8 * Math.exp(-0.5 * u);
    sp.y = lerp(60 - 395 * sp.K, H / 2, e);
    sp.ang = Math.PI / 2;
    if (u >= 1) { it.stage = 2; it.t = 0; }
  } else if (it.stage === 2) {
    it.t += dt;
    const v = it.t;
    sp.x = W / 2 + Math.sin(1.8) * 8 * Math.exp(-0.5);
    sp.y = H / 2 + 14 * Math.exp(-3.2 * v) * Math.sin(6.5 * v) * sp.t;
    sp.ang = Math.PI / 2 + Math.sin(2.2 * v) * 0.06 * Math.exp(-0.8 * v);
    if (v >= 1.3) {
      it.stage = 3; it.t = 0;
      sp.lt = 1;
      webVibrate(W / 2, H / 2, 140, 2);
      nudgeObjects(W / 2, H / 2, 0.5);
    }
  } else {
    /* ---- walk / follow / jump ---- */
    const pt = ENG.pointer;
    /* the spider plays only on the hero: ignore targets that scrolled below it */
    let tgt = null;
    if (!ENG.jumpPounce) {
      if (ENG.fly.vis > 0.05) {
        const fl = heroLocal(ENG.fly.x, ENG.fly.y);
        if (fl.y > -30 && fl.y < H - 6) tgt = fl;
      }
      if (!tgt && pt.has) {
        const pl = heroLocal(pt.x, pt.y);
        if (pl.y > -30 && pl.y < H - 6) tgt = pl;
      }
    }
    if (sp.jump) {
      const J = sp.jump;
      J.t += dt;
      const u = clamp(J.t / J.dur, 0, 1);
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      sp.x = lerp(J.x0, J.x1, e);
      sp.y = lerp(J.y0, J.y1, e);
      sp.h = J.h * Math.sin(Math.PI * u);
      sp.speed = 0;
      if (u >= 1) {
        sp.jump = null; sp.h = 0; sp.lt = 1;
        webVibrate(sp.x, sp.y, 140, 3);
        nudgeObjects(sp.x, sp.y, 1);
        tryCatchFly();
        /* feet replant */
        for (const l of ENG.legs) l.foot.init = false;
      }
    } else if (tgt) {
      const gap = (ENG.fly.hasImg ? 560 : 330) * sp.K;
      const d = hyp(tgt.x - sp.x, tgt.y - sp.y);
      const sT = Math.min(760, Math.max(0, d - gap) * 4);
      sp.speed += (sT - sp.speed) * (1 - Math.exp(-10 * dt));
      const ta = Math.atan2(tgt.y - sp.y, tgt.x - sp.x);
      const da = wrapAng(ta - sp.ang);
      sp.ang += da * (1 - Math.exp(-8 * dt));
      sp.x += Math.cos(sp.ang) * sp.speed * dt;
      sp.y += Math.sin(sp.ang) * sp.speed * dt;
      sp.x = clamp(sp.x, 10, W - 10);
      sp.y = clamp(sp.y, 10, H - 10);
    } else {
      sp.speed *= Math.exp(-6 * dt);
    }
    if (ENG.jumpPounce && !sp.jump) startPounce();
  }

  /* velocity estimate */
  const ivx = (sp.x - (sp._px === undefined ? sp.x : sp._px)) / dt;
  const ivy = (sp.y - (sp._py === undefined ? sp.y : sp._py)) / dt;
  sp.vx = lerp(sp.vx, ivx, 0.5); sp.vy = lerp(sp.vy, ivy, 0.5);
  sp._px = sp.x; sp._py = sp.y;
  const spd = hyp(sp.vx, sp.vy);

  /* angular velocity + sway */
  const av = wrapAng(sp.ang - sp.prevAng) / Math.max(dt, 1e-4);
  sp.angVel = lerp(sp.angVel, av, 0.4);
  const zT = clamp(-sp.angVel * 0.08, -0.35, 0.35);
  sp.sway += (zT - sp.sway) * (1 - Math.exp(-6 * dt));

  /* breathing phase */
  sp.phase += dt * (3.2 - 1.8 * sp.sleep);

  /* landing squash decay */
  sp.lt = Math.max(0, sp.lt - 4 * dt);

  /* ---- feet ---- */
  const tuck = 1 - 0.38 * sp.sleep;
  let anyMoving = sp.speed > 5 || sp.jump || sp.intro.stage < 3;
  for (const l of ENG.legs) {
    const H = bodyToWorld(sp, l.hip);
    let R = legRest(l, sp, tuck);
    /* velocity lead */
    R.x += sp.vx * 0.09; R.y += sp.vy * 0.09;
    if (!l.foot.init || (sp.jump)) {
      l.foot.x = R.x; l.foot.y = R.y; l.foot.init = true; l.stepping = false;
      continue;
    }
    const dxT = R.x - l.foot.x, dyT = R.y - l.foot.y;
    const distT = hyp(dxT, dyT);
    let trig = 130 * sp.K * (l.front ? 0.7 : 1);
    if (spd < 25) trig *= 0.3;
    const reach = (l.a + l.b) * sp.K;
    const hipD = hyp(l.foot.x - H.x, l.foot.y - H.y);
    const over = hipD > reach * 0.98;
    let frontBehind = false;
    if (l.front) {
      const hd = Math.cos(sp.ang) * (l.foot.x - H.x) + Math.sin(sp.ang) * (l.foot.y - H.y);
      frontBehind = hd < 0;
    }
    const urgent = over || frontBehind;
    const want = distT > trig || urgent || distT > trig * 1.6;
    if (want && !l.stepping) {
      const otherBusy = ENG.legs.some(o => o.group !== l.group && o.stepping);
      if (!otherBusy || urgent || distT > trig * 1.6) {
        l.stepping = true; l.st = 0;
        l.stDur = clamp(0.15 - spd / 3200, 0.055, 0.15);
        const ext = Math.min(18 * sp.K, distT * 0.25);
        const inv = distT > 0.001 ? 1 / distT : 0;
        l.from = { x: l.foot.x, y: l.foot.y };
        l.to = { x: R.x + dxT * inv * ext, y: R.y + dyT * inv * ext };
      }
    }
    if (l.stepping) {
      l.st += dt;
      const u = clamp(l.st / l.stDur, 0, 1);
      const e = 1 - Math.pow(1 - u, 3);
      l.foot.x = lerp(l.from.x, l.to.x, e);
      l.foot.y = lerp(l.from.y, l.to.y, e);
      if (u >= 1) {
        l.stepping = false;
        webVibrate(l.foot.x, l.foot.y, 30, 0.6);
      }
    }
    if (hyp(l.foot.x - R.x, l.foot.y - R.y) > 2) anyMoving = true;
  }

  /* ---- rest / face / sleep ---- */
  const pt = ENG.pointer;
  const still = (ENG.t - pt.lastMove > 0.25) && spd < 25 && !sp.jump && sp.intro.stage === 3;
  if (still) {
    sp.restT += dt;
    sp.stillT += dt;
  } else { sp.restT = 0; sp.stillT = 0; }
  const qtT = (sp.restT > 0.25 && !sp.jump) ? 1 : 0;
  sp.qt += (qtT - sp.qt) * (1 - Math.exp(-(qtT ? 3.2 : 6) * dt));

  /* blinks */
  if (sp.qt > 0.5) {
    if (sp.blinkT < 0) {
      sp.blinkNext -= dt;
      if (sp.blinkNext <= 0) { sp.blinkT = 0; sp.blinkN = 0; }
    } else {
      sp.blinkT += dt;
      if (sp.blinkT >= 0.2) {
        sp.blinkN++;
        if (sp.blinkN === 1) { sp.blinkT = 0.2 - 0.33; } /* second blink after 0.33s */
        else { sp.blinkT = -1; sp.blinkNext = rand(3, 5); }
      }
    }
  } else { sp.blinkT = -1; sp.blinkNext = 1.5; }

  /* sleep */
  let sleepT = 0;
  if (sp.stillT > 8) sleepT = 1;
  if (sleepT) sp.sleep = Math.min(1, sp.sleep + dt / 1.6);
  else {
    if (sp.sleep > 0.6 && (ENG.t - pt.lastMove) < 0.2 && !sp.jump) {
      /* startled hop */
      sp.sleep = 0; sp.restT = 0;
      const d = 0.001;
      sp.jump = { t: 0, dur: 0.3, x0: sp.x, y0: sp.y, x1: sp.x, y1: sp.y, h: 26 };
      webVibrate(sp.x, sp.y, 120, 2);
      for (const l of ENG.legs) l.foot.init = false;
    } else {
      sp.sleep = Math.max(0, sp.sleep - dt / 0.5);
    }
  }
  ENG.moving = anyMoving || sp.qt < 0.5;
}
