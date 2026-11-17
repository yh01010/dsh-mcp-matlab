#!/usr/bin/env node
// Structural validation for dsh-mcp-matlab.
//
//   node validate.mjs                 validate this repo
//   node validate.mjs --patch <file>  validate one patch file only
//   node validate.mjs --root <dir>    validate another checkout
//
// Exits 0 on success, 1 on any failure. Needs the `yaml` devDependency:
// run `npm install` once before using it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';

export const PLUGIN_ID = 'mcp-matlab';
export const SERVER_NAME = 'matlab';

const README_TITLE = '# dsh-mcp-matlab';
const SERVER_NAME_RE = /^[A-Za-z0-9_-]{1,32}$/;
const PERSONAL_PATH_RE = /c:\\users\\[a-z0-9_.-]+|d:\\workspace|d:\\matlab/i;
const ROOT = path.dirname(fileURLToPath(import.meta.url));

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v) => typeof v === 'string' && v.trim() !== '';

/** Checks one `config` block against the fields the host mcp-client accepts. */
function checkConfig(config, where, errors) {
  if (!isObject(config)) {
    errors.push(`${where}: config must be a mapping`);
    return;
  }
  if (!isText(config.serverName)) errors.push(`${where}: config.serverName must be a non-empty string`);
  else if (!SERVER_NAME_RE.test(config.serverName)) errors.push(`${where}: config.serverName must match ${SERVER_NAME_RE}`);
  if (config.transport !== 'stdio') errors.push(`${where}: config.transport must be "stdio"`);
  if (!isText(config.command)) errors.push(`${where}: config.command must be a non-empty string`);
  if (config.args !== undefined) {
    if (!Array.isArray(config.args)) errors.push(`${where}: config.args must be a list`);
    else config.args.forEach((arg, i) => {
      if (typeof arg !== 'string') errors.push(`${where}: config.args[${i}] must be a string`);
    });
  }
  if (config.toolCallTimeoutMs !== undefined
    && !(Number.isInteger(config.toolCallTimeoutMs) && config.toolCallTimeoutMs > 0)) {
    errors.push(`${where}: config.toolCallTimeoutMs must be a positive integer`);
  }
  if (config.failOnStartupError !== undefined && typeof config.failOnStartupError !== 'boolean') {
    errors.push(`${where}: config.failOnStartupError must be a boolean`);
  }
  if (config.reconnect !== undefined && !isObject(config.reconnect)) {
    errors.push(`${where}: config.reconnect must be a mapping`);
  }
}

/** Flattens top-level rows and `insert` rows into [row, where] pairs. */
export function collectRows(doc, source = 'patch') {
  const errors = [];
  const rows = [];
  if (!Array.isArray(doc)) {
    errors.push(`${source}: top level must be a YAML list`);
    return { rows, errors };
  }
  if (doc.length === 0) {
    errors.push(`${source}: top level list is empty (every entry commented out?)`);
    return { rows, errors };
  }
  doc.forEach((entry, i) => {
    const where = `${source}: entry[${i}]`;
    if (!isObject(entry)) {
      errors.push(`${where} must be a mapping`);
      return;
    }
    if (entry.insert !== undefined) {
      if (!Array.isArray(entry.insert)) {
        errors.push(`${where}.insert must be a list`);
        return;
      }
      if (entry.id !== undefined || entry.name !== undefined) {
        errors.push(`${where}: an insert entry carries no id/name of its own`);
      }
      entry.insert.forEach((row, j) => rows.push([row, `${where}.insert[${j}]`]));
    } else {
      rows.push([entry, where]);
    }
  });
  return { rows, errors };
}

/** Validates a parsed patch document; returns a list of human-readable problems. */
export function validatePatchDocument(doc, { source = 'patch' } = {}) {
  const { rows, errors } = collectRows(doc, source);
  const seen = new Map();
  for (const [row, where] of rows) {
    if (!isObject(row)) {
      errors.push(`${where}: row must be a mapping`);
      continue;
    }
    if (!isText(row.id)) errors.push(`${where}: id must be a non-empty string`);
    else if (seen.has(row.id)) errors.push(`${where}: duplicate id "${row.id}" (already used by ${seen.get(row.id)})`);
    else seen.set(row.id, where);
    if (!isText(row.name)) errors.push(`${where}: name must be a non-empty string`);
    checkConfig(row.config, where, errors);
  }
  return errors;
}

