const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const http = require('http');

const PORT = 9333;
const FLAGS = ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${PORT}`, '--user-data-dir=/tmp/cprof', 'about:blank'];

function waitPort(tries) {
  return new Promise((res, rej) => {
    const get = n => {
      const req = http.get(`http://127.0.0.1:${PORT}/json/version`, r => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => { try { res(JSON.parse(d).webSocketDebuggerUrl); } catch (e) { retry(n); } });
      });
      req.on('error', () => retry(n));
      req.setTimeout(4000, () => { req.destroy(); retry(n); });
    };
    const retry = n => { if (n <= 0) return rej(new Error('chromium did not come up')); setTimeout(() => get(n - 1), 1500); };
    get(tries);
  });
}

async function launch() {
  const proc = spawn('/tmp/chromium', FLAGS, {
    env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023/lib:/tmp' },
    stdio: 'ignore',
  });
  const ws = await waitPort(80);
  const browser = await puppeteer.connect({ browserWSEndpoint: ws, defaultViewport: null });
  return { browser, proc };
}

module.exports = { launch };
