const { launch } = require('./browser');

(async () => {
  const { browser, proc } = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900 });
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
    await page.goto('file:///home/user/spider/index.html', { waitUntil: 'load', timeout: 60000 });
    await new Promise(r => setTimeout(r, 8000));

    /* hero state */
    let st = await page.evaluate(() => ({
      anchors: ENG.anchorPts.length, ropes: ENG.ropes.length,
      spiderY: Math.round(ENG.spider.y), stage: ENG.spider.intro.stage,
      heroH: document.querySelector('.hero').offsetHeight,
      docH: document.body.scrollHeight,
    }));
    console.log('HERO', JSON.stringify(st));
    await page.screenshot({ path: 'raw/p_hero.png' });

    /* walk a bit so the web starts */
    await page.mouse.move(700, 400, { steps: 8 });
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(710 + i * 10, 400 + 40 * Math.sin(i / 3), { steps: 2 });
      await new Promise(r => setTimeout(r, 40));
    }

    /* scroll to work */
    await page.evaluate(() => document.querySelector('#work').scrollIntoView({ behavior: 'instant', block: 'start' }));
    await new Promise(r => setTimeout(r, 1200));
    st = await page.evaluate(() => ({
      scrollY: Math.round(scrollY),
      anchors: ENG.anchorPts.length,
      firstAnchorEl: ENG.anchorPts[0] && ENG.anchorPts[0].el ? (ENG.anchorPts[0].el.className || ENG.anchorPts[0].el.tagName) : null,
      tracked: ENG.ropes.filter(r => r.trackA || r.trackB).length,
    }));
    console.log('WORK', JSON.stringify(st));
    await page.screenshot({ path: 'raw/p_work.png' });

    /* scroll to about */
    await page.evaluate(() => document.querySelector('#about').scrollIntoView({ behavior: 'instant' }));
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'raw/p_about.png' });

    /* scroll to journey + stack */
    await page.evaluate(() => document.querySelector('#journey').scrollIntoView({ behavior: 'instant' }));
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'raw/p_journey.png' });
    await page.evaluate(() => document.querySelector('#stack').scrollIntoView({ behavior: 'instant' }));
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'raw/p_stack.png' });

    /* contact + nav active state */
    await page.evaluate(() => document.querySelector('#contact').scrollIntoView({ behavior: 'instant' }));
    await new Promise(r => setTimeout(r, 1000));
    const nav = await page.evaluate(() => [...document.querySelectorAll('.nav-links a')].map(a => a.classList.contains('active') ? 1 : 0).join(''));
    console.log('NAV_ACTIVE', nav);
    await page.screenshot({ path: 'raw/p_contact.png' });

    /* perf with sections alive */
    const fps = await page.evaluate(async () => {
      window.__frames = 0;
      const tick = () => { window.__frames++; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      await new Promise(r => setTimeout(r, 3000));
      return { fps: +(window.__frames / 3).toFixed(1), ropes: ENG.ropes.length, anchors: ENG.anchorPts.length };
    });
    console.log('PERF', JSON.stringify(fps));
    console.log('ERRORS', errors.slice(0, 10).join(' || ') || 'none');
  } finally { await browser.close().catch(() => {}); proc.kill('SIGKILL'); }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
