import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

let three = read('.build/three.min.js');
// drop the r150 deprecation warning so the console stays clean
three = three.replace(/^console\.warn\([^)]*\)/, 'void 0');

const css = read('.src/style.css');
const app = read('.src/app.js');
const shell = read('.src/shell.html');

const html = shell
  .replace('/*__CSS__*/', () => css)
  .replace('/*__THREE__*/', () => three)
  .replace('/*__APP__*/', () => app);

fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('index.html', (Buffer.byteLength(html) / 1024 / 1024).toFixed(2), 'MB');
console.log('three', three.length, 'app', app.length);
