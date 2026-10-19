import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9336;
const URL = process.env.SMOKE_URL || 'http://127.0.0.1:8123/index.html';
const profile = path.resolve('.build/chrome-smoke-profile');

const chrome = spawn(CHROME, [
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
  await sleep(2500);
  for (let i = 0; i < 40; i++) {
    const r = await cdp.send('Runtime.evaluate', { expression: 'window.__sz && window.__sz.ready', returnByValue: true });
    if (r.result.value) break;
    await sleep(300);
  }
  const ev = async expr => (await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;

  console.log('ready:', await ev('window.__sz.ready'));
  console.log('playing at load:', await ev('window.__sz.playing'));
  await ev('document.getElementById("btnPlay").click()');
  await sleep(200);
  console.log('after pause click:', await ev('window.__sz.playing'), '| label:', await ev('document.getElementById("playLabel").textContent'));
  await ev('document.getElementById("btnPlay").click()');
  await sleep(200);
  console.log('after play click:', await ev('window.__sz.playing'), '| label:', await ev('document.getElementById("playLabel").textContent'));
  await ev('document.getElementById("btnSound").click()');
  await sleep(300);
  console.log('sound label:', await ev('document.getElementById("soundLabel").textContent'));
  await ev('window.__sz.setYear(2016)');
  await sleep(400);
  console.log('HUD year after setYear(2016):', await ev('document.getElementById("year").textContent'),
    '| era:', await ev('document.getElementById("era").textContent'));
  console.log('chapter visible:', await ev('document.getElementById("chapter").classList.contains("show")'));
  const info = await ev('JSON.stringify(window.__sz.info())');
  console.log('info:', info);

  // responsive check
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 900, height: 600, deviceScaleFactor: 1, mobile: false });
  await sleep(500);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('shots/smoke-900.png', Buffer.from(shot.data, 'base64'));
  console.log('console errors:', cdp.logs.length ? cdp.logs.join('\n') : 'none');
  ws.close();
  chrome.kill();
}
main().catch(e => { console.error(e); try { chrome.kill(); } catch {} process.exit(1); });
