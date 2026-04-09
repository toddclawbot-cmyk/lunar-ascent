#!/usr/bin/env node
// build.js — self-contained build: inlines all JS into a single index.html
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const order = ['physics.js', 'entities.js', 'camera.js', 'renderer.js', 'ui.js', 'input.js', 'levels.js', 'main.js'];
const contents = {};
for (const f of order) {
  const filePath = path.join(__dirname, 'src', f);
  if (!fs.existsSync(filePath)) {
    console.error('Missing file:', filePath);
    process.exit(1);
  }
  contents[f] = fs.readFileSync(filePath, 'utf8');
  console.error('Read', f, ':', contents[f].length, 'bytes, G=', (contents[f].match(/G = ([0-9.]+)/) || ['','?'])[1]);
}

function stripExports(code) {
  return code
    .replace(/^export (const|let|var|function|class) /gm, '$1 ')
    .replace(/^export \{[^}]+\};/gm, '')
    .replace(/^import .+ from .+;$/gm, '')
    .replace(/import .+ from .+;/g, '');
}

const scriptBlocks = [];
for (const f of order) {
  scriptBlocks.push('// ===== ' + f + ' =====\n' + stripExports(contents[f]));
}

// Ensure dist dir exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
html = html.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/, '');
html = html.replace('</body>', '<script>' + scriptBlocks.join('\n\n') + '</script>\n</body>');
fs.writeFileSync(path.join(distDir, 'index.html'), html);
console.error('Built dist/index.html:', fs.statSync(path.join(distDir, 'index.html')).size, 'bytes');
console.log('Done'); // stdout for vercel to detect success
