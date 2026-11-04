const puppeteer = require('puppeteer-core');
const { launch } = require('./browser');

(async () => {
  const { browser, proc } = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
    const errors = [];
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    await page.goto('file:///home/user/spider/index.html', { waitUntil: 'load', timeout: 60000 });
    await new Promise(r => setTimeout(r, 12000));
    const state = await page.evaluate(() => ({
      ready: typeof ENG !== 'undefined' && ENG.ready,
      spider: ENG && ENG.spider ? { x: Math.round(ENG.spider.x), y: Math.round(ENG.spider.y), stage: ENG.spider.intro.stage, K: +ENG.spider.K.toFixed(2) } : null,
      ropes: ENG ? ENG.ropes.length : -1,
      live: ENG ? !!ENG.live : false,
      anchors: ENG ? ENG.anchorPts.length : -1,
      legs: ENG && ENG.legs ? ENG.legs.length : -1,
      flyVis: ENG && ENG.fly ? +ENG.fly.vis.toFixed(2) : -1,
      fps: (window.__fps || 0),
    }));
    console.log('STATE', JSON.stringify(state));
    console.log('ERRORS', errors.slice(0, 12).join(' || ') || 'none');
    await page.screenshot({ path: 'raw/shot1.png' });
  } finally {
    await browser.close().catch(() => {});
    proc.kill('SIGKILL');
  }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
