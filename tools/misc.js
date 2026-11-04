const { launch } = require('./browser');

(async () => {
  const { browser, proc } = await launch();
  try {
    /* --- desktop: walk across the 'o', measure fps --- */
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900 });
    page.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await page.goto('file:///home/user/spider/index.html', { waitUntil: 'load' });
    await page.evaluate(() => {
      window.__frames = 0;
      const tick = () => { window.__frames++; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    await new Promise(r => setTimeout(r, 7000));
    /* drag pointer slowly across the big o (center ~x=800,y=405) */
    await page.mouse.move(650, 405, { steps: 6 });
    for (let i = 0; i < 24; i++) {
      await page.mouse.move(650 + i * 13, 405 + 30 * Math.sin(i / 3), { steps: 2 });
      await new Promise(r => setTimeout(r, 50));
    }
    await page.screenshot({ path: 'raw/m_overo.png' });
    const fps = await page.evaluate(() => {
      const f = window.__frames;
      window.__frames = 0;
      return f;
    });
    console.log('frames in last ~1.2s window:', fps);
    const fps2 = await page.evaluate(async () => {
      await new Promise(r => setTimeout(r, 3000));
      return window.__frames / 3;
    });
    console.log('fps (idle, threads building):', fps2);
    const counts = await page.evaluate(() => ({ ropes: ENG.ropes.length, anchors: ENG.anchorPts.length }));
    console.log('counts', JSON.stringify(counts));
    await page.close();

    /* --- portrait --- */
    const p2 = await browser.newPage();
    await p2.setViewport({ width: 430, height: 900, isMobile: true, hasTouch: true });
    await p2.goto('file:///home/user/spider/index.html', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 9000));
    await p2.screenshot({ path: 'raw/m_portrait.png' });
    const ps = await p2.evaluate(() => ({
      t: +ENG.spider.t.toFixed(2), K: +ENG.spider.K.toFixed(3),
      hint: document.querySelector('#spider-instructions').textContent.slice(0, 22),
      mug: getComputedStyle(document.querySelector('#mug')).display,
    }));
    console.log('portrait', JSON.stringify(ps));
    await p2.close();

    /* --- short landscape --- */
    const p3 = await browser.newPage();
    await p3.setViewport({ width: 1280, height: 500 });
    await p3.goto('file:///home/user/spider/index.html', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 6000));
    await p3.screenshot({ path: 'raw/m_short.png' });
    await p3.close();
    console.log('done');
  } finally { await browser.close().catch(() => {}); proc.kill('SIGKILL'); }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
