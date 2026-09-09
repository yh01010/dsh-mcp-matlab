#!/usr/bin/env node
// Lightweight structural validation for dsh-mcp-matlab. Run:
//   node validate.mjs
// Exits 0 on success, 1 on any failure, 2 when node_modules is missing.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const errors = [];
const root = path.dirname(fileURLToPath(import.meta.url));

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// 1. package.json parses and declares dsh.bundle.patch
try {
  const pkg = JSON.parse(read('package.json'));
  const patch = pkg.dsh?.bundle?.patch;
  if (!patch) errors.push('package.json must declare dsh.bundle.patch (installable via dsh plugin add)');
  else if (!fs.existsSync(path.join(root, patch))) errors.push(`dsh.bundle.patch points at a missing file: ${patch}`);
  else console.log('✓ package.json — dsh.bundle.patch ->', patch);
} catch (e) {
  errors.push(`package.json is not valid JSON: ${e.message}`);
}

// 2. cordis.patch.yml has key fields
const patchFile = (() => {
  try { return JSON.parse(read('package.json')).dsh?.bundle?.patch || 'cordis.patch.yml'; } catch { return 'cordis.patch.yml'; }
})();
try {
  const text = read(patchFile);
  for (const needle of ['id: mcp-matlab', 'serverName: matlab', 'transport: stdio', 'command:']) {
    if (!text.includes(needle)) errors.push(`cordis.patch.yml missing: ${needle}`);
  }
  console.log('✓ cordis.patch.yml — id/serverName/transport/command present');
} catch {
  errors.push(`cordis.patch.yml not found or unreadable (${patchFile})`);
}

// 3. no personal machine paths anywhere
const walk = (d) => {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, ent.name);
    if (ent.isDirectory()) { if (ent.name !== '.git' && !ent.name.startsWith('node_modules')) walk(p); continue; }
    if (/.ya?ml$|\.md$/.test(ent.name)) {
      const text = fs.readFileSync(p, 'utf8');
      if (/c:\\users\\[a-z0-9_]+|d:\\workspace|d:\\matlab/i.test(text)) errors.push(`personal machine path in ${path.relative(root, p)}`);
    }
  }
};
walk(root);
if (errors.filter((e) => e.startsWith('personal')).length === 0) console.log('✓ no personal machine paths found');

// 4. README title
try {
  if (!read('README.md').startsWith('# dsh-mcp-matlab')) errors.push('README.md missing its # dsh-mcp-matlab title');
  else console.log('✓ README.md — title present');
} catch {
  errors.push('README.md not found');
}

if (errors.length) {
  console.error('\nvalidate.mjs FAILED:');
  errors.forEach((e) => console.error('  -', e));
  process.exit(1);
}
console.log('\nvalidate.mjs OK');