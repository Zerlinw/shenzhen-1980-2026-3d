import fs from 'node:fs';

/**
 * Locate a Chromium-based browser for the optional screenshot/smoke harnesses.
 * Set CHROME to an absolute executable path if automatic discovery fails.
 */
const CANDIDATES = [
  process.env.CHROME,
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge'
].filter(Boolean);

export function findBrowser() {
  const browser = CANDIDATES.find(file => {
    try { return fs.existsSync(file); } catch { return false; }
  });
  if (!browser) {
    throw new Error(
      'No Chromium browser found. Install Chrome/Edge/Chromium or set CHROME=/absolute/path/to/browser.'
    );
  }
  return browser;
}
