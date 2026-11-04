const { launch } = require('./browser');

(async () => {
  const { browser, proc } = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    await page.goto('file:///home/user/spider/index.html', { waitUntil: 'load', timeout: 60000 });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'raw/t_intro.png' });
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: 'raw/t_landed.png' });
    /* wiggle the pointer so the spider follows + fly appears */
    for (let i = 0; i < 40; i++) {
      await page.mouse.move(300 + 500 * (i / 40), 500 + 200 * Math.sin(i / 4), { steps: 3 });
      await new Promise(r => setTimeout(r, 60));
    }
    await page.screenshot({ path: 'raw/t_walk1.png' });
    for (let i = 0; i < 40; i++) {
      await page.mouse.move(1150 - 400 * (i / 40), 620 - 150 * Math.sin(i / 5), { steps: 3 });
      await new Promise(r => setTimeout(r, 60));
    }
    await new Promise(r => setTimeout(r, 700));
    await page.screenshot({ path: 'raw/t_walk2.png' });
    const state = await page.evaluate(() => ({
      ropes: ENG.ropes.length, live: !!ENG.live, anchors: ENG.anchorPts.length,
      spider: { x: Math.round(ENG.spider.x), y: Math.round(ENG.spider.y), spd: Math.round(ENG.spider.speed) },
      flyVis: +ENG.fly.vis.toFixed(2), fly: { x: Math.round(ENG.fly.x), y: Math.round(ENG.fly.y) },
      qt: +ENG.spider.qt.toFixed(2), sleep: +ENG.spider.sleep.toFixed(2),
      feet: ENG.legs.map(l => [Math.round(l.foot.x), Math.round(l.foot.y)]),
    }));
    console.log('STATE', JSON.stringify(state));
    console.log('ERRORS', errors.slice(0, 8).join(' || ') || 'none');
  } finally { await browser.close().catch(() => {}); proc.kill('SIGKILL'); }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
