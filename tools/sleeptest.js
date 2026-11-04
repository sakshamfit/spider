const { launch } = require('./browser');

(async () => {
  const { browser, proc } = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900 });
    page.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await page.goto('file:///home/user/spider/index.html', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 7000));
    await page.mouse.move(420, 640, { steps: 8 });
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const st = await page.evaluate(() => ({
        restT: +ENG.spider.restT.toFixed(1), sleep: +ENG.spider.sleep.toFixed(2), qt: +ENG.spider.qt.toFixed(1),
      }));
      console.log(JSON.stringify(st));
    }
    await page.screenshot({ path: 'raw/b_sleep.png' });
    /* wake by moving pointer */
    await page.mouse.move(700, 500, { steps: 4 });
    await new Promise(r => setTimeout(r, 400));
    const st = await page.evaluate(() => ({ sleep: +ENG.spider.sleep.toFixed(2), jump: !!ENG.spider.jump }));
    console.log('WAKE', JSON.stringify(st));
    await page.screenshot({ path: 'raw/b_wake.png' });
  } finally { await browser.close().catch(() => {}); proc.kill('SIGKILL'); }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
