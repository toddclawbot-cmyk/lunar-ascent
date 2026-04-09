#!/usr/bin/env node
// post-build.js — runs after `vite build` to inline all JS into index.html
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const order = ['physics.js', 'entities.js', 'camera.js', 'renderer.js', 'ui.js', 'input.js', 'levels.js', 'main.js'];
const contents = {};
for (const f of order) {
  contents[f] = readFileSync(join(root, 'src', f), 'utf8');
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

let html = readFileSync(join(root, 'index.html'), 'utf8');
html = html.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/, '');
html = html.replace('</body>', '<script>' + scriptBlocks.join('\n\n') + '</script>\n</body>');
writeFileSync(join(root, 'dist', 'index.html'), html);
console.log('Inlined JS into dist/index.html:', readFileSync(join(root, 'dist', 'index.html')).length, 'bytes');
