/* ============================================================ object wobble */
function initObjects() {
  const els = [$('#mug'), $('#p-one'), $('#p-near'), $('#tshirt'),
               ...$$('.nav-icons a')];
  for (const el of els) {
    if (!el) continue;
    ENG.objs.push({
      el,
      stick: el.dataset.stick === 'bottom',
      ang: 0, va: 0, ox: 0, oy: 0, vx: 0, vy: 0,
      cx: 0, cy: 0, size: 100,
    });
  }
}

function nudgeObjects(x, y, k) {
  const sp = ENG.spider;
  if (!sp) return;
  for (const o of ENG.objs) {
    const d = hyp(o.cx - x, o.cy - y);
    if (d < 300 * sp.K * 1.4) {
      o.va += rand(16, 28) * Math.PI / 180 * (Math.random() < 0.5 ? -1 : 1) * 2.6 * k;
    }
  }
}

function updateObjects(dt) {
  const sp = ENG.spider;
  if (!sp) return;
  const spd = hyp(sp.vx, sp.vy);
  for (const o of ENG.objs) {
    /* distance to the image box (not its centre), per spec */
    const dx = o.cx - sp.x, dy = o.cy - sp.y;
    const bx = Math.max(Math.abs(dx) - o.halfW, 0);
    const by = Math.max(Math.abs(dy) - o.halfH, 0);
    const d = hyp(bx, by);
    if (d < 260 * sp.K && spd > 40) {
      const size2 = Math.max(100, o.size * o.size);
      const torque = clamp((dx * sp.vy - dy * sp.vx) / size2, -2.5, 2.5);
      o.va += torque * 120 * dt;
      if (!o.stick) {
        o.vx += 0.85 * sp.vx * dt;
        o.vy += 0.85 * sp.vy * dt;
      }
    }
    o.ang += o.va * dt;
    o.va *= Math.exp(-2.8 * dt);
    if (Math.abs(o.ang) > 24 * Math.PI / 180) o.va -= o.ang * 8 * dt;
    if (!o.stick) {
      o.ox += o.vx * dt; o.oy += o.vy * dt;
      o.vx *= Math.exp(-2.8 * dt); o.vy *= Math.exp(-2.8 * dt);
      if (hyp(o.ox, o.oy) > 50) { o.vx -= o.ox * 8 * dt; o.vy -= o.oy * 8 * dt; }
    } else {
      if (Math.abs(o.ang) > 8 * Math.PI / 180) o.va -= o.ang * 20 * dt;
    }
    /* apply */
    const tiny = Math.abs(o.ang) < 0.0008 && Math.abs(o.ox) < 0.05 && Math.abs(o.oy) < 0.05 && Math.abs(o.va) < 0.002;
    if (tiny && o._rest) continue;
    o._rest = tiny;
    o.el.style.rotate = o.ang.toFixed(4) + 'rad';
    o.el.style.translate = o.stick ? '0 0' : o.ox.toFixed(2) + 'px ' + o.oy.toFixed(2) + 'px';
  }
}

/* ============================================================ player */
function initPlayer() {
  const STATIONS = [
    { name: 'Groove Salad', url: 'https://ice1.somafm.com/groovesalad-128-mp3' },
    { name: 'Lush', url: 'https://ice1.somafm.com/lush-128-mp3' },
    { name: 'Drone Zone', url: 'https://ice1.somafm.com/dronezone-128-mp3' },
  ];
  const player = $('#player'), statusEl = $('#status'), stationEl = $('#station');
  let cur = 0, audio = null, playing = false;

  function setStatus(s) { statusEl.textContent = s; }
  function stopAudio() { if (audio) { try { audio.pause(); audio.removeAttribute('src'); } catch (e) {} audio = null; } }
  function tune() {
    stopAudio();
    setStatus('tuning…');
    audio = new Audio();
    audio.preload = 'none';
    audio.src = STATIONS[cur].url;
    audio.addEventListener('playing', () => setStatus('live'), { once: true });
    audio.addEventListener('error', () => { setStatus('offline'); }, { once: true });
    const p = audio.play();
    if (p && p.catch) p.catch(() => setStatus('offline'));
  }
  function play() {
    playing = true;
    player.classList.add('playing');
    tune();
  }
  function stop() {
    playing = false;
    player.classList.remove('playing');
    stopAudio();
    setStatus('live');
  }
  function skip(dir) {
    cur = (cur + dir + STATIONS.length) % STATIONS.length;
    stationEl.textContent = STATIONS[cur].name;
    if (playing) tune();
  }
  $('#btnPlay').addEventListener('click', () => playing ? stop() : play());
  $('#btnNext').addEventListener('click', () => skip(1));
  $('#btnPrev').addEventListener('click', () => skip(-1));
  $('#btnShuffle').addEventListener('click', () => skip((Math.random() * 3) | 0));
  $('#btnRepeat').addEventListener('click', () => skip(1));
}

