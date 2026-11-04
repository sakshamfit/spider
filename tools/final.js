const { launch } = require('./browser');

(async () => {
  const { browser, proc } = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900 });
    page.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await page.goto('file:///home/user/spider/index.html', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 7000));

    /* long walk to build a big web + brush past the mug */
    await page.mouse.move(240, 260, { steps: 6 });
    for (let i = 0; i < 30; i++) {
      await page.mouse.move(250 + i * 12, 260 + 60 * Math.sin(i / 4), { steps: 2 });
      await new Promise(r => setTimeout(r, 40));
    }
    for (let i = 0; i < 30; i++) {
      await page.mouse.move(600 - i * 14, 330 - 40 * Math.sin(i / 5), { steps: 2 });
      await new Promise(r => setTimeout(r, 40));
    }
    const objs = await page.evaluate(() => ENG.objs.map(o => ({ id: o.el.id || o.el.ariaLabel, ang: +o.ang.toFixed(3), ox: +o.ox.toFixed(1) })));
    console.log('OBJECTS', JSON.stringify(objs));
    /* fps with a built web */
    const fps = await page.evaluate(async () => {
      window.__frames = 0;
      const tick = () => { window.__frames++; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      await new Promise(r => setTimeout(r, 3000));
      return { fps: window.__frames / 3, ropes: ENG.ropes.length, dew: ENG.ropes.reduce((a, r) => a + r.dew.length, 0) };
    });
    console.log('PERF', JSON.stringify(fps));

    /* cocoon visual: teleport fly near spider mouth then pounce */
    await page.evaluate(() => {
      const sp = ENG.spider;
      ENG.fly.x = sp.x + Math.cos(sp.ang) * 200 * sp.K;
      ENG.fly.y = sp.y + Math.sin(sp.ang) * 200 * sp.K;
    });
    await page.mouse.click(801, 402);
    await new Promise(r => setTimeout(r, 700));
    await page.screenshot({ path: 'raw/f_cocoon.png', clip: { x: 600, y: 250, width: 500, height: 400 } });
    const coc = await page.evaluate(() => ({ caught: ENG.fly.caught, dur: +ENG.fly.catchDur.toFixed(1) }));
    console.log('COCOON', JSON.stringify(coc));

    /* player toggle (autoplay blocked headless, but state should flip + status show) */
    await page.click('#btnPlay');
    await new Promise(r => setTimeout(r, 1200));
    const pl = await page.evaluate(() => ({
      playing: document.querySelector('#player').classList.contains('playing'),
      status: document.querySelector('#status').textContent,
      station: document.querySelector('#station').textContent,
    }));
    console.log('PLAYER', JSON.stringify(pl));
    await page.click('#btnNext');
    const st2 = await page.evaluate(() => document.querySelector('#station').textContent);
    console.log('NEXT->', st2);
    await page.click('#btnPlay');
    await new Promise(r => setTimeout(r, 200));
    const pl2 = await page.evaluate(() => document.querySelector('#player').classList.contains('playing'));
    console.log('STOPPED', pl2);
  } finally { await browser.close().catch(() => {}); proc.kill('SIGKILL'); }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
