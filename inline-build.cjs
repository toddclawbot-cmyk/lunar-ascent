#!/usr/bin/env node
// inline-build.js — creates a single self-contained HTML file
const fs = require('fs');
const path = require('path');

const order = ['physics.js', 'entities.js', 'camera.js', 'renderer.js', 'ui.js', 'input.js', 'levels.js', 'main.js'];
const contents = {};
order.forEach(f => { contents[f] = fs.readFileSync(path.join(__dirname, 'src', f), 'utf8'); });

function stripExports(code) {
  return code
    .replace(/^export (const|let|var|function|class) /gm, '$1 ')
    .replace(/^export \{[^}]+\};/gm, '')
    .replace(/^import .+ from .+;$/gm, '')
    .replace(/import .+ from .+;/g, '');
}

const scriptBlocks = [];
for (const f of order) {
  const code = stripExports(contents[f]);
  scriptBlocks.push('// ===== ' + f + ' =====\n' + code);
}

let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
html = html.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/, '');
html = html.replace('</body>', '<script>' + scriptBlocks.join('\n\n') + '</script>\n</body>');
fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), html);
console.log('Created dist/index.html:', fs.statSync(path.join(__dirname, 'dist', 'index.html')).size, 'bytes');
