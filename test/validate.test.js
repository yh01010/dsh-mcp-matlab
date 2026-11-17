import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validatePatchText } from '../validate.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => fs.readFileSync(path.join(here, 'fixtures', name), 'utf8');

test('valid patch has no problems', () => {
  assert.deepEqual(validatePatchText(fixture('valid.yml'), { source: 'valid.yml' }), []);
});

test('all-commented-out patch is rejected', () => {
  const errors = validatePatchText(fixture('all-commented-out.yml'), { source: 'all-commented-out.yml' });
  assert.ok(errors.length > 0, 'expected at least one error');
  assert.match(errors[0], /top level must be a YAML list/);
});

test('broken YAML is reported as a syntax error', () => {
  const errors = validatePatchText(fixture('broken-yaml.yml'), { source: 'broken-yaml.yml' });
  assert.ok(errors.length > 0, 'expected at least one error');
  assert.match(errors[0], /not valid YAML/);
});

test('empty command is rejected', () => {
  const errors = validatePatchText(fixture('empty-command.yml'), { source: 'empty-command.yml' });
  assert.ok(
    errors.some((e) => /command must be a non-empty string/.test(e)),
    `expected a command error, got: ${JSON.stringify(errors)}`,
  );
});

test('duplicate ids are rejected', () => {
  const errors = validatePatchText(fixture('duplicate-id.yml'), { source: 'duplicate-id.yml' });
  assert.ok(
    errors.some((e) => /duplicate id "mcp-matlab"/.test(e)),
    `expected a duplicate-id error, got: ${JSON.stringify(errors)}`,
  );
});