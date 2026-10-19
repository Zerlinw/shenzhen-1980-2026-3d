/**
 * Headless screenshot harness.
 *
 * Usage:
 *   node scripts/shoot.mjs
 *   node scripts/shoot.mjs --years=1980,1996,2016,2026
 *   node scripts/shoot.mjs --years=1980,2026 --close --night
 *   node scripts/shoot.mjs --url=http://127.0.0.1:8123/index.html
 *
 * Options:
 *   --years=LIST     comma separated years (default: 2026)
 *   --out=DIR        output directory (default: docs/screenshots)
 *   --url=URL        page URL (default: local file:// build)
 *   --size=WxH       viewport (default: 1600x900)
 *   --port=N         CDP port (default: 9333)
 *   --close          also capture the 2026 scene close-ups
 *   --night          also capture the neon night scene
 *
 * Requires a Chromium browser. Set CHROME if auto-detection fails.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBrowser } from './browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function argValue(name, fallback) {
  const prefixed = args.find(a => a.startsWith(`--${name}=`));
  if (prefixed) return prefixed.slice(name.length + 3);
  const i = args.indexOf(`--${name}`);
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1];
  return fallback;
}
function hasFlag(name) {
  return args.includes(`--${name}`) || process.env[`SHOT_${name.toUpperCase()}`] === '1';
}
if (hasFlag('help')) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0] + '*/');
  process.exit(0);
}

const firstPositional = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const years = (argValue('years', firstPositional || '2026')).split(',').map(Number).filter(Number.isFinite);
const outDir = path.resolve(ROOT, argValue('out', 'docs/screenshots'));
const size = argValue('size', process.env.SHOT_SIZE || '1600x900').split('x').map(Number);
const W = Number.isFinite(size[0]) ? size[0] : 1600;
const H = Number.isFinite(size[1]) ? size[1] : 900;
const PORT = Number(argValue('port', process.env.SHOT_PORT || 9333));
const BASE = argValue('url', process.env.SHOT_URL || 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/'));
const withCloseups = hasFlag('close');
const withNight = hasFlag('night');
const browser = findBrowser();
const profile = path.resolve(ROOT, '.cache/chrome-shoot');

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(profile, { recursive: true });

const chrome = spawn(browser, [
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

async function waitJson(url, timeout = 25000) {
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
    ws.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
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

  const sep = BASE.includes('?') ? '&' : '?';
  await cdp.send('Page.navigate', { url: `${BASE}${sep}year=${years[0] || 2026}&paused=1` });

  let ready = false;
  for (let i = 0; i < 160; i++) {
    await sleep(250);
    try {
      const r = await cdp.send('Runtime.evaluate', { expression: 'window.__sz && window.__sz.ready === true', returnByValue: true });
      if (r.result.value === true) { ready = true; break; }
    } catch { /* page might still be loading */ }
  }
  if (!ready) throw new Error('scene never became ready');
  await sleep(1400);

  const evalValue = async expression =>
    (await cdp.send('Runtime.evaluate', { expression, returnByValue: true })).result.value;
  const info = await evalValue('JSON.stringify(window.__sz.info())');
  console.log('INFO', info);

  async function shot(name) {
    const png = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    const file = path.join(outDir, name);
    fs.writeFileSync(file, Buffer.from(png.data, 'base64'));
    console.log('SHOT', path.relative(ROOT, file), fs.statSync(file).size);
  }

  for (const year of years) {
    await evalValue(`window.__sz.setYear(${year})`);
    await sleep(1600);
    await shot(`sz-${year}.png`);
  }

  if (withCloseups) {
    await evalValue('window.__sz.setYear(2026)');
    await sleep(700);
    const views = [
      ['pingan', [9, 17, 20], [0, 14, -4]],
      ['breakfast', [-16, 6.5, 15], [-16, 2.2, 5]],
      ['greenway-w', [-1, 5.5, 19.5], [-4, 1.1, 15]],
      ['greenway-e', [9, 5.5, 19.5], [10, 1.1, 15]],
      ['market', [15.5, 6.5, 16], [15.5, 2.2, 6]],
      ['bay', [12, 8, 32], [26, 2, 26]],
      ['water', [-28, 8, 36], [-33, 0.8, 30]]
    ];
    for (const [name, c, t] of views) {
      await evalValue(`window.__sz.debug.look(${c.join(',')},${t.join(',')})`);
      await sleep(900);
      await shot(`close-${name}.png`);
    }
    await evalValue('window.__sz.debug.resetLook()');
  }

  if (withNight) {
    await evalValue('window.__sz.setMode("night")');
    await evalValue('window.__sz.debug.nightAt(2.6)');
    await sleep(1200);
    await shot('sz-night.png');
    await evalValue('window.__sz.debug.nightAt(5.6)');
    await sleep(1100);
    await shot('sz-night-2.png');
    await evalValue('window.__sz.setMode("day")');
  }

  if (logs.length) {
    console.log('--- console ---');
    [...new Set(logs)].slice(0, 40).forEach(l => console.log(l));
    process.exitCode = 1;
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
