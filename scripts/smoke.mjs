import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBrowser } from './browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browser = findBrowser();
const PORT = Number(process.env.SMOKE_PORT || 9336);
const URL = process.env.SMOKE_URL || 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const SHOTS = path.join(ROOT, 'docs/screenshots');
const profile = path.resolve(ROOT, '.cache/chrome-smoke');
fs.mkdirSync(profile, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });

const chrome = spawn(browser, [
  '--headless=new', '--no-sandbox', '--disable-crash-reporter', '--no-first-run',
  '--no-default-browser-check', '--enable-unsafe-swiftshader', '--use-gl=angle',
  '--use-angle=swiftshader', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--window-size=1280,800', '--hide-scrollbars', 'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitJson(url, timeout = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try { const r = await fetch(url); if (r.ok) return await r.json(); } catch { /* retry */ }
    await sleep(200);
  }
  throw new Error('timeout ' + url);
}
class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.logs = [];
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id);
        this.pending.delete(m.id);
        if (m.error) reject(new Error(m.error.message)); else resolve(m.result);
      } else if (m.method === 'Runtime.exceptionThrown') {
        this.logs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
      } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
        this.logs.push('ERR ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' '));
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
}

async function main() {
  await waitJson(`http://127.0.0.1:${PORT}/json/version`);
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const cdp = new CDP(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Page.navigate', { url: URL + '?v=' + Date.now() });
  await sleep(2200);
  for (let i = 0; i < 60; i++) {
    const r = await cdp.send('Runtime.evaluate', { expression: 'window.__sz && window.__sz.ready', returnByValue: true });
    if (r.result.value) break;
    await sleep(300);
  }
  const ev = async expr => (await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;

  console.log('ready:', await ev('window.__sz.ready'));
  console.log('year at load:', await ev('window.__sz.year'), '| playing:', await ev('window.__sz.playing'));
  console.log('finale visible:', await ev('document.getElementById("finale").classList.contains("show")'));
  console.log('legend visible:', await ev('document.getElementById("legend").classList.contains("show")'));

  await ev('document.getElementById("btnPlay").click()');
  await sleep(300);
  console.log('after play click:', await ev('window.__sz.playing'), '| label:', await ev('document.getElementById("playLabel").textContent'));
  await ev('document.getElementById("btnPlay").click()');
  await sleep(200);
  console.log('after pause click:', await ev('window.__sz.playing'), '| label:', await ev('document.getElementById("playLabel").textContent'));

  await ev('document.getElementById("btnSound").click()');
  await sleep(300);
  console.log('sound label:', await ev('document.getElementById("soundLabel").textContent'));

  await ev('window.__sz.setYear(2016)');
  await sleep(500);
  console.log('HUD year after setYear(2016):', await ev('document.getElementById("year").textContent'),
    '| era:', await ev('document.getElementById("era").textContent'));
  console.log('chapter visible:', await ev('document.getElementById("chapter").classList.contains("show")'),
    '| legend visible:', await ev('document.getElementById("legend").classList.contains("show")'));
  console.log('info:', await ev('JSON.stringify(window.__sz.info())'));

  await ev('document.getElementById("btnMode").click()');
  await sleep(1400);
  console.log('night mode:', await ev('window.__sz.mode'),
    '| body.night:', await ev('document.body.classList.contains("night")'),
    '| mode label:', await ev('document.getElementById("modeLabel").textContent'));
  console.log('night info:', await ev('JSON.stringify(window.__sz.info())'));

  await ev('document.getElementById("btnMode").click()');
  await sleep(900);
  console.log('back to day:', await ev('window.__sz.mode'),
    '| body.night:', await ev('document.body.classList.contains("night")'),
    '| mode label:', await ev('document.getElementById("modeLabel").textContent'));

  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 900, height: 600, deviceScaleFactor: 1, mobile: false });
  await sleep(700);
  let shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, 'smoke-900.png'), Buffer.from(shot.data, 'base64'));

  await ev('document.getElementById("btnMode").click()');
  await sleep(1200);
  shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, 'smoke-night-900.png'), Buffer.from(shot.data, 'base64'));
  await ev('document.getElementById("btnMode").click()');
  await sleep(500);
  console.log('console errors:', cdp.logs.length ? cdp.logs.join('\n') : 'none');
  ws.close();
  chrome.kill();
}
main().catch(e => { console.error(e); try { chrome.kill(); } catch { /* noop */ } process.exit(1); });