/** Parses and validates patch text; a YAML syntax error is a single problem. */
export function validatePatchText(text, { source = 'patch' } = {}) {
  let doc;
  try {
    doc = parseYaml(text);
  } catch (e) {
    return [`${source}: not valid YAML (${e.message})`];
  }
  return validatePatchDocument(doc, { source });
}

/** Full repo check: package.json, patch structure, personal paths, README title. */
export function validateRepo(root = ROOT, log = () => {}) {
  const errors = [];
  const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
  let patchRel = 'cordis.patch.yml';

  // 1. package.json parses and declares dsh.bundle.patch
  try {
    const pkg = JSON.parse(read('package.json'));
    const declared = pkg.dsh?.bundle?.patch;
    if (!declared) errors.push('package.json must declare dsh.bundle.patch (installable via dsh plugin add)');
    else if (!fs.existsSync(path.join(root, declared))) errors.push(`dsh.bundle.patch points at a missing file: ${declared}`);
    else {
      patchRel = declared;
      log(`✓ package.json — dsh.bundle.patch -> ${declared}`);
    }
  } catch (e) {
    errors.push(`package.json is not valid JSON: ${e.message}`);
  }

  // 2. patch file parses and every row is structurally sound
  try {
    const text = read(patchRel);
    const patchErrors = validatePatchText(text, { source: patchRel });
    if (patchErrors.length) {
      errors.push(...patchErrors);
    } else {
      const { rows } = collectRows(parseYaml(text), patchRel);
      const own = rows.map(([row]) => row).find((row) => row.id === PLUGIN_ID);
      if (!own) errors.push(`${patchRel}: no row with id "${PLUGIN_ID}"`);
      else if (own.config?.serverName !== SERVER_NAME) errors.push(`${patchRel}: row "${PLUGIN_ID}" must use serverName "${SERVER_NAME}"`);
      else log(`✓ ${patchRel} — structure valid, id "${PLUGIN_ID}" on serverName "${SERVER_NAME}"`);
    }
  } catch {
    errors.push(`${patchRel} not found or unreadable`);
  }

  // 3. no personal machine paths in tracked text (.yml/.md/.json)
  let personal = 0;
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name !== '.git' && ent.name !== 'node_modules') walk(p);
        continue;
      }
      if (!/\.ya?ml$|\.md$|\.json$/.test(ent.name)) continue;
      if (PERSONAL_PATH_RE.test(fs.readFileSync(p, 'utf8'))) {
        errors.push(`personal machine path in ${path.relative(root, p)}`);
        personal += 1;
      }
    }
  };
  walk(root);
  if (personal === 0) log('✓ no personal machine paths found');

  // 4. README title
  try {
    if (!read('README.md').startsWith(README_TITLE)) errors.push(`README.md missing its ${README_TITLE} title`);
    else log('✓ README.md — title present');
  } catch {
    errors.push('README.md not found');
  }

  return errors;
}

function report(errors, label) {
  if (errors.length) {
    console.error(`\nvalidate.mjs FAILED (${label}):`);
    errors.forEach((e) => console.error('  -', e));
    return 1;
  }
  console.log('\nvalidate.mjs OK');
  return 0;
}

function main(argv) {
  let patch = null;
  let root = ROOT;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--patch' || arg === '--root') {
      const value = argv[i + 1];
      if (!value) return report([`${arg} needs a value`], 'args');
      if (arg === '--patch') patch = value;
      else root = path.resolve(value);
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log('usage: node validate.mjs [--patch <file>] [--root <dir>]');
      return 0;
    } else {
      return report([`unknown argument: ${arg}`], 'args');
    }
  }

  if (patch) {
    const errors = validatePatchText(fs.readFileSync(path.resolve(patch), 'utf8'), { source: patch });
    return report(errors, patch);
  }
  return report(validateRepo(root, (line) => console.log(line)), root);
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) process.exit(main(process.argv.slice(2)));