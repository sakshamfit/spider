const { launch } = require('./browser');

(async () => {
  const { browser, proc } = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900 });
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    await page.goto('file:///home/user/spider/index.html', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 8000));

    /* walk on the hero so a web exists */
    await page.mouse.move(650, 400, { steps: 6 });
    for (let i = 0; i < 24; i++) {
      await page.mouse.move(660 + i * 12, 400 + 50 * Math.sin(i / 3), { steps: 2 });
      await new Promise(r => setTimeout(r, 40));
    }
    const hero = await page.evaluate(() => ({ ropes: ENG.ropes.length, sy: scrollY }));
    console.log('HERO', JSON.stringify(hero));
    await page.screenshot({ path: 'raw/s_hero.png' });

    /* scroll to the middle of the portfolio */
    await page.evaluate(() => document.querySelector('#about').scrollIntoView({ behavior: 'instant' }));
    await new Promise(r => setTimeout(r, 1000));
    await page.mouse.move(800, 450, { steps: 6 });
    for (let i = 0; i < 12; i++) {
      await page.mouse.move(810 + i * 8, 450 + 30 * Math.sin(i), { steps: 2 });
      await new Promise(r => setTimeout(r, 40));
    }
    const below = await page.evaluate(() => ({
      sy: Math.round(scrollY),
      anchors: ENG.anchorPts.length,
      anchorBelowHero: ENG.anchorPts.filter(p => p.y > innerHeight + 5).length,
      spiderY: Math.round(ENG.spider.y),
      spiderX: Math.round(ENG.spider.x),
      speed: Math.round(ENG.spider.speed),
    }));
    console.log('BELOW', JSON.stringify(below));
    await page.screenshot({ path: 'raw/s_about.png' });

    /* wipe button test */
    const wipe = await page.evaluate(async () => {
      const before = ENG.ropes.filter(r => !r.dying).length;
      document.querySelector('#wipe').click();
      await new Promise(r => setTimeout(r, 900));
      const after = ENG.ropes.filter(r => !r.dying).length;
      const falling = ENG.fallingDrops.length;
      /* wipe again on the hero after scrolling back */
      document.querySelector('#home').scrollIntoView({ behavior: 'instant' });
      await new Promise(r => setTimeout(r, 800));
      return { before, after, falling };
    });
    console.log('WIPE', JSON.stringify(wipe));
    await page.screenshot({ path: 'raw/s_wiped.png' });
    console.log('ERRORS', errors.slice(0, 6).join(' || ') || 'none');
  } finally { await browser.close().catch(() => {}); proc.kill('SIGKILL'); }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
