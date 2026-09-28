// Guards against secrets leaking through --redact. Every value in sample.har that starts
// with FAKE_ is a secret and must never appear in redacted output.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { convert } = require('../lib');

const samplePath = path.join(__dirname, 'sample.har');
const har = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
const secrets = [...fs.readFileSync(samplePath, 'utf8').matchAll(/FAKE_[A-Z_]+/g)].map((m) => m[0]);

test('--redact removes every secret header and query param', () => {
  const out = convert(har, { redact: true }).map((r) => r.curl).join('\n');
  const leaked = secrets.filter((s) => out.includes(s));
  assert.deepStrictEqual(leaked, [], `leaked: ${leaked.join(', ')}`);
  assert.match(out, /leadId=42/, 'non-secret query params are kept');
  assert.match(out, /Content-Type: application\/json/, 'non-secret headers are kept');
});

test('without --redact, values are passed through unchanged', () => {
  const out = convert(har).map((r) => r.curl).join('\n');
  for (const s of secrets) assert.ok(out.includes(s), `${s} missing`);
});

test('CLI filters by host and method', () => {
  const out = execFileSync(
    process.execPath,
    [path.join(__dirname, '..', 'har2curl.js'), samplePath, '--host', 'leadsquared', '--method', 'post', '--redact'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  );
  assert.match(out, /^# \[500\] POST \/v2\/Leads\.Get$/m);
  assert.doesNotMatch(out, /browser\/v1beta\/logs/);
});
