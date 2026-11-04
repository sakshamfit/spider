const { launch } = require('./browser');

(async () => {
  const { browser, proc } = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900 });
    page.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await page.goto('file:///home/user/spider/index.html', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 7000));
    /* layering audit */
    const layers = await page.evaluate(() => {
      const over = document.querySelector('.over');
      const o = document.querySelector('.over .found .o');
      const web = document.querySelector('.web-layer');
      return {
        overZ: getComputedStyle(over).zIndex,
        webZ: getComputedStyle(web).zIndex,
        oVisible: getComputedStyle(o).visibility,
        oOpacity: getComputedStyle(o).opacity,
        oRect: JSON.parse(JSON.stringify(o.getBoundingClientRect())),
        frameORect: JSON.parse(JSON.stringify(document.querySelector('#bigFound .o').getBoundingClientRect())),
      };
    });
    console.log('LAYERS', JSON.stringify(layers));
    /* paint test: recolor the over-o red, spider walks through, screenshot */
    await page.evaluate(() => { document.querySelector('.over .found .o').style.color = 'red'; });
    await page.mouse.move(680, 405, { steps: 5 });
    for (let i = 0; i < 18; i++) {
      await page.mouse.move(690 + i * 14, 405 + 20 * Math.sin(i / 3), { steps: 2 });
      await new Promise(r => setTimeout(r, 45));
    }
    await page.mouse.move(795, 405, { steps: 4 });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: 'raw/o_redtest.png' });
    await page.evaluate(() => { document.querySelector('.over .found .o').style.color = ''; });
    /* blink closeup: park + zoom crop */
    await page.mouse.move(1200, 700, { steps: 6 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'raw/o_rest.png', clip: { x: 640, y: 260, width: 340, height: 300 } });
    await new Promise(r => setTimeout(r, 2400));
    await page.screenshot({ path: 'raw/o_blink.png', clip: { x: 640, y: 260, width: 340, height: 300 } });
  } finally { await browser.close().catch(() => {}); proc.kill('SIGKILL'); }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
