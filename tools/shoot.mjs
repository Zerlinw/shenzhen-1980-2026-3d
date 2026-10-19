/**
 * Headless verification harness.
 * Usage: node tools/shoot.mjs [years] [outDir]
 * Requires full access on Windows (Chrome needs named pipes for its child processes).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;
const years = (process.argv[2] || '1980,1985,1996,2011,2016,2026').split(',').map(Number);
const outDir = path.resolve(process.argv[3] || 'shots');
const BASE = process.env.SHOT_URL || 'http://127.0.0.1:8123/index.html';
const W = Number(process.env.SHOT_W || 1600);
const H = Number(process.env.SHOT_H || 900);

fs.mkdirSync(outDir, { recursive: true });
const profile = path.resolve('.build/chrome-shot-profile');

const chrome = spawn(CHROME, [
  '--headless=new',
  '--no-sandbox',
  '--disable-crash-reporter',
  '--no-first-run',
  '--no-default-browser-check',
  '--enable-unsafe-swiftshader',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--disable-features=CalculateNativeWinOcclusion',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  `--window-size=${W},${H}`,
  '--hide-scrollbars',
  'about:blank'
], { stdio: 'ignore', detached: false });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitJson(url, timeout = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch { /* retry */ }
    await sleep(200);
  }
  throw new Error('timeout waiting for ' + url);
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { try { this.ws.close(); } catch { /* noop */ } }
}

async function main() {
  await waitJson(`http://127.0.0.1:${PORT}/json/version`);
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const cdp = new CDP(ws);

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  try { await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true }); } catch { /* optional */ }
  try { await cdp.send('Page.bringToFront'); } catch { /* optional */ }

  const logs = [];
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      logs.push('EXCEPTION: ' + (d.exception?.description || d.text));
    }
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
      logs.push(m.params.type.toUpperCase() + ': ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' '));
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      logs.push('LOG: ' + m.params.entry.text);
    }
  });

  const url = `${BASE}?year=${years[0]}&paused=1`;
  await cdp.send('Page.navigate', { url });

  // wait until the scene signals ready
  let ready = false;
  for (let i = 0; i < 120; i++) {
    await sleep(250);
    try {
      const r = await cdp.send('Runtime.evaluate', { expression: 'window.__sz && window.__sz.ready === true', returnByValue: true });
      if (r.result.value === true) { ready = true; break; }
    } catch { /* page might still be loading */ }
  }
  if (!ready) throw new Error('scene never became ready');
  await sleep(800);

  const info = await cdp.send('Runtime.evaluate', { expression: 'JSON.stringify(window.__sz.info())', returnByValue: true });
  console.log('INFO', info.result.value);
  const dbg = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const p = window.__sz.debug.palette();
      const r = c => [c.r.toFixed(3), c.g.toFixed(3), c.b.toFixed(3)];
      return JSON.stringify({ zen: r(p.zen), hor: r(p.hor), fog: r(p.fog), night: p.night, cam: window.__sz.debug.camera.position.toArray().map(v => +v.toFixed(1)) });
    })()`, returnByValue: true
  });
  console.log('PALETTE', dbg.result.value);

  for (const y of years) {
    await cdp.send('Runtime.evaluate', { expression: `window.__sz.setYear(${y})`, returnByValue: true });
    await sleep(1200);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    const file = path.join(outDir, `sz-${y}.png`);
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    const size = fs.statSync(file).size;
    console.log('SHOT', file, size);
  }

  // autoplay smoke test: play 4 seconds and sample the year twice
  await cdp.send('Runtime.evaluate', { expression: 'window.__sz.setYear(1980); window.__sz.play();', returnByValue: true });
  await sleep(3000);
  const y1 = await cdp.send('Runtime.evaluate', { expression: 'window.__sz.year', returnByValue: true });
  console.log('PLAYTEST year after 3s =', y1.result.value);

  if (logs.length) {
    console.log('--- console ---');
    [...new Set(logs)].slice(0, 40).forEach(l => console.log(l));
  } else {
    console.log('--- console clean ---');
  }

  cdp.close();
  chrome.kill();
}

main().catch(err => {
  console.error('SHOOT FAILED:', err.message);
  try { chrome.kill(); } catch { /* noop */ }
  process.exit(1);
});
