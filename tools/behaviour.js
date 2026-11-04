const { launch } = require('./browser');

(async () => {
  const { browser, proc } = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900 });
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    await page.goto('file:///home/user/spider/index.html', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: 'raw/b_hang.png' });
    await new Promise(r => setTimeout(r, 5500));

    /* rest face: park pointer, wait */
    await page.mouse.move(400, 650, { steps: 10 });
    await new Promise(r => setTimeout(r, 2500));
    let st = await page.evaluate(() => ({ qt: +ENG.spider.qt.toFixed(2), spd: Math.round(ENG.spider.speed) }));
    console.log('REST qt', JSON.stringify(st));
    await page.screenshot({ path: 'raw/b_rest.png' });

    /* blink: wait a bit more */
    await new Promise(r => setTimeout(r, 2600));
    await page.screenshot({ path: 'raw/b_blink.png' });

    /* pounce: click near the fly position */
    await page.mouse.move(900, 500, { steps: 5 });
    await new Promise(r => setTimeout(r, 600));
    await page.mouse.click(905, 505);
    await new Promise(r => setTimeout(r, 260));
    await page.screenshot({ path: 'raw/b_jump.png' });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: 'raw/b_catch.png' });
    st = await page.evaluate(() => ({ caught: ENG.fly.caught, jump: !!ENG.spider.jump }));
    console.log('CATCH', JSON.stringify(st));

    /* sleep: keep pointer still 11s */
    st = await page.evaluate(() => { ENG.pointer.x = 200; ENG.pointer.y = 200; return 1; });
    await new Promise(r => setTimeout(r, 11000));
    st = await page.evaluate(() => ({ sleep: +ENG.spider.sleep.toFixed(2), qt: +ENG.spider.qt.toFixed(2) }));
    console.log('SLEEP', JSON.stringify(st));
    await page.screenshot({ path: 'raw/b_sleep.png' });

    /* wake */
    await page.mouse.move(800, 450, { steps: 4 });
    await new Promise(r => setTimeout(r, 500));
    st = await page.evaluate(() => ({ sleep: +ENG.spider.sleep.toFixed(2), jump: !!ENG.spider.jump }));
    console.log('WAKE', JSON.stringify(st));

    /* web count then Delete */
    const before = await page.evaluate(() => ENG.ropes.length);
    await page.keyboard.press('Delete');
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: 'raw/b_clear.png' });
    await new Promise(r => setTimeout(r, 2500));
    const after = await page.evaluate(() => ({ ropes: ENG.ropes.filter(r => !r.dying).length, live: !!ENG.live, splats: ENG.splats.length }));
    console.log('CLEAR', before, '->', JSON.stringify(after));
    console.log('ERRORS', errors.slice(0, 6).join(' || ') || 'none');
  } finally { await browser.close().catch(() => {}); proc.kill('SIGKILL'); }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
