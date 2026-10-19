import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const exists = p => fs.existsSync(path.join(root, p));

const required = ['src/shell.html', 'src/style.css', 'src/app.js', 'vendor/three.min.js'];
for (const file of required) {
  if (!exists(file)) throw new Error(`missing source file: ${file}`);
}

let three = read('vendor/three.min.js');
// drop the legacy deprecation warning so the console stays clean
three = three.replace(/^console\.warn\([^)]*\)/, 'void 0');

const css = read('src/style.css');
const app = read('src/app.js');
const shell = read('src/shell.html');

for (const token of ['/*__CSS__*/', '/*__THREE__*/', '/*__APP__*/']) {
  if (!shell.includes(token)) throw new Error(`src/shell.html is missing ${token}`);
}

const html = shell
  .replace('/*__CSS__*/', () => css)
  .replace('/*__THREE__*/', () => three)
  .replace('/*__APP__*/', () => app);

fs.writeFileSync(path.join(root, 'index.html'), html);
console.log(`index.html  ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB`);
console.log(`three.js   ${three.length.toLocaleString()} chars (vendored, inlined)`);
console.log(`app.js     ${app.length.toLocaleString()} chars`);