/* ============================================================ input */
function initInput() {
  const pt = ENG.pointer;
  const hint = $('#spider-instructions');
  if (ENG.touch) hint.textContent = 'Hold — clear web\nDouble-tap — make the spider jump';
  let downX = 0, downY = 0, downT = 0, holdTimer = 0, lastTap = 0, moved = false;

  document.addEventListener('pointermove', e => {
    const nx = e.clientX, ny = e.clientY;
    const dtm = Math.max(4, e.timeStamp - (pt._ts || e.timeStamp - 16));
    const d = hyp(nx - pt.x, ny - pt.y);
    pt.spd = lerp(pt.spd, d / (dtm / 1000), 0.4);
    if (ENG.fly) ENG.fly.recoil = Math.min(1, ENG.fly.recoil + d / 800);
    pt.x = nx; pt.y = ny; pt.has = true;
    pt.lastMove = ENG.t;
    pt._ts = e.timeStamp;
    if (hyp(nx - downX, ny - downY) > 12) moved = true;
  }, { passive: true });

  document.addEventListener('pointerdown', e => {
    pt.x = e.clientX; pt.y = e.clientY; pt.has = true;
    pt.lastMove = ENG.t;
    downX = e.clientX; downY = e.clientY; downT = e.timeStamp; moved = false;
    const interactive = e.target.closest && e.target.closest('button,a,input,[data-no-spider]');
    if (!interactive && ENG.touch) {
      clearTimeout(holdTimer);
      holdTimer = setTimeout(() => {
        if (!moved) {
          clearWeb();
          if (navigator.vibrate) navigator.vibrate(30);
        }
      }, 650);
      const now = e.timeStamp;
      if (now - lastTap < 320) {
        /* double tap: move fly + pounce */
        if (ENG.fly) { ENG.fly.x = e.clientX; ENG.fly.y = e.clientY; ENG.fly.landed = 0; ENG.fly.stillT = 0; }
        ENG.pointer.x = e.clientX; ENG.pointer.y = e.clientY;
        startPounce();
        lastTap = 0;
      } else lastTap = now;
    }
  });
  document.addEventListener('pointerup', e => {
    clearTimeout(holdTimer);
    const interactive = e.target.closest && e.target.closest('button,a,input,[data-no-spider]');
    if (!interactive && !ENG.touch && !moved && e.timeStamp - downT < 600) {
      startPounce();
    }
  });
  document.addEventListener('pointerleave', () => { pt.has = false; });
  document.addEventListener('pointerout', e => { if (!e.relatedTarget) pt.has = false; });
  window.addEventListener('blur', () => { pt.has = false; });

  document.addEventListener('mouseover', e => {
    pt.overUI = !!(e.target.closest && e.target.closest('button,a,input,[data-no-spider]'));
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const t = document.activeElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      clearWeb();
    }
  });
}

function clearWeb() {
  for (const r of ENG.ropes) {
    r.dying = 0.0001;
    for (let i = r.dew.length - 1; i >= 0; i--) dropFall(r, r.dew[i], i);
    r.vibrate(r.pts[6].x, r.pts[6].y, 4000, 3);
  }
  for (const s of ENG.splats) if (s.fall === undefined) s.fall = rand(0, 0.3);
  if (navigator.vibrate) navigator.vibrate(30);
  ENG.lastAnchor = null;
  ENG.live = null; /* a fresh live thread starts from the spinneret */
}

/* ============================================================ scroll */
/* silk + spider live on the hero canvas and scroll away with it, so scrolling
   needs no web surgery — only the nav highlight follows the section */
function updateActiveNav() {
  const links = $$('.nav-links a');
  let best = 0;
  links.forEach((a, i) => {
    const href = a.getAttribute('href') || '';
    if (!href.startsWith('#')) return;
    const t = document.getElementById(href.slice(1));
    if (!t) return;
    if (t.getBoundingClientRect().top <= innerHeight * 0.45) best = i;
  });
  links.forEach((a, i) => a.classList.toggle('active', i === best));
}

