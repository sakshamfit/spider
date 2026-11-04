const { launch } = require('./browser');

(async () => {
  const { browser, proc } = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900 });
    page.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await page.goto('file:///home/user/spider/index.html', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 7000));
    await page.mouse.move(400, 650, { steps: 8 });
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 2500));
      const st = await page.evaluate(() => {
        const sp = ENG.spider;
        const stepping = ENG.legs.filter(l => l.stepping).length;
        return { restT: +sp.restT.toFixed(1), sleep: +sp.sleep.toFixed(2), qt: +sp.qt.toFixed(1), stepping,
                 spd: +Math.hypot(sp.vx, sp.vy).toFixed(1) };
      });
      console.log(JSON.stringify(st));
    }
    await page.screenshot({ path: 'raw/b_sleep.png' });
  } finally { await browser.close().catch(() => {}); proc.kill('SIGKILL'); }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
