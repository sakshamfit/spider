const { launch } = require('./browser');

(async () => {
  const { browser, proc } = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900 });
    page.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await page.goto('file:///home/user/spider/index.html', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 8000));
    /* natural catch: park pointer right at the spider's mouth, fly settles there, then click */
    const ok = await page.evaluate(async () => {
      const sp = ENG.spider;
      const mx = sp.x + Math.cos(sp.ang) * 300 * sp.K;
      const my = sp.y + Math.sin(sp.ang) * 300 * sp.K;
      ENG.pointer.x = mx; ENG.pointer.y = my; ENG.pointer.has = true; ENG.pointer.lastMove = ENG.t;
      /* let the fly converge + land */
      await new Promise(r => setTimeout(r, 2500));
      ENG.fly.x = mx; ENG.fly.y = my;
      startPounce();
      await new Promise(r => setTimeout(r, 800));
      return { caught: ENG.fly.caught, dur: +ENG.fly.catchDur.toFixed(2) };
    });
    console.log('CATCH', JSON.stringify(ok));
    const pos = await page.evaluate(() => ({ x: ENG.fly.x, y: ENG.fly.y, vis: ENG.fly.vis, sx: ENG.spider.x, sy: ENG.spider.y }));
    console.log('FLY', JSON.stringify(pos));
    await new Promise(r => setTimeout(r, 350));
    await page.screenshot({ path: 'raw/f_cocoon.png', clip: { x: pos.x - 170, y: pos.y - 150, width: 360, height: 300 } });
    await new Promise(r => setTimeout(r, 900));
    await page.screenshot({ path: 'raw/f_cocoon2.png', clip: { x: pos.x - 170, y: pos.y - 150, width: 360, height: 300 } });
  } finally { await browser.close().catch(() => {}); proc.kill('SIGKILL'); }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
