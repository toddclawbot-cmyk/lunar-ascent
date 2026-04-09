#!/usr/bin/env node
// post-inline.js — inlines all JS modules into dist/index.html after vite build
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const order = ['audio.js', 'physics.js', 'entities.js', 'camera.js', 'renderer.js', 'ui.js', 'input.js', 'levels.js', 'main.js'];
const contents = {};
for (const f of order) {
  contents[f] = fs.readFileSync(path.join(root, 'src', f), 'utf8');
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

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/, '');
html = html.replace('</body>', '<script>' + scriptBlocks.join('\n\n') + '</script>\n</body>');
fs.writeFileSync(path.join(root, 'dist', 'index.html'), html);
console.log('Inlined JS:', fs.statSync(path.join(root, 'dist', 'index.html')).size, 'bytes');
