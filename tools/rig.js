const { launch } = require('./browser');

(async () => {
  const { browser, proc } = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1000 });
    page.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await page.goto('file:///home/user/spider/index.html', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 3500));
    const info = await page.evaluate(async () => {
      /* stop the main loop from painting over our test canvas */
      const out = {};
      const S = ENG.slices;
      out.abd = { w: S.abd.width, h: S.abd.height };
      out.head = { w: S.head.width, h: S.head.height };
      /* alpha stats of abdomen slice */
      const g = S.abd.getContext('2d');
      const d = g.getImageData(0, 0, S.abd.width, S.abd.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 60) n++;
      out.abdOpaque = n;
      const legs = ENG.legs.map(l => ({ a: Math.round(l.a), b: Math.round(l.b), stripW: l.strip.width, split: Math.round(l.split), sign: l.sign, hip: l.hip.map(Math.round), rest: l.rest.map(Math.round) }));
      out.legs = legs;
      /* render rig test at K = 0.5 */
      const K = 0.5, sp = { x: 700, y: 500, ang: Math.PI / 2, sway: 0, K, qt: 0, sleep: 0, phase: 0, lt: 0, h: 0 };
      for (const l of ENG.legs) { l.foot.x = 0; l.foot.y = 0; l.foot.init = false; }
      const span = 1017 * K * 1.35;
      const c = mkCanvas(span, span), g2 = c.getContext('2d');
      ENG.off = c; ENG.offX = g2;
      ENG.spider.x = span / 2; ENG.spider.y = span / 2; ENG.spider.ang = sp.ang; ENG.spider.K = K; ENG.spider.qt = 0; ENG.spider.sleep = 0;
      for (const l of ENG.legs) {
        const R = legRest(l, ENG.spider, 1);
        l.foot.x = R.x; l.foot.y = R.y; l.foot.init = true;
      }
      ENG.spider.h = 0;
      drawSpider();
      out.rigData = ENG.off.toDataURL('image/png');
      return out;
    });
    console.log('INFO', JSON.stringify({ ...info, rigData: undefined }));
    require('fs').writeFileSync('/tmp/rig.png', Buffer.from(info.rigData.split(',')[1], 'base64'));
    console.log('rig png written');
  } finally { await browser.close().catch(() => {}); proc.kill('SIGKILL'); }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