function initScroll() {
  document.addEventListener('scroll', () => {
    requestAnimationFrame(updateActiveNav);
  }, { passive: true });
  updateActiveNav();
}

/* ============================================================ wipe button */
function initWipe() {
  const btn = $('#wipe');
  btn.addEventListener('click', () => clearWeb());
}

/* ============================================================ resize */
let resizeTimer = 0;
function doResize() {
  W = innerWidth; H = innerHeight;
  DPR = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  flyCanvas.width = Math.round(W * DPR);
  flyCanvas.height = Math.round(H * DPR);
  fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  /* shadows are soft and offset — half resolution keeps the composite cheap */
  shadowC = mkCanvas(W / 2, H / 2); shadowX = shadowC.getContext('2d');
  maskC = mkCanvas(W, H); maskX = maskC.getContext('2d'); maskData = null;
  debrisC = mkCanvas(W, H); debrisX = debrisC.getContext('2d');
  const sp = ENG.spider;
  if (sp) {
    const t = scaleT();
    sp.t = t; sp.size = 1.85 * t; sp.K = sp.size * 0.12;
    sp.x = clamp(sp.x, 10, W - 10);
    sp.y = clamp(sp.y, 10, H - 10);
    for (const l of ENG.legs) l.foot.init = false;
  }
  ENG.flySize = Math.max(0.75, 1.05 * scaleT());
  resampleAnchors();
  for (const r of ENG.ropes) r.decorDirty = true;
}

/* ============================================================ loop */
let frameDt = 1 / 60;
let lastT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (!lastT) lastT = now;
  let dt = (now - lastT) / 1000;
  lastT = now;
  dt = Math.min(0.033, Math.max(0.0005, dt));
  frameDt = dt;
  ENG.t += dt;

  updateFly(dt);
  updateObjects(dt);
  updateSpider(dt);
  updateSilk(dt);

  /* anchors resample after things settle */
  if (ENG.moving) ENG.settleTimer = 0;
  else {
    ENG.settleTimer += dt;
    if (ENG.settleTimer > 0.3 && !ENG._settled) {
      ENG._settled = true;
      resampleAnchors();
    }
  }
  if (ENG.moving) ENG._settled = false;

  /* splat fade/fall */
  for (let i = ENG.splats.length - 1; i >= 0; i--) {
    const s = ENG.splats[i];
    if (s.fall !== undefined) {
      s.fallY = (s.fallY || 0) + 900 * dt;
      s.y += 900 * dt;
      if (s.y > H + 40) ENG.splats.splice(i, 1);
    }
  }

  /* render: hero scene on the hero canvas, fly on the fixed layer */
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  fctx.clearRect(0, 0, W, H);
  drawDebris();
  drawSilk();
  drawSpider();
  drawZs(dt);
  drawFly();
}

/* ============================================================ boot */
async function boot() {
  try {
    const [spiderImg, faceImg, flyImg] = await Promise.all([
      loadImg(ASSETS.spider), loadImg(ASSETS.face), loadImg(ASSETS.fly),
    ]);
    ENG.spiderImg = spiderImg; ENG.faceImg = faceImg; ENG.flyImg = flyImg;
    buildSpiderAssets(spiderImg);
    flySprites = buildFlySprites(flyImg);
    sampleEyeSkin();
    makeDewSprite();
    ENG.spider = newSpider();
    ENG.fly = newFly();
    ENG.flySize = Math.max(0.75, 1.05 * ENG.spider.t);
    initObjects();
    initPlayer();
    initInput();
    initScroll();
    initWipe();
    doResize();
    ENG.ready = true;
    /* hotlinked images shift layout as they arrive — resample when they do */
    document.addEventListener('load', e => {
      if (e.target && e.target.tagName === 'IMG') scheduleResample(200);
    }, true);
    requestAnimationFrame(frame);
  } catch (err) {
    console.error('boot failed', err);
  }
}

new ResizeObserver(() => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(doResize, 60);
}).observe(pageEl);
window.addEventListener('load', () => setTimeout(resampleAnchors, 50));
setTimeout(resampleAnchors, 600);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => resampleAnchors());
boot();
