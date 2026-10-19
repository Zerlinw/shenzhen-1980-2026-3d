/**
 * One-off migration helper: pull the inlined Three.js build out of index.html
 * so tools/build.mjs can rebuild the page from .src/ again.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const three = blocks.find(b => b.includes('THREE') && b.includes('REVISION')) || blocks[0];
if (!three) throw new Error('inline three.js not found');
fs.mkdirSync(path.join(root, '.build'), { recursive: true });
fs.writeFileSync(path.join(root, '.build/three.min.js'), three);
console.log('three bytes', three.length);
