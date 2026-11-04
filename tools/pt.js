const { launch } = require('./browser');
(async () => {
  const { browser, proc } = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    page.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await page.goto('file:///home/user/spider/index.html', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 8000));
    await page.screenshot({ path: 'raw/pt_hero.png' });
    await page.evaluate(() => document.querySelector('#work').scrollIntoView());
    await new Promise(r => setTimeout(r, 900));
    await page.screenshot({ path: 'raw/pt_work.png' });
    console.log('ok');
  } finally { await browser.close().catch(()=>{}); proc.kill('SIGKILL'); }
})().catch(e => console.error('FATAL', e.message));
