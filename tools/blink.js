const { launch } = require('./browser');

(async () => {
  const { browser, proc } = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900 });
    page.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await page.goto('file:///home/user/spider/index.html', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 7000));
    await page.mouse.move(1200, 690, { steps: 6 });
    await new Promise(r => setTimeout(r, 2600));
    const pos = await page.evaluate(() => ({ x: ENG.spider.x, y: ENG.spider.y, qt: +ENG.spider.qt.toFixed(2) }));
    console.log('spider at', JSON.stringify(pos));
    const clip = { x: Math.max(0, pos.x - 150), y: Math.max(0, pos.y - 130), width: 300, height: 260 };
    await page.screenshot({ path: 'raw/o_rest.png', clip });
    await new Promise(r => setTimeout(r, 2300));
    await page.screenshot({ path: 'raw/o_blink.png', clip });
  } finally { await browser.close().catch(() => {}); proc.kill('SIGKILL'); }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
